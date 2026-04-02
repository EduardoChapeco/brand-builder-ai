import React from "react";
import { Composition, registerRoot } from "remotion";
import { REMOTION_COMPOSITION_ID } from "./constants.js";
import { RemotionRenderPropsSchema } from "./contracts.js";
import { VideoStudioComposition } from "./VideoStudioComposition.js";
import { buildRenderProps } from "./template.js";

const previewComposition = {
  id: "preview-composition",
  workspace_id: "preview-workspace",
  prompt_original: "",
  layers: [],
  canvas_width: 1080,
  canvas_height: 1080,
  status: "draft",
  metadata: {},
};

const calculateMetadata = (({ props }: { props: Record<string, unknown> }) => {
  const renderProps = buildRenderProps(previewComposition, RemotionRenderPropsSchema.parse(props || {}));

  return {
    width: renderProps.canvas?.width || 1080,
    height: renderProps.canvas?.height || 1080,
    fps: renderProps.canvas?.fps || 30,
    durationInFrames: renderProps.canvas?.total_frames || 90,
    props: renderProps,
  };
}) as any;

const Root: React.FC = () =>
  React.createElement(Composition, {
    id: REMOTION_COMPOSITION_ID,
    component: VideoStudioComposition,
    width: 1080,
    height: 1080,
    fps: 30,
    durationInFrames: 90,
    calculateMetadata,
  });

registerRoot(Root);
