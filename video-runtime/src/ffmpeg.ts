import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);

export const runFfmpeg = async (args: string[]) => {
  return execFileAsync(config.ffmpegPath, args, {
    maxBuffer: 1024 * 1024 * 20,
  });
};

export const parseSilenceLog = (stderr: string, paddingMs: number) => {
  const entries: Array<{ start: number; end: number; removed: boolean }> = [];
  let currentStart: number | null = null;

  for (const line of stderr.split(/\r?\n/)) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/);
    const endMatch = line.match(/silence_end:\s*([0-9.]+)/);

    if (startMatch) {
      currentStart = Number(startMatch[1]);
    }
    if (endMatch && currentStart !== null) {
      const rawEnd = Number(endMatch[1]);
      const start = Math.max(0, currentStart - paddingMs / 1000);
      const end = Math.max(start, rawEnd + paddingMs / 1000);
      entries.push({ start, end, removed: false });
      currentStart = null;
    }
  }

  return entries;
};
