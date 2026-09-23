"use strict";

/** Deterministic semantic-floor bridge; it emits overrides, never scenes. */
const COMPARATIVE_SHOTS = new Set(["split", "twoShot", "beforeAfter"]);
const DIAGRAM_TYPES = new Set(["sorter", "matchWave", "flow", "spectrum", "matrix", "tree", "funnel"]);
const screenText = require("./screen-text");

function copyIntent(intent) {
  return {
    archetype: intent.archetype,
    domain: intent.domain,
    requiredActions: [...(intent.requiredActions || [])],
    requiredAttributes: { ...(intent.requiredAttributes || {}) },
    forbiddenTropes: [...(intent.forbiddenTropes || [])],
    semanticRequirements: [...(intent.semanticRequirements || [])],
  };
}

// ── 2026-09-23: labels are CLAUSES the narrator said, or nothing ────────────
// The old path sliced narration (`label()` = last 4 content words,
// `wordSlices()` = first 3 / last 3) and fell back to atom.subject/object,
// which the atom extractor fills from another book's defaults ("Thirty
// Tyrants" on a Crime & Punishment beat). Result: "PRODUCT OKAY LETS UNPACK",
// "IDEAS SOME GRAND U". Now a side of a graphic exists only when the sentence
// states it as a short clause on either side of an explicit marker, and the
// clause passes the shared screen-text check. Otherwise semanticPayload is
// null and NO floor is added — a silent frame beats a meaningless diagram.
const MAX_CLAUSE_TOKENS = 5;

function splitAt(text, pattern) {
  const match = String(text || "").match(pattern);
  if (!match || match.index == null) return null;
  return [text.slice(0, match.index), text.slice(match.index + match[0].length)];
}

// The clause touching the marker: back to the previous boundary on the left,
// forward to the next boundary on the right.
function nearClause(side, dir) {
  const parts = String(side || "").split(/[.!?;:,—–]+/).filter((p) => p.trim());
  return (dir === "left" ? parts[parts.length - 1] : parts[0]) || "";
}

function phrase(clause, narration) {
  const toks = String(clause || "").replace(/[“”"`]/g, "").trim().split(/\s+/).filter(Boolean);
  const isEdge = (w) => screenText.FUNCTION_WORDS.has(w.toLowerCase().replace(/[^a-z0-9']/g, "").replace(/'/g, ""));
  let lo = 0, hi = toks.length;
  while (lo < hi && isEdge(toks[lo])) lo++;
  while (hi > lo && isEdge(toks[hi - 1])) hi--;
  // Trimming a negation flips the meaning ("I don't have a castle" -> CASTLE).
  const isNeg = (w) => screenText.NEGATIONS.has(w.toLowerCase().replace(/[^a-z]/g, ""));
  if (toks.slice(0, lo).some(isNeg) || toks.slice(hi).some(isNeg)) return null;
  const core = toks.slice(lo, hi);
  // A long clause cannot be shortened without choosing words for the narrator.
  if (!core.length || core.length > MAX_CLAUSE_TOKENS - 1 || toks.length > MAX_CLAUSE_TOKENS + 2) return null;
  const text = core.join(" ").replace(/[^A-Za-z0-9%'’&\s-]/g, "").toUpperCase().trim();
  return screenText.isLabel(text, { narration }) ? text : null;
}

function distinctPair(left, right) {
  if (!left || !right) return null;
  return screenText.checkPair(left, right).length ? null : { left, right };
}

function markerPair(text, pattern, order = "forward") {
  const split = splitAt(text, pattern);
  if (!split) return null;
  // Both sides must live in ONE sentence: "…a graphic designer. But wait, …"
  // is two sentences, not a contrast between a designer and "wait".
  if (/[.!?]\s*$/.test(split[0]) || !split[0].trim()) return null;
  const left = phrase(nearClause(split[0], "left"), text);
  const right = phrase(nearClause(split[1], "right"), text);
  return order === "forward" ? distinctPair(left, right) : distinctPair(right, left);
}

// Bare "not" negates a verb ("does not equal"); only ", not" opposes two things.
const CONTRAST_MARKER = /\b(?:rather than|instead of|as opposed to|versus|vs\.?|whereas|but)\b|,\s*not\b/i;
const CAUSE_MARKER = /\b(?:leads to|led to|results in|resulted in|causes|caused|produces|turns into|becomes|became)\b/i;
const BECAUSE_MARKER = /\bbecause\b/i; // "B because A" → A → B

function semanticPayload(atom, archetype) {
  if (!atom || !atom.text) return null;
  const text = atom.text;
  if (archetype === "contrast" || archetype === "allegory_equivalence" || archetype === "character_psychology") {
    const pair = markerPair(text, CONTRAST_MARKER);
    if (!pair) return null;
    if (archetype === "contrast") return { kind: "comparison_labels", leftLabel: pair.left, rightLabel: pair.right };
    if (archetype === "allegory_equivalence") return { kind: "two_domain_labels", sourceLabel: pair.left, targetLabel: pair.right };
    return { kind: "internal_tension_labels", internalPoleA: pair.left, internalPoleB: pair.right };
  }
  if (archetype === "cause_effect" || archetype === "transformation") {
    const flow = markerPair(text, CAUSE_MARKER) || markerPair(text, BECAUSE_MARKER, "reverse");
    return flow ? { kind: "flow_labels", triggerLabel: flow.left, consequenceLabel: flow.right } : null;
  }
  return null;
}

function isValidDiagram(diagram) {
  if (!diagram || !DIAGRAM_TYPES.has(diagram.type)) return false;
  const labels = Array.isArray(diagram.labels) ? diagram.labels : [];
  if (diagram.type === "matchWave") return labels.length >= 1;
  return labels.length >= 2;
}

function hasComposition(direction, kind) {
  const grammar = direction.semanticGrammar && direction.semanticGrammar.kind;
  const shot = direction.shot || "";
  const castCount = Number(direction.cast && direction.cast.count) || 0;
  if (kind === "comparative") return grammar === "comparison" || (COMPARATIVE_SHOTS.has(shot) && castCount >= 2) || isValidDiagram(direction.diagram);
  if (kind === "two_domain") return grammar === "two_domain_comparison" || (isValidDiagram(direction.diagram) && ["sorter", "spectrum", "matchWave"].includes(direction.diagram.type));
  if (kind === "flow") return grammar === "cause_effect_flow" || shot === "beforeAfter" || (isValidDiagram(direction.diagram) && direction.diagram.type === "flow");
  return grammar === "internal_tension" || (isValidDiagram(direction.diagram) && direction.diagram.type === "spectrum") || castCount >= 2;
}

function comparisonOverride(direction, archetype) {
  const roles = Array.isArray(direction.cast && direction.cast.roles) ? direction.cast.roles.slice(0, 2) : [];
  while (roles.length < 2) roles.push(roles.length === 0 ? "protagonist" : "foil");
  return {
    shot: "split",
    semanticGrammar: { kind: "comparison", poles: ["LEFT_POLE", "RIGHT_POLE"] },
    cast: {
      ...(direction.cast || {}), count: 2, crowd: 0, roles,
      // Planner applies this to character two: an active counterpart prevents
      // the comparison from degenerating into idle-actor wallpaper.
      secondaryAction: archetype === "allegory_equivalence" ? "point" : "talk",
    },
  };
}

function diagramOverride(type, labels) {
  return {
    shot: "insert", cast: { count: 0, crowd: 0, roles: [] }, props: [], concept: null,
    // No title: the two labels ARE the claim. A constant title ("TRIGGER →
    // CONSEQUENCE") stamped the same words on every diagram of every book.
    diagram: { type, title: null, labels, values: [], at: 4, scale: 1 },
  };
}

function twoDomainOverride() {
  return {
    // A split is already a real, renderer-supported two-domain composition.
    // Unlike a generic diagram marker, the unchanged Gate can observe both
    // active poles without requiring a new VisualContract rule.
    ...comparisonOverride({}, "allegory_equivalence"),
    semanticGrammar: { kind: "two_domain_comparison", domains: ["SOURCE_DOMAIN", "TARGET_DOMAIN"] },
  };
}

function withGrammar(override, kind) {
  return { ...override, semanticGrammar: { kind } };
}

function propIsForbidden(prop, forbiddenTropes) {
  const type = String(prop && prop.type || "").toLowerCase();
  if (forbiddenTropes.includes("comic_lightbulb") && /lightbulb|bulb/.test(type)) return true;
  if (forbiddenTropes.includes("heart_symbol") && /heart/.test(type)) return true;
  if (forbiddenTropes.includes("party_confetti") && /confetti|party/.test(type)) return true;
  if (forbiddenTropes.includes("burning_or_destructive_action") && /fire|flame|burn|destroy|crash/.test(type)) return true;
  if (forbiddenTropes.includes("unrelated_navigation_prop") && /compass|rudder|navigation/.test(type)) return true;
  return false;
}

function sanitizeAction(action, forbiddenTropes = []) {
  return forbiddenTropes.includes("celebrate_action") && action === "celebrate" ? "think" : action;
}

/**
 * Precedence: an authored or already-valid composition wins. Only a missing
 * semantic grammar gets an override. Static reflection gets no fallback.
 */
function buildDirectorOverrides({ intent, atom, direction, authoredDiagram = false, authoredComposition = false }) {
  const archetype = intent && intent.archetype;
  const requiredActions = (intent && intent.requiredActions) || [];
  const provenance = intent ? copyIntent(intent) : null;
  const payload = semanticPayload(atom, archetype);
  const base = { override: null, reason: "no_semantic_requirement", archetype, requiredActions, provenance, semanticPayload: payload };
  if (!archetype || archetype === "static_reflection") return base;
  // Human art may be semantically insufficient, but it is never silently
  // replaced here; the unchanged VisualContract remains the firewall.
  if (authoredDiagram || authoredComposition) return { ...base, reason: "preserved_authored_composition" };
  // A floor without words would be a composition that claims a relationship
  // nobody can read — the regex archetype alone ("not/but/while" ⇒ contrast)
  // is not evidence. No payload ⇒ no floor.
  if (!payload) return { ...base, reason: "no_payload_no_floor" };

  if (archetype === "contrast") {
    if (hasComposition(direction, "comparative")) return { ...base, reason: "preserved_existing_comparison" };
    return { ...base, reason: "added_comparative_floor", override: { ...comparisonOverride(direction, archetype), semanticPayload: payload } };
  }
  if (archetype === "allegory_equivalence") {
    if (hasComposition(direction, "two_domain")) return { ...base, reason: "preserved_existing_two_domain_comparison" };
    return { ...base, reason: "added_two_domain_floor", override: { ...twoDomainOverride(), semanticPayload: payload } };
  }
  if (archetype === "cause_effect" || archetype === "transformation") {
    if (hasComposition(direction, "flow")) return { ...base, reason: "preserved_existing_flow" };
    return { ...base, reason: "added_causal_flow_floor", override: { ...withGrammar(diagramOverride("flow", [payload.triggerLabel, payload.consequenceLabel]), "cause_effect_flow"), semanticPayload: payload } };
  }
  if (archetype === "character_psychology") {
    if (hasComposition(direction, "tension")) return { ...base, reason: "preserved_existing_tension" };
    return { ...base, reason: "added_internal_tension_floor", override: { ...withGrammar(diagramOverride("spectrum", [payload.internalPoleA, payload.internalPoleB]), "internal_tension"), semanticPayload: payload } };
  }
  return base;
}

function applyDirectorOverrides(direction, result) {
  if (!result) return direction;
  const override = result.override || {};
  const forbiddenTropes = result.provenance ? result.provenance.forbiddenTropes : [];
  const merged = {
    ...direction, ...override,
    cast: override.cast ? { ...(direction.cast || {}), ...override.cast } : direction.cast,
    props: Object.prototype.hasOwnProperty.call(override, "props") ? override.props : direction.props,
  };
  // Exclusions are applied before planner assembly. The original intent remains
  // attached as provenance; no Gate behavior is changed or bypassed.
  if (Array.isArray(merged.props)) merged.props = merged.props.filter((prop) => !propIsForbidden(prop, forbiddenTropes));
  merged.semanticConstraints = result.provenance;
  return merged;
}

module.exports = { buildDirectorOverrides, applyDirectorOverrides, sanitizeAction, isValidDiagram, semanticPayload };
