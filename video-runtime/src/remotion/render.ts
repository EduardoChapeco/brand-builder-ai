import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { getRenderProgress, renderMediaOnLambda } from "@remotion/lambda-client";
import { getCompositions, renderMedia } from "@remotion/renderer";
import { config, getResolvedRemotionRenderMode } from "../config.js";

export type RenderFormat = "mp4" | "gif" | "webm";

export type MotionRenderInput = {
  compositionKey: string;
  inputProps: Record<string, unknown>;
  format: RenderFormat;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  jobId: string;
};

type LocalRenderResult = {
  mode: "local" | "lambda";
  outputFilePath: string;
  extension: string;
  mimeType: string;
  providerMetadata: Record<string, unknown>;
};

let cachedBundlePromise: Promise<string> | null = null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getCodecForFormat = (format: RenderFormat) => {
  if (format === "gif") return { codec: "gif" as const, extension: "gif", mimeType: "image/gif" };
  if (format === "webm") return { codec: "vp9" as const, extension: "webm", mimeType: "video/webm" };
  return { codec: "h264" as const, extension: "mp4", mimeType: "video/mp4" };
};

const ensureBundle = async () => {
  if (!cachedBundlePromise) {
    cachedBundlePromise = bundle({
      entryPoint: config.remotion.entryPoint,
      onProgress: () => undefined,
      webpackOverride: (currentConfiguration) => currentConfiguration,
    });
  }

  return cachedBundlePromise;
};

const renderLocally = async (input: MotionRenderInput): Promise<LocalRenderResult> => {
  const serveUrl = await ensureBundle();
  const compositions = await getCompositions(serveUrl, {
    inputProps: input.inputProps,
  });
  const composition = compositions.find((item) => item.id === input.compositionKey);

  if (!composition) {
    throw new Error(`Remotion composition ${input.compositionKey} nao esta registrada no bundle local.`);
  }

  const { codec, extension, mimeType } = getCodecForFormat(input.format);
  const outputFilePath = path.join(os.tmpdir(), `${input.jobId}-${randomUUID()}.${extension}`);

  await renderMedia({
    composition,
    serveUrl,
    codec,
    outputLocation: outputFilePath,
    inputProps: input.inputProps,
    overwrite: true,
    imageFormat: "png",
    logLevel: "error",
    chromiumOptions: {
      ignoreCertificateErrors: true,
    },
  });

  return {
    mode: "local",
    outputFilePath,
    extension,
    mimeType,
    providerMetadata: {
      serve_url: serveUrl,
      renderer: "local",
    },
  };
};

const renderOnLambda = async (input: MotionRenderInput): Promise<LocalRenderResult> => {
  if (!config.remotion.lambdaRegion || !config.remotion.lambdaFunctionName || !config.remotion.lambdaServeUrl) {
    throw new Error("Remotion Lambda requer region, functionName e serveUrl configurados.");
  }

  const { codec, extension, mimeType } = getCodecForFormat(input.format);
  const lambdaStart = await renderMediaOnLambda({
    region: config.remotion.lambdaRegion as never,
    functionName: config.remotion.lambdaFunctionName,
    serveUrl: config.remotion.lambdaServeUrl,
    composition: input.compositionKey,
    codec,
    inputProps: input.inputProps,
    forceWidth: input.width,
    forceHeight: input.height,
    forceFps: input.fps,
    forceDurationInFrames: input.durationInFrames,
    outName: `${input.jobId}.${extension}`,
    framesPerLambda: 40,
    concurrency: 4,
    privacy: "public",
    jpegQuality: 95,
    chromiumOptions: {
      ignoreCertificateErrors: true,
    },
  });

  const startedAt = Date.now();
  const timeoutMs = 1000 * 60 * 20;

  while (Date.now() - startedAt < timeoutMs) {
    const progress = await getRenderProgress({
      bucketName: lambdaStart.bucketName,
      functionName: config.remotion.lambdaFunctionName,
      renderId: lambdaStart.renderId,
      region: config.remotion.lambdaRegion as never,
    });

    if ("fatalErrorEncountered" in progress && progress.fatalErrorEncountered) {
      throw new Error(String(progress.errors?.[0] || "Remotion Lambda reportou erro fatal."));
    }

    if (progress.done) {
      if (!progress.outputFile) {
        throw new Error("Remotion Lambda concluiu sem outputFile.");
      }

      const response = await fetch(progress.outputFile);
      if (!response.ok) {
        throw new Error(`Falha ao baixar output do Remotion Lambda: ${response.status}`);
      }

      const buffer = new Uint8Array(await response.arrayBuffer());
      const outputFilePath = path.join(os.tmpdir(), `${input.jobId}-${randomUUID()}.${extension}`);
      await fs.writeFile(outputFilePath, buffer);

      return {
        mode: "lambda",
        outputFilePath,
        extension,
        mimeType,
        providerMetadata: {
          render_id: lambdaStart.renderId,
          bucket_name: lambdaStart.bucketName,
          output_file: progress.outputFile,
          renderer: "lambda",
        },
      };
    }

    await sleep(3000);
  }

  throw new Error("Timeout aguardando conclusao do Remotion Lambda.");
};

export const renderMotionComposition = async (input: MotionRenderInput): Promise<LocalRenderResult> => {
  const mode = getResolvedRemotionRenderMode();
  if (mode === "lambda") {
    return renderOnLambda(input);
  }

  return renderLocally(input);
};
