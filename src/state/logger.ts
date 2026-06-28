import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export async function appendLog(logPath: string, message: string): Promise<void> {
  await mkdir(dirname(logPath), { recursive: true });
  await appendFile(logPath, `${new Date().toISOString()} ${message}\n`, "utf8");
}
