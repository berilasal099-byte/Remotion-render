#!/usr/bin/env node
/**
 * render-github-assemble.js — download all segments of a split GitHub render and
 * concat them into the final out/<slug>.mp4, verified.
 *
 * render.js --method=github auto-splits a long video into worker-sized frame
 * segments (each under the 6h Actions cap) and records .render-github-split.json.
 * This pulls each segment's artifact (video-<slug>-seg<k>) from its worker, verifies
 * each piece, concatenates them in frame order, and decode-verifies the result.
 *
 * Usage: node scripts/render-github-assemble.js --slug=<slug>
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync, spawnSync, execFileSync } = require("child_process");
const { ROOT, loadAccounts, gh, walk, parseArgs } = require("./lib/render-pool");

const args = parseArgs(process.argv.slice(2));
const SLUG = args.slug;
if (!SLUG) { console.error("Kullanım: node scripts/render-github-assemble.js --slug=<slug>"); process.exit(1); }

// Prefer the per-slug state file (multi-agent safe); fall back to the shared one.
const perSlug = path.join(ROOT, `.render-github-split.${SLUG}.json`);
const splitPath = fs.existsSync(perSlug) ? perSlug : path.join(ROOT, ".render-github-split.json");
if (!fs.existsSync(splitPath)) { console.error(`❌ .render-github-split.${SLUG}.json yok — bu slug bölünmüş bir render değil. Tek-parça için render-github-download.js kullan.`); process.exit(1); }
const split = JSON.parse(fs.readFileSync(splitPath, "utf8"));
if (split.slug !== SLUG) { console.error(`❌ split state slug'ı '${split.slug}', istenen '${SLUG}'. (Başka bir agent .render-github-split.json'u ezmiş olabilir — .render-github-split.${SLUG}.json bekleniyordu.)`); process.exit(1); }

const acc = loadAccounts();
const segsSorted = [...split.segments].sort((a, b) => a.seg - b.seg);
const tmpRoot = path.join(ROOT, "out", `gh-asm-${SLUG}`);
fs.rmSync(tmpRoot, { recursive: true, force: true });
fs.mkdirSync(tmpRoot, { recursive: true });

const verifyMp4 = (f) => {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" });
  const dur = parseFloat((probe.stdout || "").trim());
  if (!Number.isFinite(dur) || dur <= 0.1) return { ok: false, dur: 0 };
  const dec = spawnSync("ffmpeg", ["-v", "error", "-t", "5", "-i", f, "-f", "null", "-"], { encoding: "utf8" });
  return { ok: dec.status === 0, dur };
};

function downloadArtifactZip(url, token, destZip) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "User-Agent": "Remotion-Render-Pipeline",
          Accept: "application/vnd.github+json",
        },
        timeout: 45000,
      },
      (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          https.get(res.headers.location, { timeout: 300000 }, (blobRes) => {
            if (blobRes.statusCode !== 200) {
              return reject(new Error(`Blob storage HTTP ${blobRes.statusCode}`));
            }
            const file = fs.createWriteStream(destZip);
            blobRes.pipe(file);
            file.on("finish", () => {
              file.close(resolve);
            });
            file.on("error", reject);
          }).on("error", reject);
        } else {
          reject(new Error(`GitHub API HTTP ${res.statusCode}`));
        }
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout connecting to GitHub"));
    });
  });
}

async function main() {
  /**
   * Unpack a GitHub artifact zip.
   *
   * A one-line `tar -xf <zip>` cost a full 30-minute render across ten accounts,
   * for two reasons that only bite on Windows:
   *
   *   1. GNU tar CANNOT READ ZIP AT ALL. Only bsdtar can, and which one answers to
   *      `tar` depends on PATH order — Windows ships bsdtar in System32, Git for
   *      Windows ships GNU tar and usually wins inside a Bash shell. The same
   *      command therefore worked for earlier books and failed for this one.
   *   2. GNU tar reads an argument with a colon before the first slash as
   *      `host:path`, so an absolute Windows path makes it dial out:
   *      `tar: Cannot connect to C: resolve failed`.
   *
   * So: use bsdtar by its real path when it is there, fall back to PowerShell's
   * Expand-Archive (always present on Windows), and to `unzip`/`tar` elsewhere.
   * Relative paths with `cwd` keep the drive letter out of the arguments entirely.
   */
  function extractZip(zipPath, destDir) {
    const cwd = path.dirname(zipPath);
    const zip = path.basename(zipPath);
    const dest = path.relative(cwd, destDir) || ".";
    const attempts = [];

    if (process.platform === "win32") {
      const bsdtar = path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe");
      if (fs.existsSync(bsdtar)) attempts.push([bsdtar, ["-xf", zip, "-C", dest], { cwd }]);
      attempts.push(["powershell", [
        "-NoProfile", "-NonInteractive", "-Command",
        `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
      ], {}]);
    } else {
      attempts.push(["unzip", ["-q", "-o", zip, "-d", dest], { cwd }]);
      attempts.push(["tar", ["-xf", zip, "-C", dest], { cwd }]);
    }

    const errs = [];
    for (const [cmd, argv, opts] of attempts) {
      try {
        execFileSync(cmd, argv, { stdio: "pipe", ...opts });
        return;
      } catch (e) {
        errs.push(`${path.basename(cmd)}: ${String(e.stderr || e.message).trim().split("\n")[0]}`);
      }
    }
    throw new Error(`zip açılamadı (${errs.join(" | ")})`);
  }

  async function downloadSegment(sg) {
    const worker = (acc.workers || []).find((w) => w.id === sg.workerId || w.username === sg.username);
    if (!worker) throw new Error(`worker bulunamadı: ${sg.username} (seg ${sg.seg})`);
    const repo = `${worker.username}/${worker.repo}`;
    const artifact = `video-${SLUG}-seg${sg.seg}`;

    const runs = gh(worker, ["run", "list", "--repo", repo, "--workflow", "render-video.yml", "-L", "10",
      "--json", "databaseId,status,conclusion,createdAt"], { json: true }) || [];
    const done = runs.filter((r) => r.status === "completed" && r.conclusion === "success");
    if (!done.length) throw new Error(`${repo}: tamamlanmış başarılı run yok — seg${sg.seg} henüz bitmemiş olabilir.`);

    const segDir = path.join(tmpRoot, `seg${sg.seg}`);
    fs.mkdirSync(segDir, { recursive: true });
    let got = null;
    let lastErr = null;
    for (const r of done) {
      try {
        const artData = gh(worker, ["api", `repos/${repo}/actions/runs/${r.databaseId}/artifacts`], { json: true });
        const art = (artData?.artifacts || []).find((a) => a.name === artifact);
        if (!art) continue;

        const sizeMB = (art.size_in_bytes / 1e6).toFixed(1);
        console.log(`⬇  [seg${sg.seg}/${segsSorted.length}] İndiriliyor: ${repo} (${sizeMB} MB)...`);
        const zipPath = path.join(tmpRoot, `seg${sg.seg}.zip`);
        await downloadArtifactZip(art.archive_download_url, worker.token, zipPath);

        fs.rmSync(segDir, { recursive: true, force: true });
        fs.mkdirSync(segDir, { recursive: true });
        extractZip(zipPath, segDir);
        try { fs.unlinkSync(zipPath); } catch {}

        const mp4 = walk(segDir).find((f) => f.toLowerCase().endsWith(".mp4"));
        if (mp4) {
          got = mp4;
          console.log(`✓  [seg${sg.seg}/${segsSorted.length}] Dosya açıldı`);
          break;
        }
      } catch (e) {
        lastErr = e.message;
        console.warn(`⚠  [seg${sg.seg}] Deneme hatası: ${e.message}`);
      }
    }
    // Distinguish "the artifact is not there" from "we could not unpack it".
    // Collapsing the two sent a real extraction bug looking for a missing upload.
    if (!got) {
      throw new Error(lastErr
        ? `${repo}: '${artifact}' indirildi ama açılamadı — ${lastErr}`
        : `${repo} son run'larında '${artifact}' artifact'i bulunamadı.`);
    }

    const v = verifyMp4(got);
    if (!v.ok) throw new Error(`seg${sg.seg} bozuk/kesik (decode başarısız).`);
    console.log(`✅ [seg${sg.seg}/${segsSorted.length}] Doğrulandı (${(v.dur / 60).toFixed(1)} dk)`);
    return got;
  }

  async function downloadSegmentWithRetry(sg, maxAttempts = 3) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await downloadSegment(sg);
      } catch (err) {
        if (attempt < maxAttempts) {
          console.warn(`⚠  [seg${sg.seg}] Deneme ${attempt} başarısız: ${err.message}. 5s sonra tekrar denenecek...`);
          await new Promise((res) => setTimeout(res, 5000));
        } else {
          throw err;
        }
      }
    }
  }

  const CONCURRENCY = 3;
  console.log(`\n🚀 ${segsSorted.length} segment paralel indiriliyor (Eşzamanlı: ${CONCURRENCY})...`);
  const segFiles = new Array(segsSorted.length);
  let curIndex = 0;
  async function workerLoop() {
    while (curIndex < segsSorted.length) {
      const idx = curIndex++;
      segFiles[idx] = await downloadSegmentWithRetry(segsSorted[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, segsSorted.length) }, workerLoop));

// ── pre-concat sanity: every segment file must still exist ───────────────────
for (const f of segFiles) {
  if (!fs.existsSync(f)) {
    console.error(`❌ Segment dosyası kayıp (download sonrası silindi?): ${f}`);
    process.exit(1);
  }
}

// ── concat in frame order ─────────────────────────────────────────────────────
const partsFile = path.join(tmpRoot, "parts.txt");
fs.writeFileSync(partsFile, segFiles.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
const dest = path.join(ROOT, "out", `${SLUG}.mp4`);
console.log(`\n🔗 ${segFiles.length} segment birleştiriliyor → out/${SLUG}.mp4`);
execSync(`ffmpeg -y -f concat -safe 0 -i "${partsFile}" -c copy "${dest}"`, { cwd: ROOT, stdio: process.stdout.isTTY ? "inherit" : "pipe" });

// ── verify final (concat can silently truncate) ───────────────────────────────
let ok = true, durMin = "?";
try {
  durMin = (Number(execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${dest}"`, { encoding: "utf8" }).trim()) / 60).toFixed(1);
  execSync(`ffmpeg -v error -t 6 -i "${dest}" -f null -`, { stdio: "ignore" });
  execSync(`ffmpeg -v error -sseof -6 -i "${dest}" -f null -`, { stdio: "ignore" });
  console.log(`\n✅ DOĞRULANDI — out/${SLUG}.mp4 · ${durMin} dk · baş/son decode temiz.`);
} catch (e) {
  ok = false;
  console.warn(`\n⚠ Final doğrulama BAŞARISIZ: ${String(e.message).slice(0, 160)}`);
}
fs.rmSync(tmpRoot, { recursive: true, force: true });

fs.writeFileSync(path.join(ROOT, ".render-github-state.json"), JSON.stringify({
  slug: SLUG, split: true, segments: segsSorted.length, verified: ok, durationMin: durMin,
  repos: [...new Set(segsSorted.map((s) => `${s.username}/${s.repo}`))],
}, null, 2) + "\n");

  if (ok) {
    const postScript = path.join(ROOT, "scripts", "post-render.js");
    if (fs.existsSync(postScript)) {
      spawnSync("node", [postScript, `--slug=${SLUG}`], { cwd: ROOT, stdio: "inherit" });
    }
    console.log(`\nSorunsuzsa temizle (her worker reposunun artifact/log'ları):`);
    segsSorted.forEach((s) => console.log(`   node scripts/render-github-cleanup.js --slug=${SLUG} --worker=${s.username}`));
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Assemble Hatası:", err);
  process.exit(1);
});

