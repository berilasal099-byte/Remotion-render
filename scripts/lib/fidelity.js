/**
 * fidelity.js — scoring a scene against its SEMANTIC CONTRACT.
 *
 * Shared by `scripts/audit-fidelity.js` (the report) and `scripts/hard-gate.js`
 * (Gate 12), so the number in the gate table and the number in the audit can
 * never drift apart.
 *
 * The contract itself is written by `scripts/lib/narrative-compiler.js` from the
 * beat's own spoken words and travels on the scene as `_contract`. What is
 * checked here is whether the PLAN honours it:
 *
 *   subjects        the people the narration names are staged
 *   interaction     two people acting on each other are both in frame, in a shot
 *                   that can hold two, facing each other
 *   setting         the backdrop is where the beat happens
 *   motif legality  no icon on a beat whose narration grounds none
 *
 * A scene with no requirement is not scored. Inventing a requirement for a beat
 * that owes nothing is exactly how filler gets justified.
 */

/** Shots that can actually stage two people in relation to each other. */
const TWO_HANDER = new Set(["twoShot", "overShoulder", "split", "crowd", "diorama", "wide"]);
/** Sets that depict nowhere in particular, so they never contradict a setting. */
const PLACELESS = new Set(["abstract", "horizon", "sky", "stage", "none"]);

function scoreScene(scene) {
  const c = scene && scene._contract;
  if (!c) return { id: scene && scene.id, unscored: true, reason: "no contract" };

  const roles = new Set((scene.characters || []).map((ch) => ch && ch.role).filter(Boolean));
  const props = (scene.props || []).filter(Boolean);
  const isCard = !!scene.chapterCard;
  const checks = [];
  const misses = [];

  if (Array.isArray(c.subjects) && c.subjects.length && !isCard) {
    const missing = c.subjects.filter((k) => !roles.has(k));
    const ok = (c.subjects.length - missing.length) / c.subjects.length;
    checks.push(ok);
    if (ok < 1) misses.push(`subjects not staged: ${missing.join(", ")}`);
  }

  if (c.interaction && !isCard) {
    const two = (scene.characters || []).length >= 2;
    const framed = TWO_HANDER.has(scene.shot);
    const facing = (scene.characters || []).some((ch) => ch && ch.lookAt === "partner");
    const ok = (two ? 0.5 : 0) + (framed ? 0.3 : 0) + (facing ? 0.2 : 0);
    checks.push(ok);
    if (ok < 1) {
      const why = [];
      if (!two) why.push("one figure only");
      if (!framed) why.push(`shot=${scene.shot} cannot hold two`);
      if (!facing) why.push("not facing each other");
      misses.push(`interaction: ${why.join(", ")}`);
    }
  }

  if (c.setting && !isCard) {
    const set = (scene.bg && scene.bg.set) || "none";
    const ok = set === c.setting || PLACELESS.has(set) ? 1 : 0;
    checks.push(ok);
    if (!ok) misses.push(`set=${set}, beat happens in ${c.setting}`);
  }

  if (c.motifJustified === false) {
    const illegal = props.filter((p) => p.type && p.type !== "customSvg").map((p) => p.type);
    checks.push(illegal.length === 0 ? 1 : 0);
    if (illegal.length) misses.push(`ungrounded motif: ${illegal.join(", ")}`);
  }

  if (!checks.length) return { id: scene.id, unscored: true, reason: "no requirements" };
  return {
    id: scene.id,
    from: scene.fromFrame || 0,
    score: checks.reduce((a, b) => a + b, 0) / checks.length,
    misses,
    said: String(scene._narration || "").slice(0, 120),
  };
}

function scoreBook(config) {
  const scenes = (config && config.scenes) || [];
  const results = scenes.map(scoreScene);
  const scored = results.filter((r) => !r.unscored);
  if (!scored.length) throw new Error("no semantic contracts in this config");
  return {
    results,
    scored: scored.length,
    unscored: results.length - scored.length,
    perfect: scored.filter((r) => r.score === 1).length,
    partial: scored.filter((r) => r.score > 0 && r.score < 1).length,
    failed: scored.filter((r) => r.score === 0).length,
    score: Math.round((scored.reduce((a, r) => a + r.score, 0) / scored.length) * 1000) / 10,
  };
}

module.exports = { scoreScene, scoreBook, TWO_HANDER, PLACELESS };
