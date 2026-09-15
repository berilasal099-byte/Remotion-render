#!/usr/bin/env node
/**
 * hard-gate.js — Antidote God Mode: Pre-Render Hard Gates (Phase 10)
 *
 * Enforces the 8 Non-Negotiable Golden Rules before any render or worker dispatch.
 * Blocks video export if any retention violation exists.
 *
 * The Non-Negotiable Hard Gates:
 *   [GATE 1] Narrative Health: 0 explanation streaks (>2) & 0 escalation droughts (>28s).
 *   [GATE 2] Promise Integrity: 0 unresolved promises & 0 orphan payoffs.
 *   [GATE 3] Visual Freshness: 0 stagnation streaks (3 consecutive identical visual states).
 *   [GATE 4] Novelty Budget: 0 visual novelty droughts (>60s).
 *   [GATE 5] Chapter Structure: Every chapter must have Macro Question → Turn → Climax Payoff.
 *   [GATE 6] Cognitive Compression: Character clears stage for diagram hero.
 *   [GATE 7] Audio Punctuation: 100% payoffs have DING chime & 100% chapters have THUD hit.
 *   [GATE 8] Master Retention: Composite Holistic Retention Score >= 85.
 *   [GATE 9] Visual Contract Compliance: 0 forbidden motifs, characters preserved.
 *   [GATE 10A] World & Historical Integrity: 0 anachronisms (sets, props, attire).
 *   [GATE 10B] Propositional & Causal Integrity: Visuals embody philosophical claim & causal mechanism.
 *   [GATE 11] Visual Information Gain & Anti-Stagnation Floor: 0 consecutive low-VIG scenes & active state progression.
 *
 * Usage:
 *   node scripts/hard-gate.js --slug=<slug> [--auto-fix]
 *   node scripts/hard-gate.js --all [--auto-fix]
 */

const fs = require("fs");
const path = require("path");
const { abs } = require("./lib/paths");
const { auditHolisticRetention } = require("./lib/antidote-retention-auditor");
const { autoRepairAntidote } = require("./lib/antidote-auto-repair");
const { validateSceneAgainstContract, repairSceneContract } = require("./lib/visual-contract");
const { enforceSemanticRelevance, scoreSemanticRelevance } = require("./lib/visual-intent");

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  })
);

const AUTO_FIX = !!args["auto-fix"] || !!args.fix;

function evaluateGates(slug, autoFix = false) {
  const p = abs.antidoteConfig(slug);
  if (!fs.existsSync(p)) {
    console.error(`Error: Config not found at ${p}`);
    process.exit(1);
  }

  let config = JSON.parse(fs.readFileSync(p, "utf8"));
  let chapters = [];
  const metaPath = abs.youtubeMeta(slug);
  if (fs.existsSync(metaPath)) {
    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
      chapters = meta.chapters || [];
    } catch (_) {}
  }

  let audit = auditHolisticRetention(config, chapters);
  const compressionPassed = (config.scenes || []).every((s) => !s.diagram || s.characters?.length === 0 || s.characters?.[0]?.scale <= 0.65);

  // Self-heal if autoFix requested and not yet perfect or any gate fails
  if ((!audit.passed || audit.score < 95 || !compressionPassed) && autoFix) {
    console.log(`  [AUTO-FIX] Initiating Autonomous Auto-Repair Loop for ${slug}...`);
    const repairResult = autoRepairAntidote(config, chapters, { maxPasses: 4 });
    config = repairResult.config;
    fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf8");
    audit = auditHolisticRetention(config, chapters);
    console.log(`  [AUTO-FIX] Repaired to Score: ${audit.score}/100 (${repairResult.repairs.length} repairs applied).`);
  }

  // Evaluate Visual Contract Compliance (Gate 9)
  const briefsPath = path.resolve(__dirname, `../books/${slug}/beat-briefs.json`);
  let contractPassed = true;
  let contractViolations = [];
  if (fs.existsSync(briefsPath)) {
    try {
      const briefsData = JSON.parse(fs.readFileSync(briefsPath, "utf8"));
      const briefsArr = briefsData.briefs || briefsData;
      const fp = (text) => {
        const norm = String(text).toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
        let h = 2166136261;
        for (let i = 0; i < norm.length; i++) { h ^= norm.charCodeAt(i); h = Math.imul(h, 16777619); }
        return (h >>> 0).toString(36);
      };
      const briefMap = new Map(briefsArr.map((b) => [b.fp, b]));
      let repairedCount = 0;
      for (let i = 0; i < (config.scenes || []).length; i++) {
        const sc = config.scenes[i];
        const brief = briefMap.get(fp(sc._narration?.slice(0, 160) || ""));
        if (!brief) continue;
        const val = validateSceneAgainstContract(sc, brief);
        if (!val.valid) {
          if (autoFix) {
            config.scenes[i] = repairSceneContract(sc, brief);
            repairedCount++;
          } else {
            contractViolations.push(...val.violations);
          }
        }
      }
      if (autoFix && repairedCount > 0) {
        fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf8");
        console.log(`  [AUTO-FIX] Repaired ${repairedCount} scenes violating visual contract.`);
      }
      contractPassed = contractViolations.length === 0;
    } catch (_) {}
  }

  // Evaluate Semantic Relevance, Era Integrity, Proposition Integrity & VIG (Gate 10A, 10B, 11)
  // The STORY BIBLE decides the era, exactly as `apply-semantic-arcs.js` does.
  // The genre string cannot: `classics` covers Plato and it covers Milton, and on
  // `paradise-lost` (a 17th-century poem the hosts read through corporate-meeting
  // and social-feed analogies) the genre test alone turned on the ancient-Greek
  // machine — forbidding the modern icons the narration explicitly asks for and
  // swapping sets for classical ones. Two stages reading the same config must not
  // disagree about what century a book is in. Genre/author stay as the fallback
  // for a book with no bible.
  const isAncient = (() => {
    try {
      const bp = path.resolve(__dirname, `../books/${slug}/story-bible.json`);
      const era = fs.existsSync(bp)
        ? String(JSON.parse(fs.readFileSync(bp, "utf8"))?.world?.era || "")
        : "";
      if (era) return /ancient|classical|antiquity|greek|roman|medieval/i.test(era);
    } catch { /* fall through to the genre heuristic */ }
    return /philosophy|ancient|classical|history|classics|stoic|greek|roman/.test(String(config.meta?.genre || "").toLowerCase()) ||
      /plato|socrates|aristotle|marcus aurelius|seneca|epictetus/.test(String(config.meta?.author || "").toLowerCase());
  })();

  let worldViolations = [];
  let propositionViolations = [];
  let vigViolations = [];

  function evaluateSemanticAndVigGates(cfg) {
    worldViolations = [];
    propositionViolations = [];
    vigViolations = [];

    const scenes = cfg.scenes || [];
    let consecutiveLowVig = 0;
    let totalVigScore = 0;

    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      const res = scoreSemanticRelevance(sc, sc._narration, { isAncient });

      // Gate 10A: World & Historical Integrity (0 Anachronisms)
      if (res.worldScore < 8) {
        worldViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 10A: World & Era Integrity",
          reasons: res.reasons.filter((r) => r.includes("Gate 10A")),
        });
      }

      // Gate 10B: Propositional & Causal Integrity & Director Spec
      if (res.semanticScore < 7) {
        propositionViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 10B: Propositional Integrity",
          reasons: res.reasons.filter((r) => r.includes("Gate 10B")),
        });
      }

      if (!sc.director || !sc.director.viewerFocus || !sc.director.blocking) {
        propositionViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 10B: Incomplete Director Spec",
          reasons: [`Scene ${sc.id} is missing director specification (viewerFocus, visualSubject, blocking)`],
        });
      }

      if (!sc.visualProposition || !sc.visualProposition.visualQuestion || !sc.visualProposition.visualAnswer) {
        propositionViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 10B: Missing Visual Question & Answer",
          reasons: [`Scene ${sc.id} is missing visualQuestion or visualAnswer`],
        });
      }

      // Gate 10B: Visual Question & Answer (VQA) Fulfillment on Critical Causal Beats
      const cType = sc.visualProposition?.claimType;
      const isCriticalCausal =
        cType === "causal" ||
        cType === "consequence" ||
        cType === "counterexample" ||
        sc.visualProposition?.epistemicStance === "refutation";
      const vqaStatus = sc.answersVisualQuestion || res.answersVisualQuestion;
      if (isCriticalCausal && vqaStatus === "none") {
        propositionViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 10B: Unanswered Visual Question on Causal Beat",
          reasons: [
            `Scene ${sc.id} asserts a ${cType || "causal"} claim but answersVisualQuestion is 'none' (visual fails to answer '${sc.visualProposition?.visualQuestion || "why/how"}')`,
          ],
        });
      }

      // Gate 11: Visual Information Gain (VIG 0–5 Cognitive Scale) & Anti-Stagnation Floor
      const vigScore = typeof sc.vigScore === "number" ? sc.vigScore : (res.vigScore ?? (sc.visualInformationGain === "high" ? 4 : sc.visualInformationGain === "medium" ? 2 : 1));
      totalVigScore += vigScore;

      // Rule 1: No consecutive low VIG (score <= 1)
      if (vigScore <= 1) {
        consecutiveLowVig++;
        if (consecutiveLowVig > 1) {
          vigViolations.push({
            sceneId: sc.id,
            index: i,
            rule: "Gate 11: Consecutive Low VIG",
            message: `Consecutive low Visual Information Gain (score ${vigScore}/5, level '${res.vigLevel}') at scene ${sc.id} (index ${i})`,
          });
        }
      } else {
        consecutiveLowVig = 0;
      }

      // Rule 2: Zero decorative wallpaper (VIG 0) on conceptual argumentation beats
      if (vigScore === 0 && res.proposition) {
        vigViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 11: Decorative Wallpaper in Conceptual Beat",
          message: `Scene ${sc.id} has VIG 0 (decorative) despite active proposition "${res.proposition.claim}"`,
        });
      }

      // Rule 3: Anti-stagnation: Static motif repetition without state progression or camera shift
      if (i >= 2) {
        const p0 = scenes[i - 2].props?.[0];
        const p1 = scenes[i - 1].props?.[0];
        const p2 = sc.props?.[0];
        if (
          p0 && p1 && p2 &&
          p0.type === p1.type && p1.type === p2.type &&
          (p0.stateIndex ?? 0) === (p1.stateIndex ?? 0) &&
          (p1.stateIndex ?? 0) === (p2.stateIndex ?? 0) &&
          scenes[i - 2].shot === scenes[i - 1].shot &&
          scenes[i - 1].shot === sc.shot
        ) {
          vigViolations.push({
            sceneId: sc.id,
            index: i,
            rule: "Gate 11: Static Visual Stagnation",
            message: `Static motif "${p2.type}" frozen across beats ${i - 2}..${i} without state progression or shot variation`,
          });
        }
      }

      // Rule 4: State Machine Wrap-Around Ban: Never reset from >0 back to 0 without world change
      if (i > 0) {
        const prevProp = scenes[i - 1].props?.[0];
        const currProp = sc.props?.[0];
        if (
          prevProp && currProp &&
          prevProp.type === currProp.type &&
          typeof prevProp.stateIndex === "number" &&
          typeof currProp.stateIndex === "number"
        ) {
          if (prevProp.stateIndex > 0 && currProp.stateIndex === 0) {
            vigViolations.push({
              sceneId: sc.id,
              index: i,
              rule: "Gate 11: Illegal State Wrap-Around",
              message: `Prop "${currProp.type}" illegally wrapped around from state ${prevProp.stateIndex} back to 0 at scene ${sc.id}`,
            });
          }
        }
      }

      // Rule 5: Critical causal/thesis beat floor: Causal & consequence claims require VIG >= 2.5
      if ((cType === "causal" || cType === "consequence") && vigScore < 2.5) {
        vigViolations.push({
          sceneId: sc.id,
          index: i,
          rule: "Gate 11: Critical Causal Beat VIG Floor",
          message: `Scene ${sc.id} asserts a ${cType} claim but has insufficient VIG (${vigScore}/5.0 < 2.5)`,
        });
      }
    }

    // VIG REWARDED DECORATION, AND HAD TO STOP.
    //
    // Every term in the VIG formula needs a PROP or a DIAGRAM, so removing an
    // unrelated clock LOWERED the score of the scene it was cluttering. Measured
    // on `hoot`: with filler motifs on screen the book passed this gate; with the
    // filler removed — the same film, now showing only what its narration
    // grounds — average VIG fell to 1.76 and 95% of scenes read "low". A gate
    // that moves that way does not measure information gain, it measures how
    // much has been drawn, and following it converges on clutter.
    //
    // A beat whose narration grounds no depictable concept owes no diagram: its
    // information IS the people, the place and the line landing on the spoken
    // word. Such scenes are excluded from the two budget rules below, so the
    // budget still bites exactly where it should — on beats that COULD have
    // carried a picture and didn't. Gate 12 checks that those excluded scenes
    // really are doing their job.
    const carriesNoPicture = (sc) => !!(sc && sc._contract && sc._contract.motifJustified === false
      && Array.isArray(sc._contract.subjects) && sc._contract.subjects.length > 0);
    const budgetScenes = scenes.filter((sc) => !carriesNoPicture(sc));
    const budgetTotalVig = budgetScenes.reduce((a, sc) => a + (typeof sc.vigScore === "number" ? sc.vigScore : 1), 0);

    // Rule 6: Average VIG score floor across the entire video (>= 2.5/5.0)
    const avgVig = budgetScenes.length > 0 ? budgetTotalVig / budgetScenes.length : 0;
    if (budgetScenes.length > 0 && avgVig < 2.5) {
      vigViolations.push({
        sceneId: "ALL",
        index: -1,
        rule: "Gate 11: Low Average VIG Score",
        message: `Average VIG score across video is ${avgVig.toFixed(2)}/5.0 (minimum required: 2.5)`,
      });
    }

    // Rule 7: Pacing Budget: Low VIG scenes (score <= 2.0) allowed for dialogue/reaction/character drama, capped at <= 35% of all scenes
    const lowVigCount = budgetScenes.filter((s) => (typeof s.vigScore === "number" ? s.vigScore : 1) <= 2.0).length;
    const lowVigRatio = budgetScenes.length > 0 ? lowVigCount / budgetScenes.length : 0;
    const maxLowVigBudget = 0.35;
    if (lowVigRatio > maxLowVigBudget) {
      vigViolations.push({
        sceneId: "ALL",
        index: -1,
        rule: "Gate 11: Low-VIG Pacing Budget Exceeded",
        message: `Low VIG scenes (score <= 2.0) account for ${(lowVigRatio * 100).toFixed(1)}% of video (maximum allowed: ${(maxLowVigBudget * 100).toFixed(1)}%)`,
      });
    }
  }

  evaluateSemanticAndVigGates(config);

  // ── BEAT VISUAL FIDELITY (Gate 12) ──────────────────────────────────────
  // Every gate above this one measures PRESENTATION: rhythm, promise/payoff,
  // stagnation, novelty, event density. All eleven passed on a plan that showed
  // a Classical Athenian Polis in a Carl Hiaasen novel and staged a two-person
  // assault as one man looking at a clock. Presentation quality is not semantic
  // quality, so the composite score cannot be the last word: a book that does
  // not show what it is talking about is not S tier at any rhythm.
  let fidelity = null;
  try {
    fidelity = require("./lib/fidelity").scoreBook(config);
  } catch (e) {
    fidelity = null; // no contracts in this config (older book) -> gate abstains
  }

  if (autoFix && (worldViolations.length > 0 || propositionViolations.length > 0 || vigViolations.length > 0)) {
    console.log(`  [AUTO-FIX] Enforcing Semantic Relevance, State Machines & VIG Floor for ${slug}...`);
    config = enforceSemanticRelevance(config, { isAncient });
    fs.writeFileSync(p, JSON.stringify(config, null, 2), "utf8");
    evaluateSemanticAndVigGates(config);
    console.log(`  [AUTO-FIX] Repaired: 10A violations: ${worldViolations.length}, 10B violations: ${propositionViolations.length}, 11 violations: ${vigViolations.length}`);
  }

  const worldPassed = worldViolations.length === 0;
  const propositionPassed = propositionViolations.length === 0;
  const vigPassed = vigViolations.length === 0;

  // Evaluate the Hard Gates
  const gateChecks = [
    {
      gate: 1,
      name: "Narrative Health (Golden Rules)",
      passed: audit.diagnostics.narrativePassed,
      detail: audit.diagnostics.narrativePassed ? "Zero explanation streaks / droughts" : "Narrative fatigue detected",
    },
    {
      gate: 2,
      name: "Promise & Curiosity Integrity",
      passed: audit.diagnostics.promisesPassed,
      detail: audit.diagnostics.promisesPassed ? "100% promises resolved with earned payoffs" : "Dangling promises / orphan payoffs",
    },
    {
      gate: 3,
      name: "Visual Freshness (Zero Stagnation)",
      passed: audit.diagnostics.stagnationPassed,
      detail: audit.diagnostics.stagnationPassed ? "Zero visual state repetition streaks" : "Visual stagnation alert",
    },
    {
      gate: 4,
      name: "Visual Novelty Budget",
      passed: audit.diagnostics.noveltyPassed,
      detail: audit.diagnostics.noveltyPassed ? "Optimal novelty distribution (metaphors, splits, diagrams)" : "Novelty drought (>60s)",
    },
    {
      gate: 5,
      name: "Chapter Curiosity Cycles",
      passed: audit.diagnostics.chaptersPassed,
      detail: audit.diagnostics.chaptersPassed ? "All chapters follow Question → Turn → Payoff" : "Chapter arc deficits",
    },
    {
      gate: 6,
      name: "Cognitive Compression Architecture",
      passed: (config.scenes || []).every((s) => !s.diagram || s.characters?.length === 0 || s.characters?.[0]?.scale <= 0.65),
      detail: "Characters yield stage focal point to hero diagrams",
    },
    {
      gate: 7,
      name: "Audio Director Punctuation",
      passed: audit.diagnostics.audioPassed,
      detail: audit.diagnostics.audioPassed ? "100% payoffs & chapter cards punctured with tactile SFX" : "Missing audio punch",
    },
    {
      gate: 8,
      name: "Holistic Retention Score (>= 85)",
      passed: audit.score >= 85,
      detail: `Retention score ${audit.score}/100 [${audit.grade}]`,
    },
    {
      gate: 9,
      name: "Visual Contract Compliance",
      passed: contractPassed,
      detail: contractPassed
        ? "100% scenes satisfy visual contracts (0 forbidden motifs, characters preserved)"
        : `${contractViolations.length} visual contract violations detected`,
    },
    {
      gate: "10A",
      name: "World & Era Integrity (0 Anachronisms)",
      passed: worldPassed,
      detail: worldPassed
        ? "100% scenes historically and environmentally coherent (0 modern intrusions)"
        : `${worldViolations.length} era integrity / anachronism violations detected`,
    },
    {
      gate: "10B",
      name: "Propositional & Causal Integrity",
      passed: propositionPassed,
      detail: propositionPassed
        ? "100% scenes visually embody philosophical claim & causal mechanism"
        : `${propositionViolations.length} proposition / causal dissonance violations detected`,
    },
    {
      gate: 11,
      name: "Visual Information Gain & Dynamic Progression",
      passed: vigPassed,
      detail: vigPassed
        ? "Zero consecutive low-VIG scenes & active state-machine progression"
        : `${vigViolations.length} VIG deficits or static freezing violations detected`,
    },
    {
      gate: 12,
      name: "Beat Visual Fidelity (>= 90)",
      // A config with no semantic contracts predates this check; the gate
      // abstains rather than failing a book it cannot measure.
      passed: !fidelity || fidelity.score >= 90,
      detail: !fidelity
        ? "no semantic contracts in this config — re-plan to measure"
        : `${fidelity.score.toFixed(1)}/100 · ${fidelity.perfect}/${fidelity.scored} scenes meet their contract` +
          (fidelity.score >= 90 ? "" : ` · ${fidelity.failed} show none of what they owe`),
    },
  ];

  const allPassed = gateChecks.every((g) => g.passed);

  return {
    slug,
    allPassed,
    score: audit.score,
    grade: audit.grade,
    gateChecks,
    violations: [
      ...(audit.allViolations || []),
      ...contractViolations,
      ...worldViolations,
      ...propositionViolations,
      ...vigViolations,
    ],
  };
}

function printGateReport(r) {
  const symbol = r.allPassed ? "✓" : "✗";
  const status = r.allPassed ? "PASSED — GREEN LIGHT TO RENDER" : "BLOCKED — HARD GATE VIOLATION";

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║  ANTIDOTE GOD MODE: PRE-RENDER HARD GATES                     ║`);
  console.log(`║  ${r.slug.padEnd(60)}  ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`  Decision:                  [${symbol}] ${status}`);
  console.log(`  Composite Retention Score: ${String(r.score).padStart(3)} / 100  [${r.grade}]`);

  console.log(`\n── Gate Verification Checklist ──────────────────────────────────`);
  for (const g of r.gateChecks) {
    const icon = g.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [GATE ${g.gate}] ${g.name.padEnd(36)} [${icon}]  ${g.detail}`);
  }

  if (!r.allPassed) {
    console.log(`\n── Critical Blocking Violations (${r.violations.length}) ──────────────────────`);
    for (const v of r.violations.slice(0, 8)) {
      console.log(`  ⚠ [${v.system || "Gate"}] ${v.rule || v.message}`);
    }
    console.log(`\n  Run with '--auto-fix' to let Antidote autonomously repair all deficits.`);
  }

  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);
}

function main() {
  if (args.slug) {
    const res = evaluateGates(args.slug, AUTO_FIX);
    printGateReport(res);
    if (!res.allPassed) process.exit(1);
    process.exit(0);
  }

  if (args.all) {
    const booksDir = path.resolve(__dirname, "../books");
    const slugs = fs.readdirSync(booksDir).filter((d) => {
      const cp = path.join(booksDir, d, "config.antidote.json");
      return fs.existsSync(cp);
    });

    console.log(`\n══ VERIFYING PRE-RENDER HARD GATES ACROSS CATALOGUE (${slugs.length} BOOKS) ══`);
    const results = [];

    for (const slug of slugs) {
      const res = evaluateGates(slug, AUTO_FIX);
      results.push(res);
    }

    console.log(`\n══ CATALOGUE PRE-RENDER HARD GATES SUMMARY ══`);
    console.log("Slug".padEnd(34) + "Score".padStart(7) + "Failed Gates".padStart(15) + "Decision".padStart(14));
    console.log("─".repeat(70));

    let failedCount = 0;
    for (const r of results) {
      if (!r.allPassed) failedCount++;
      const failedGates = r.gateChecks.filter((g) => !g.passed).map((g) => g.gate).join(",") || "None (0)";
      const decision = r.allPassed ? "GREEN LIGHT" : "BLOCKED";
      console.log(
        r.slug.padEnd(34) +
        String(r.score).padStart(7) +
        failedGates.padStart(15) +
        decision.padStart(14)
      );
    }
    console.log("─".repeat(70));
    console.log(`Result: ${results.length - failedCount}/${results.length} books cleared for production render.\n`);

    if (failedCount > 0) process.exit(1);
    process.exit(0);
  }

  console.log("Usage: node scripts/hard-gate.js --slug=<slug> [--auto-fix] | --all [--auto-fix]");
  process.exit(1);
}

main();
