import * as path from "path";
import { DeployContext } from "./interfaces";

const transferFile = async (file: string, {
  ftpClient, logFunction, options
}: DeployContext): Promise<void> => {
  const sourcePath = path.resolve(process.cwd(), options.sourcePath, file);
  const destinationPath = path.join(options.remotePath, file);

  logFunction(`Transfering ${file} to ${destinationPath}`);

  if(!options.replace && await ftpClient.fileExists(destinationPath)) {
    logFunction(`${destinationPath} already exists. skipping...\n`)
    return;
  }

  const destinationDirname = path.dirname(destinationPath);
  await ftpClient.mkdir(destinationDirname, true);

  await ftpClient.putFile(sourcePath, destinationPath);
  logFunction(`${file} has been successfully transfered\n`);
};

export const transferFiles = async (files: string[], context: DeployContext): Promise<void> => {
  for(const file of files) {
    await transferFile(file, context);
  }
};
