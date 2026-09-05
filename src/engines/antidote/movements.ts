import { interpolate, spring, Easing } from "remotion";
import type { EnterAnim, CharAction } from "./schema";

/**
 * movements.ts — the reusable motion vocabulary of the Antidote engine.
 *
 * Everything is a pure function of the LOCAL frame (frames since the element
 * appeared) so it composes cleanly inside Sequences. Built on Remotion's
 * useCurrentFrame → interpolate/spring model. No per-video code lives here.
 */

export type Transform = { opacity: number; tx: number; ty: number; scale: number; rotate: number };
export const IDENTITY: Transform = { opacity: 1, tx: 0, ty: 0, scale: 1, rotate: 0 };

const sp = (frame: number, fps: number, cfg?: Parameters<typeof spring>[0]["config"], delay = 0) =>
  spring({ frame: frame - delay, fps, config: { damping: 14, mass: 0.7, stiffness: 120, ...cfg } });

// ── ENTER animations (fadeIn / slideIn / pop / …) ───────────────────────────
export function enter(anim: EnterAnim, frame: number, fps: number, delay = 0): Transform {
  const p = sp(frame, fps, undefined, delay); // 0→1 settle
  const f = Math.max(0, frame - delay);
  switch (anim) {
    case "fade":
      return { ...IDENTITY, opacity: interpolate(f, [0, 12], [0, 1], { extrapolateRight: "clamp" }) };
    case "left":
      return { ...IDENTITY, opacity: Math.min(1, p * 1.4), tx: interpolate(p, [0, 1], [-420, 0]) };
    case "right":
      return { ...IDENTITY, opacity: Math.min(1, p * 1.4), tx: interpolate(p, [0, 1], [420, 0]) };
    case "up":
      return { ...IDENTITY, opacity: Math.min(1, p * 1.4), ty: interpolate(p, [0, 1], [320, 0]) };
    case "down":
      return { ...IDENTITY, opacity: Math.min(1, p * 1.4), ty: interpolate(p, [0, 1], [-320, 0]) };
    case "pop": {
      const s = sp(frame, fps, { damping: 9, mass: 0.6, stiffness: 200 }, delay);
      return { ...IDENTITY, opacity: interpolate(f, [0, 6], [0, 1], { extrapolateRight: "clamp" }), scale: interpolate(s, [0, 1], [0.3, 1]) };
    }
    case "none":
    default:
      return IDENTITY;
  }
}

// gentle idle bob — every character breathes so nothing looks frozen
export const bob = (frame: number, amp = 6, period = 90) => Math.sin((frame / period) * Math.PI * 2) * amp;

// ── AMBIENT — the "nothing on screen is ever frozen" rule ───────────────────
/**
 * ambient(seed, frame) — a slow, endless, deterministic float applied to props
 * and backdrop layers.
 *
 * The rigs already breathe (bob/blink/gaze), but every MOTIF sat perfectly
 * still once its draw-in finished, which is what made a 7-15s scene read as a
 * slide with a person pasted on it. Kurzgesagt's real trick is not fast cuts —
 * it is that no element is ever static. This is that, for ~0 CPU: two sines
 * and a cosine per element, desynced by `seed` so nothing pulses in lockstep.
 *
 * Periods are mutually prime-ish (211/173/307 frames ≈ 7/5.8/10s at 30fps) so
 * the combined motion never visibly loops inside a scene.
 */
export function ambient(seed: number, frame: number, amp = 1): { ty: number; tx: number; rotate: number; scale: number } {
  const p = seed * Math.PI * 2; // phase offset — element `seed` is its index/id hash
  return {
    ty: Math.sin((frame / 211) * Math.PI * 2 + p) * 9 * amp,
    tx: Math.cos((frame / 307) * Math.PI * 2 + p * 1.7) * 5 * amp,
    rotate: Math.sin((frame / 173) * Math.PI * 2 + p * 0.6) * 0.9 * amp,
    scale: 1 + Math.sin((frame / 251) * Math.PI * 2 + p * 1.3) * 0.012 * amp,
  };
}

/**
 * arcOf — the metaphor's one-shot movement across a scene.
 *
 * `ambient()` keeps a motif alive; this makes it MEAN something. The curve runs
 * once over the scene's own length (eased, so it is a movement rather than a
 * slide) and composes multiplicatively with the ambient float.
 *
 * `local` is frames since the motif appeared; `span` is how long it has.
 */
export function arcOf(
  arc: "none" | "grow" | "shrink" | "rise" | "fall" | "closein" | "tilt" | undefined,
  local: number,
  span: number,
): { ty: number; scale: number; rotate: number; opacity: number } {
  const rest = { ty: 0, scale: 1, rotate: 0, opacity: 1 };
  if (!arc || arc === "none" || span <= 1) return rest;
  const t = interpolate(local, [0, span], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  switch (arc) {
    // the thing the beat is about becomes bigger than the person
    case "grow": return { ...rest, scale: 1 + t * 0.34 };
    // ...or drains away to nothing
    case "shrink": return { ...rest, scale: 1 - t * 0.3, opacity: 1 - t * 0.25 };
    case "rise": return { ...rest, ty: -t * 130, opacity: 0.75 + t * 0.25 };
    case "fall": return { ...rest, ty: t * 130, opacity: 1 - t * 0.2 };
    // the walls come in: bigger AND lower, so it crowds the frame
    case "closein": return { ...rest, scale: 1 + t * 0.42, ty: t * 46 };
    case "tilt": return { ...rest, rotate: t * 9 };
    default: return rest;
  }
}

// ── CHARACTER RIG poses — return part transforms the rig applies ─────────────
export type Pose = {
  lean: number; // torso rotate deg
  armL: number; // left arm rotate deg (0 = down at side)
  armR: number;
  mouth: number; // 0 closed → 1 open
  browY: number; // eyebrow offset px (expression accent)
  headY: number; // head bob px
  blink: number; // 0 open → 1 shut (quick close-open every ~3s)
  gazeX: number; // -1 far left → 0 center → +1 far right (pupil offset)
};
const BASE: Pose = { lean: 0, armL: 8, armR: -8, mouth: 0, browY: 0, headY: 0, blink: 0, gazeX: 0 };

/**
 * Deterministic blink cycle — a quick shut (4 frames) every ~97 frames (~3.2s
 * at 30fps). Uses a prime period so the pattern never aligns obviously with
 * other periodic motions (bob, sway). Double-blink every 3rd cycle for
 * naturalism.
 */
function blinkAt(frame: number): number {
  const PERIOD = 97;
  const cycle = Math.floor(frame / PERIOD);
  const inCycle = frame % PERIOD;
  // primary blink: frames 0-4
  if (inCycle <= 4) {
    return interpolate(inCycle, [0, 1.5, 2.5, 4], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  }
  // double-blink on every 3rd cycle: a second blink 10 frames after the first
  if (cycle % 3 === 0 && inCycle >= 10 && inCycle <= 13) {
    return interpolate(inCycle, [10, 11, 12, 13], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  }
  return 0;
}

export function pose(action: CharAction, frame: number, fps: number): Pose {
  const t = frame / fps;
  const blink = blinkAt(frame);
  switch (action) {
    case "talk": {
      // mouth flaps on a fast noisy cadence; tiny head bob
      const m = (Math.sin(frame * 0.8) * 0.5 + 0.5) * (Math.sin(frame * 0.37) * 0.4 + 0.6);
      // talkers look slightly off-center, drifting naturally
      const gazeX = Math.sin(frame * 0.03) * 0.35;
      return { ...BASE, mouth: m, headY: Math.sin(frame * 0.2) * 2, blink, gazeX };
    }
    case "point": {
      const p = spring({ frame, fps, config: { damping: 10, stiffness: 160 } });
      // gaze follows the pointing arm (right arm → look right)
      const gazeX = interpolate(p, [0, 1], [0, 0.7]);
      return { ...BASE, armR: interpolate(p, [0, 1], [-8, -105]), lean: interpolate(p, [0, 1], [0, 6]), blink, gazeX };
    }
    case "celebrate": {
      const up = spring({ frame, fps, config: { damping: 8, stiffness: 180 } });
      const j = Math.abs(Math.sin(t * 6)) * 10;
      return { ...BASE, armL: interpolate(up, [0, 1], [8, 150]), armR: interpolate(up, [0, 1], [-8, -150]), headY: -j, mouth: 0.5, blink, gazeX: 0 };
    }
    case "slump": {
      const d = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
      // slumped characters look down-left (withdrawn)
      return { ...BASE, lean: interpolate(d, [0, 1], [0, 10]), headY: interpolate(d, [0, 1], [0, 12]), armL: 4, armR: -4, browY: 3, blink, gazeX: -0.4 };
    }
    case "think": {
      // thinkers look up and to the left slowly
      const gazeX = -0.3 + Math.sin(frame * 0.02) * 0.2;
      return { ...BASE, armR: -70, lean: 3, headY: Math.sin(frame * 0.05) * 2, blink, gazeX };
    }
    case "idle":
    default: {
      // idle: slow gentle drift, eyes wander
      const gazeX = Math.sin(frame * 0.015) * 0.25;
      return { ...BASE, headY: bob(frame, 3, 120), lean: Math.sin(frame * 0.02) * 1.2, blink, gazeX };
    }
  }
}

// ── CAMERA — viewBox-style zoom/pan over the whole stage ────────────────────
export type CameraSpec = {
  zoom: [number, number];
  panX: [number, number];
  panY: [number, number];
  /** A quick push-in on a beat — usually the frame the kinetic callout lands. */
  punch?: { at: number; amount: number };
};

export function camera(spec: CameraSpec, frame: number, durationFrames: number) {
  const e = interpolate(frame, [0, Math.max(1, durationFrames)], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.ease),
  });
  // The drift: a slow, continuous move across the whole beat.
  let scale = interpolate(e, [0, 1], spec.zoom);
  // The punch: a sharp snap in that settles over ~14 frames. A slow zoom alone
  // is what made every scene feel like the same slide; the punch gives the
  // callout an impact frame.
  if (spec.punch) {
    const d = frame - spec.punch.at;
    if (d >= 0 && d <= 20) {
      const bump = interpolate(d, [0, 3, 20], [0, spec.punch.amount, 0], {
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.quad),
      });
      scale += bump;
    }
  }
  return {
    scale,
    x: interpolate(e, [0, 1], spec.panX),
    y: interpolate(e, [0, 1], spec.panY),
  };
}
