import { createBackups } from "./backup";
import { cleanDeployDirectory } from "./cleanDeployDirectory";
import { FtpAsyncClient } from "./ftp-async-client";
import { listGlobFiles } from "./glob.helper";

import { DeployContext, DeployOptions } from "./interfaces";
import { transferFiles } from "./transferFiles";

const prepareDeployDirectory = async (context: DeployContext): Promise<void> => {
  const { ftpClient, logFunction, options } = context;

  const directoryExists = await ftpClient.dirExists(options.remotePath);

  logFunction("Preparing deploy directory...");

  if(!directoryExists) {
    logFunction(`Remote directory ${options.remotePath} does not exist. Creating a directory`);
    await ftpClient.mkdir(options.remotePath, true);
  } else if(options.cleanRemoteDirectory) {
    logFunction("Cleaning deploy directory...\n");
    await cleanDeployDirectory(context);
  }
  
  logFunction("Deploy directory has been successfully prepared\n");
};

export const deploy = async (options: Required<DeployOptions>): Promise<void> => {
  const log = options.logger;

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

  const context: DeployContext = {
    ftpClient: ftpClient,
    logFunction: log,
    options: options
  };

  log(`Connected to ${options.connection.host} as ${options.connection.user}\n`);

  try {
    await createBackups(context);
  } catch (err) {
    log(`An error occurred when creating backups.`);
    await ftpClient.close();
    throw err;
  }

  try {
    await prepareDeployDirectory(context);
  } catch (err) {
    log(`An error occurred when preparing deploy directory.`);
    await ftpClient.close();
    throw err;
  }

  log("");

  log("Starting file transfer...\n");

  try {
    await transferFiles(files, context);
  } catch (err) {
    log(`An error occurred when transfering files.`);
    await ftpClient.close();
    throw err;
  }

  log("File transfer has been successfully finished!\n")
  log("Successful deploy! Disconnecting...")

  await ftpClient.close();

  log("Disconnected! Have a great day!")
}