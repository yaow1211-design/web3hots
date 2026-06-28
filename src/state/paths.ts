import { join } from "node:path";

export interface RunPaths {
  runDir: string;
  coreJson: string;
  coreMarkdown: string;
  socialJson: string;
  socialMarkdown: string;
}

export function getRunPaths(rootDir: string, date: string): RunPaths {
  const runDir = join(rootDir, "runs", date);
  return {
    runDir,
    coreJson: join(runDir, "core.json"),
    coreMarkdown: join(runDir, "core.md"),
    socialJson: join(runDir, "social-pack.json"),
    socialMarkdown: join(runDir, "social-pack.md")
  };
}
