import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { RemotionLayer, RemotionRenderProps } from "./contracts.js";
import { summarizeLayer } from "./template.js";

const h = React.createElement;

const styles = {
  root: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #050816 0%, #0f172a 45%, #111827 100%)",
    color: "#f8fafc",
    fontFamily: "Inter, system-ui, sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    padding: "48px",
    boxSizing: "border-box" as const,
    gap: "24px",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
  },
  titleBlock: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px",
    maxWidth: "72%",
  },
  title: {
    fontSize: "42px",
    fontWeight: 800,
    letterSpacing: "-0.04em",
    lineHeight: 1,
  },
  subtitle: {
    fontSize: "18px",
    color: "rgba(226,232,240,0.82)",
    lineHeight: 1.5,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "10px",
  },
  pill: {
    padding: "8px 12px",
    borderRadius: "999px",
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(148, 163, 184, 0.24)",
    fontSize: "13px",
    color: "#e2e8f0",
  },
  frameBadge: {
    padding: "14px 18px",
    borderRadius: "18px",
    background: "linear-gradient(180deg, rgba(34,197,94,0.18), rgba(15,23,42,0.78))",
    border: "1px solid rgba(34,197,94,0.25)",
    minWidth: "180px",
    textAlign: "right" as const,
  },
  frameLabel: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.14em",
    color: "rgba(167,243,208,0.72)",
  },
  frameValue: {
    fontSize: "28px",
    fontWeight: 800,
    marginTop: "4px",
  },
  body: {
    flex: 1,
    display: "grid",
    gridTemplateColumns: "1.35fr 0.85fr",
    gap: "24px",
    minHeight: 0,
  },
  panel: {
    borderRadius: "28px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(15, 23, 42, 0.72)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 24px 70px rgba(2, 6, 23, 0.45)",
    padding: "24px",
    minHeight: 0,
  },
  activeScene: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "20px",
    height: "100%",
  },
  activeHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },
  sceneKind: {
    fontSize: "14px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.14em",
    color: "#93c5fd",
  },
  sceneTitle: {
    fontSize: "34px",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    lineHeight: 1.02,
  },
  sceneBody: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "18px",
    minHeight: 0,
    flex: 1,
  },
  sceneCopy: {
    borderRadius: "22px",
    border: "1px solid rgba(96, 165, 250, 0.16)",
    background: "rgba(8, 15, 31, 0.78)",
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    minHeight: 0,
  },
  sceneMedia: {
    borderRadius: "22px",
    border: "1px solid rgba(96, 165, 250, 0.16)",
    background: "linear-gradient(180deg, rgba(14, 165, 233, 0.18), rgba(8, 15, 31, 0.88))",
    padding: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
    overflow: "hidden",
  },
  sceneImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    borderRadius: "18px",
  },
  detailLabel: {
    fontSize: "12px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "rgba(148, 163, 184, 0.84)",
    marginBottom: "6px",
  },
  detailText: {
    fontSize: "17px",
    lineHeight: 1.5,
    color: "#e2e8f0",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  tag: {
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(59, 130, 246, 0.16)",
    border: "1px solid rgba(59, 130, 246, 0.22)",
    fontSize: "12px",
    color: "#bfdbfe",
  },
  summaryList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    overflow: "auto",
    minHeight: 0,
  },
  summaryItem: {
    borderRadius: "18px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    background: "rgba(2, 6, 23, 0.58)",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  summaryItemActive: {
    border: "1px solid rgba(59, 130, 246, 0.5)",
    boxShadow: "0 0 0 1px rgba(59,130,246,0.18) inset",
    background: "rgba(30, 41, 59, 0.86)",
  },
  summaryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  },
  summaryType: {
    fontSize: "15px",
    fontWeight: 700,
  },
  summaryFrame: {
    fontSize: "12px",
    color: "rgba(226,232,240,0.72)",
  },
  summaryText: {
    fontSize: "14px",
    lineHeight: 1.45,
    color: "rgba(226,232,240,0.9)",
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    fontSize: "13px",
    color: "rgba(226,232,240,0.72)",
  },
};

const layerProgress = (frame: number, layer: RemotionLayer) => {
  const start = layer.start_frame;
  const end = layer.start_frame + layer.duration_frames;
  const duration = Math.max(1, end - start);
  const localFrame = Math.max(0, Math.min(frame - start, duration));
  return interpolate(localFrame, [0, duration * 0.16, duration * 0.84, duration], [0.15, 1, 1, 0.2], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
};

const sceneOpacity = (frame: number, layer: RemotionLayer) => {
  const start = layer.start_frame;
  const end = layer.start_frame + layer.duration_frames;
  const fadeIn = interpolate(frame, [start, start + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [Math.max(start + 12, end - 12), end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return Math.min(fadeIn, fadeOut);
};

const isSceneActive = (frame: number, layer: RemotionLayer) =>
  frame >= layer.start_frame && frame < layer.start_frame + layer.duration_frames;

export const VideoStudioComposition = (props: RemotionRenderProps) => {
  const frame = useCurrentFrame();
  const scenes = props.scenes.length > 0 ? props.scenes : [{
    id: "empty",
    type: "empty",
    order: 0,
    start_frame: 0,
    duration_frames: props.canvas?.total_frames || 90,
    fps: props.canvas?.fps || 30,
    content: { title: "No scenes supplied" },
    metadata: {},
  }];
  const activeScene = scenes.find((scene) => isSceneActive(frame, scene)) || scenes[0];
  const totalFrames = props.canvas?.total_frames || scenes.reduce((maxFrames, scene) => Math.max(maxFrames, scene.start_frame + scene.duration_frames), 0) || 90;
  const progress = Math.max(0, Math.min(frame / Math.max(1, totalFrames), 1));
  const activeSummary = summarizeLayer(activeScene);

  const activeCard = h(
    "div",
    {
      style: {
        ...styles.panel,
        ...styles.activeScene,
        opacity: sceneOpacity(frame, activeScene),
        transform: `scale(${layerProgress(frame, activeScene)})`,
      },
    },
    h(
      "div",
      { style: styles.activeHeader },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 } },
        h("div", { style: styles.sceneKind }, `${activeScene.type} | scene ${activeScene.order + 1}`),
        h("div", { style: styles.sceneTitle }, activeSummary.title),
        h("div", { style: styles.metaRow },
          h("span", { style: styles.pill }, `frame ${activeScene.start_frame} to ${activeScene.start_frame + activeScene.duration_frames}`),
          h("span", { style: styles.pill }, `fps ${activeScene.fps}`),
          h("span", { style: styles.pill }, `template ${props.template_key || "layer_composition"}`),
        ),
      ),
      h(
        "div",
        { style: styles.frameBadge },
        h("div", { style: styles.frameLabel }, "Progress"),
        h("div", { style: styles.frameValue }, `${Math.round(progress * 100)}%`),
      ),
    ),
    h(
      "div",
      { style: styles.sceneBody },
      h(
        "div",
        { style: styles.sceneCopy },
        h("div", null,
          h("div", { style: styles.detailLabel }, "Mensagem principal"),
          h("div", { style: styles.detailText }, activeSummary.title),
        ),
        activeSummary.subtitle ? h(
          "div",
          null,
          h("div", { style: styles.detailLabel }, "Suporte"),
          h("div", { style: styles.detailText }, activeSummary.subtitle),
        ) : null,
        h(
          "div",
          null,
          h("div", { style: styles.detailLabel }, "Estrutura"),
          h("div", { style: styles.detailText }, activeSummary.contentPreview),
        ),
        activeSummary.tags.length > 0 ? h(
          "div",
          null,
          h("div", { style: styles.detailLabel }, "Tags"),
          h("div", { style: styles.tagRow }, ...activeSummary.tags.map((tag) => h("span", { key: tag, style: styles.tag }, tag))),
        ) : null,
      ),
      h(
        "div",
        { style: styles.sceneMedia },
        activeSummary.mediaUrl
          ? h("img", {
            src: activeSummary.mediaUrl,
            alt: activeSummary.title,
            style: styles.sceneImage,
          })
          : h(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "10px", alignItems: "center", textAlign: "center", color: "rgba(226,232,240,0.76)" } },
            h("div", { style: { fontSize: "14px", letterSpacing: "0.12em", textTransform: "uppercase" } }, "No visual asset"),
            h("div", { style: { fontSize: "18px", fontWeight: 700, maxWidth: "28ch" } }, "The render is driven by structured layer JSON, not arbitrary TSX."),
          ),
      ),
    ),
  );

  return h(
    "div",
    { style: styles.root },
    h(
      "div",
      { style: styles.topBar },
      h(
        "div",
        { style: styles.titleBlock },
        h("div", { style: styles.title }, props.title),
        h("div", { style: styles.subtitle }, [
          props.composition_kind ? `Kind: ${props.composition_kind}` : "Guardrailed Remotion template",
          props.source_module ? `Source: ${props.source_module}` : "",
          props.metadata && typeof props.metadata === "object" && !Array.isArray(props.metadata) && "template_key" in props.metadata
            ? `Template: ${String((props.metadata as Record<string, unknown>).template_key)}`
            : "",
        ].filter(Boolean).join(" | ")),
        h(
          "div",
          { style: styles.metaRow },
          h("span", { style: styles.pill }, `Canvas ${props.canvas?.width || 1080}x${props.canvas?.height || 1080}`),
          h("span", { style: styles.pill }, `Frames ${totalFrames}`),
          h("span", { style: styles.pill }, `Scenes ${scenes.length}`),
        ),
      ),
      h(
        "div",
        { style: styles.frameBadge },
        h("div", { style: styles.frameLabel }, "Frame"),
        h("div", { style: styles.frameValue }, `${frame}`),
      ),
    ),
    h(
      "div",
      { style: styles.body },
      activeCard,
      h(
        "div",
        { style: styles.panel },
        h("div", { style: { display: "flex", flexDirection: "column", gap: "16px", minHeight: 0, height: "100%" } },
          h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" } },
            h("div", { style: { fontSize: "22px", fontWeight: 800 } }, "Scene Queue"),
            h("div", { style: styles.pill }, `mode ${props.render_mode || "auto"}`),
          ),
          h(
            "div",
            { style: styles.summaryList },
            ...scenes.map((scene) => {
              const summary = summarizeLayer(scene);
              const active = scene.id === activeScene.id;
              return h(
                "div",
                {
                  key: scene.id,
                  style: active ? { ...styles.summaryItem, ...styles.summaryItemActive } : styles.summaryItem,
                },
                h(
                  "div",
                  { style: styles.summaryHeader },
                  h("div", { style: styles.summaryType }, `${scene.type}`),
                  h("div", { style: styles.summaryFrame }, `${scene.start_frame} - ${scene.start_frame + scene.duration_frames}`),
                ),
                h("div", { style: styles.summaryText }, summary.title),
                summary.subtitle ? h("div", { style: { ...styles.summaryText, color: "rgba(148, 163, 184, 0.92)" } }, summary.subtitle) : null,
                summary.tags.length > 0 ? h("div", { style: styles.tagRow }, ...summary.tags.slice(0, 3).map((tag) => h("span", { key: tag, style: styles.tag }, tag))) : null,
              );
            }),
          ),
        ),
      ),
    ),
    h(
      "div",
      { style: styles.footer },
      h("div", null, `composition_id: ${String((props.metadata as Record<string, unknown>).composition_id || "video-studio-render")}`),
      h("div", null, "rendered by guardrailed template, no arbitrary TSX execution"),
    ),
  );
};
