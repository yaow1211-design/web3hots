#!/usr/bin/env node
import { runDailyCore } from "./runner/dailyCore.js";
import { runDailySocialPack } from "./runner/dailySocialPack.js";

export async function main(argv: string[]): Promise<number> {
  const command = argv[2];

  if (command === "daily-core") {
    await runDailyCore();
    return 0;
  }

  if (command === "daily-social-pack") {
    await runDailySocialPack();
    return 0;
  }

  console.error("Usage: broadcast-bot daily-core | daily-social-pack");
  return 2;
}

main(process.argv)
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
    process.exitCode = 1;
  });
