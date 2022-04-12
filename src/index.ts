import {deploy as deployWithAllOptions} from "./deploy";
import { DeployOptions } from "./interfaces";

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
  await deployWithAllOptions(fullfilledOptions);
};