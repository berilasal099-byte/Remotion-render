#!/usr/bin/env node
/**
 * plan-antidote.js — VTT → a SCAFFOLD books/<slug>/config.antidote.json for the
 * Antidote engine (flat-vector characters + kinetic text + subtitles).
 *
 * It does the deterministic part — timing, scene segmentation, word-timed
 * captions, a first-guess scene type + placeholder character/text — so Claude
 * only has to ART-DIRECT (pick characters, expressions, actions, kinetic copy,
 * props) on top of a config that already renders. Same Claude-first split as the
 * Vox pipeline. NVIDIA is not involved.
 *
 * Usage:
 *   node scripts/plan-antidote.js --vtt=public/captions/<slug>.vtt --slug=<slug> \
 *     --title="Book" --author="Author" --genre=psychology [--until=<sec>] [--scene-secs=11]
 *
 * Callout copy (highest quality path — same shape as plan-vox --emit-beats):
 *   1) node scripts/plan-antidote.js --emit-beats=<file> ...same args...
 *   2) Claude rewrites each beat's `callout` in that file
 *   3) node scripts/plan-antidote.js --callouts=<file> ...same args...
 */
const fs = require("fs");
const { rel, abs, ensureBookDir, readManifest } = require("./lib/paths");
const { parseWords, buildCaptions } = require("./lib/vtt");
const { createDirector, classify: beatOf, SCENE_ICONS } = require("./lib/antidote-director");
const { createCopywriter } = require("./lib/antidote-copy");

const FPS = 30;
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const TITLE = args.title || "Untitled";
const AUTHOR = args.author || "";
const GENRE = (args.genre || "psychology").toLowerCase();
const SLUG = args.slug || slugify(TITLE);
const VTT = args.vtt || rel.vtt(SLUG);
const UNTIL = args.until ? parseFloat(args.until) : Infinity;
// Scene tempo. Was 11s -> ~115 scenes for a 29-min book (~15s of screen time
// each once durations run to the next scene's start), which is roughly double
// the reference channels (School of Life ~5-8s, Kurzgesagt ~3-5s). 6.5s lands
// in that band while still breaking on sentence ends. Antidote scenes are pure
// 2D SVG/CSS, so ~2x the scene count costs almost nothing to render.
const SCENE_SECS = args["scene-secs"] ? parseFloat(args["scene-secs"]) : 6.5;
// Claude handoff, mirroring plan-vox's --emit-beats/--designs pair:
//   --emit-beats=<file>  dump every beat (narration + shot + heuristic callout) and exit
//   --callouts=<file>    consume that file after Claude has rewritten the callouts
const EMIT_BEATS = args["emit-beats"] || null;
const CALLOUTS_IN = args.callouts || null;
// The authored art file (Claude-first). Each beat may carry a `callout` and/or a
// `concept` (the scene's literal subject → its icon). Kept raw as ART so the
// concept survives; CALLOUTS is the callout-only view the copy path consumes.
const ART = (() => {
  if (!CALLOUTS_IN) return null;
  const loaded = JSON.parse(fs.readFileSync(CALLOUTS_IN, "utf8"));
  return Array.isArray(loaded) ? loaded : loaded.beats || [];
})();
const CALLOUTS = ART
  // a beat may legitimately have no callout — null/"" means "leave this frame silent"
  ? ART.map((b) => (b && b.callout && b.callout.text ? b.callout : b && b.text ? b : null))
  : null;
const hasOwn = (o, k) => o && Object.prototype.hasOwnProperty.call(o, k);

const STOP = new Set("the a an an and or but so of to in on at for with as is are was were be been being it its this that these those we you they i he she him her his hers their theirs our ours your yours my mine me us them just like really very much more most about into from than then now here there what how why who whom when which while where whose not no yes can could would should will shall may might must do does did done have has had get got gets going gonna kind sort thing things stuff okay ok yeah right mean know think say said says one two also even still because though although if because whether than".split(/\s+/));
// vague intensifiers / pronoun-ish words that read as empty in a bold callout
const GENERIC = new Set("completely everything something anything nothing everyone someone anyone anybody everybody absolutely basically literally actually honestly obviously definitely essentially seriously totally really probably certainly generally usually suddenly simply exactly especially particularly unbelievable incredible amazing awesome pretty little".split(/\s+/));
// legacy helper still used by the thumbnail scaffold below
const emphasisWords = (text, n = 2) =>
  [...new Set(text.replace(/[^\w$%\s]/g, " ").split(/\s+/).filter((w) => w.length > 4 && !STOP.has(w.toLowerCase())))]
    .sort((a, b) => b.length - a.length).slice(0, n).map((w) => w.toUpperCase());

// ── WORD-LEVEL SYNC ─────────────────────────────────────────────────────────
// Callouts used to be stamped at a fixed `at: 22` (0.73s into the scene) while
// the phrase they quote was actually spoken a MEDIAN 3.3 SECONDS later (p90
// 13.6s, worst 17.5s) — only 16% landed within half a second of the word. That
// mismatch is what makes motion graphics feel like they belong to a different
// video than the voice. The VTT already carries per-word frame timings, so the
// fix is just to use them: find where the phrase is actually spoken and put the
// type there, a few frames early so it is already on screen as the word arrives.
const LEAD = 4; // frames the callout leads the spoken word
const MIN_HOLD = 40; // a callout must stay up at least this long, or it just flashes
const normw = (w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, "");
function anchorAt(scene, phrase, fallback, durationFrames) {
  if (!phrase || !scene.words || !scene.words.length) return fallback;
  const want = String(phrase).split(/\s+/).map(normw).filter(Boolean);
  if (!want.length) return fallback;
  const said = scene.words.map((w) => normw(w.w));
  let frame = -1;
  for (let i = 0; i + want.length <= said.length; i++) {
    if (want.every((w, k) => said[i + k] === w)) { frame = scene.words[i].s; break; }
  }
  if (frame < 0) { const i = said.indexOf(want[0]); if (i >= 0) frame = scene.words[i].s; }
  if (frame < 0) return fallback;
  const latest = Math.max(0, durationFrames - MIN_HOLD);
  return Math.max(0, Math.min(frame - scene.from - LEAD, latest));
}

// ── palette (book-specific, from book.json → drives bg + text + cast colors so
//    the Antidote video shares its book's color identity instead of a generic
//    blue/cream look). Falls back to a warm-neutral default. ────────────────
const hx = (h) => { const m = String(h).replace("#", ""); const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb = ([r, g, b]) => `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
const mixc = (h, to, a) => rgb(hx(h).map((c) => c + (to - c) * a));
const lighten = (h, a) => mixc(h, 255, a);
const darken = (h, a) => mixc(h, 0, a);
const PAL = (() => {
  const m = (readManifest(SLUG) || {}).palette;
  return m && m.paper ? m : { paper: "#EAE7DE", ink: "#1E1E22", red: "#D9603C", gold: "#C99A48" };
})();
// four LIGHT backgrounds tuned from the palette (characters + text read on them)
const BGS = [
  { type: "flat", colors: [lighten(PAL.paper, 0.25)] },
  { type: "gradient", colors: [lighten(PAL.paper, 0.4), PAL.paper] },
  { type: "gradient", colors: [lighten(PAL.gold, 0.62), lighten(PAL.paper, 0.2)] },
  { type: "gradient", colors: [lighten(PAL.red, 0.66), lighten(PAL.paper, 0.28)] },
];
// ── CAST BIBLE ──────────────────────────────────────────────────────────────
// The old planner did `CAST[(i + c) % CAST.length]`, minting a fresh stranger
// every scene: 224 character instances, 224 identities, zero continuity. Scenes
// now carry a ROLE and the look is resolved once, here, from the book palette —
// so the same protagonist walks through the whole film and restyling the cast is
// a single edit to meta.cast. Claude can rename and restyle these at
// art-direction; the engine only cares about the role keys.
const SEED = SLUG.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
// Lead presentation varies per book so the channel doesn't look like one series.
const LEAD_F = SEED % 2 === 1;
const CAST_BIBLE = {
  narrator: {
    name: "Narrator — talks to camera, frames every idea",
    variant: { skin: "#F2C79B", hair: "#3A2A22", suit: PAL.red, shirt: "#FFFFFF", hairStyle: "short", gender: "m", age: "adult", outfit: "casual", glasses: false, beard: "none", expression: "neutral" },
  },
  protagonist: {
    name: "The 'you' of the book — carries every lived beat",
    variant: { skin: "#E7B489", hair: "#2B2622", suit: darken(PAL.gold, 0.18), shirt: lighten(PAL.paper, 0.34), hairStyle: LEAD_F ? "long" : "short", gender: LEAD_F ? "f" : "m", age: "adult", outfit: "casual", glasses: false, beard: "none", expression: "neutral" },
  },
  foil: {
    name: "Whoever the protagonist is up against",
    variant: { skin: "#C98A5E", hair: "#241C16", suit: darken(PAL.ink, 0), shirt: lighten(PAL.paper, 0.3), hairStyle: LEAD_F ? "buzz" : "bun", gender: LEAD_F ? "m" : "f", age: "adult", outfit: "suit", glasses: false, beard: LEAD_F ? "stubble" : "none", expression: "neutral" },
  },
  mentor: {
    name: "Shows up on advice beats — older, calmer",
    variant: { skin: "#F0C9A0", hair: "#9A9A9A", suit: darken(PAL.red, 0.3), shirt: "#FFFFFF", hairStyle: "bald", gender: "m", age: "old", outfit: "suit", glasses: true, beard: "full", expression: "neutral" },
  },
  extra: {
    name: "Anonymous body — crowds, background roles",
    variant: { skin: "#DDA97C", hair: "#3B302A", suit: lighten(PAL.ink, 0.42), shirt: lighten(PAL.paper, 0.2), hairStyle: "buzz", gender: "m", age: "young", outfit: "uniform", glasses: false, beard: "none", expression: "neutral" },
  },
};

(() => {
  const vttText = fs.readFileSync(abs.vtt ? (fs.existsSync(VTT) ? VTT : abs.vtt(SLUG)) : VTT, "utf8");
  const words = parseWords(vttText);
  if (!words.length) { console.error("No words parsed from VTT: " + VTT); process.exit(1); }
  const captions = buildCaptions(words, FPS, UNTIL);
  if (!captions.length) { console.error("No captions built."); process.exit(1); }

  // segment captions into ~SCENE_SECS scenes, breaking at sentence ends
  const scenes = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const from = cur[0].startFrame;
    const end = cur[cur.length - 1].endFrame;
    const text = cur.map((c) => c.text).join(" ");
    // Keep the word-level timings with the scene: they're what lets a callout
    // land ON the word it quotes instead of at a fixed offset (see anchorAt).
    scenes.push({ from, end, text, words: cur.flatMap((c) => c.words || []) });
    cur = [];
  };
  for (const c of captions) {
    cur.push(c);
    const dur = (c.endFrame - cur[0].startFrame) / FPS;
    const endsSentence = /[.!?]$/.test(c.text);
    if (dur >= SCENE_SECS && endsSentence) flush();
    else if (dur >= SCENE_SECS * 1.6) flush();
  }
  flush();

  // crude sentiment → drives the character's action + expression so the everyman
  // reacts to the narration instead of idling through 180 scenes identically.
  const NEG = /\b(wrong|fail|failed|lose|lost|struggle|hard|fear|afraid|doubt|stuck|weak|worse|worst|mistake|quit|give up|can'?t|never|problem|pressure|anxious|worry)\b/i;
  const POS = /\b(win|won|grow|growth|better|best|succeed|success|achieve|potential|thrive|breakthrough|master|improve|proud|great|greater|rise|unlock)\b/i;
  const react = (text) => {
    const even = text.length % 2 === 0; // deterministic tiebreak (resume-safe)
    if (/\?\s*$/.test(text.trim()) || /\b(why|how|what if|imagine|consider)\b/i.test(text)) return { action: "think", expression: "surprised" };
    if (NEG.test(text)) return { action: even ? "slump" : "point", expression: "worried" };
    if (POS.test(text)) return { action: even ? "celebrate" : "point", expression: "happy" };
    return { action: "talk", expression: "neutral" };
  };

  // The DIRECTOR owns framing, transitions, backdrops and motifs (see
  // scripts/lib/antidote-director.js). The planner keeps what it is good at:
  // timing, cast continuity and the kinetic copy.
  const director = createDirector({ palette: PAL, genre: GENRE, slug: SLUG });
  // Callouts: Claude-authored when --callouts was given, heuristic otherwise.
  const copy = createCopywriter();

  const sceneSpecs = scenes.map((s, i) => {
    const next = scenes[i + 1];
    const durationFrames = (next ? next.from : s.end) - s.from;
    const isTitle = i === 0;
    const r = react(s.text);

    // ── kinetic copy first: the callout frame drives the camera punch ────────
    // Copy comes from Claude when a --callouts file was supplied, otherwise from
    // the copywriter heuristic. Either way a beat may legitimately get NO
    // callout — a silent frame lands harder than a weak word.
    const texts = [];
    let calloutAt = null;
    const authored = CALLOUTS ? CALLOUTS[i] : null;
    if (isTitle) {
      texts.push({ text: TITLE.toUpperCase(), style: "plain", color: PAL.ink, enter: "down", at: 6 });
      // With a --callouts file, Claude's `null` MEANS silence — never fall back to
      // the heuristic, or every deliberately silent beat gets a weak word stamped.
      const sub = CALLOUTS
        ? (authored ? authored.text : null)
        : (copy.write(s.text.replace(new RegExp(TITLE, "i"), ""), "title") || {}).text;
      if (sub) {
        const at = anchorAt(s, sub, 26, durationFrames);
        texts.push({ text: sub.toUpperCase(), style: "box", color: PAL.paper, boxColor: PAL.red, enter: "pop", at });
        calloutAt = at;
      }
    } else {
      const call = CALLOUTS ? authored : copy.write(s.text, beatOf(s.text));
      if (call && call.text) {
        const stat = call.style === "outline";
        // land the type on the word, not on the cut
        const at = anchorAt(s, call.text, 22, durationFrames);
        texts.push({
          text: String(call.text).toUpperCase(),
          style: call.style || "box",
          color: stat ? PAL.ink : call.style === "box" || call.style === "stack" ? PAL.paper : PAL.ink,
          boxColor: stat ? PAL.gold : PAL.red,
          enter: "pop",
          at,
        });
        calloutAt = at;
      }
    }
    // Staging (x / y / size) is intentionally omitted — the SHOT preset places
    // the copy, so re-directing a scene never means re-typing coordinates.

    // Claude-first: when the art file names a beat's `concept`, it wins (a string
    // forces that icon, null forces none); otherwise the director's lexicon reads
    // the subject from the narration.
    const d = director.direct({
      text: s.text, index: i, isTitle, calloutAt, total: scenes.length,
      concept: hasOwn(ART && ART[i], "concept") ? ART[i].concept : undefined,
    });

    // ── cast: roles, not looks. meta.cast resolves the face at render time ───
    const characters = [];
    for (let c = 0; c < d.cast.count; c++) {
      const role = d.cast.roles[c] || "extra";
      const isSecond = c > 0;
      characters.push({
        id: `c${i}-${c}`,
        rig: "everyman",
        role,
        expression: isTitle ? "happy" : isSecond ? (r.expression === "happy" ? "worried" : "neutral") : r.expression,
        enter: d.shot === "twoShot" || d.shot === "split" ? (c === 0 ? "left" : "right") : i % 2 === 0 ? "left" : "fade",
        action: isTitle ? "talk" : isSecond ? (r.action === "celebrate" ? "slump" : "idle") : r.action,
        ...(d.cast.crowd && c === 0 ? { crowd: d.cast.crowd } : {}),
      });
    }

    return {
      id: isTitle ? "intro" : `scene-${String(i).padStart(2, "0")}`,
      fromFrame: s.from,
      durationFrames: Math.max(FPS, durationFrames),
      _narration: s.text.slice(0, 160), // hint for Claude's art-direction; safe to delete
      _beat: d.class, // which beat class the director read; safe to delete
      _act: d.act, // where the color script places this beat; safe to delete
      ...(d.concept ? { concept: d.concept } : {}), // the beat's literal subject (icon)
      shot: d.shot,
      transition: d.transition,
      bg: d.bg,
      camera: d.camera,
      characters,
      // A motif illustrates the idea, so it should arrive with it. On the icon
      // shots (insert / illustration / diorama / beforeAfter) the icon IS the shot,
      // so keep the director's own `at` (0, or the beforeAfter stagger); otherwise
      // a metaphor motif leads the callout slightly. Firing every motif at scene
      // start meant a counter finished counting before the number was spoken.
      props: d.props.map((p) => ({
        ...p,
        at: ["insert", "illustration", "diorama", "beforeAfter"].includes(d.shot)
          ? (p.at ?? 0)
          : calloutAt != null ? Math.max(0, calloutAt - 8) : 12,
      })),
      texts,
    };
  });

  // ── Claude handoff: dump the beats and stop, so the copy can be authored ──
  // The heuristic copywriter is deliberate about scarcity, so many beats come
  // back with `callout: null` — that means "this frame stays silent", not "fill
  // me in". Claude should rewrite the weak ones and leave the quiet ones quiet.
  if (EMIT_BEATS) {
    const payload = {
      book: { slug: SLUG, title: TITLE, author: AUTHOR, genre: GENRE },
      instructions: [
        "Rewrite `callout.text` per beat: 2-4 words, concrete and loaded, in the viewer's second person where it fits.",
        "NEVER an abstract noun (ORGANIZATION / MANAGEMENT / INFORMATION). Prefer what a person can see, feel or do.",
        "Set callout to null when the beat has no hook worth stamping — silence is a valid, good choice.",
        "`style`: reveal (3-4 words) | highlight (2 words) | strike (a negation) | outline (a real stat) | box | stack.",
        "`concept`: the beat's LITERAL subject → a scene icon that gets shown instead of talking heads.",
        `  Allowed: ${SCENE_ICONS.join(", ")}. Set a string when the beat is really ABOUT that thing`,
        "  (a crash, a home, a lake, a wall of notes); set null to force talking heads; omit to let the",
        "  lexicon decide. Use sparingly and only when it's the true subject — a wrong icon is worse than none.",
        "Keep the array order and length. Then re-run plan-antidote with --callouts=<this file>.",
      ],
      beats: sceneSpecs.map((sc, i) => ({
        i,
        shot: sc.shot,
        beat: sc._beat,
        concept: sc.concept ?? null,
        narration: scenes[i].text,
        callout: sc.texts.length ? { text: sc.texts[sc.texts.length - 1].text, style: sc.texts[sc.texts.length - 1].style } : null,
      })),
    };
    fs.writeFileSync(EMIT_BEATS, JSON.stringify(payload, null, 2) + "\n");
    const filled = payload.beats.filter((b) => b.callout).length;
    console.log(`✓ ${EMIT_BEATS} — ${payload.beats.length} beat, ${filled} heuristik callout (${payload.beats.length - filled} sessiz)`);
    console.log(`  Claude callout'ları yeniden yazdıktan sonra:`);
    console.log(`  node scripts/plan-antidote.js --callouts=${EMIT_BEATS} --vtt=${VTT} --slug=${SLUG} --title="${TITLE}" --genre=${GENRE}`);
    return;
  }

  const durationInFrames = sceneSpecs.length ? sceneSpecs[sceneSpecs.length - 1].fromFrame + sceneSpecs[sceneSpecs.length - 1].durationFrames : 0;
  const audio = fs.existsSync(abs.audio(SLUG)) ? rel.audio(SLUG).replace(/^public\//, "") : undefined;

  // Thumbnail brief scaffold — Claude ART-DIRECTS the `hook` (≤4 words, book-specific
  // AND original, NOT the title) and may tune the variant/action/motif. The PALETTE
  // is NOT here: it lives in books/<slug>/book.json (BOOK_PALETTES) so the video and
  // thumbnail share one color identity. Registered as Thumb-<slug> when engine=antidote.
  let thumbnail = {
    hook: emphasisWords(TITLE, 2).join(" ") || TITLE.toUpperCase(),
    _needsClaudeRefine: true, // replace hook with an original ≤4-word book-specific line
    variant: { ...CAST_BIBLE.narrator.variant, expression: "happy", outfit: "casual" },
    action: "celebrate",
    expression: "happy",
    motif: "risingBars",
  };
  // Re-planning a book (new shot grammar, retimed VTT…) must never throw away a
  // hand-refined thumbnail brief — the baked PNG is built from it.
  if (fs.existsSync(abs.antidoteConfig(SLUG))) {
    try {
      const prev = JSON.parse(fs.readFileSync(abs.antidoteConfig(SLUG), "utf8"));
      const prevThumb = prev && prev.meta && prev.meta.thumbnail;
      if (prevThumb && !prevThumb._needsClaudeRefine) {
        thumbnail = prevThumb;
        console.log("↻ thumbnail brief korundu (elle rafine edilmiş): " + JSON.stringify(prevThumb.hook));
      }
    } catch { /* unreadable previous config — fall back to the scaffold */ }
  }

  const config = {
    meta: { slug: SLUG, title: TITLE, author: AUTHOR, fps: FPS, width: 1920, height: 1080, ...(audio ? { audio } : {}), durationInFrames, thumbnail, cast: CAST_BIBLE },
    scenes: sceneSpecs,
    captions,
  };

  // --out = test mode: write only the scaffold to a custom path, don't mutate the
  // real config.antidote.json or book.json.
  const outPath = args.out || null;
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(config, null, 2) + "\n");
    console.log(`✓ (test) ${outPath} — ${sceneSpecs.length} scene(s), ${captions.length} captions, ${(durationInFrames / FPS).toFixed(0)}s (book.json NOT touched)`);
    return;
  }

  ensureBookDir(SLUG);
  fs.writeFileSync(abs.antidoteConfig(SLUG), JSON.stringify(config, null, 2) + "\n");

  // book.json engine = antidote (source of truth for the pipeline)
  const man = readManifest(SLUG) || { slug: SLUG, title: TITLE, author: AUTHOR, genre: GENRE };
  man.engine = "antidote";
  fs.writeFileSync(abs.manifest(SLUG), JSON.stringify(man, null, 2) + "\n");

  console.log(`✓ ${rel.antidoteConfig(SLUG)} — ${sceneSpecs.length} scene(s), ${captions.length} captions, ${(durationInFrames / FPS).toFixed(0)}s`);
  console.log(`✓ ${rel.manifest(SLUG)} — engine: antidote`);
  console.log(`\n⚠  SCAFFOLD — CLAUDE ŞİMDİ ART-DIRECT ETMELİ (Claude-first, en kaliteli yol):`);
  console.log(`   Yönetmen kadraj/geçiş/dekor/motif'i zaten kurdu ("shot", "transition", "bg", "props").`);
  console.log(`   Claude'un işi: "_narration" + "_beat" ipuçlarına göre kinetik metni kitaba özgü YENİDEN YAZMAK,`);
  console.log(`   yanlış okunmuş beat'lerde "shot"u değiştirmek ve motif'i anlatıya oturtmak.`);
  console.log(`   Staging (x/y/size) bilerek boş — shot preset'i yerleştiriyor; sadece override gerekirse yaz.`);
  console.log(`   Sonra: node scripts/gen-books-registry.js`);
  console.log(`   Önizle: http://localhost:3001/Antidote-${SLUG}`);
})();
