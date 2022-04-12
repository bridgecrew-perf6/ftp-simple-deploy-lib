import { DeployContext } from "./interfaces";
import * as path from "path";

export const cleanDeployDirectory = async ({ftpClient, logFunction, options}: DeployContext): Promise<void> => {
  const listedEntries = await ftpClient.list(options.remotePath);

  logFunction(`Found ${listedEntries.length} entries in remote directory. Deleting...`)

  const lastWorkingDirectory = await ftpClient.pwd();
  await ftpClient.cwd(options.remotePath);

  for(const entry of listedEntries) {
    if(options.excludeFromCleaning.some(value => value === entry.name)) {
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
};