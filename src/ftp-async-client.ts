import { ListingElement, Options as ConnectionOptions }from "ftp";
import FtpClient from "ftp";
import {open} from "fs/promises";
import {existsSync, fstatSync} from "fs";
import * as path from "path";

export class FtpAsyncClient {
  private _client: FtpClient;

  constructor() {
    this._client = new FtpClient();
  }

  public async connect(options: ConnectionOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this._client.on("ready", () => {
        resolve();
      });

      this._client.on("error", (err) => {
        reject(err);
      });

      this._client.on("end", () => {
        reject(new Error("Could not connect to the http client (connection end)"));
      });

      this._client.connect(options);
    });
  }

  public async close(): Promise<void> {
    return new Promise<void>((resolve) => {
      this._client.on("close", () => {
        resolve();
      });

      this._client.end();
    });
  }


  public async pwd(): Promise<string> {
    return new Promise((resolve, reject) => {
      this._client.pwd((err, path) => {
        if(err) reject(err);
        else resolve(path);
      });
    });
  }

  public async cwd(path: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      this._client.cwd(path, (err, curDir) => {
        if(err) reject(err);
        else resolve(curDir);
      });
    })
  }

  public async putFile(sourcePath: string, destinationPath: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if(!existsSync(sourcePath)) reject(new Error(`File ${sourcePath} does not exist`));

      const sourceFile = await open(sourcePath, "r");
      const stat = fstatSync(sourceFile.fd);

      if(stat.isDirectory())
        reject(new Error(`${sourcePath} is a directory, not a file`));

      const sourceFileBuffer = await sourceFile.readFile();

      this._client.put(sourceFileBuffer, destinationPath, (err) => {
        if(err) reject(err);
        else resolve();
      });

      await sourceFile.close();
    });
  }

  public async mkdir(path: string, recursively: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this._client.mkdir(path, recursively, (err) => {
        if(err) reject(err);
        else resolve();
      });
    });
  }

  public async fileExists(path: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._client.size(path, (err, size) => {
        if(err && (<any>err).code == 550) resolve(false);
        if(err) reject(err);
        resolve(size >= 0);
      });
    });
  }

  public async dirExists(path: string): Promise<boolean> {
    return new Promise(async (resolve, reject) => {
      const lastWorkingDirectory = await this.pwd();

      try {
        await this.cwd(path);
      } catch (err) {
        resolve(false);
      }

      await this.cwd(lastWorkingDirectory);
      resolve(true);
    });
  }

  public async list(path: string): Promise<ListingElement[]> {
    return new Promise((resolve, reject) => {
      this._client.list(path, (err, elements) => {
        if(err) reject(err);
        else resolve(elements);
      });
    });
  }

  private convertEntryNameToPath(rootPath: string, entryName: string): string {
    return path.join(rootPath, entryName);
  }

  public async listRecursively(dirPath: string): Promise<string[]> {
    const result = [] as string[];

    const entries = await this.list(dirPath);

    const fileEntries = entries.filter(entry => entry.type === "-");
    const dirEntries = entries.filter(entry => entry.type === "d");

    const filePaths = fileEntries.map<string>(entry => this.convertEntryNameToPath(dirPath, entry.name));

    result.push(...filePaths);

    for(const entry of dirEntries) {
      const entryPath = path.join(dirPath, entry.name);
      const entryFiles = await this.listRecursively(entryPath);

      result.push(...entryFiles);
    }

    return result;
  }

  public async rmdir(path: string, recursively: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this._client.rmdir(path, recursively, (err) => {
        if(err) reject(err);
        else resolve();
      })
    });
  }

  public async rm(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._client.delete(path, (err) => {
        if(err) reject(err);
        else resolve();
      });
    });
  }

  public async get(path: string): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
      this._client.get(path, async (err, stream) => {
        if(err) reject(err);
        resolve(stream);
      })
    });
  }
}