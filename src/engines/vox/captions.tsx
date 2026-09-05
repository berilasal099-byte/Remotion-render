import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Caption } from "./schema";
import { RED, HEADLINE } from "./palette";

export const CaptionLayer: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const active = captions.find((c) => frame >= c.startFrame && frame < c.endFrame);
  if (!active) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 60, zIndex: 55, pointerEvents: "none" }}>
      <div style={{ maxWidth: 1500, textAlign: "center", background: "rgba(26,26,26,0.88)", borderRadius: 12, padding: "16px 30px", display: "flex", flexWrap: "wrap", gap: "4px 14px", justifyContent: "center", boxShadow: `0 0 0 3px ${RED}` }}>
        {active.words.map((w, i) => {
          const spoken = frame >= w.s;
          const current = frame >= w.s && frame < w.e;
          return <span key={i} style={{ fontFamily: HEADLINE, fontWeight: 800, fontSize: 40, letterSpacing: 0.5, color: current ? RED : spoken ? "#fff" : "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>{w.w}</span>;
        })}
      </div>
    </AbsoluteFill>
  );
};
