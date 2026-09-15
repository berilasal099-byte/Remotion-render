#!/usr/bin/env node
/**
 * preproduce.js — Unified Autonomous Pre-Production & Art Direction CLI
 *
 * Runs BEFORE plan-antidote or plan-vox.
 * Reads the book's transcript/VTT, analyzes the semantic universe, performs
 * asset gap analysis, synthesizes custom SVG motifs or document styles, and
 * outputs `books/<slug>/creative-bible.json`.
 *
 * Usage:
 *   node scripts/preproduce.js --slug=million-dollar-weekend --genre=business
 *   node scripts/preproduce.js --slug=meditations --title="Meditations" --author="Marcus Aurelius" --genre=philosophy
 */

const fs = require("fs");
const path = require("path");
const { rel, abs, ensureBookDir } = require("./lib/paths");
const { generateCreativeBible } = require("./lib/art-director");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  })
);

const SLUG = args.slug || "million-dollar-weekend";
const TITLE = args.title || (SLUG.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
const AUTHOR = args.author || "";
const GENRE = (args.genre || "general").toLowerCase();
const VTT_PATH = args.vtt || rel.vtt(SLUG);
const OUT_PATH = args.out || path.join("books", SLUG, "creative-bible.json");

async function run() {
  console.log(`\n============================================================`);
  console.log(`🎬 UNIFIED AI ART DIRECTOR & PRE-PRODUCTION ENGINE`);
  console.log(`   Book: "${TITLE}" (${GENRE})`);
  console.log(`   Slug: ${SLUG}`);
  console.log(`============================================================\n`);

  let vttText = "";
  if (fs.existsSync(VTT_PATH)) {
    vttText = fs.readFileSync(VTT_PATH, "utf8");
    console.log(`[+] Loaded VTT transcript: ${VTT_PATH} (${(vttText.length / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`[-] VTT not found at ${VTT_PATH}. Proceeding with title & genre metadata.`);
  }

  const bible = await generateCreativeBible({
    title: TITLE,
    author: AUTHOR,
    genre: GENRE,
    vttText,
  });

  // THE BOOK'S OWN PALETTE WINS. `book.json.palette` is authored per book at
  // Step 0 and is already the source of truth everywhere else (gen-books-registry
  // reads it into BOOK_PALETTES; the thumbnail system exists to stop every book
  // looking alike). The universe classifier below is a heuristic over the
  // transcript, and when it guesses wrong it repaints the whole film: it read
  // Speaker for the Dead as "Contemporary General Non-Fiction" and put its
  // corporate blue/orange into 327 places in the config, over a bespoke forest
  // palette. A book that declares no palette is unaffected.
  const bookPalette = (() => {
    try { return (JSON.parse(fs.readFileSync(abs.manifest(SLUG), "utf8")) || {}).palette || null; }
    catch { return null; }
  })();
  if (bookPalette && bible.world) {
    bible.world.palette = {
      ...bible.world.palette,
      primary: bookPalette.red || bible.world.palette?.primary,
      accent: bookPalette.gold || bible.world.palette?.accent,
      paper: bookPalette.paper || bible.world.palette?.paper,
      ink: bookPalette.ink || bible.world.palette?.ink,
    };
    console.log(`[+] Palette taken from books/${SLUG}/book.json (authored) — universe default overridden`);
  }

  ensureBookDir(SLUG);
  fs.writeFileSync(OUT_PATH, JSON.stringify(bible, null, 2), "utf8");
  console.log(`[+] Wrote creative bible: ${OUT_PATH}`);

  // Display summary
  console.log(`\n------------------ ART DIRECTION DOSSIER ------------------`);
  console.log(`🌌 World / Universe: ${bible.world.label} (${bible.world.universeKey})`);
  console.log(`🎨 Color Palette:`);
  console.log(`   Primary: ${bible.world.palette.primary} | Accent: ${bible.world.palette.accent}`);
  console.log(`   Paper:   ${bible.world.palette.paper} | Ink:    ${bible.world.palette.ink}`);
  console.log(`\n🚀 Engine Recommendation:`);
  console.log(`   Format:     ${bible.world.recommendedEngine.toUpperCase()}`);
  console.log(`   Confidence: ${(bible.world.engineConfidence * 100).toFixed(0)}%`);
  console.log(`   Rationale:  ${bible.world.engineRationale}`);

  console.log(`\n🎭 Antidote Production Strategy:`);
  console.log(`   Preferred Sets: ${bible.antidote.preferredSets.join(", ")}`);
  const customMotifs = Object.keys(bible.antidote.activeCustomMotifs);
  if (customMotifs.length > 0) {
    console.log(`   Synthesized Custom SVGs: ${customMotifs.join(", ")}`);
  } else {
    console.log(`   Synthesized Custom SVGs: 0 (all needed motifs natively available)`);
  }

  console.log(`\n📰 Vox Production Strategy:`);
  console.log(`   Primary Document: ${bible.vox.primaryDocType}`);
  console.log(`   Photo Aesthetics: ${bible.vox.photoPromptStyle}`);
  if (bible.vox.suggestedLocations.length > 0) {
    console.log(`   Geo Coordinates: ${bible.vox.suggestedLocations.map((l) => l.name).join(", ")}`);
  }
  console.log(`-----------------------------------------------------------\n`);
}

run().catch((err) => {
  console.error("Art Director error:", err);
  process.exit(1);
});
