import { deploy as deployWithAllOptions } from "./deploy";
import { DeployOptions } from "./interfaces";
import * as path from "path";

export { DeployConnectionOptions, DeployOptions } from "./interfaces";

const fullfillOptionsWithDefaults = (options: DeployOptions): Required<DeployOptions> => {
  const resultOptions = Object.assign({
    cleanRemoteDirectory: false,
    exclude: [] ,
    include: ["**/*"],
    excludeFromBackup: [],
    excludeFromCleaning: [],
    logger: () => {},
    replace: false,
    saveLocalBackups: false,
    saveRemoteBackups: false,
    backupsLocalDirectory: path.resolve(process.cwd(), "./deploy-backups/"),
    backupsRemoteDirectory: "backups"
  } as Required<Omit<DeployOptions, "connection" | "remotePath" | "sourcePath">>, options);

  if(resultOptions.saveRemoteBackups) {
    resultOptions.excludeFromCleaning.push(resultOptions.backupsRemoteDirectory);
    resultOptions.excludeFromBackup.push(path.join(resultOptions.backupsRemoteDirectory + "**/*"));
  }

  return resultOptions;
};

export const deploy = async (options: DeployOptions): Promise<void> => {
  const fullfilledOptions = fullfillOptionsWithDefaults(options);
  await deployWithAllOptions(fullfilledOptions);
};