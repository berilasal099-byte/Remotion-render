#!/usr/bin/env node
/**
 * validate-screen-text.js — hard gate: every string printed on an Antidote frame
 * must be readable copy about what the narrator says in that scene.
 *
 *   node scripts/validate-screen-text.js --slug=<slug> [--report-only]
 *
 * Runs at the LAST point before render (make-book after every post-plan rewrite,
 * render.js before dispatch) because apply-semantic-arcs / repairs rewrite text
 * after the planner. Books listed in PUBLISHED_BOOKS.md are frozen: they are
 * reported, never blocked (their config is the record of what shipped).
 *
 * Logic lives in scripts/lib/screen-text.js; this is only the CLI.
 */
const fs = require("fs");
const path = require("path");
const { validateConfig } = require("./lib/screen-text");

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)=(.*)$/); return m ? [m[1], m[2]] : [a.slice(2), true]; }));
const slug = args.slug;
if (!slug) { console.error("Usage: node scripts/validate-screen-text.js --slug=<slug> [--report-only]"); process.exit(1); }

const root = path.resolve(__dirname, "..");
const cfgPath = path.join(root, "books", slug, "config.antidote.json");
if (!fs.existsSync(cfgPath)) { console.error(`No Antidote config: ${path.relative(root, cfgPath)}`); process.exit(1); }

function publishedSlugs() {
  try {
    const md = fs.readFileSync(path.join(root, "PUBLISHED_BOOKS.md"), "utf8");
    return new Set([...md.matchAll(/`([a-z0-9-]{3,})`/g)].map((m) => m[1]));
  } catch { return new Set(); }
}

const frozen = publishedSlugs().has(slug);
const report = { slug, generatedAt: new Date().toISOString(), frozen, ...validateConfig(JSON.parse(fs.readFileSync(cfgPath, "utf8"))) };
const out = path.join(root, "books", slug, "screen-text.report.json");
fs.writeFileSync(out, JSON.stringify(report, null, 2) + "\n");

console.log(`${report.status} ${slug}: ${report.violations.length} screen-text violation(s) in ${report.strings} string(s) / ${report.scenes} scenes → ${path.relative(root, out)}`);
if (report.violations.length) console.log(`  ${Object.entries(report.counts).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
for (const v of report.violations.slice(0, 20)) console.log(`  ${v.code} ${v.sceneId} ${v.path}: ${v.message}`);
if (report.status !== "PASS") {
  if (frozen) console.log("  (published book — frozen, report only)");
  else if (!args["report-only"]) process.exit(1);
}
