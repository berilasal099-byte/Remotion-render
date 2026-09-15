#!/usr/bin/env node
/**
 * audit-fidelity.js — BEAT VISUAL FIDELITY.
 *
 * THE GAP THIS CLOSES. `hard-gate.js` scored `hoot` **100/100, S tier, GREEN
 * LIGHT** on a plan that put 146 scenes of a Classical Athenian Polis in a Carl
 * Hiaasen novel, staged "Dana is mushing Roy's face against the window glass"
 * as one adult alone looking at a CLOCK, and stamped the same callout on 27
 * scenes. Every God-Mode gate passed, because they all measure PRESENTATION —
 * rhythm, promise/payoff, stagnation, novelty budget, event density. None of
 * them asks the only question a viewer actually asks:
 *
 *     am I looking at the thing they are talking about?
 *
 * Worse, the novelty and VIG gates are satisfied by DECORATION, so removing an
 * unrelated clock LOWERS the score of the scene it was cluttering. A pipeline
 * graded that way converges on filler.
 *
 * WHAT THIS MEASURES. Each scene is scored against its own SEMANTIC CONTRACT
 * (`scene._contract`, written by `scripts/lib/narrative-compiler.js` from the
 * beat's own spoken words):
 *
 *   subjects      the people the narration names are staged
 *   interaction   two people acting on each other are BOTH in frame, in a shot
 *                 that can hold two, looking at each other
 *   setting       the backdrop is the place the beat happens
 *   motif legality no icon appears on a beat whose narration grounds none
 *
 * Presence is checked against the PLAN; the contract behind it was derived from
 * the TRANSCRIPT, so a scene cannot score well by asserting things about itself.
 *
 * SCORE. Per scene, the mean of the requirements that apply to it, x100. A beat
 * with no contract requirements (pure host commentary, nobody named, nothing
 * depictable) is NOT scored — it is counted separately as `unscored`, because
 * inventing a requirement for it is how filler gets justified.
 *
 * USAGE
 *   node scripts/audit-fidelity.js --slug=<slug> [--min=90] [--top=N] [--soft] [--json]
 *
 * Exit 1 when the book scores under `--min` (default 90), unless `--soft`.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);
const SLUG = args.slug;
const MIN = Number(args.min || 90);
const TOP = Number(args.top || 0);
if (!SLUG) {
  console.error("Kullanım: node scripts/audit-fidelity.js --slug=<slug> [--min=90] [--top=N] [--soft]");
  process.exit(1);
}

const CFG = path.join(ROOT, "books", SLUG, "config.antidote.json");
if (!fs.existsSync(CFG)) {
  console.error(`❌ ${path.relative(ROOT, CFG)} yok — önce kitabı planla.`);
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(CFG, "utf8"));
const scenes = Array.isArray(cfg.scenes) ? cfg.scenes : [];

const { scoreScene, scoreBook } = require("./lib/fidelity");

let book;
try {
  book = scoreBook(cfg);
} catch (e) {
  console.error(`❌ ${SLUG}: ${e.message} — re-plan the book so every scene carries its contract.`);
  process.exit(args.soft ? 0 : 1);
}
const { results, scored: scoredCount, unscored, perfect, partial, failed } = book;
const scored = results.filter((r) => !r.unscored);
const total = book.score;

const fps = (cfg.meta && cfg.meta.fps) || 30;
const ts = (f) => `${Math.floor(f / fps / 60)}:${String(Math.floor(f / fps) % 60).padStart(2, "0")}`;

console.log(`\n══════════════════════════════════════════════════════════════`);
console.log(`  BEAT VISUAL FIDELITY: ${SLUG}`);
console.log(`══════════════════════════════════════════════════════════════`);
console.log(`  Scenes scored:            ${scoredCount} / ${results.length}  (${unscored} carry no requirement)`);
console.log(`  Contract fully met:       ${perfect}`);
console.log(`  Partially met:            ${partial}`);
console.log(`  Not met:                  ${failed}`);
console.log(`  VISUAL FIDELITY:          ${total.toFixed(1)} / 100   (floor ${MIN})`);

if (TOP) {
  const worst = scored.filter((r) => r.score < 1).sort((a, b) => a.score - b.score || b.misses.length - a.misses.length).slice(0, TOP);
  if (worst.length) {
    console.log(`\n  worst ${worst.length}:`);
    for (const r of worst) {
      console.log(`   [${(r.score * 100).toFixed(0).padStart(3)}] ${r.id} @ ${ts(r.from)}  ${r.misses.join(" · ")}`);
      console.log(`         SAID: "${r.said}"`);
    }
  }
}

if (args.json) {
  console.log(JSON.stringify({ slug: SLUG, score: total, scored: scoredCount, unscored, perfect, partial, failed }, null, 2));
}

const pass = total >= MIN;
console.log(`\n  ${pass ? "✓ PASS" : "✗ FAIL"} — visual fidelity ${total.toFixed(1)} ${pass ? ">=" : "<"} ${MIN}\n`);
if (!pass && !args.soft) process.exit(1);
