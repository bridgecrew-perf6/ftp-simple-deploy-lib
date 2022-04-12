import { FtpAsyncClient } from "./ftp-async-client";

export type LogFunction = (str: string) => void;

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

export interface DeployContext {
  options: Required<DeployOptions>;
  ftpClient: FtpAsyncClient;
  logFunction: LogFunction;
}
