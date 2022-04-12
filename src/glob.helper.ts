import glob from "glob";
import * as path from "path";

const globAsync = (pattern: string, options: glob.IOptions): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    glob(pattern, options, (err, matches) => {
      if(err) reject(err);
      else resolve(matches);
    });
  });
};

const globArray = async (patterns: string[], options: glob.IOptions): Promise<string[]> => {
  const result = [] as string[];

  for(const pattern of patterns) {
    const matches = await globAsync(pattern, options);
    result.push(...matches);
  }

  return result;
};

export const listGlobFiles = async (root: string, include: string[], exclude: string[]): Promise<string[]> => {
  const files = await globArray(include, {
    cwd: path.resolve(process.cwd(), root),
    nodir: true,
    ignore: exclude,
  });

  return files;
};