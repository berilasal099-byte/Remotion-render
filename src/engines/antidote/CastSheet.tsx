import React from "react";
import { AbsoluteFill } from "remotion";
import { Everyman } from "./characters/Everyman";
import { ANTIDOTE_FONT } from "./components/KineticText";
import type { Pose } from "./movements";
import type { VariantSpec } from "./schema";

/**
 * CastSheet — a living reference of what the parametric Everyman rig can look
 * like (hair / glasses / beard / gender / age / outfit combinations). Dev-only
 * composition; not part of any book. Add a combo here when you add a wardrobe
 * option, so the range stays visible at a glance.
 */
const STILL: Pose = { lean: 0, armL: 8, armR: -8, mouth: 0, browY: 0, headY: 0, blink: 0, gazeX: 0 };

type Cell = { label: string; v: Partial<VariantSpec> };
const D: VariantSpec = {
  skin: "#F2C79B", hair: "#3A2A22", suit: "#4E6E8E", shirt: "#FFFFFF", expression: "neutral",
  hairStyle: "short", glasses: false, beard: "none", gender: "m", age: "adult", outfit: "suit",
};

const CELLS: Cell[] = [
  { label: "classic suit", v: {} },
  { label: "casual + young", v: { outfit: "casual", suit: "#3E8E7E", age: "young", expression: "happy" } },
  { label: "glasses", v: { glasses: true, suit: "#6A5E8E" } },
  { label: "full beard", v: { beard: "full", hair: "#4A342A", suit: "#7A4A3A" } },
  { label: "older exec", v: { hairStyle: "bald", glasses: true, age: "old", hair: "#8C8378", suit: "#2E3A59", expression: "worried" } },
  { label: "woman · casual", v: { gender: "f", hairStyle: "long", hair: "#5A3A28", outfit: "casual", suit: "#C56B7A", expression: "happy" } },
  { label: "woman · uniform", v: { gender: "f", hairStyle: "bun", hair: "#241C16", outfit: "uniform", suit: "#3E5A7A" } },
  { label: "buzz · uniform", v: { hairStyle: "buzz", outfit: "uniform", suit: "#4A6B4E", hair: "#241C16" } },
  { label: "sage · robe", v: { outfit: "robe", hairStyle: "long", beard: "full", age: "old", hair: "#B9B2A6", skin: "#E7B489", suit: "#8A7A5E", expression: "neutral" } },
  { label: "friendly", v: { gender: "f", glasses: true, outfit: "casual", hairStyle: "long", hair: "#6B4A2E", suit: "#E0A23C", age: "young", expression: "happy" } },
];

const COLS = 5;
const CELL_W = 1920 / COLS;
const ROW_H = 440;

export const CastSheet: React.FC = () => (
  <AbsoluteFill style={{ background: "#F4EFE6", fontFamily: ANTIDOTE_FONT }}>
    <div style={{ position: "absolute", top: 34, left: 0, width: 1920, textAlign: "center", fontSize: 46, fontWeight: 800, color: "#1D3B57" }}>
      Antidote — Everyman cast (one rig, parametric)
    </div>
    {CELLS.map((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx = col * CELL_W + CELL_W / 2;
      const top = 150 + row * ROW_H;
      return (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: cx, top: top + 150, transform: "translate(-50%,-50%) scale(0.52)" }}>
            <Everyman variant={{ ...D, ...c.v }} pose={STILL} />
          </div>
          <div style={{ position: "absolute", left: cx, top: top + 360, width: CELL_W, transform: "translateX(-50%)", textAlign: "center", fontSize: 30, fontWeight: 700, color: "#3A4A57" }}>
            {c.label}
          </div>
        </React.Fragment>
      );
    })}
  </AbsoluteFill>
);
