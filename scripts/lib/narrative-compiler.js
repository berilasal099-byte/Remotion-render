/**
 * narrative-compiler.js — Narrative Beat Compiler 2.0 (Beat Intent & Visual Contract)
 *
 * Transforms flat narration text into deep visual storytelling intent:
 *   - Event extraction (action, target, event type)
 *   - Character states & relational tension
 *   - Narrative & Visual intent
 *   - Visual Contract (mustShow, mustNotShow)
 *   - Antidote engine constraints (shot preferences, forbidden shots/motifs)
 *
 * Guiding Principle: "Randomness can choose STYLE. It can never choose MEANING."
 */

const { CONCEPT_LEXICON } = require("./antidote-director");

// ── Contextual Negative Constraints ──────────────────────────────────────────
// Motifs that are strictly forbidden in non-financial contexts (e.g. YA, fiction, philosophy)
// unless the beat explicitly mentions monetary transactions or currency.
const FINANCIAL_MOTIFS = [
  "coin",
  "moneyRain",
  "dollarExchange",
  "funnelMetrics",
  "wallet",
];

const TECH_BUSINESS_MOTIFS = [
  "codeWindow",
  "laptopMockup",
  "rocketLaunch",
  "serverRoom",
  "pitchStage",
  "startupGarage",
];

const MONEY_KEYWORDS = /\$|\b(money|dollars?|cash|wealth|salary|income|cents?|buy|bought|price|cost|invest|bank|finance|currency)\b/i;
const TECH_KEYWORDS = /\b(code|coding|software|programmer|startup|server|app|algorithm|silicon valley|tech company)\b/i;

// Event and emotional classification patterns
const EVENT_PATTERNS = [
  {
    type: "social_pressure",
    re: /\b(shun(?:ning|ned)?|peer pressure|panopticon|surveillance|mob|herd|conformity|conform|uniformity|invisible|erased)\b/i,
    action: "shun_or_police",
    target: "outsider",
    preferredConcepts: ["chains", "mask", "shadowSelf", "target"],
    preferredShots: ["crowd", "silhouette", "split", "medium"],
  },
  {
    type: "characterization",
    re: /\b(apathy|dormancy|anchor|unbothered|care about nothing|marshal|cool kid|indifferen(?:t|ce)|chill)\b/i,
    action: "detach",
    target: "social_hierarchy",
    preferredConcepts: ["shield", "mask", "shadowSelf", "spotlight"],
    preferredShots: ["medium", "closeUp", "diorama", "overShoulder"],
  },
  {
    type: "compassion_treason",
    re: /\b(comfort(?:ing|ed)?|cradl(?:ing|ed)|injured|agony|broken|enemy|opponent|mercy|tender|gentle)\b/i,
    action: "comfort",
    target: "enemy",
    preferredConcepts: ["heart", "medical", "shield", "balance"],
    preferredShots: ["twoShot", "closeUp", "medium", "diorama"],
  },
  {
    type: "rebellion_freedom",
    re: /\b(ukulele|singing|birthday|rat|cinnamon|dandelion|sunflower|spontaneous|quirky|freak|free|cheer)\b/i,
    action: "defy_norms",
    target: "conformity",
    preferredConcepts: ["star", "butterfly", "spotlight", "zap"],
    preferredShots: ["medium", "illustration", "diorama", "split"],
  },
  {
    type: "intimacy_betrayal",
    re: /\b(loves?|boyfriend|coward(?:ice)?|plead(?:ing)?|beg(?:ging)?|embarrass(?:ed)?|hide|hiding|closet|locker|normal|susan)\b/i,
    action: "betray_or_pressure",
    target: "partner",
    preferredConcepts: ["heart", "crack", "mirror", "mask", "chains"],
    preferredShots: ["twoShot", "overShoulder", "split", "closeUp"],
  },
  {
    type: "defeat_desolation",
    re: /\b(empty|deserted|parking lot|nobody|alone|abandoned|silence|failure|broken|shatter)\b/i,
    action: "isolate",
    target: "self",
    preferredConcepts: ["crack", "shadowSelf", "storm", "grave"],
    preferredShots: ["silhouette", "wide", "lowAngle", "medium"],
  },
  {
    type: "wisdom_closure",
    re: /\b(bones?|skull|fossil|paleontol|archie|miracle|remember|decades?|years later|regret|wisdom)\b/i,
    action: "reflect",
    target: "human_condition",
    preferredConcepts: ["compass", "hourglass", "lightbulb", "tree"],
    preferredShots: ["twoShot", "medium", "diorama", "closeUp"],
  },
];

function extractEntities(words, cast) {
  // A possessive is still the person. Without stripping it, "Roy's face",
  // "Roy's temples" and "Roy's name" never matched the cast, so the book's
  // protagonist was absent from most of his own beats and no two-hander was
  // ever detected.
  const lowerWords = words.map((w) => String(w).toLowerCase().replace(/[^a-z0-9']/g, "").replace(/'s$/, ""));
  const matched = [];

  for (const [key, c] of Object.entries(cast || {})) {
    const tokens = new Set();
    const names = [c.name, ...(c.aliases || []), key];
    if (key.toLowerCase() === "starirl" || key.toLowerCase() === "stargirl") {
      names.push("stargirl", "starirl", "susan");
    }
    if (key.toLowerCase() === "wayne") {
      names.push("wayne", "parr");
    }
    if (key.toLowerCase() === "kimble") {
      names.push("hillari", "hillary", "kimble");
    }
    if (key.toLowerCase() === "archie") {
      names.push("archie", "brubaker");
    }

    for (const name of names) {
      if (!name) continue;
      String(name)
        .toLowerCase()
        .split(/[^a-z0-9']+/)
        .forEach((t) => {
          if (t.length > 2 && !["mr", "mrs", "the", "and"].includes(t)) tokens.add(t);
        });
    }

    if (lowerWords.some((w) => tokens.has(w))) {
      matched.push({ key, name: c.name || key, entry: c });
    }
  }

  return matched;
}

function compileNarrativeBeat({
  index,
  total,
  from,
  text,
  said,
  bible,
  genre,
  prevBrief = null,
}) {
  const fullText = (said || text || "").trim();
  const words = fullText.split(/\s+/);
  const isFictionOrYA = /young adult|ya|fiction|literature|novel|romance|drama/i.test(genre || "");
  const hasMoneyContext = MONEY_KEYWORDS.test(fullText);
  const hasTechContext = TECH_KEYWORDS.test(fullText);

  // 1. Entities
  let entities = extractEntities(words, bible && bible.cast);

  // ── PRONOUN CARRY-OVER ───────────────────────────────────────────────────
  // Two hosts talking about a book name a person once and then say "he" for the
  // next forty seconds. Matching only literal names left most beats with no
  // subject at all — 38.5% of `hoot` scored `thin`, i.e. the picture claimed
  // nothing — even though a human listener knows exactly who is being discussed.
  // So a beat with no name of its own, but with a third-person pronoun, inherits
  // the previous beat's people. It decays after a few beats (`_carry`), because
  // an antecedent that old is a guess, not a reference, and any new name breaks
  // the chain immediately.
  const CARRY_LIMIT = 4;
  let carryDepth = 0;
  if (!entities.length && prevBrief && Array.isArray(prevBrief.entities) && prevBrief.entities.length) {
    const hasPronoun = /\b(he|him|his|she|her|hers|they|them|their)\b/i.test(fullText);
    const prevDepth = Number(prevBrief._carry || 0);
    if (hasPronoun && prevDepth < CARRY_LIMIT) {
      const cast = (bible && bible.cast) || {};
      const carried = prevBrief.entities
        .filter((k) => cast[k])
        .map((k) => ({ key: k, name: cast[k].name || k, entry: cast[k] }));
      if (carried.length) {
        entities = carried;
        carryDepth = prevDepth + 1;
      }
    }
  }
  const entityKeys = entities.map((e) => e.key);

  // 2. Event & Narrative Function
  let matchedEvent = null;
  for (const ep of EVENT_PATTERNS) {
    if (ep.re.test(fullText)) {
      matchedEvent = ep;
      break;
    }
  }

  const beatType = matchedEvent ? matchedEvent.type : (entities.length ? "characterization" : "philosophy");
  const action = matchedEvent ? matchedEvent.action : (entities.length ? "observe" : "explain");
  const target = matchedEvent ? matchedEvent.target : "concept";

  // 3. Narrative & Visual Intent
  let narrativeIntent = "";
  let visualIntent = "";
  if (beatType === "social_pressure" || fullText.includes("shun")) {
    narrativeIntent = "Expose how collective silence and social panopticon erase nonconforming individuals";
    visualIntent = "Subject surrounded by cold silhouette crowd or cold empty space, feeling the weight of the panopticon";
  } else if (beatType === "compassion_treison") {
    narrativeIntent = "Highlight the high crime of extending grace to an opponent in tribal competition";
    visualIntent = "Hero cradling or reaching towards the outsider in direct defiance of the surrounding arena";
  } else if (beatType === "intimacy_betrayal") {
    narrativeIntent = "Dramatize the devastating betrayal when someone asks you to conform to expectations";
    visualIntent = "Intimate two-shot friction: confronting party in anguish, asking the subject to shrink";
  } else if (beatType === "defeat_desolation") {
    narrativeIntent = "Show the total failure of the conformity bargain: isolation after surrender";
    visualIntent = "Wide silhouette shot of lone figure standing in overwhelming empty space";
  } else {
    narrativeIntent = `Dramatize the thematic conflict of ${beatType.replace(/_/g, " ")}`;
    visualIntent = entities.length
      ? `${entities.map((e) => e.name).join(" and ")} staged in direct relation to the core idea`
      : "Visual metaphor dramatizing the underlying argument";
  }

  // 4. MustShow & MustNotShow Visual Contract
  const mustShow = [];
  const mustNotShow = [];

  if (bible && bible.world && Array.isArray(bible.world.forbid)) {
    mustNotShow.push(...bible.world.forbid);
  }

  if (entities.length > 0 || beatType === "characterization" || beatType === "intimacy_betrayal") {
    mustShow.push("characters");
    entities.forEach((e) => mustShow.push(e.key));
  }

  if ((isFictionOrYA || !hasMoneyContext) && !hasMoneyContext) {
    mustNotShow.push(...FINANCIAL_MOTIFS);
  }

  if (!hasTechContext) {
    mustNotShow.push(...TECH_BUSINESS_MOTIFS);
  }

  let conceptCandidate = null;
  if (matchedEvent && matchedEvent.preferredConcepts) {
    conceptCandidate = matchedEvent.preferredConcepts[0];
  }

  if (!conceptCandidate && bible && bible.objects) {
    for (const obj of bible.objects) {
      const cRe = CONCEPT_LEXICON.find(([cName]) => cName === obj.concept);
      if (cRe && cRe[1].test(fullText)) {
        conceptCandidate = obj.concept;
        break;
      }
    }
  }

  const forbiddenShots = [];
  if (mustShow.includes("characters") && entities.length > 0) {
    forbiddenShots.push("insert");
  }

  const shotPreference = (matchedEvent && matchedEvent.preferredShots) || (entities.length >= 2 ? ["twoShot", "overShoulder", "split"] : ["medium", "diorama", "closeUp"]);

  const isAncientOrPhilosophy = /philosophy|ancient|classical|history|classics|stoic|greek|roman/.test(String(genre || "").toLowerCase()) ||
    (bible && bible.world && (bible.world.era?.includes("ancient") || bible.world.era?.includes("classical") || (bible.world.approxYear != null && bible.world.approxYear < 500)));

  // A book's geography is the story bible's claim. Two things went wrong here:
  //   * `declaredPlaces[0]` was a bible KEY (`busWindow`), not a backdrop name,
  //     so the default place was never a set the engine can draw.
  //   * the modern branch below is a five-word lexicon that never consulted the
  //     bible, and `place` inherits from the previous beat indefinitely. One hit
  //     on `injury` put six minutes of a Florida vacant-lot story in a HOSPITAL,
  //     and bare `law` asked for a COURTROOM the book never enters.
  // The bible's own places are checked first, and when a book declares its
  // geography the generic lexicon may only pick from it.
  const biblePlaceList = bible && bible.places ? Object.values(bible.places).filter((p) => p && p.set) : [];
  const declaredSets = new Set(biblePlaceList.map((p) => p.set));
  const biblePlaceWords = biblePlaceList
    .filter((p) => Array.isArray(p.keywords) && p.keywords.length)
    .map((p) => [
      new RegExp("\\b(" + p.keywords
        .map((k) => String(k).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .filter(Boolean).join("|") + ")\\b", "i"),
      p.set,
    ]);
  const defaultPlace = biblePlaceList.length ? biblePlaceList[0].set : (isAncientOrPhilosophy ? "agora" : "room");
  let place = (prevBrief && prevBrief.place) || defaultPlace;

  if (isAncientOrPhilosophy) {
    if (/\b(agora|marketplace|acropolis|assembly|pnyx|polis|square)\b/i.test(fullText)) place = "agora";
    else if (/\b(colonnade|temple|portico|columns?|stoa|atrium|pediment)\b/i.test(fullText)) place = "colonnade";
    else if (/\b(cave|cavern|underground|stalactite|shadows? on the wall|chained)\b/i.test(fullText)) place = "cave";
    else if (/\b(ship|galley|trireme|deck|mast|sail|rudder|helm|pilot|sea|waves)\b/i.test(fullText)) place = "shipDeck";
    else if (/\b(manuscript|scroll|parchment|papyrus|treatise|writing|dialogue)\b/i.test(fullText)) place = "manuscript";
    else if (place === "classroom" || place === "hospital" || place === "office" || place === "kitchen" || place === "bedroom") {
      place = "agora";
    }
  } else {
    const bibleHit = biblePlaceWords.find(([re]) => re.test(fullText));
    if (bibleHit) place = bibleHit[1];
    else {
      let guess = null;
      if (/\b(hospital|ambulance|clinic|injury)\b/i.test(fullText)) guess = "hospital";
      else if (/\b(court|law|trial|judge)\b/i.test(fullText)) guess = "court";
      else if (/\b(school|classroom|schoolyard|lecture hall)\b/i.test(fullText)) guess = "classroom";
      else if (/\b(office|boardroom|workplace)\b/i.test(fullText)) guess = "office";
      else if (/\b(street|sidewalk|avenue)\b/i.test(fullText)) guess = "street";
      if (guess && (!declaredSets.size || declaredSets.has(guess))) place = guess;
    }
    // An inherited place the book never declared is not geography, it is drift.
    if (declaredSets.size && !declaredSets.has(place)) place = defaultPlace;
  }

  // ── THE SEMANTIC CONTRACT ────────────────────────────────────────────────
  // What this beat OWES the screen, derived from the beat's own spoken words.
  // The pipeline ran narration -> visual category -> motif -> composition, so a
  // motif was the DEFAULT and the staging was arranged around whatever the
  // grammar happened to draw. That is how "Dana is mushing Roy's face against
  // the window glass" became ONE adult figure looking at a CLOCK. The contract
  // inverts the order: subjects and their interaction are required; a motif is
  // permitted only when the narration actually grounds one.
  const INTERACTION_RE = /\b(push(?:e[sd])?|shov(?:e|es|ed)|grab(?:s|bed)?|hold(?:s|ing)?|held|drag(?:s|ged)?|pin(?:s|ned)?|hits?|punch(?:e[sd])?|squeez(?:e|es|ed)|mush(?:ing|es|ed)?|digg?(?:s|ing)?|chase(?:s|d)?|confront(?:s|ed)?|yell(?:s|ed|ing)?|scream(?:s|ed|ing)?|threaten(?:s|ed)?|tells?|told|asks?|asked|answer(?:s|ed)?|calls?|called|faces?|against|argue(?:s|d)?|interrupt(?:s|ed)?|bully|bullies|bullied|arrest(?:s|ed)?|hands?|handed)\b/i;
  const actionMatch = fullText.match(INTERACTION_RE);
  const interaction = entities.length >= 2 && !!actionMatch;

  // A motif is JUSTIFIED only when a concept was found by matching THIS beat's
  // own words -- `conceptCandidate` above is exactly that test against the
  // bible's objects. A concept suggested by the beat-type event table is not
  // grounded in anything spoken, so it does not license a picture.
  // Same standard the relevance audit applies: an icon is grounded when the
  // concept's OWN vocabulary is in this beat's words. The bible's objects rank
  // first (they are the book's recurring subjects), but a general concept the
  // narration plainly states is grounded too — "drive them right off the cliff"
  // earns a `ledge`, and refusing it would suppress correct pictures along with
  // the filler. What stays banned is a concept nothing in the beat says.
  let groundedConcept = conceptCandidate;
  if (!groundedConcept) {
    for (const [cName, cRe] of CONCEPT_LEXICON) {
      if (mustNotShow.includes(cName)) continue;
      if (cRe.test(fullText)) { groundedConcept = cName; break; }
    }
  }
  const motifJustified = !!groundedConcept;

  const contract = {
    subjects: entities.map((e) => e.key),
    subjectNames: entities.map((e) => e.name),
    action: actionMatch ? actionMatch[0].toLowerCase() : null,
    interaction,
    setting: place || null,
    motifJustified,
    motifConcept: groundedConcept || null,
    // A gaze follows meaning, never decoration.
    gaze: interaction ? "partner" : motifJustified ? "motif" : "viewer",
    requiredVisuals: [
      ...entities.map((e) => e.key),
      ...(interaction ? ["physical_interaction"] : []),
      ...(place ? [place] : []),
    ],
  };
  if (interaction) {
    mustShow.push("interaction");
    // A two-hander cannot be told in a single: the second person IS the beat.
    forbiddenShots.push("insert", "illustration", "closeUp", "silhouette");
  }

  // THE SUBJECT IS WHAT THE BEAT IS ABOUT — not what kind of beat it is.
  // This used to fall back to the beat TYPE, so 120 of `hoot`'s 244 scenes
  // declared their subject to be "philosophy", a word the narration never says,
  // in a Carl Hiaasen novel. `audit-relevance` grounds a scene by checking the
  // stated subject against the spoken words, so a type label read as a lie and
  // scored `unrelated` — that single fallback, not the motifs, was the largest
  // share of the book's 44.7% wrong.
  // A beat with no named person and no grounded concept now states NO subject.
  // That is honest: the audit scores it `thin` (nothing claimed) instead of
  // `unrelated` (claimed something untrue), and the deficit is visible.
  const subject = entities.length
    ? `${entities.map((e) => e.name).join(" & ")}${actionMatch ? " — " + actionMatch[0].toLowerCase() : ""}`
    : (conceptCandidate || null);

  return {
    subject,
    entities: entityKeys,
    event: {
      type: beatType,
      action,
      target,
    },
    state: entities.reduce((acc, e) => {
      acc[e.key] = e.key === "wayne" ? "emotionally_detached" : e.key === "starirl" ? "unapologetic" : "protective_conformist";
      return acc;
    }, {}),
    relationship: entities.length >= 2 ? { [`${entities[0].key}_to_${entities[1].key}`]: action } : {},
    beatType,
    narrative_intent: narrativeIntent,
    visual_intent: visualIntent,
    mustShow,
    mustNotShow: Array.from(new Set(mustNotShow)),
    contract,
    _carry: carryDepth,
    place,
    confidence: entities.length ? 0.92 : (conceptCandidate ? 0.78 : 0.65),
    antidote: {
      concept: conceptCandidate,
      set: place,
      cast: entityKeys,
      shotPreference,
      forbiddenShots,
      forbiddenMotifs: Array.from(new Set(mustNotShow)),
    },
  };
}

module.exports = {
  compileNarrativeBeat,
  FINANCIAL_MOTIFS,
  TECH_BUSINESS_MOTIFS,
};
