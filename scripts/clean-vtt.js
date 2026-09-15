#!/usr/bin/env node
/**
 * clean-vtt.js — turn a raw YouTube auto-caption VTT (inline <c> word-timing tags +
 * duplicated "rolling" lines) into a clean, sequential, non-overlapping VTT that
 * YouTube's manual caption uploader accepts ("with timing").
 *
 * Usage: node scripts/clean-vtt.js public/captions/sway.vtt public/captions/sway.clean.vtt
 */
const fs = require("fs");
const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error("Usage: node scripts/clean-vtt.js <in.vtt> <out.vtt>");
  process.exit(1);
}
const raw = fs.readFileSync(inPath, "utf8").replace(/\r\n/g, "\n");
const blocks = raw.split(/\n\n+/);
// YouTube's ASR writes non-speech events as bracketed tokens — "[Music]",
// "[Applause]", "[snorts]" — and censors profanity as "[ __ ]", which comes
// through the VTT HTML-escaped as "[&nbsp;__&nbsp;]". None of that is speech,
// and all of it ships to viewers: `paradise-lost` had "an uneducated
// [&nbsp;__&nbsp;]" and "She argues [snorts]" sitting in the caption file that
// goes up with the video. Entities are decoded first so the censor token is a
// plain "[ __ ]" by the time the bracket rule sees it.
const decodeEntities = (s) => s
  .replace(/&nbsp;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/g, "'");
const stripNonSpeech = (s) => s.replace(/\[[^\]]{0,40}\]/g, " ");
const stripTags = (s) => stripNonSpeech(decodeEntities(s.replace(/<[^>]+>/g, "")))
  .replace(/\s+([,.!?;:])/g, "$1")
  .replace(/\s+/g, " ")
  .trim();
const cues = [];
for (const b of blocks) {
  const lines = b.split("\n");
  const tl = lines.find((l) => l.includes("-->"));
  if (!tl) continue;
  const m = tl.match(/(\d\d:\d\d:\d\d\.\d+)\s*-->\s*(\d\d:\d\d:\d\d\.\d+)/);
  if (!m) continue;
  // Prefer the line that carries inline word-timing tags (the "new" spoken content);
  // fall back to the last non-empty payload line.
  const payload = lines.slice(lines.indexOf(tl) + 1);
  const tagged = payload.filter((l) => /<\d\d:\d\d:\d\d\.\d+>/.test(l));
  const src = tagged.length ? tagged.join(" ") : payload.join(" ");
  const text = stripTags(src);
  if (!text) continue;
  cues.push({ start: m[1], end: m[2], startN: toSec(m[1]), endN: toSec(m[2]), text });
}
function toSec(t) {
  const [h, mnt, s] = t.split(":");
  return (+h) * 3600 + (+mnt) * 60 + parseFloat(s);
}
function fmt(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, "0");
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  const s = (sec % 60).toFixed(3).padStart(6, "0");
  return `${h}:${m}:${s}`;
}
// De-duplicate consecutive identical text, drop zero/negative-length cues,
// and force strictly increasing, non-overlapping timings with a small min duration.
const clean = [];
let prevEnd = 0;
for (const c of cues) {
  if (c.text === (clean[clean.length - 1]?.text)) continue;
  let start = Math.max(c.startN, prevEnd);
  let end = Math.max(c.endN, start + 0.4);
  if (end - start < 0.4) end = start + 0.4;
  clean.push({ start, end, text: c.text });
  prevEnd = end;
}
let out = "WEBVTT\n\n";
clean.forEach((c, i) => {
  out += `${i + 1}\n${fmt(c.start)} --> ${fmt(c.end)}\n${c.text}\n\n`;
});
fs.writeFileSync(outPath, out);
console.log(`✓ ${outPath} — ${clean.length} clean cues (from ${cues.length} raw)`);
