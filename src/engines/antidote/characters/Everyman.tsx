import React from "react";
import type { VariantSpec } from "../schema";
import type { Pose } from "../movements";

/**
 * Everyman — a flat-vector, rigged, PARAMETRIC character in the Antidote style.
 *
 * One rig → a whole cast. `variant` drives colors, face, and a small wardrobe:
 * hairStyle · glasses · beard · gender presentation · age · outfit. All motion is
 * transform-driven (arms rotate at the shoulder, head bobs, mouth flaps) so
 * animating is free and the character stays perfectly consistent scene-to-scene.
 *
 * Special silhouettes (armored warrior, etc.) get their own rig when a book needs
 * one; this covers the everyday human cast. viewBox 400×600 (waist-up).
 */

export type Variant = VariantSpec;

const darken = (hex: string, amt = 0.8) => {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = Math.round(((n >> 16) & 255) * amt);
  const g = Math.round(((n >> 8) & 255) * amt);
  const b = Math.round((n & 255) * amt);
  return `rgb(${r},${g},${b})`;
};

// Expression → eyebrow shape (inner/outer y) + mouth curve. Smaller y = higher.
function face(expr: VariantSpec["expression"], mouth: number) {
  let browOuter = 102, browInner = 100;
  let mouthPath = "M176,214 Q200,220 224,214";
  switch (expr) {
    case "happy": browOuter = 98; browInner = 96; mouthPath = "M166,208 Q200,246 234,208"; break;
    case "sad": browOuter = 104; browInner = 92; mouthPath = "M176,226 Q200,206 224,226"; break;
    case "surprised": browOuter = 84; browInner = 82; mouthPath = "M188,214 Q200,214 212,214"; break;
    case "worried": browOuter = 103; browInner = 90; mouthPath = "M176,222 Q188,215 200,221 Q212,227 224,220"; break;
    default: break;
  }
  return { browOuter, browInner, mouthPath, open: Math.max(0, Math.min(1, mouth)), wide: expr === "surprised" };
}

const Hand: React.FC<{ cx: number; cy: number; skin: string; thumb?: 1 | -1 }> = ({ cx, cy, skin, thumb = 1 }) => (
  <g>
    <ellipse cx={cx} cy={cy} rx={18} ry={21} fill={skin} />
    <ellipse cx={cx + 15 * thumb} cy={cy - 8} rx={7} ry={10} fill={skin} transform={`rotate(${25 * thumb} ${cx + 15 * thumb} ${cy - 8})`} />
  </g>
);

// ── wardrobe: torso by outfit ───────────────────────────────────────────────
const Torso: React.FC<{ outfit: VariantSpec["outfit"]; suit: string; shirt: string }> = ({ outfit, suit, shirt }) => {
  const dark = darken(suit, 0.82);
  const base = <path d="M60,600 L92,320 Q200,268 308,320 L340,600 Z" fill={suit} />;
  if (outfit === "casual") {
    return (<g>{base}<path d="M166,298 Q200,332 234,298 L230,300 Q200,326 170,300 Z" fill={dark} /></g>);
  }
  if (outfit === "uniform") {
    return (
      <g>
        {base}
        <path d="M168,300 L200,388 L232,300 Z" fill={shirt} />
        <rect x={196} y={300} width={8} height={150} fill={dark} />
        <circle cx={200} cy={356} r={5} fill={dark} />
        <circle cx={200} cy={402} r={5} fill={dark} />
        <rect x={250} y={314} width={56} height={14} rx={4} fill={dark} />
        <rect x={94} y={314} width={56} height={14} rx={4} fill={dark} />
      </g>
    );
  }
  if (outfit === "robe") {
    return (
      <g>
        {base}
        <path d="M92,320 Q150,300 200,302 L200,600 L118,600 Z" fill={darken(suit, 0.9)} />
        <path d="M308,320 Q250,300 200,302 L200,600 L282,600 Z" fill={suit} />
        <path d="M200,302 L172,360 L200,418 L228,360 Z" fill={shirt} />
      </g>
    );
  }
  // suit (default)
  return (
    <g>
      {base}
      <path d="M168,300 L200,392 L232,300 Z" fill={shirt} />
      <path d="M168,300 L150,336 L182,352 Z" fill={dark} />
      <path d="M232,300 L250,336 L218,352 Z" fill={dark} />
      <path d="M192,312 L208,312 L214,430 L200,452 L186,430 Z" fill={darken(suit, 0.6)} />
    </g>
  );
};

// ── hair: behind-head layer (long/bun) + front hairline cap ──────────────────
const BackHair: React.FC<{ style: VariantSpec["hairStyle"]; color: string }> = ({ style, color }) => {
  if (style === "long")
    return <path d="M96,150 Q96,58 200,50 Q304,58 304,150 L310,340 Q300,250 292,150 Q292,94 200,90 Q108,94 108,150 Q100,250 90,340 Z" fill={color} />;
  if (style === "bun") return <circle cx={200} cy={58} r={30} fill={color} />;
  return null;
};
const FrontHair: React.FC<{ style: VariantSpec["hairStyle"]; color: string }> = ({ style, color }) => {
  if (style === "bald")
    return (<g fill={color}><path d="M108,152 Q104,124 118,116 Q120,140 130,154 Z" /><path d="M292,152 Q296,124 282,116 Q280,140 270,154 Z" /></g>);
  if (style === "buzz")
    return <path d="M112,150 Q114,74 200,70 Q286,74 288,150 Q288,114 200,110 Q112,114 112,150 Z" fill={color} opacity={0.9} />;
  // short / long / bun share the front cap
  return <path d="M106,150 Q108,52 200,48 Q292,52 294,150 Q294,92 200,88 Q106,92 106,150 Z" fill={color} />;
};

export const Everyman: React.FC<{ variant: Variant; pose: Pose; width?: number }> = ({ variant, pose, width = 400 }) => {
  const { skin, hair, suit, shirt, expression, hairStyle, glasses, beard, gender, age, outfit } = variant;
  const f = face(expression, pose.mouth);
  const eyeRy = f.wide ? 20 : 14;
  const lipColor = gender === "f" ? "#B5615A" : darken(skin, 0.5);
  const browCol = darken(hair === "#FFFFFF" || hair.toLowerCase() === "#fff" ? "#9a9a9a" : hair, 0.75);
  const beardCol = darken(hair, 0.85);

  return (
    <svg width={width} height={width * 1.5} viewBox="0 0 400 600" style={{ overflow: "visible" }}>
      <g transform={`rotate(${pose.lean} 200 560)`}>
        {/* arms behind torso */}
        <g transform={`rotate(${pose.armL} 96 322)`}>
          <rect x={78} y={318} width={36} height={168} rx={18} fill={suit} />
          <Hand cx={96} cy={498} skin={skin} thumb={-1} />
        </g>
        <g transform={`rotate(${pose.armR} 304 322)`}>
          <rect x={286} y={318} width={36} height={168} rx={18} fill={suit} />
          <Hand cx={304} cy={498} skin={skin} thumb={1} />
        </g>

        <Torso outfit={outfit} suit={suit} shirt={shirt} />

        {/* neck */}
        <rect x={178} y={244} width={44} height={54} rx={16} fill={darken(skin, 0.92)} />

        {/* head */}
        <g transform={`translate(0 ${pose.headY})`}>
          <BackHair style={hairStyle} color={hair} />
          <ellipse cx={112} cy={158} rx={14} ry={20} fill={skin} />
          <ellipse cx={288} cy={158} rx={14} ry={20} fill={skin} />
          <ellipse cx={200} cy={150} rx={92} ry={104} fill={skin} />
          <FrontHair style={hairStyle} color={hair} />

          {/* beard (under mouth, over jaw) */}
          {beard === "stubble" && (
            <path d="M130,166 Q140,244 200,252 Q260,244 270,166 Q250,214 200,218 Q150,214 130,166 Z" fill={beardCol} opacity={0.24} />
          )}
          {beard === "full" && (
            <g fill={beardCol}>
              <path d="M126,158 Q136,250 200,258 Q264,250 274,158 Q252,220 200,222 Q148,220 126,158 Z" />
              <path d="M176,196 Q200,188 224,196 Q212,206 200,206 Q188,206 176,196 Z" />
            </g>
          )}

          {/* eyebrows */}
          <g transform={`translate(0 ${pose.browY})`} stroke={browCol} strokeWidth={6} strokeLinecap="round">
            <line x1={150} y1={f.browOuter} x2={186} y2={f.browInner} />
            <line x1={250} y1={f.browOuter} x2={214} y2={f.browInner} />
          </g>

          {/* eyes — blink squashes the whites; gaze offsets the pupils */}
          {(() => {
            const blinkRy = eyeRy * (1 - pose.blink * 0.92); // nearly shut at blink=1
            const pupilDx = (pose.gazeX ?? 0) * 6; // ±6px max offset
            const pupilDy = Math.abs(pose.gazeX ?? 0) * 1.2; // pupils drop slightly at extremes
            // Eyelid: a skin-colored arc that covers the top of the eye during blinks
            const lidDrop = pose.blink * (eyeRy * 0.85);
            return (
              <>
                {/* whites */}
                <ellipse cx={168} cy={132} rx={15} ry={blinkRy} fill="#FFFFFF" />
                <ellipse cx={232} cy={132} rx={15} ry={blinkRy} fill="#FFFFFF" />
                {/* pupils — hidden when fully blinked */}
                {pose.blink < 0.85 && (
                  <>
                    <circle cx={170 + pupilDx} cy={134 + pupilDy} r={7} fill="#26241F" />
                    <circle cx={234 + pupilDx} cy={134 + pupilDy} r={7} fill="#26241F" />
                  </>
                )}
                {/* eyelids — skin-colored arcs that sweep down during blinks */}
                {pose.blink > 0.05 && (
                  <>
                    <ellipse cx={168} cy={132 - eyeRy + lidDrop} rx={17} ry={lidDrop * 0.7 + 2} fill={skin} />
                    <ellipse cx={232} cy={132 - eyeRy + lidDrop} rx={17} ry={lidDrop * 0.7 + 2} fill={skin} />
                  </>
                )}
              </>
            );
          })()}
          {gender === "f" && (
            <g stroke="#26241F" strokeWidth={3} strokeLinecap="round">
              <line x1={154} y1={124} x2={148} y2={120} />
              <line x1={246} y1={124} x2={252} y2={120} />
            </g>
          )}

          {/* glasses */}
          {glasses && (
            <g stroke="#2b2b2b" strokeWidth={5} fill="rgba(255,255,255,0.12)">
              <rect x={146} y={116} width={44} height={34} rx={12} />
              <rect x={210} y={116} width={44} height={34} rx={12} />
              <line x1={190} y1={132} x2={210} y2={132} />
            </g>
          )}

          {/* nose */}
          <path d="M198,150 Q192,178 202,180" fill="none" stroke={darken(skin, 0.8)} strokeWidth={5} strokeLinecap="round" />

          {/* age lines */}
          {age === "old" && (
            <g fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth={3} strokeLinecap="round">
              <path d="M150,102 Q200,96 250,102" />
              <path d="M168,188 Q160,206 168,222" />
              <path d="M232,188 Q240,206 232,222" />
            </g>
          )}

          {/* mouth */}
          {f.open > 0.05 && <ellipse cx={200} cy={216} rx={20} ry={2 + f.open * 15} fill="#7A3B3B" />}
          <path d={f.mouthPath} fill="none" stroke={lipColor} strokeWidth={gender === "f" ? 7 : 6} strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
};
