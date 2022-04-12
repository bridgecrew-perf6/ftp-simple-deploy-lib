import * as path from "path";
import { FtpAsyncClient } from "./ftp-async-client";
import { listGlobFiles } from "./glob.helper";

export interface DeployConnectionOptions {
  host: string;
  user: string;
  password?: string;
  port?: number;
}

export interface DeployOptions {
  sourcePath: string; 
  remotePath: string;

  cleanRemoteDirectory: boolean;
  excludeFromCleaning?: string[]; //Files or directories that will be ignored when cleaning the remote directory (can only specify the files or directories in the root directory)

  include: string[];
  exclude: string[];

  connection: DeployConnectionOptions;
  replace: boolean;

  logger?: (str: string) => void;
}

export const deploy = async (options: DeployOptions): Promise<void> => {
  const log = options.logger || (() => {});

  log(`Collecting information about files...`)

  const files = await listGlobFiles(options.sourcePath, options.include, options.exclude);

  log(`Found ${files.length} files.\n`);

  if(files.length == 0) {
    log(`Nothing to do.`);
    return;
  }

  const ftpClient = new FtpAsyncClient();

  log(`Initializing connection to ${options.connection.host}`);

  await ftpClient.connect({
    host: options.connection.host,
    user: options.connection.user,
    password: options.connection.password,
    port: options.connection.port,
  });

  log(`Connected to ${options.connection.host} as ${options.connection.user}\n`);

  const directoryExists = await ftpClient.dirExists(options.remotePath);

  if(!directoryExists) {
    log(`Remote directory ${options.remotePath} does not exist. Creating a directory`);
    await ftpClient.mkdir(options.remotePath, true);

  } else if(options.cleanRemoteDirectory) {
    const listedEntries = await ftpClient.list(options.remotePath);

    log(`Found ${listedEntries.length} entries in remote directory. Deleting...`)

    const lastWorkingDirectory = await ftpClient.pwd();
    await ftpClient.cwd(options.remotePath);

    for(const entry of listedEntries) {
      if(options.excludeFromCleaning?.some(value => value === entry.name)) {
        log(`Entry ${entry.name} is excluded. Skipping...`);
        continue;
      }

      if(entry.type == "d") {
        await ftpClient.rmdir(entry.name, true);
        log(`Remote directory ${path.join(options.remotePath, entry.name)} has been deleted`)
      } else {
        await ftpClient.rm(entry.name);
        log(`Remote file ${path.join(options.remotePath, entry.name)} has been deleted`)
      }
    }

    await ftpClient.cwd(lastWorkingDirectory);
  }

  log("");

  log("Starting file transfer...\n");

  for(const file of files) {
    const sourcePath = path.resolve(process.cwd(), options.sourcePath, file);
    const destinationPath = path.join(options.remotePath, file);

    log(`Transfering ${file} to ${destinationPath}`);

    if(!options.replace && await ftpClient.fileExists(destinationPath)) {
      log(`${destinationPath} already exists. skipping...\n`)
      continue;
    }

    const destinationDirname = path.dirname(destinationPath);
    await ftpClient.mkdir(destinationDirname, true);

    await ftpClient.putFile(sourcePath, destinationPath);
    log(`${file} has been successfully transfered\n`);
  }

  log("File transfer has been successfully finished!\n")
  log("Successful deploy! Disconnecting...")

  await ftpClient.close();

  log("Disconnected! Have a great day!")
};