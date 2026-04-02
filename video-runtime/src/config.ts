import fs from "node:fs";
import path from "node:path";

export const config = {
  port: Number(process.env.PORT || 8099),
  runtimeSecret: process.env.VIDEO_RUNTIME_SECRET || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  redisUrl: process.env.REDIS_URL || "",
  remotion: {
    renderMode: (process.env.VIDEO_RUNTIME_REMOTION_RENDER_MODE || "auto").toLowerCase(),
    entryPoint: process.env.VIDEO_RUNTIME_REMOTION_ENTRYPOINT || path.resolve(process.cwd(), "src/remotion/entrypoint.ts"),
    compositionId: process.env.VIDEO_RUNTIME_REMOTION_COMPOSITION_ID || "video-studio-render",
    outputBucket: process.env.VIDEO_RUNTIME_REMOTION_OUTPUT_BUCKET || "video-assets",
    lambdaRegion: process.env.VIDEO_RUNTIME_REMOTION_LAMBDA_REGION || "",
    lambdaFunctionName: process.env.VIDEO_RUNTIME_REMOTION_LAMBDA_FUNCTION_NAME || "",
    lambdaBucketName: process.env.VIDEO_RUNTIME_REMOTION_LAMBDA_BUCKET || "",
    lambdaServeUrl: process.env.VIDEO_RUNTIME_REMOTION_SERVE_URL || "",
    lambdaOutputBaseUrl: process.env.VIDEO_RUNTIME_REMOTION_OUTPUT_BASE_URL || "",
  },
};

const allowedRenderModes = new Set(["auto", "local", "lambda"]);

const hasLambdaCredentialSource = () => Boolean(
  (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  || process.env.AWS_PROFILE
  || process.env.AWS_WEB_IDENTITY_TOKEN_FILE
  || process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI
);

export const getResolvedRemotionRenderMode = () => (
  config.remotion.renderMode === "auto"
    ? (process.env.NODE_ENV === "production" ? "lambda" : "local")
    : config.remotion.renderMode
);

export const assertConfig = () => {
  if (!config.runtimeSecret) throw new Error("VIDEO_RUNTIME_SECRET is required.");
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }
  if (!allowedRenderModes.has(config.remotion.renderMode)) {
    throw new Error("VIDEO_RUNTIME_REMOTION_RENDER_MODE must be one of: auto, local, lambda.");
  }
  if (!fs.existsSync(config.remotion.entryPoint)) {
    throw new Error(`Remotion entrypoint not found: ${config.remotion.entryPoint}`);
  }
  if (getResolvedRemotionRenderMode() === "lambda") {
    if (!config.remotion.lambdaRegion) {
      throw new Error("VIDEO_RUNTIME_REMOTION_LAMBDA_REGION is required in lambda render mode.");
    }
    if (!config.remotion.lambdaFunctionName) {
      throw new Error("VIDEO_RUNTIME_REMOTION_LAMBDA_FUNCTION_NAME is required in lambda render mode.");
    }
    if (!config.remotion.lambdaServeUrl) {
      throw new Error("VIDEO_RUNTIME_REMOTION_SERVE_URL is required in lambda render mode.");
    }
    if (!hasLambdaCredentialSource()) {
      throw new Error("AWS credentials source not detected for Remotion Lambda render mode.");
    }
  }
};
