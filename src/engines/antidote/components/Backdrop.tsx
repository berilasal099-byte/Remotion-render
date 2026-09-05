import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { BgSpec } from "../schema";

/**
 * Backdrop — the world behind the cast.
 *
 * A flat color field is what makes a 45-minute video read as "template". This
 * draws the background as THREE PARALLAX LAYERS (far / mid / near) that drift
 * against the camera at different rates, plus an optional frame texture. All of
 * it is vector + CSS gradients: no images, no WebGL, negligible CPU cost on a
 * GPU-less render box.
 */

// Backdrop colors arrive from the planner as `rgb(...)` strings (the color
// script composes them), so a hex-only parser here would silently no-op.
const parseColor = (c: string): [number, number, number] | null => {
  const s = String(c).trim();
  const m = s.match(/^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = s.replace("#", "");
  const full = t.length === 3 ? t.split("").map((ch) => ch + ch).join("") : t;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const shade = (color: string, amt: number) => {
  const rgb = parseColor(color);
  if (!rgb) return color;
  const to = amt < 0 ? 0 : 255;
  const a = Math.abs(amt);
  const [r0, g0, b0] = rgb;
  return `rgb(${Math.round(r0 + (to - r0) * a)},${Math.round(g0 + (to - g0) * a)},${Math.round(b0 + (to - b0) * a)})`;
};

type LayerProps = { ink: string; accent: string; frame: number };

// ── sets: [far, mid, near] renderers, drawn in a 1920×1080 viewBox ──────────
const SETS: Record<string, Array<React.FC<LayerProps>>> = {
  horizon: [
    ({ ink }) => (
      <g>
        <rect x={0} y={0} width={1920} height={640} fill={ink} opacity={0.06} />
        <circle cx={1520} cy={250} r={140} fill={ink} opacity={0.07} />
      </g>
    ),
    ({ ink }) => (
      <g fill={ink} opacity={0.13}>
        <path d="M-100,760 Q300,600 720,742 Q1100,868 1520,706 Q1760,614 2020,700 L2020,1080 L-100,1080 Z" />
      </g>
    ),
    ({ ink }) => <rect x={-100} y={906} width={2120} height={220} fill={ink} opacity={0.16} />,
  ],
  office: [
    ({ ink }) => (
      <g stroke={ink} strokeWidth={7} opacity={0.13} fill="none">
        <rect x={120} y={120} width={430} height={330} rx={10} />
        <line x1={335} y1={120} x2={335} y2={450} /><line x1={120} y1={285} x2={550} y2={285} />
        <rect x={1370} y={120} width={430} height={330} rx={10} />
        <line x1={1585} y1={120} x2={1585} y2={450} /><line x1={1370} y1={285} x2={1800} y2={285} />
      </g>
    ),
    ({ ink, accent }) => (
      <g opacity={0.18}>
        <rect x={1300} y={520} width={520} height={26} rx={8} fill={ink} />
        <rect x={1348} y={546} width={20} height={190} fill={ink} />
        <rect x={1752} y={546} width={20} height={190} fill={ink} />
        <rect x={1390} y={432} width={64} height={88} rx={6} fill={accent} />
        <rect x={1470} y={452} width={64} height={68} rx={6} fill={ink} />
        <rect x={100} y={560} width={210} height={22} rx={8} fill={ink} />
      </g>
    ),
    ({ ink }) => <rect x={-100} y={928} width={2120} height={200} fill={ink} opacity={0.14} />,
  ],
  street: [
    ({ ink }) => (
      <g fill={ink} opacity={0.1}>
        <rect x={60} y={330} width={190} height={560} /><rect x={280} y={430} width={150} height={460} />
        <rect x={470} y={250} width={210} height={640} /><rect x={1240} y={370} width={180} height={520} />
        <rect x={1450} y={280} width={230} height={610} /><rect x={1710} y={440} width={160} height={450} />
      </g>
    ),
    ({ ink, accent }) => (
      <g opacity={0.2}>
        <rect x={-40} y={640} width={300} height={280} fill={ink} />
        <rect x={1660} y={600} width={320} height={320} fill={ink} />
        <rect x={352} y={520} width={14} height={400} fill={ink} />
        <circle cx={359} cy={506} r={26} fill={accent} />
      </g>
    ),
    ({ ink }) => (
      <g>
        <rect x={-100} y={900} width={2120} height={220} fill={ink} opacity={0.2} />
        <g stroke={ink} strokeWidth={10} opacity={0.14}>
          {[0, 260, 520, 780, 1040, 1300, 1560, 1820].map((x) => <line key={x} x1={x} y1={952} x2={x + 130} y2={952} />)}
        </g>
      </g>
    ),
  ],
  room: [
    ({ ink, accent }) => (
      <g>
        <rect x={640} y={140} width={300} height={230} rx={8} fill="none" stroke={ink} strokeWidth={9} opacity={0.16} />
        <rect x={676} y={176} width={228} height={158} fill={accent} opacity={0.12} />
      </g>
    ),
    ({ ink, accent }) => (
      <g opacity={0.2}>
        <path d="M1560,470 L1720,470 L1770,600 L1510,600 Z" fill={accent} opacity={0.55} />
        <rect x={1630} y={600} width={18} height={300} fill={ink} />
        <rect x={1560} y={890} width={158} height={20} rx={8} fill={ink} />
        <rect x={150} y={700} width={430} height={200} rx={22} fill={ink} opacity={0.55} />
      </g>
    ),
    ({ ink }) => (
      <g>
        <rect x={-100} y={900} width={2120} height={220} fill={ink} opacity={0.15} />
        <rect x={-100} y={886} width={2120} height={20} fill={ink} opacity={0.25} />
      </g>
    ),
  ],
  stage: [
    ({ ink }) => (
      <g fill={ink} opacity={0.12}>
        {Array.from({ length: 14 }).map((_, i) => (
          <path key={i} d={`M${i * 150 - 40},0 Q${i * 150 + 34},400 ${i * 150 - 10},880 L${i * 150 + 62},880 Q${i * 150 + 106},400 ${i * 150 + 38},0 Z`} />
        ))}
      </g>
    ),
    ({ accent }) => (
      <g opacity={0.22}>
        <path d="M420,0 L640,0 L900,900 L200,900 Z" fill={accent} opacity={0.35} />
        <path d="M1280,0 L1500,0 L1720,900 L1020,900 Z" fill={accent} opacity={0.25} />
      </g>
    ),
    ({ ink }) => (
      <g>
        <ellipse cx={960} cy={950} rx={780} ry={80} fill={ink} opacity={0.1} />
        <rect x={-100} y={940} width={2120} height={180} fill={ink} opacity={0.2} />
      </g>
    ),
  ],
  sky: [
    ({ ink }) => <circle cx={1560} cy={220} r={170} fill={ink} opacity={0.08} />,
    ({ ink, frame }) => (
      <g fill={ink} opacity={0.14}>
        <g transform={`translate(${(frame * 0.28) % 2400 - 300} 0)`}>
          <ellipse cx={300} cy={280} rx={190} ry={72} /><ellipse cx={430} cy={252} rx={130} ry={62} />
        </g>
        <g transform={`translate(${(frame * 0.16) % 2400 - 700} 0)`}>
          <ellipse cx={1180} cy={430} rx={220} ry={80} /><ellipse cx={1330} cy={400} rx={140} ry={66} />
        </g>
      </g>
    ),
    ({ ink }) => (
      <g fill={ink} opacity={0.18}>
        <path d="M-100,940 Q400,860 900,930 Q1400,1000 2020,912 L2020,1120 L-100,1120 Z" />
      </g>
    ),
  ],
  abstract: [
    ({ accent, ink }) => (
      <g>
        <circle cx={330} cy={250} r={280} fill={accent} opacity={0.1} />
        <circle cx={1620} cy={820} r={340} fill={ink} opacity={0.07} />
      </g>
    ),
    ({ ink, frame }) => (
      <g stroke={ink} strokeWidth={26} opacity={0.08} strokeLinecap="round">
        {Array.from({ length: 7 }).map((_, i) => (
          <line key={i} x1={-200 + i * 330 + ((frame * 0.2) % 330)} y1={1180} x2={200 + i * 330 + ((frame * 0.2) % 330)} y2={-100} />
        ))}
      </g>
    ),
    ({ accent, frame }) => (
      <g fill={accent} opacity={0.22}>
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 140 + i * 205;
          const y = 700 + Math.sin(frame * 0.02 + i) * 46;
          return <circle key={i} cx={x} cy={y} r={9 + (i % 3) * 4} />;
        })}
      </g>
    ),
  ],
};

// ── textures: static CSS tiles, so they cost nothing per frame ──────────────
function textureStyle(texture: BgSpec["texture"], ink: string): React.CSSProperties | null {
  switch (texture) {
    case "grain":
      return {
        backgroundImage: `radial-gradient(${ink} 0.5px, transparent 0.6px)`,
        backgroundSize: "3px 3px",
        opacity: 0.11,
        mixBlendMode: "multiply",
      };
    case "dots":
      return {
        backgroundImage: `radial-gradient(${ink} 2.2px, transparent 2.4px)`,
        backgroundSize: "42px 42px",
        opacity: 0.09,
      };
    case "grid":
      return {
        backgroundImage: `linear-gradient(${ink} 1.5px, transparent 1.5px), linear-gradient(90deg, ${ink} 1.5px, transparent 1.5px)`,
        backgroundSize: "96px 96px",
        opacity: 0.08,
      };
    case "rays":
      return {
        backgroundImage: `repeating-conic-gradient(from 0deg at 50% -12%, ${ink} 0deg 3deg, transparent 3deg 9deg)`,
        opacity: 0.06,
      };
    default:
      return null;
  }
}

const Layer: React.FC<{ children: React.ReactNode; dx: number; dy: number; dz: number; blur?: number }> = ({ children, dx, dy, dz, blur = 0 }) => (
  <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px) scale(${dz})`, transformOrigin: "center", filter: blur > 0.1 ? `blur(${blur}px)` : undefined }}>
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style={{ overflow: "visible" }}>
      {children}
    </svg>
  </AbsoluteFill>
);

export const Backdrop: React.FC<{ bg: BgSpec; cam: { x: number; y: number; scale: number } }> = ({ bg, cam }) => {
  const frame = useCurrentFrame();
  const colors = bg.colors && bg.colors.length ? bg.colors : ["#8FC0E8"];
  const base =
    bg.type === "gradient" && colors.length >= 2
      ? `linear-gradient(180deg, ${colors[0]}, ${colors[colors.length - 1]})`
      : colors[0];
  const ink = bg.accent || shade(colors[colors.length - 1], -0.62);
  const accent = bg.accent || shade(colors[0], -0.35);
  const layers = SETS[bg.set] || null;
  const tex = textureStyle(bg.texture, ink);

  return (
    <AbsoluteFill>
      {/* split field: two color halves for the `split` shot */}
      {bg.split && bg.split.length >= 2 ? (
        <AbsoluteFill>
          <div style={{ position: "absolute", inset: 0, width: "50%", background: bg.split[0] }} />
          <div style={{ position: "absolute", inset: 0, left: "50%", width: "50%", background: bg.split[1] }} />
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 8, marginLeft: -4, background: ink, opacity: 0.45 }} />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ background: base }} />
      )}

      {layers ? (
        <>
          {/* Depth-of-field: far layer blurs most when the camera zooms in,
              mid gets light blur, near stays sharp — cinematic rack focus. */}
          {(() => {
            const zoomAmt = Math.max(0, cam.scale - 1); // 0 at rest, grows with zoom
            const farBlur = Math.min(6, zoomAmt * 18);    // up to 6px
            const midBlur = Math.min(2.5, zoomAmt * 7);   // up to 2.5px
            // AMBIENT PARALLAX — a camera at rest used to freeze the whole
            // backdrop. Each depth layer now breathes on its own slow, desynced
            // cycle, so the set keeps depth even in a locked-off shot. Far layer
            // moves most (it reads as distance), near layer barely at all.
            const amb = (period: number, phase: number, px: number) =>
              Math.sin((frame / period) * Math.PI * 2 + phase) * px;
            return (
              <>
                <Layer dx={cam.x * 0.22 + amb(263, 0, 14)} dy={cam.y * 0.22 + amb(197, 1.1, 8)} dz={1 + (cam.scale - 1) * 0.25} blur={farBlur}>
                  {React.createElement(layers[0], { ink, accent, frame })}
                </Layer>
                <Layer dx={cam.x * 0.55 + amb(211, 2.3, 8)} dy={cam.y * 0.55 + amb(179, 0.4, 5)} dz={1 + (cam.scale - 1) * 0.6} blur={midBlur}>
                  {React.createElement(layers[1], { ink, accent, frame })}
                </Layer>
                <Layer dx={cam.x * 0.88 + amb(307, 4.1, 4)} dy={cam.y * 0.88 + amb(233, 3.0, 3)} dz={1 + (cam.scale - 1) * 0.9}>
                  {React.createElement(layers[2], { ink, accent, frame })}
                </Layer>
              </>
            );
          })()}
        </>
      ) : null}

      {tex ? <AbsoluteFill style={tex} /> : null}
      {/* a soft vignette keeps the eye centered and stops flat fields reading as slides */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 52%, rgba(0,0,0,0.16) 100%)" }} />
    </AbsoluteFill>
  );
};
