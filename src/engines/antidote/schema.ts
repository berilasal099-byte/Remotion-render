import { z } from "zod";

/**
 * Antidote engine — scene-JSON schema.
 *
 * A book = an ordered list of SCENES on a shared timeline (frames). Each scene
 * picks a SHOT (the framing), a BACKDROP (parallax set + texture), places
 * characters / motifs / kinetic text, and enters through a TRANSITION.
 *
 * Everything is data — no per-video code. New books = new JSON, same engine.
 *
 * Staging fields (character x/y/scale, text x/y/size) are OPTIONAL: when absent
 * the SHOT preset supplies them (see shots.ts). Older configs that carry explicit
 * numbers keep rendering exactly as before.
 */

export const enterAnim = z.enum(["fade", "left", "right", "up", "down", "pop", "none"]);
export type EnterAnim = z.infer<typeof enterAnim>;

export const charAction = z.enum(["idle", "talk", "point", "celebrate", "slump", "think"]);
export type CharAction = z.infer<typeof charAction>;

export const expression = z.enum(["neutral", "happy", "sad", "surprised", "worried"]);
export type Expression = z.infer<typeof expression>;

// ── SHOT GRAMMAR ────────────────────────────────────────────────────────────
// The framing vocabulary. Without it every scene was the identical waist-up
// figure at x=660 (163 of 181 scenes in clear-thinking). A shot decides where
// the cast stands, how big it reads, and where the kinetic copy lives.
export const shotName = z.enum([
  "wide", // full stage, small figure, environment reads
  "medium", // the classic waist-up presenter (legacy default)
  "closeUp", // face fills frame, copy beside it
  "twoShot", // two characters facing each other
  "overShoulder", // dark foreground shoulder + subject beyond
  "insert", // NO cast — a motif alone carries the beat (pattern interrupt)
  "split", // vertical split screen: before/after, this-vs-that
  "silhouette", // flat dark figure on a bright accent field, huge copy
  "lowAngle", // heroic: figure low and large, copy towering overhead
  "crowd", // the everyman multiplied — "most people…" beats
  "illustration", // a concrete SCENE ICON is the hero (a crash, a home, a lake…),
  //                a silhouette subject beside it — the beat's SUBJECT, not a metaphor
  "diorama", //     the subject is INSIDE the scene: a large environmental icon behind,
  //                a silhouette figure standing within it (in front of the home, at the grave…)
  "beforeAfter", // two scene icons + an arrow between — transformation / this-then-that
]);
export type ShotName = z.infer<typeof shotName>;

// ── TRANSITIONS ─────────────────────────────────────────────────────────────
// Each scene overlaps the previous one by `frames` and reveals itself across
// that window, so these are true transitions (the outgoing scene is still
// visible underneath) rather than hard cuts.
export const transitionType = z.enum([
  "cut", "dissolve", "wipeRight", "wipeLeft", "wipeUp",
  "whipLeft", "whipRight", "irisIn", "flash", "slideUp",
]);
export type TransitionType = z.infer<typeof transitionType>;
export const transitionSchema = z.object({
  type: transitionType.default("cut"),
  frames: z.number().default(10),
  color: z.string().optional(), // accent used by flash / whip streak / iris ring
});
export type TransitionSpec = z.infer<typeof transitionSchema>;
/**
 * Runtime fallback for configs written before the shot grammar existed — they
 * were plain hard cuts. Needed as a real constant (not just a schema default)
 * because Remotion hands `defaultProps` to the renderer WITHOUT parsing them.
 */
export const DEFAULT_TRANSITION: TransitionSpec = { type: "cut", frames: 0 };

// Styles the rig: flat-vector colors + face + a small parametric wardrobe so one
// rig yields a whole cast (hair, glasses, beard, presentation, age, outfit).
// (A raster-cutout rig can be added later without changing scenes — the rig
// field selects which renderer draws it.)
export const hairStyle = z.enum(["short", "buzz", "bald", "long", "bun"]);
export const beardStyle = z.enum(["none", "stubble", "full"]);
export const genderPresentation = z.enum(["m", "f"]);
export const ageStage = z.enum(["young", "adult", "old"]);
export const outfitStyle = z.enum(["suit", "casual", "uniform", "robe"]);

export const variantSchema = z.object({
  skin: z.string().default("#F2C79B"),
  hair: z.string().default("#3A2A22"),
  suit: z.string().default("#4E6E8E"), // primary garment color
  shirt: z.string().default("#FFFFFF"), // inner/accent color
  expression: expression.default("neutral"),
  hairStyle: hairStyle.default("short"),
  glasses: z.boolean().default(false),
  beard: beardStyle.default("none"),
  gender: genderPresentation.default("m"),
  age: ageStage.default("adult"),
  outfit: outfitStyle.default("suit"),
});
export type VariantSpec = z.infer<typeof variantSchema>;
const VARIANT_DEFAULT = {
  skin: "#F2C79B", hair: "#3A2A22", suit: "#4E6E8E", shirt: "#FFFFFF", expression: "neutral" as const,
  hairStyle: "short" as const, glasses: false, beard: "none" as const, gender: "m" as const, age: "adult" as const, outfit: "suit" as const,
};

// ── CAST BIBLE ──────────────────────────────────────────────────────────────
// Without this, the planner minted a brand-new stranger for every scene: 224
// character instances in clear-thinking, 224 distinct identities. A 45-minute
// film with no recurring face reads as stock clip-art, not as a story. Scenes
// now reference a ROLE and the look is resolved from one book-level bible, so
// restyling the whole cast is a single edit and faces actually come back.
export const castRole = z.enum(["narrator", "protagonist", "foil", "mentor", "extra"]);
export type CastRole = z.infer<typeof castRole>;

export const castMemberSchema = z.object({
  name: z.string().default(""), // for the author's benefit; never rendered
  variant: variantSchema,
});
export type CastMember = z.infer<typeof castMemberSchema>;
export const castSchema = z.record(castRole, castMemberSchema);
export type CastBible = Partial<Record<CastRole, CastMember>>;

/** Runtime fallback — Remotion hands defaultProps to the renderer unparsed. */
export const DEFAULT_VARIANT: VariantSpec = VARIANT_DEFAULT;

// A character instance placed in a scene. Staging is optional — the shot fills it in.
export const characterSchema = z.object({
  id: z.string(),
  rig: z.enum(["everyman"]).default("everyman"),
  /** Who this is. The look comes from meta.cast[role]; `variant` overrides it. */
  role: castRole.optional(),
  variant: variantSchema.optional(),
  /** Per-scene face, layered over the role's resting expression. */
  expression: expression.optional(),
  x: z.number().optional(), // center anchor (px, 1920×1080 stage)
  y: z.number().optional(),
  scale: z.number().optional(),
  flip: z.boolean().optional(),
  enter: enterAnim.default("fade"),
  action: charAction.default("idle"),
  silhouette: z.boolean().optional(), // flat dark cut-out (overShoulder / silhouette shots)
  crowd: z.number().optional(), // >1 → replicate into a depth-staggered crowd
});
export type CharacterSpec = z.infer<typeof characterSchema>;

// ── MOTIFS (props) ──────────────────────────────────────────────────────────
// The visual-metaphor library. Every entry actually draws something — the old
// coin/book/shape stubs returned null.
export const propType = z.enum([
  "moneyRain", "coin", "book", "arrow", "shape",
  "barChart", "lineGrowth", "balance", "ladder", "door", "clock",
  "maze", "spotlight", "counter", "orbit", "stack", "crack", "ripple", "summit",
  // ── SCENE ICONS ──────────────────────────────────────────────────────────
  // Concrete narrative nouns/events (not metaphors) — what a beat is literally
  // ABOUT. The director maps narration → a concept → one of these, and the
  // `illustration` shot makes it the hero. Priority set chosen by frequency
  // across the whole book catalog (home > family > star > heart > road > …).
  "home", "family", "star", "heart", "road", "storm", "school", "phone",
  "ledge", "medical", "grave", "notes", "water", "fire", "crash", "tree",
  // Phase 2 — next frequency tier across the catalog
  "work", "game", "war", "food", "city", "photo", "law", "mask", "key", "mirror",
]);
export type PropType = z.infer<typeof propType>;

export const propSchema = z.object({
  type: propType,
  x: z.number().default(960),
  y: z.number().default(540),
  scale: z.number().default(1),
  color: z.string().optional(),
  color2: z.string().optional(),
  value: z.number().optional(), // counter target / bar count / rung count
  label: z.string().optional(), // counter suffix ("%", "X", "M")
  enter: enterAnim.default("fade"),
  /** Frames after the scene starts. A motif should arrive with the idea it
   *  illustrates — a counter that finishes before the number is spoken is worse
   *  than no counter at all. */
  at: z.number().default(0),
  /**
   * The metaphor's ARC — what the motif DOES across the scene.
   *
   * Concept icons (Phase 1) put the beat's literal subject on screen, which
   * fixed "every beat is a talking head" but left the subject inert: a stone
   * that means "shame" just sat there. An arc gives the object the beat's own
   * movement — the stone GROWS, the wall CLOSES IN, the light RISES — so the
   * picture carries the meaning instead of merely naming it.
   *
   * Runs once over the scene, on top of the endless `ambient()` float.
   */
  arc: z.enum(["none", "grow", "shrink", "rise", "fall", "closein", "tilt"]).default("none"),
});
export type PropSpec = z.infer<typeof propSchema>;
export type PropArc = PropSpec["arc"];

// ── KINETIC COPY ────────────────────────────────────────────────────────────
// `box` / `outline` / `plain` are the original one-word stamps. The rest are
// PHRASE-level treatments: a callout is now 2–4 words, and a phrase that just
// pops in as one block wastes the beat — these reveal it the way it is spoken.
export const textStyle = z.enum([
  "box", // colored box stamp (the workhorse)
  "outline", // heavy stroke, for stats
  "plain", // bare type
  "reveal", // word by word, each springing in on a stagger
  "highlight", // plain type with an accent bar wiping in behind the last word
  "strike", // type with a stroke drawn through it — "not this"
  "stack", // words stacked vertically, each dropping in
  "marker", // hand-drawn highlighter stroke behind the text (organic, Vox-like)
]);
export type TextStyle = z.infer<typeof textStyle>;

export const textSchema = z.object({
  text: z.string(),
  x: z.number().optional(),
  y: z.number().optional(),
  style: textStyle.default("box"),
  color: z.string().default("#FFFFFF"),
  boxColor: z.string().default("#E23B57"),
  size: z.number().optional(),
  enter: enterAnim.default("pop"),
  at: z.number().default(0), // frames after the scene starts
});
export type TextSpec = z.infer<typeof textSchema>;

// ── BACKDROP ────────────────────────────────────────────────────────────────
// Flat color fields read as "template". A set gives depth (three parallax layers
// that drift against the camera) and a texture gives the frame its grain.
export const setName = z.enum(["none", "horizon", "office", "street", "room", "stage", "sky", "abstract"]);
export type SetName = z.infer<typeof setName>;
export const textureName = z.enum(["none", "grain", "dots", "rays", "grid"]);
export type TextureName = z.infer<typeof textureName>;

export const bgSchema = z.object({
  type: z.enum(["flat", "gradient"]).default("flat"),
  colors: z.array(z.string()).default(["#8FC0E8"]),
  set: setName.default("none"),
  texture: textureName.default("none"),
  accent: z.string().optional(), // set-furniture ink; defaults to a shade of colors[0]
  split: z.array(z.string()).optional(), // split shot: [leftColor, rightColor]
  // Which act of the director's color script produced this field. Metadata:
  // nothing renders it, but it makes the arc auditable in the config.
  act: z.enum(["setup", "tension", "turn", "resolution"]).optional(),
});
export type BgSpec = z.infer<typeof bgSchema>;

const numPair = z.tuple([z.number(), z.number()]);
export const cameraSchema = z.object({
  zoom: numPair.default([1, 1] as [number, number]), // [from, to]
  panX: numPair.default([0, 0] as [number, number]),
  panY: numPair.default([0, 0] as [number, number]),
  // a quick push-in synced to a beat (usually the kinetic callout's `at` frame)
  punch: z.object({ at: z.number(), amount: z.number().default(0.06) }).optional(),
});

export const sceneSchema = z.object({
  id: z.string(),
  fromFrame: z.number(),
  durationFrames: z.number(),
  /** The beat's literal SUBJECT, when it has one (e.g. "crash", "home", "ledge").
   *  Set by the director's concept lexicon / Claude; drives the illustration shot
   *  + scene icon. Advisory/telemetry — the icon itself lives in `props`. */
  concept: z.string().optional(),
  shot: shotName.default("medium"),
  transition: transitionSchema.default({ type: "cut", frames: 10 }),
  bg: bgSchema.default({ type: "flat", colors: ["#8FC0E8"], set: "none", texture: "none" }),
  camera: cameraSchema.default({ zoom: [1, 1], panX: [0, 0], panY: [0, 0] }),
  characters: z.array(characterSchema).default([]),
  props: z.array(propSchema).default([]),
  texts: z.array(textSchema).default([]),
});
export type SceneSpec = z.infer<typeof sceneSchema>;

// Word-timed captions (same shape as the Vox pipeline) — drives the subtitle band.
export const captionWordSchema = z.object({ w: z.string(), s: z.number(), e: z.number() });
export const captionSchema = z.object({
  text: z.string(),
  startFrame: z.number(),
  endFrame: z.number(),
  words: z.array(captionWordSchema).default([]),
});
export type CaptionSpec = z.infer<typeof captionSchema>;

// Thumbnail brief for the Antidote engine's own (flat-vector) thumbnail. Authored
// by Claude at art-direction time; the palette itself comes from book.json
// (BOOK_PALETTES in the generated registry), so only the book-specific staging
// lives here. `hook` must be book-specific AND original (≤4 words, not the title).
export const thumbMotif = z.enum(["risingBars", "arrowUp", "summit", "spark", "ring"]);
export const antidoteThumbnailSchema = z.object({
  hook: z.string(),
  variant: variantSchema.default(VARIANT_DEFAULT),
  action: charAction.default("celebrate"),
  expression: expression.default("happy"),
  motif: thumbMotif.default("risingBars"),
  layout: z.string().optional(),
});
export type AntidoteThumbnailBrief = z.infer<typeof antidoteThumbnailSchema>;

export const antidoteConfigSchema = z.object({
  meta: z.object({
    slug: z.string(),
    title: z.string(),
    author: z.string().default(""),
    fps: z.number().default(30),
    width: z.number().default(1920),
    height: z.number().default(1080),
    audio: z.string().optional(), // public-relative, e.g. audio/<slug>.m4a
    durationInFrames: z.number(),
    thumbnail: antidoteThumbnailSchema.optional(),
    /** The book's recurring cast; scenes reference these by role. */
    cast: castSchema.optional(),
  }),
  scenes: z.array(sceneSchema),
  captions: z.array(captionSchema).default([]),
});
export type AntidoteConfig = z.infer<typeof antidoteConfigSchema>;

export const antidoteBookSchema = z.object({ config: antidoteConfigSchema });
