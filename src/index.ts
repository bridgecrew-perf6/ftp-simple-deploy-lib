import { Options } from "ftp";
import * as path from "path";
import { FtpAsyncClient } from "./ftp-async-client";
import { listGlobFiles } from "./glob.helper";

type LogFunction = (str: string) => void;

interface DeployContext {
  options: Required<DeployOptions>;
  ftpClient: FtpAsyncClient;
  logFunction: LogFunction;
}

export interface DeployConnectionOptions {
  host: string;
  user: string;
  password?: string;
  port?: number;
}

export interface DeployOptions {
  sourcePath: string; 
  remotePath: string;

  cleanRemoteDirectory?: boolean;
  excludeFromCleaning?: string[]; //Files or directories that will be ignored when cleaning the remote directory (can only specify the files or directories in the root directory)

  include?: string[];
  exclude?: string[];

  connection: DeployConnectionOptions;
  replace?: boolean;

  logger?: LogFunction;
}

const prepareDeployDirectory = async ({ftpClient, logFunction, options}:DeployContext): Promise<void> => {
  const directoryExists = await ftpClient.dirExists(options.remotePath);

  if(!directoryExists) {
    logFunction(`Remote directory ${options.remotePath} does not exist. Creating a directory`);
    await ftpClient.mkdir(options.remotePath, true);

  } else if(options.cleanRemoteDirectory) {
    const listedEntries = await ftpClient.list(options.remotePath);

    logFunction(`Found ${listedEntries.length} entries in remote directory. Deleting...`)

    const lastWorkingDirectory = await ftpClient.pwd();
    await ftpClient.cwd(options.remotePath);

    for(const entry of listedEntries) {
      if(options.excludeFromCleaning?.some(value => value === entry.name)) {
        logFunction(`Entry ${entry.name} is excluded. Skipping...`);
        continue;
      }

      if(entry.type == "d") {
        await ftpClient.rmdir(entry.name, true);
        logFunction(`Remote directory ${path.join(options.remotePath, entry.name)} has been deleted`)
      } else {
        await ftpClient.rm(entry.name);
        logFunction(`Remote file ${path.join(options.remotePath, entry.name)} has been deleted`)
      }
    }

    await ftpClient.cwd(lastWorkingDirectory);
  }
};

const transferFiles = async (files: string[], {
  ftpClient, logFunction, options
}: DeployContext): Promise<void> => {
  for(const file of files) {
    const sourcePath = path.resolve(process.cwd(), options.sourcePath, file);
    const destinationPath = path.join(options.remotePath, file);

    logFunction(`Transfering ${file} to ${destinationPath}`);

    if(!options.replace && await ftpClient.fileExists(destinationPath)) {
      logFunction(`${destinationPath} already exists. skipping...\n`)
      continue;
    }

    const destinationDirname = path.dirname(destinationPath);
    await ftpClient.mkdir(destinationDirname, true);

    await ftpClient.putFile(sourcePath, destinationPath);
    logFunction(`${file} has been successfully transfered\n`);
  }
};

const fullfillOptionsWithDefaults = (options: DeployOptions): Required<DeployOptions> => {
  return Object.assign({
    cleanRemoteDirectory: false,
    exclude: [] ,
    include: ["**/*"],
    excludeFromCleaning: [],
    logger: () => {},
    replace: false,
  } as Required<Omit<DeployOptions, "connection" | "remotePath" | "sourcePath">>, options);
};

export const deploy = async (options: DeployOptions): Promise<void> => {
  const fullfilledOptions = fullfillOptionsWithDefaults(options);

  const log = options.logger || (() => {});

  log(`Collecting information about files...`)

  const files = await listGlobFiles(fullfilledOptions.sourcePath, fullfilledOptions.include, fullfilledOptions.exclude);

  log(`Found ${files.length} files.\n`);

  if(files.length == 0) {
    log(`Nothing to do.`);
    return;
  }

  const ftpClient = new FtpAsyncClient();

  log(`Initializing connection to ${fullfilledOptions.connection.host}`);

  await ftpClient.connect({
    host: fullfilledOptions.connection.host,
    user: fullfilledOptions.connection.user,
    password: fullfilledOptions.connection.password,
    port: fullfilledOptions.connection.port,
  });

  const context: DeployContext = {
    ftpClient: ftpClient,
    logFunction: log,
    options: fullfilledOptions
  };

  log(`Connected to ${fullfilledOptions.connection.host} as ${options.connection.user}\n`);

  await prepareDeployDirectory(context);

  log("");

  log("Starting file transfer...\n");

  await transferFiles(files, context);

  log("File transfer has been successfully finished!\n")
  log("Successful deploy! Disconnecting...")

  await ftpClient.close();

  log("Disconnected! Have a great day!")
};