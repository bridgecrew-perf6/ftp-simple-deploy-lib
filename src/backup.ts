import * as path from "path";
import * as fsAsync from "fs/promises";
import * as fs from "fs";
import rmfr from "rmfr";
import GlobToRegExp from "glob-to-regexp";

import AdmZip from "adm-zip";

import { DeployContext } from "./interfaces";

const saveStreamToFile = async (stream: NodeJS.ReadableStream, fileName: string): Promise<void> => {
  return new Promise((resolve) => {
    stream.once("close", () => {
      resolve();      
    });

    const writeStream = fs.createWriteStream(fileName);
    stream.pipe(writeStream);
  });
};

export const createBackups = async ({ftpClient, logFunction, options}: DeployContext): Promise<void> => {
  if(!options.saveLocalBackups && options.saveRemoteBackups)
    return;

  logFunction(`Creating temp directory for backup files`);

  const excludePatternsList = options.excludeFromBackup.map(value => {
    return GlobToRegExp(value);
  });

  const tempDir = path.resolve(process.cwd(), ".temp/ftp-simple-deploy-backups/");

  const localDir = options.backupsLocalDirectory;
  const remoteDir = path.join(options.remotePath, options.backupsRemoteDirectory);

  logFunction(`Listing files to backup...`);

  const files = await ftpClient.listRecursively(options.remotePath);

  const savedFiles = [] as string[];

  logFunction(`Found ${Object.keys(files).length} files. Downloading...\n`);

  for(const remoteFilePath of files) {
    const relativeFilePath = path.relative(options.remotePath, remoteFilePath);

    if(excludePatternsList.some(value => {
      return value.test(relativeFilePath);
    })) {
      logFunction(`File ${remoteFilePath} is ignored... skipping...`);
      continue;
    }

    logFunction(`Downloading ${remoteFilePath}...`);

    const tempFilePath = path.join(tempDir, relativeFilePath);
    const tempFileDirPath = path.dirname(tempFilePath);


    await fsAsync.mkdir(tempFileDirPath, {
      recursive: true
    }); 

    const stream = await ftpClient.get(remoteFilePath);
    await saveStreamToFile(stream, tempFilePath);

    savedFiles.push(relativeFilePath);
    logFunction(`${remoteFilePath} has been successfully downloaded...\n`);
  }

  logFunction(`Creating backup zip archive...`);
  const zip = new AdmZip();

  for(const fileToArchive of savedFiles) {
    const file = await fsAsync.readFile(path.join(tempDir, fileToArchive));
    zip.addFile(fileToArchive, file);
  }

  const tempBackupFilePath = path.join(tempDir, "backup.zip");
  await zip.writeZipPromise(tempBackupFilePath);

  const backupFileName = `backup_${Date.now()}.zip`;

  logFunction(`A backup zip archive has been successfully created\n`);

  if(options.saveRemoteBackups) {
    logFunction(`Saving zip backup file to server...`);

    const serverPath = path.join(remoteDir, backupFileName);

    await ftpClient.mkdir(remoteDir, true);
    await ftpClient.putFile(tempBackupFilePath, serverPath);

    logFunction(`Backup has been saved to ${serverPath}...\n`);
  }

  if(options.saveLocalBackups) {
    const backupFilePath = path.join(localDir, backupFileName);

    logFunction(`Saving local backup...`);

    fsAsync.mkdir(localDir, {recursive: true});
    fsAsync.copyFile(tempBackupFilePath, backupFilePath);

    logFunction(`Local backup has been successfully saved to ${backupFilePath}\n`);
  }

  logFunction(`Backups have been successfully created`);

  await rmfr(tempDir);
};