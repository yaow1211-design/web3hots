import { readFile } from "node:fs/promises";
import { join } from "node:path";
import dotenv from "dotenv";
import type { AppConfig } from "../domain/types.js";
import { defaultConfigSchema, envSchema, miaConfigSchema } from "./schemas.js";

export async function loadConfig(options: { rootDir?: string; miaConfigPath?: string; envPath?: string } = {}): Promise<AppConfig> {
  const rootDir = options.rootDir ?? process.cwd();
  const envPath = options.envPath ?? join(rootDir, ".env");
  const miaConfigPath = options.miaConfigPath ?? join(rootDir, "config", "mia.json");
  const defaultConfigPath = join(rootDir, "config", "default.json");

  const parsedEnv = dotenv.parse(await readFile(envPath, "utf8"));
  const env = envSchema.parse(parsedEnv);
  const defaultConfig = defaultConfigSchema.parse(JSON.parse(await readFile(defaultConfigPath, "utf8")));
  const mia = miaConfigSchema.parse(JSON.parse(await readFile(miaConfigPath, "utf8")));

  return { rootDir, env, defaultConfig, mia };
}
