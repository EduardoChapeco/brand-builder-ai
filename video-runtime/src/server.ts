import express from "express";
import { Redis } from "ioredis";
import { assertConfig, config } from "./config.js";
import { executeJob } from "./jobs.js";
import { verifySignature } from "./signature.js";

assertConfig();

const app = express();
const redis = config.redisUrl ? new Redis(config.redisUrl) : null;

app.use(express.json({
  verify: (req, _res, buf) => {
    (req as express.Request & { rawBody?: string }).rawBody = buf.toString("utf-8");
  },
}));

app.get("/health", async (_req, res) => {
  const redisStatus = redis ? await redis.ping().catch(() => "down") : "disabled";
  res.json({
    ok: true,
    redis: redisStatus,
    ffmpeg: config.ffmpegPath,
  });
});

app.post("/internal/jobs/dispatch", async (req, res) => {
  const rawBody = (req as express.Request & { rawBody?: string }).rawBody || JSON.stringify(req.body || {});
  const timestamp = req.header("x-video-runtime-ts");
  const signature = req.header("x-video-runtime-signature");

  if (!verifySignature({
    secret: config.runtimeSecret,
    timestamp: timestamp || undefined,
    signature: signature || undefined,
    path: "/internal/jobs/dispatch",
    body: rawBody,
  })) {
    res.status(401).json({ error: "Invalid runtime signature." });
    return;
  }

  const jobId = typeof req.body?.job_id === "string" ? req.body.job_id : "";
  if (!jobId) {
    res.status(400).json({ error: "job_id is required." });
    return;
  }

  if (redis) {
    await redis.set(`video-job:${jobId}:dispatch`, new Date().toISOString(), "EX", 60 * 10).catch(() => null);
  }

  queueMicrotask(async () => {
    try {
      await executeJob(jobId);
      if (redis) {
        await redis.set(`video-job:${jobId}:status`, "completed", "EX", 60 * 30).catch(() => null);
      }
    } catch (error) {
      console.error("[video-runtime] job failed", jobId, error);
      if (redis) {
        await redis.set(`video-job:${jobId}:status`, "failed", "EX", 60 * 30).catch(() => null);
      }
    }
  });

  res.status(202).json({ accepted: true, job_id: jobId });
});

app.listen(config.port, () => {
  console.log(`[video-runtime] listening on :${config.port}`);
});
