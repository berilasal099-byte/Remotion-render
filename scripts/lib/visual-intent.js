/**
 * visual-intent.js — Visual Intent & Semantic Relevance Engine (Antidote 6.1)
 *
 * Closes the semantic dissonance / "illustrated radio" gap:
 * Connects the spoken philosophical or narrative idea to the world and objects on screen.
 *
 * Core components:
 * 1. extractVisualClaim: extracts core conceptual assertions & metaphors from narration.
 * 2. scoreSemanticRelevance: scores scene candidate alignment (0–10).
 * 3. enforceSemanticRelevance: guarantees zero anachronisms, thematic continuity, and
 *    mandatory conceptual motifs for foundational book passages.
 */

const PHILOSOPHICAL_WORLDS = {
  ringOfGyges: {
    id: "ringOfGyges",
    name: "The Ring of Gyges",
    set: "colonnade",
    defaultShot: "illustration",
    states: [
      {
        index: 0,
        phase: "discovery_artifact",
        claim: "The shepherd discovers a mysterious golden signet ring in a chasm",
        visualMode: "metaphor",
        shot: "insert",
        re: /\b(discovered a ring|found a ring|shepherd'?s ring|golden ring|chasm|bronze horse|ring of (gyges|gajis))\b/i,
      },
      {
        index: 1,
        phase: "inward_turn_vanish",
        claim: "Turning the collet inward grants total invisible impunity",
        visualMode: "transformation",
        shot: "illustration",
        re: /\b(turned (the )?(collet|ring) inward|invisib(le|ility)|unseen|vanish(ed|ing)?|nobody (can )?see)\b/i,
      },
      {
        index: 2,
        phase: "moral_bifurcation",
        claim: "Glaucon's challenge: Would any man remain moral if actions had zero consequences?",
        visualMode: "character_drama",
        shot: "split",
        re: /\b(glaucon'?s challenge|remain just|moral choice|social contract|would you steal|act with impunity|two rings)\b/i,
      },
      {
        index: 3,
        phase: "tyrant_vs_martyr",
        claim: "The ultimate test: The unjust man praised and crowned vs the just man tortured and despised",
        visualMode: "comparison_split",
        shot: "beforeAfter",
        re: /\b(unjust man|just man|praised and crowned|crucified|scourged|justice for its own sake)\b/i,
      },
    ],
  },

  caveAllegory: {
    id: "caveAllegory",
    name: "The Allegory of the Cave",
    set: "cave",
    defaultShot: "insert",
    states: [
      {
        index: 0,
        phase: "shadows_on_wall",
        claim: "Chained prisoners from childhood mistake cast shadows for absolute reality",
        visualMode: "spatial_state",
        shot: "insert",
        re: /\b(shadows? on the wall|cave wall|shackled|prisoners? in the cave|cannot turn their heads|illusion)\b/i,
      },
      {
        index: 1,
        phase: "puppeteers_fire",
        claim: "Behind the screen, puppet-masters carry statues before a blazing artificial fire",
        visualMode: "causal_diagram",
        shot: "illustration",
        re: /\b(fire behind|blazing fire|puppet-?masters?|artifacts? carried|parapet|firelight)\b/i,
      },
      {
        index: 2,
        phase: "broken_chains_ascent",
        claim: "Release and turning around: The painful blinding shock of facing the light",
        visualMode: "character_drama",
        shot: "medium",
        re: /\b(broken chains|turn around|stand up|pain in the eyes|dragged upward|steep ascent|rough path|fight the person dragging|turn back to the (comforting )?darkness|painful)\b/i,
      },
      {
        index: 3,
        phase: "blinding_sunlight_good",
        claim: "Emerging into the blinding daylight: The Sun representing the Form of the Good",
        visualMode: "transformation",
        shot: "wide",
        re: /\b(sunlight|the sun represents the good|source of all truth|form of the good|true knowledge|outside the cave)\b/i,
      },
    ],
  },

  tripartiteSoul: {
    id: "tripartiteSoul",
    name: "The Tripartite Soul",
    set: "colonnade",
    defaultShot: "illustration",
    states: [
      {
        index: 0,
        phase: "triad_hierarchy",
        claim: "The architecture of the soul: Rational Charioteer, Spirited Steed, and Appetite Beast",
        visualMode: "causal_diagram",
        shot: "illustration",
        re: /\b(tripartite soul|three parts of the soul|logistikon|charioteer|two horses|internal structure of the soul)\b/i,
      },
      {
        index: 1,
        phase: "appetite_mutiny",
        claim: "When appetite expands without limit, insatiable desire mutinies against reason",
        visualMode: "character_drama",
        shot: "closeUp",
        re: /\b(appetite|infinite appetite|desires mutiny|stress eat|addiction|bodily urges|craving|appetitive)\b/i,
      },
      {
        index: 2,
        phase: "spirited_indignation",
        claim: "The spirited element (thumos) allies with reason in indignation against debased urges",
        visualMode: "transformation",
        shot: "medium",
        re: /\b(thumos|spirited (part|element)|anger at oneself|leontius|corpses|honor|indignation)\b/i,
      },
      {
        index: 3,
        phase: "rational_harmony",
        claim: "Inner harmony: Reason holds the reins, establishing internal peace and justice",
        visualMode: "metaphor",
        shot: "insert",
        re: /\b(inner harmony|balance the soul|reason holds the reins|peace within|justice in the soul)\b/i,
      },
    ],
  },

  shipOfState: {
    id: "shipOfState",
    name: "The Ship of State",
    set: "shipDeck",
    defaultShot: "insert",
    states: [
      {
        index: 0,
        phase: "quarreling_crew",
        claim: "The ship of state: Quarrelsome sailors competing for control without navigational science",
        visualMode: "character_drama",
        shot: "twoShot",
        re: /\b(picture a ship|sailors quarreling|quarreling over the helm|no knowledge of navigation|ship owner is big and strong)\b/i,
      },
      {
        index: 1,
        phase: "mutiny_at_helm",
        claim: "Populist mutiny: Drugging the true captain, feasting, and sailing aimlessly",
        visualMode: "transformation",
        shot: "insert",
        re: /\b(mutiny|mutinous|swarm the helm|swarm the ship owner|feast and drink|drugging the (captain|owner)|pure manipulation|politicians)\b/i,
      },
      {
        index: 2,
        phase: "isolated_stargazer",
        claim: "The true navigator: Ignored as a useless stargazer while he studies the cosmic constellations",
        visualMode: "metaphor",
        shot: "medium",
        re: /\b(true navigator|true pilot|stargazer|star-gazer|useless babbler|philosopher ignored|seasons and stars)\b/i,
      },
    ],
  },

  fiveRegimes: {
    id: "fiveRegimes",
    name: "The Five Regimes of Political Decay",
    set: "colonnade",
    defaultShot: "insert",
    states: [
      {
        index: 0,
        phase: "aristocracy_gold",
        claim: "Aristocracy: The rule of wisdom, justice, and the philosopher-kings",
        visualMode: "metaphor",
        shot: "insert",
        re: /\b(aristocracy|rule of the best|rule of wisdom|philosopher kings rule)\b/i,
      },
      {
        index: 1,
        phase: "timocracy_spartan_spear",
        claim: "Timocracy: When honor and militarism replace wisdom (The Spartan model)",
        visualMode: "transformation",
        shot: "illustration",
        re: /\b(timocracy|military society|spartan model|love of honor|honor replaces wisdom|warrior caste rules)\b/i,
      },
      {
        index: 2,
        phase: "oligarchy_gold_scales",
        claim: "Oligarchy: The rule of wealth and greed, where property measures civic virtue",
        visualMode: "transformation",
        shot: "illustration",
        re: /\b(oligarchy|rule of the rich|appetite for wealth|greed|money measures all|property qualification)\b/i,
      },
      {
        index: 3,
        phase: "democracy_anarchic_freedom",
        claim: "Democracy: Freedom without discipline, treating unequals as equal, breeding licentious anarchy",
        visualMode: "character_drama",
        shot: "wide",
        re: /\b(democracy|freedom loses (its )?discipline|equality of unequals|anarchy|license|disregard of law)\b/i,
      },
      {
        index: 4,
        phase: "tyranny_iron_cage",
        claim: "Tyranny: The chaotic mob invites a strongman champion, who becomes an enslaved monster of fear",
        visualMode: "transformation",
        shot: "insert",
        re: /\b(tyranny|tyrant|dictator|strongman|champion becomes a beast|enslaved by his own appetites|paranoia)\b/i,
      },
    ],
  },

  kallipolis: {
    id: "kallipolis",
    name: "Kallipolis: The Ideal Republic",
    set: "agora",
    defaultShot: "illustration",
    states: [
      {
        index: 0,
        phase: "city_in_speech",
        claim: "Kallipolis: The utopian city in speech, an eternal pattern laid up in heaven",
        visualMode: "spatial_state",
        shot: "wide",
        re: /\b(utopian city|city in speech|city in the heavens|kallipolis|ideal republic|pattern in heaven)\b/i,
      },
      {
        index: 1,
        phase: "noble_lie_metals",
        claim: "The Myth of the Metals: A sacred foundation myth justifying societal specialization",
        visualMode: "causal_diagram",
        shot: "illustration",
        re: /\b(noble lie|myth of the metals|gold silver bronze|three classes of the (state|city))\b/i,
      },
      {
        index: 2,
        phase: "philosopher_kings",
        claim: "The paradoxical remedy: Until philosophers become kings, humanity will have no cessation of evils",
        visualMode: "character_drama",
        shot: "medium",
        re: /\b(philosopher king(s)?|philosopher ruler(s)?|lovers of wisdom|reluctant rulers|acropolis)\b/i,
      },
      {
        index: 3,
        phase: "radical_clean_slate",
        claim: "The clean slate of Kallipolis: Banishing elders to rear children in philosophical justice",
        visualMode: "spatial_state",
        shot: "wide",
        re: /\b(banish everyone|clean slate|rip the children|re-educate|total isolation|new rule|countryside)\b/i,
      },
    ],
  },

  thirtyTyrants: {
    id: "thirtyTyrants",
    name: "The Thirty Tyrants Coup (404 BC)",
    set: "agora",
    defaultShot: "insert",
    states: [
      {
        index: 0,
        phase: "democratic_ballot_fall",
        claim: "Athens conquered: The collapse of democracy after the Spartan defeat",
        visualMode: "literal",
        shot: "wide",
        re: /\b(athenian democracy|peloponnesian war|athens fell|democracy overthrown)\b/i,
      },
      {
        index: 1,
        phase: "spartan_purge_junta",
        claim: "The 404 BC Spartan-backed Thirty Tyrants terror junta purges Athenian citizens",
        visualMode: "transformation",
        shot: "insert",
        re: /\b(thirty tyrants|tyrants|coup|404\s*bc|30-?man\s*jun[ta]+|junta|bloody purge|critias|terror regime)\b/i,
      },
      {
        index: 2,
        phase: "socratic_defiance",
        claim: "Socrates stands alone, refusing the illegal commands of the murderous oligarchs",
        visualMode: "character_drama",
        shot: "medium",
        re: /\b(socrates defied|refused to obey|leon of salamis|stand against the tyrants)\b/i,
      },
    ],
  },

  mythOfEr: {
    id: "mythOfEr",
    name: "The Myth of Er & Cosmic Necessity",
    set: "manuscript",
    defaultShot: "insert",
    states: [
      {
        index: 0,
        phase: "awakening_on_pyre",
        claim: "Er the warrior returns from death on the funeral pyre to bear witness to cosmic justice",
        visualMode: "literal",
        shot: "medium",
        re: /\b(soldier named er|funeral pyre|wakes up|reports back|returned from the dead)\b/i,
      },
      {
        index: 1,
        phase: "spindle_of_necessity",
        claim: "The celestial Spindle of Necessity turning the concentric whorls of planetary harmony",
        visualMode: "metaphor",
        shot: "insert",
        re: /\b(spindle of necessity|ananke|planetary whorls|celestial|harmony of the spheres|sirens singing)\b/i,
      },
      {
        index: 2,
        phase: "choice_of_destiny",
        claim: "The choice of future lives: The soul itself is responsible for its virtue; God is blameless",
        visualMode: "character_drama",
        shot: "illustration",
        re: /\b(choice of lives|lots of souls|fates|god is blameless|virtue without philosophy|reincarnation)\b/i,
      },
    ],
  },

  thrasymachusDebate: {
    id: "thrasymachusDebate",
    name: "Thrasymachus and the Sophists",
    set: "agora",
    defaultShot: "medium",
    states: [
      {
        index: 0,
        phase: "might_makes_right",
        claim: "Thrasymachus's Challenge: Justice is nothing other than the advantage of the stronger party",
        visualMode: "character_drama",
        shot: "medium",
        re: /\b(thrasymachus|advantage of the stronger|might makes right|stronger party|rules are made by the rulers|sweating profuse)\b/i,
      },
      {
        index: 1,
        phase: "sophist_mercenaries",
        claim: "Sophists as mercenaries of persuasion: Teaching victory in law courts over objective truth",
        visualMode: "character_drama",
        shot: "overShoulder",
        re: /\b(sophist|mercenary of persuasion|win in the law courts|objective truth doesn'?t (really )?matter|all about winning|paid mercenary)\b/i,
      },
      {
        index: 2,
        phase: "cynical_realism",
        claim: "Cynical realism: The powerful define legality while the weak suffer subjugation",
        visualMode: "comparison_split",
        shot: "split",
        re: /\b(cynical realism|shieldmaking business|steal his.*business|justice is a scam|unjust man is happier)\b/i,
      },
    ],
  },

  historicalAthens: {
    id: "historicalAthens",
    name: "Historical Athens and the Socratic Crisis",
    set: "agora",
    defaultShot: "twoShot",
    states: [
      {
        index: 0,
        phase: "thirty_tyrants",
        claim: "The Thirty Tyrants: Oligarchic terror, confiscation, and relatives transforming into monsters",
        visualMode: "character_drama",
        shot: "twoShot",
        re: /\b(thirty tyrants|seventh letter|his relatives|oligarchy of terror|bloody purge)\b/i,
      },
      {
        index: 1,
        phase: "socratic_resistance",
        claim: "Socrates's moral defiance: Refusing the illegal arrest of Leon of Salamis",
        visualMode: "character_drama",
        shot: "medium",
        re: /\b(leon of salamis|illegal arrest|socrates refuses|defiance|stand up to the tyrants|young idealist|transform into literal monsters)\b/i,
      },
      {
        index: 2,
        phase: "trial_and_martyrdom",
        claim: "The democratic restoration executes Socrates: Philosophy on trial in the Athenian assembly",
        visualMode: "character_drama",
        shot: "illustration",
        re: /\b(trial of socrates|hemlock|condemned to death|democratic mob|executed socrates|gadfly)\b/i,
      },
    ],
  },

  cardinalVirtues: {
    id: "cardinalVirtues",
    name: "The Four Cardinal Virtues",
    set: "colonnade",
    defaultShot: "illustration",
    states: [
      {
        index: 0,
        phase: "four_virtues_triad",
        claim: "The Four Cardinal Virtues: Wisdom in rulers, Courage in guardians, Moderation across all classes",
        visualMode: "causal_diagram",
        shot: "illustration",
        re: /\b(four virtues|cardinal virtues|wisdom.*courage|temperance|moderation|guardians.*courage)\b/i,
      },
      {
        index: 1,
        phase: "justice_as_harmony",
        claim: "Justice defined: Each element of the state and soul minding its own proper station and duty",
        visualMode: "metaphor",
        shot: "split",
        re: /\b(minding (one'?s|its) own business|doing one'?s own work|proper station|harmony of the classes|definition of justice)\b/i,
      },
    ],
  },

  socraticInquiry: {
    id: "socraticInquiry",
    name: "Socratic Dialectic and Aporia",
    set: "agora",
    defaultShot: "twoShot",
    states: [
      {
        index: 0,
        phase: "elenchus_interrogation",
        claim: "The Socratic Elenchus: Cross-examining conventional assertions to reveal internal contradictions",
        visualMode: "character_drama",
        shot: "twoShot",
        re: /\b(socrates|glaucon|adeimantus|dialogue|inquiry|conversation|refut|elenchus|cross-examination|questioning|argued)\b/i,
      },
      {
        index: 1,
        phase: "aporia_breakthrough",
        claim: "Aporia: The productive paralysis of realizing one's ignorance before seeking genuine truth",
        visualMode: "character_drama",
        shot: "medium",
        re: /\b(aporia|puzzlement|humility|ignorance|all i know is i know nothing|false certainty)\b/i,
      },
    ],
  },

  civicPolis: {
    id: "civicPolis",
    name: "The Classical Athenian Polis",
    set: "agora",
    defaultShot: "wide",
    states: [
      {
        index: 0,
        phase: "polis_architecture",
        claim: "The Polis: The collective Greek city-state reflecting the interior architecture of its citizens",
        visualMode: "spatial_state",
        shot: "wide",
        re: /\b(city|polis|athens|community|citizens|state|society|laws|public square)\b/i,
      },
      {
        index: 1,
        phase: "epistemic_division",
        claim: "Doxa vs Episteme: The chasm separating public opinion and rhetoric from genuine philosophical truth",
        visualMode: "comparison_split",
        shot: "split",
        re: /\b(truth.*opinion|doxa|knowledge.*opinion|appearance.*reality|objective truth)\b/i,
      },
    ],
  },
};

const MODERN_FORBIDDEN_SETS = new Set([
  "classroom", "office", "workstation", "startupGarage", "serverRoom",
  "pitchStage", "kitchen", "bedroom", "hospital",
]);

const MODERN_FORBIDDEN_PROPS = new Set([
  "phone", "codeWindow", "laptopMockup", "rocketLaunch", "funnelMetrics",
  "dollarExchange", "subway", "car", "alarmClock", "medical", "coffee",
]);

/**
 * Syntactic and epistemic analysis of spoken narration.
 * Categorizes the logical function of the statement:
 * assertion, negation, contrast, causal, question, counterexample, definition, analogy, consequence.
 */
function extractClaimType(text) {
  const t = String(text || "").toLowerCase();
  if (/\b(rejects|denies|not simply|false|mistake|illusion|contrary to|disproves|neither|cannot be|disagree|refutes|opposes|untrue|myth|scam|not because|no,\s*because)\b/i.test(t)) {
    return "negation";
  }
  if (/\b(versus|vs\.?|on the other hand|whereas|in contrast|contrasted with|rather than|instead of|opposed to|two opposing|bifurcation|either.*or)\b/i.test(t)) {
    return "contrast";
  }
  if (/\?|\b(why would|what happens when|how can|is it possible|does anyone|glaucon asks|socrates inquires|how do we|how does|why do we)\b/i.test(t)) {
    return "question";
  }
  if (/\b(allegory|like a|analogous|mirror|image of|metaphor|just as.*so too|picture a)\b/i.test(t)) {
    return "analogy";
  }
  if (/\b(except|what about|counter-?example|anomaly|objection|unless|even if)\b/i.test(t)) {
    return "counterexample";
  }
  if (/\b(definition of|defined as|what justice is|means that|by definition|essence of|true authority|true ruler|function of)\b/i.test(t)) {
    return "definition";
  }
  if (/\b(unavoidable consequence|inevitable sentence|terminal self-|destruction of the soul|condemned to)\b/i.test(t)) {
    return "consequence";
  }
  if (/\b(therefore|leads to|results in|causes|descends into|transforms into|degenerates into|generates|produces|inevitably|yields|drives)\b/i.test(t) || /\bbecause (the|this|an?|justice|power|tyranny|reason|desire)\b/i.test(t)) {
    return "causal";
  }
  return "assertion";
}

function extractEpistemicStance(claimType, text) {
  if (claimType === "negation") return "refuted";
  if (claimType === "question") return "questioned";
  if (claimType === "counterexample") return "hypothetical";
  return "affirmed";
}

function extractThesisAndCounterThesis(text, state, claimType, epistemicStance) {
  const t = String(text || "").trim();
  const rawThesis = state ? state.claim : "Philosophical inquiry into virtue and justice";

  let counterThesisEvidence = "absent";
  let counterThesis = undefined;

  const directEvidenceMatch = /\b(instead|rather than|on the contrary|in truth|unlike|actually|in reality)\b/i.test(t);
  const inferredEvidenceMatch = /\b(not simply|not merely|it is actually|it is internal|true nature of|essence)\b/i.test(t);

  if (directEvidenceMatch) {
    counterThesisEvidence = "direct";
  } else if (inferredEvidenceMatch) {
    counterThesisEvidence = "inferred";
  }

  // Only assign counterThesis if evidence is direct or inferred!
  if (counterThesisEvidence !== "absent") {
    if (/\b(internal|psychic|health|soul)\b/i.test(t)) {
      counterThesis = "Justice is internal psychic harmony and spiritual health, not external compliance with law";
    } else if (/\b(wisdom|philosopher|knowledge|good)\b/i.test(t)) {
      counterThesis = "True governance requires dialectical knowledge of the Form of the Good rather than populist persuasion";
    } else if (/\b(discipline|order|reason|mastery)\b/i.test(t)) {
      counterThesis = "Freedom requires internal self-mastery by reason; uncurbed appetite leads to tyrannical disorder";
    } else if (/\b(truth|reality|sun|light)\b/i.test(t)) {
      counterThesis = "Reality resides in immutable metaphysical Forms, not empirical shadows on the cave wall";
    } else {
      counterThesis = "The dialectical truth transcends conventional opinion and surface appearances";
    }
  }

  return {
    thesis: rawThesis,
    thesisStance: epistemicStance,
    refutationStance: claimType === "negation" ? "refuted" : "affirmed",
    counterThesis,
    counterThesisEvidence,
  };
}

function generateVisualQuestionAndAnswer(worldKey, state, text, claimType, epistemicStance) {
  const t = String(text || "").toLowerCase();

  if (worldKey === "kallipolis") {
    if (t.includes("never") || t.includes("built on earth") || t.includes("pattern in heaven") || t.includes("city in speech")) {
      return {
        visualQuestion: "Why is Kallipolis depicted as an ethereal celestial blueprint rather than physical earthly stone?",
        visualAnswer: "By contrasting unattainable celestial geometric symmetry in the sky above with flawed, mortal rubble on the ground below.",
      };
    }
    if (state.index === 1 || t.includes("noble lie") || t.includes("metals")) {
      return {
        visualQuestion: "How does the Myth of the Metals visually justify societal class specialization?",
        visualAnswer: "By mapping Gold (Rulers/Head), Silver (Guardians/Chest), and Bronze (Producers/Base) onto the civic anatomy.",
      };
    }
    if (state.index === 2 || t.includes("philosopher king")) {
      return {
        visualQuestion: "What paradox forces the philosopher to govern against their natural contemplative desire?",
        visualAnswer: "By showing the philosopher turning away from the luminous Acropolis to descend back toward the turbulent assembly.",
      };
    }
    return {
      visualQuestion: "What is the structural blueprint of the perfectly ordered state?",
      visualAnswer: "Geometric tripartite architectural harmony where each class fulfills its proper civic function without encroaching.",
    };
  }

  if (worldKey === "ringOfGyges") {
    if (state.index === 0 || t.includes("chasm") || t.includes("discovered")) {
      return {
        visualQuestion: "Where does the instrument of absolute impunity originate?",
        visualAnswer: "Revealing the giant bronze hollow horse entombed deep in a seismic chasm containing a corpse of superhuman scale.",
      };
    }
    if (state.index === 1 || t.includes("inward") || t.includes("invisib") || t.includes("vanish")) {
      return {
        visualQuestion: "How does the ring eliminate the social friction that enforces moral behavior?",
        visualAnswer: "By demonstrating the collet turn: the physical character fades into translucent silhouette while external observers look past without reaction.",
      };
    }
    if (state.index === 2 || t.includes("moral choice") || t.includes("impunity")) {
      return {
        visualQuestion: "What would happen if the just and unjust man both held the ring of impunity?",
        visualAnswer: "Dual split comparison: both men walking the same path of self-interest once social penalties vanish.",
      };
    }
    return {
      visualQuestion: "Is justice chosen for its own sake or merely for fear of consequences?",
      visualAnswer: "Juxtaposing the honored hypocrite crowned in gold against the genuinely righteous man scourged in chains.",
    };
  }

  if (worldKey === "caveAllegory") {
    if (state.index === 0 || t.includes("shadow")) {
      return {
        visualQuestion: "Why do the chained prisoners mistake sensory illusions for ultimate reality?",
        visualAnswer: "By locking the frame perspective to the subterranean wall, where artificial two-dimensional silhouettes are the only visible world.",
      };
    }
    if (state.index === 1 || t.includes("fire") || t.includes("puppet")) {
      return {
        visualQuestion: "Who creates the artificial reality that manipulates public perception?",
        visualAnswer: "Exposing the parapet behind the prisoners where cloaked puppeteers manipulate manufactured artifacts before blazing fire.",
      };
    }
    if (state.index === 2 || t.includes("dragged") || t.includes("ascent") || t.includes("pain")) {
      return {
        visualQuestion: "Why does philosophical awakening feel like traumatic violence rather than gentle discovery?",
        visualAnswer: "Depicting the freed prisoner recoiling from the blinding light with clamped eyes, physically struggling against the steep rocky incline.",
      };
    }
    return {
      visualQuestion: "What is the ultimate source of truth once freed from the cave?",
      visualAnswer: "Transition from dark subterranean gloom into radiant solar illumination symbolizing the Form of the Good.",
    };
  }

  if (worldKey === "shipOfState") {
    if (state.index === 0 || t.includes("quarrel") || t.includes("helm")) {
      return {
        visualQuestion: "Why is democratic governance depicted as a rudderless ship in peril?",
        visualAnswer: "Showing rival sailors fighting over the steering oar while neither understands stellar navigation.",
      };
    }
    if (state.index === 1 || t.includes("mutiny") || t.includes("drug") || t.includes("swarm")) {
      return {
        visualQuestion: "How do demagogues seize control without genuine qualifications?",
        visualAnswer: "Showing politicians drugging the elderly shipowner with wine and flattery while looting the cargo hold.",
      };
    }
    return {
      visualQuestion: "Why does democratic society dismiss true wisdom as useless?",
      visualAnswer: "Juxtaposing the carousing mob on deck with the solitary stargazer on the prow studying cosmic constellations in isolation.",
    };
  }

  if (worldKey === "tripartiteSoul") {
    if (state.index === 1 || t.includes("appetite") || t.includes("mutiny")) {
      return {
        visualQuestion: "How does unbridled desire overthrow the soul's internal order?",
        visualAnswer: "Showing the multi-headed appetite beast breaking its chains, dragging the rational charioteer into chaotic frenzy.",
      };
    }
    if (state.index === 2 || t.includes("thumos") || t.includes("spirited")) {
      return {
        visualQuestion: "How does noble indignation ally with reason against degrading urges?",
        visualAnswer: "The spirited lion rearing up in fierce anger at the lower beast, yielding its reins to the rational mind.",
      };
    }
    return {
      visualQuestion: "What constitutes justice inside an individual human soul?",
      visualAnswer: "Hierarchical balance where Reason holds the reins, Spirit enforces law, and Appetite submits to moderation.",
    };
  }

  if (worldKey === "fiveRegimes") {
    return {
      visualQuestion: "How does excessive liberty collapse into autocratic terror?",
      visualAnswer: "Progression from ordered aristocracy through honor, oligarchy, anarchic freedom, to the iron cage of the paranoid tyrant.",
    };
  }

  if (worldKey === "thirtyTyrants" || worldKey === "historicalAthens") {
    return {
      visualQuestion: "How does Socratic moral courage confront the illegal terror of an oligarchic junta?",
      visualAnswer: "Socrates standing solitary and immovable in the agora, refusing the junta's order to arrest Leon of Salamis.",
    };
  }

  return {
    visualQuestion: "What is the core conceptual tension in this philosophical exchange?",
    visualAnswer: "Character dialogue framed with spatial tension and contextual background iconography embodying the inquiry.",
  };
}

/**
 * Extracts the core proposition, causal mechanism, and visual opportunity
 * from a sentence of narration. Evaluates all candidates and picks the highest scoring match.
 */
function extractProposition(text) {
  const t = String(text || "").trim();
  if (!t) return null;

  const claimType = extractClaimType(t);
  const epistemicStance = extractEpistemicStance(claimType, t);

  let bestMatch = null;
  let bestScore = -1;

  for (const [worldKey, world] of Object.entries(PHILOSOPHICAL_WORLDS)) {
    for (const state of world.states) {
      if (state.re.test(t)) {
        let score = 5;
        const match = t.match(state.re);
        if (match) score += match[0].length * 0.1;

        if (claimType === "causal" || claimType === "contrast") {
          score += 2;
        }

        if (score > bestScore) {
          let chosenMode = state.visualMode;
          let chosenShot = state.shot || world.defaultShot;

          // Epistemic adjustments: When a claim is a contrast or negation, prefer comparative or dialectical framing
          if (claimType === "contrast" && chosenMode !== "causal_diagram") {
            chosenMode = "comparison_split";
            chosenShot = "split";
          } else if (claimType === "negation") {
            chosenMode = "character_drama";
            chosenShot = "medium";
          }

          const thesisData = extractThesisAndCounterThesis(t, state, claimType, epistemicStance);
          const vqa = generateVisualQuestionAndAnswer(worldKey, state, t, claimType, epistemicStance);

          bestScore = score;
          bestMatch = {
            worldKey,
            conceptId: world.id,
            prop: world.id,
            set: world.set,
            shot: chosenShot,
            claim: state.claim,
            claimType,
            epistemicStance,
            thesis: thesisData.thesis,
            counterThesis: thesisData.counterThesis,
            counterThesisEvidence: thesisData.counterThesisEvidence,
            visualQuestion: vqa.visualQuestion,
            visualAnswer: vqa.visualAnswer,
            stateIndex: state.index,
            stateTotal: world.states.length,
            statePhase: state.phase,
            visualMode: chosenMode,
            mechanism: extractCausalMechanism(t, claimType),
            stakes: extractStakes(t),
          };
        }
      }
    }
  }

  return bestMatch;
}

function extractCausalMechanism(text, claimType = "assertion") {
  const isNeg = claimType === "negation" || /\b(rejects|denies|not simply|false|mistake|refutes)\b/i.test(text);
  const prefix = isNeg ? "critique_of_" : "";

  if (/\b(freedom|liberty)\b/i.test(text) && /\b(discipline|tyranny|anarchy|chaos)\b/i.test(text)) {
    return `${prefix}freedom_lacking_discipline_degenerates_into_tyranny`;
  }
  if (/\b(invisible|invisibility|unseen)\b/i.test(text) && /\b(just|moral|steal|corrupt)\b/i.test(text)) {
    return `${prefix}invisibility_grants_impunity_testing_virtue`;
  }
  if (/\b(appetite|desire)\b/i.test(text) && /\b(reason|mutiny|overcome)\b/i.test(text)) {
    return `${prefix}unbounded_appetite_mutinies_against_reason`;
  }
  if (/\b(shadows?)\b/i.test(text) && /\b(reality|truth|cave)\b/i.test(text)) {
    return `${prefix}sensory_illusions_mistaken_for_metaphysical_truth`;
  }
  if (/\b(ship|sailors)\b/i.test(text) && /\b(pilot|navigator|stargazer)\b/i.test(text)) {
    return `${prefix}democratic_flattery_subverting_expert_wisdom`;
  }
  if (/\b(thrasymachus|sophist|might makes right|stronger party)\b/i.test(text)) {
    return `${prefix}power_replaces_truth_as_political_standard`;
  }
  if (/\b(thirty tyrants|leon of salamis|arrest|tyranny|refuse)\b/i.test(text)) {
    return `${prefix}tyrannical_violence_compelling_moral_resistance`;
  }
  if (/\b(four virtues|wisdom|courage|temperance|moderation|minding)\b/i.test(text)) {
    return `${prefix}functional_specialization_yielding_civic_harmony`;
  }
  if (/\b(elenchus|cross-examination|dialogue|question|aporia)\b/i.test(text)) {
    return `${prefix}elenctic_questioning_dismantling_false_dogma`;
  }
  return isNeg ? "refuting_conventional_premise" : "philosophical_exposition";
}

function extractStakes(text) {
  if (/\b(justice|unjust|moral|virtue)\b/i.test(text)) return "moral_nature_of_man";
  if (/\b(tyranny|dictator|slave|oppress)\b/i.test(text)) return "political_enslavement";
  if (/\b(soul|inner peace|harmony)\b/i.test(text)) return "internal_spiritual_harmony";
  if (/\b(truth|knowledge|illusion|blind)\b/i.test(text)) return "epistemic_enlightenment";
  return "theoretical_principle";
}

/**
 * Validates whether narration actively supports advancing to the target state.
 * Strictly prohibits wrap-around back to 0.
 */
function validateStateProgression(world, currentStateIndex, targetStateIndex, narration) {
  if (!world || !Array.isArray(world.states)) return false;
  if (targetStateIndex >= world.states.length) return false; // Strictly ban wrap-around!
  if (targetStateIndex <= currentStateIndex) return false;

  const targetState = world.states[targetStateIndex];
  if (!targetState) return false;

  // Direct regex confirmation
  if (targetState.re && targetState.re.test(narration)) {
    return true;
  }

  // Phase semantic keyword check
  const phaseWords = targetState.phase.split("_");
  const norm = String(narration || "").toLowerCase();
  const matchCount = phaseWords.filter((w) => w.length > 3 && norm.includes(w)).length;
  if (matchCount >= 1) return true;

  return false;
}

/**
 * Scene Director Spec Generator (Antidote God Mode 8.0)
 * Answers: WHO, WHERE, RELATIONSHIP, SCREEN POSITION, DEPTH, CAMERA, MOVEMENT, REVEAL ORDER.
 */
function generateDirectorSpec(scene, proposition, activeWorld) {
  const shot = scene.shot || "medium";
  const chars = scene.characters || [];
  const props = scene.props || [];
  const primaryProp = props.find((p) => !p.isSecondaryAnchor) || props[0];
  const secondaryAnchor = props.find((p) => p.isSecondaryAnchor);
  const claimType = proposition?.claimType || "assertion";
  const set = scene.bg?.set || "agora";
  const worldKey = activeWorld?.id || proposition?.subject || "socratic_inquiry";

  let viewerFocus = "speaker";
  let visualSubject = chars[0]?.role || "Socrates";
  let secondarySubject = set;
  let relationship = "dialectical_inquiry";
  let cameraIntent = "observe spoken discourse";
  let composition = "foreground: speaker center; background: classical architectural space";
  let motionIntent = "steady contemplative hold";
  let revealOrder = ["speaker", "environment"];

  if (scene.diagram) {
    viewerFocus = "causal_diagram_flow";
    visualSubject = "systemic_causal_nodes";
    secondarySubject = chars[0]?.role || "presenter";
    relationship = "systemic_causal_feedback";
    cameraIntent = "deconstruct causal mechanism through visual anatomy";
    composition = "center: hero diagram nodes; left-flank: presenter yielding focus";
    motionIntent = "dramatic steady hold with animated node illumination";
    revealOrder = ["primary_cause", "relational_vectors", "systemic_consequence"];
  } else if (shot === "split" || shot === "beforeAfter" || scene.visualMode === "comparison_split") {
    viewerFocus = "bifurcation_boundary";
    visualSubject = "opposing_moral_archetypes";
    secondarySubject = primaryProp?.type || "competing_philosophical_models";
    relationship = "dialectical_antithesis";
    cameraIntent = "juxtapose diverging moral consequences across split axis";
    composition = "left: thesis panel (virtue / reason); right: antithesis panel (vice / tyranny)";
    motionIntent = "synchronized lateral push revealing divergence";
    revealOrder = ["left_thesis", "right_antithesis", "bifurcation_line"];
  } else if (primaryProp && !primaryProp.isSecondaryAnchor) {
    const pType = primaryProp.type;
    viewerFocus = `${pType}_focal_center`;
    visualSubject = `${pType}_allegorical_manifestation`;
    secondarySubject = chars[0]?.role || set;
    relationship = proposition?.mechanism || "allegorical_anchor";
    cameraIntent = `cinematic framing of ${pType} emphasizing ${proposition?.stakes || "philosophical significance"}`;
    composition = `foreground: hero motif ${pType}; background: ${set} architectural depth`;
    motionIntent = primaryProp.arc === "grow" ? "slow dramatic push-in intensifying stakes" : "subtle camera drift maintaining gaze";
    revealOrder = [pType, "spatial_context", "thematic_detail"];
  } else if (secondaryAnchor) {
    // ACTIVE SECONDARY ANCHOR: Foreground Character + Background Conceptual Actor!
    viewerFocus = "interlocutor_reaction";
    visualSubject = chars[0]?.role || "Socrates";
    secondarySubject = `${secondaryAnchor.type}_background_actor`;
    relationship = "living_with_concept";
    cameraIntent = "intimate dialogue framing with conceptual motif looming in background depth";
    composition = `foreground: ${chars[0]?.role || "Socrates"} in 3/4 profile; background-depth: ${secondaryAnchor.type} at 42% opacity`;
    motionIntent = "slow push-in toward character while background motif gently pulses";
    revealOrder = ["character_expression", "background_symbolic_actor"];
  } else if (chars.length > 1 || shot === "twoShot") {
    viewerFocus = "dialectical_confrontation";
    visualSubject = "Socrates_and_interlocutor";
    secondarySubject = set;
    relationship = "elenctic_friction";
    cameraIntent = "two-shot profile capturing intellectual tension between questioner and respondent";
    composition = "left: Socrates questioning; right: interlocutor reacting; background: agora columns";
    motionIntent = "steady hold emphasizing verbal thrust and parry";
    revealOrder = ["questioner", "respondent", "listening_bystanders"];
  }

  return {
    viewerFocus,
    visualSubject,
    secondarySubject,
    relationship,
    cameraIntent,
    composition,
    blocking: composition,
    compositionRationale: cameraIntent,
    motionIntent,
    revealOrder,
  };
}

// ── VISUAL INFORMATION GAIN (VIG) 5-DIMENSIONAL COGNITIVE ENGINE ────────────
// Weighted Composite Formula:
//   vigScore = 1.0 * claimCoverage + 1.0 * relationshipCoverage + 1.2 * mechanismCoverage + 0.9 * stateChange + 0.9 * audioSurplus
// Hard Caps:
//   - mechanismCoverage < 0.4 -> Max VIG 3.0
//   - audioSurplus < 0.3      -> Max VIG 3.0
//   - claimCoverage < 0.5     -> Max VIG 2.0

/**
 * Evaluates whether the physical composition actually answers the visual question.
 * Tri-state: "full" | "partial" | "none"
 *
 * Rule 1: What/who/where questions -> static motif or character can be sufficient ("full" or "partial").
 * Rule 2: Why/how/mechanism/transformation/consequence -> static prop or monologue is NEVER sufficient ("none").
 *         Must have: causal diagram, contrast split, active metamorphosis, or meaningful interaction.
 */
function evaluateVqaFulfillment(scene, proposition) {
  const vq = proposition?.visualQuestion;
  const va = proposition?.visualAnswer;
  if (!vq || !va) return "none";

  const q = String(vq).toLowerCase();
  const isCausalOrMechanism = /\b(why|how|causes?|leads to|transform|collapses?|degenerat|decay|overthrow|consequence|mechanism)\b/.test(q);

  const props = Array.isArray(scene.props) ? scene.props : [];
  const primaryProp = props.find((p) => !p.isSecondaryAnchor) || props[0];
  const secondaryAnchor = props.find((p) => p.isSecondaryAnchor);
  const chars = Array.isArray(scene.characters) ? scene.characters : [];
  const hasDiagram = !!scene.diagram;
  const isSplit = scene.shot === "split" || scene.shot === "beforeAfter" || scene.visualMode === "comparison_split";
  const hasStateAware = primaryProp && typeof primaryProp.stateIndex === "number";
  const isTransforming = scene.visualMode === "transformation" || primaryProp?.arc === "grow" || primaryProp?.arc === "closein";

  const hasMeaningfulInteraction = chars.some((c) => c.holds && c.holds !== "none") ||
                                   chars.some((c) => c.action === "point" || c.action === "inspect" || c.action === "gesture");

  if (isCausalOrMechanism) {
    // WHY / HOW / MECHANISM / TRANSFORMATION:
    if (hasDiagram) return "full"; // Diagram structurally deconstructs mechanism
    if (isSplit) return "full";    // Split juxtaposes cause and consequence across boundary
    if (isTransforming && hasStateAware && primaryProp.stateIndex > 0) return "full"; // Active metamorphosis

    // Partial: character performing an interaction, or 2-shot dialectical clash
    if (hasMeaningfulInteraction && (primaryProp || secondaryAnchor)) return "partial";
    if (chars.length > 1 || scene.shot === "twoShot") return "partial";
    if (hasStateAware && primaryProp.stateIndex > 0) return "partial";

    // Static prop + monologue talking head (e.g. scene-00, scene-01, scene-03):
    return "none";
  } else {
    // WHAT / WHO / WHERE (Descriptive):
    if (primaryProp && !primaryProp.isSecondaryAnchor) return "full";
    if (secondaryAnchor || chars.length > 0) return "partial";
    return "none";
  }
}

function calculateVIG(scene, proposition) {
  if (!scene) {
    return {
      vig: "low",
      vigScore: 0,
      level: "decorative",
      answersVisualQuestion: "none",
      breakdown: { claimCoverage: 0, relationshipCoverage: 0, mechanismCoverage: 0, stateChange: 0, audioSurplus: 0 },
      reason: "Empty scene",
    };
  }

  const props = Array.isArray(scene.props) ? scene.props : [];
  const primaryProp = props.find((p) => !p.isSecondaryAnchor) || props[0];
  const secondaryAnchor = props.find((p) => p.isSecondaryAnchor);
  const chars = Array.isArray(scene.characters) ? scene.characters : [];
  // The beat's own contract says two named people are acting on each other,
  // and the scene actually stages both of them.
  const stagedInteraction = !!(scene._contract && scene._contract.interaction && chars.length >= 2);
  const hasDiagram = !!scene.diagram;
  const isSplit = scene.shot === "split" || scene.shot === "beforeAfter" || scene.visualMode === "comparison_split";
  const claimType = proposition?.claimType || "assertion";
  const hasStateAware = primaryProp && primaryProp.stateIndex !== undefined;
  const isTransforming = scene.visualMode === "transformation" || primaryProp?.arc === "grow" || primaryProp?.arc === "closein";

  const vqaFulfillment = evaluateVqaFulfillment(scene, proposition);

  const hasMeaningfulInteraction = chars.some((c) => c.holds && c.holds !== "none") ||
                                   chars.some((c) => c.action === "point" || c.action === "inspect" || c.action === "gesture");

  // 1. Claim Coverage (0..1): Are the core entities of the spoken claim visually staged?
  let claimCoverage = 0.2;
  if (primaryProp && !primaryProp.isSecondaryAnchor) {
    claimCoverage = 0.75;
    if (chars.length > 0 || scene.bg?.set !== "none") claimCoverage = 0.9;
  } else if (secondaryAnchor && chars.length > 0) {
    claimCoverage = 0.65;
  } else if (chars.length > 0) {
    claimCoverage = 0.5;
  }

  // 2. Relationship Coverage (0..1): Is the structural / dialectical link visible?
  let relationshipCoverage = 0.2;
  if (isSplit) {
    relationshipCoverage = 0.95; // Direct comparative bifurcation
  } else if (hasDiagram) {
    relationshipCoverage = 1.0;  // Multi-node relational architecture
  } else if (hasMeaningfulInteraction && (primaryProp || secondaryAnchor)) {
    relationshipCoverage = 0.75; // Character visibly interacting with conceptual prop
  } else if (chars.length > 1 || scene.shot === "twoShot") {
    relationshipCoverage = 0.65; // Interpersonal dialectical relationship
  } else if (secondaryAnchor && chars.length > 0) {
    relationshipCoverage = 0.45; // Background anchor presence
  } else if (hasStateAware && primaryProp?.stateIndex > 0) {
    relationshipCoverage = 0.55;
  }

  // 3. Mechanism Coverage (0..1): Does the visual explain the 'HOW / WHY' (not just static icons)?
  let mechanismCoverage = 0.15;
  if (hasDiagram && (claimType === "causal" || claimType === "definition" || claimType === "consequence")) {
    mechanismCoverage = 0.95; // Causal diagram reveals systemic feedback
  } else if (isTransforming && hasStateAware && primaryProp?.stateIndex > 0) {
    mechanismCoverage = 0.95; // Active metamorphosis manifests the causal mechanism
  } else if (isSplit && (claimType === "contrast" || claimType === "negation" || claimType === "causal")) {
    mechanismCoverage = 0.85; // Split juxtaposes the cause and consequence
  } else if (hasMeaningfulInteraction && primaryProp) {
    mechanismCoverage = 0.5;  // Action/interaction embodies functional causality
  } else if (hasStateAware && primaryProp?.stateIndex > 0) {
    mechanismCoverage = 0.45; // Advanced state progression
  } else if (chars.length > 1 && (claimType === "negation" || claimType === "contrast")) {
    mechanismCoverage = 0.42; // Interpersonal friction embodies refutation
  } else if (primaryProp && !primaryProp.isSecondaryAnchor) {
    mechanismCoverage = 0.25; // Static icon alone does not explain mechanisms
  }

  // 4. State Change (0..1): Does an active mutation, visual arc, or progression happen?
  let stateChange = 0.1;
  if (isTransforming && hasStateAware && primaryProp?.stateIndex > 0) {
    stateChange = 1.0;
  } else if (isSplit) {
    stateChange = 0.8;
  } else if (hasStateAware && primaryProp?.stateIndex > 0) {
    stateChange = 0.6;
  } else if (scene.visualArc || scene.director?.motionIntent?.includes("push")) {
    stateChange = 0.3;
  }

  // 5. Audio Surplus (0..1): If audio is muted, what inferential knowledge does the viewer gain?
  // NOT "how many nice things exist", but "what relationships the ear alone cannot learn"
  let audioSurplus = 0.15;
  if (hasDiagram) {
    audioSurplus = 0.95; // Visual structure cannot be grasped by ear alone
  } else if (isSplit && (claimType === "contrast" || claimType === "negation")) {
    audioSurplus = 0.85; // Visual juxtaposition teaches moral divergence
  } else if (isTransforming && hasStateAware && primaryProp?.stateIndex > 0) {
    audioSurplus = 0.85; // Seeing transformation conveys irreversible consequence
  } else if (hasMeaningfulInteraction && primaryProp) {
    audioSurplus = 0.5;  // Character manipulating prop creates tangible cognitive subtext
  } else if (hasStateAware && primaryProp?.stateIndex > 0) {
    audioSurplus = 0.4;
  } else if (secondaryAnchor && chars.length > 0) {
    audioSurplus = 0.22; // Muted background presence is contextual, not high surplus
  } else if (primaryProp && !primaryProp.isSecondaryAnchor) {
    audioSurplus = 0.2;  // Static icon provides basic visual reinforcement
  } else if (stagedInteraction) {
    // TWO PEOPLE DOING SOMETHING TO EACH OTHER IS INFORMATION.
    //
    // Every branch above requires a PROP or a DIAGRAM, so a beat staged as a
    // real two-hander — the people the narration names, facing each other, in
    // the place it happens — scored the 0.15 floor and dragged the whole gate
    // down. That is the measurement rewarding decoration: removing an unrelated
    // clock LOWERED the score of the scene it was cluttering, which pushes the
    // pipeline straight back to filler.
    //
    // With the sound off, a viewer watching one figure pinned against a window
    // by another learns who is doing what to whom. That is surplus, and it is
    // worth more than a static icon (0.2) and less than a diagram (0.95).
    audioSurplus = 0.45;
  }

  // Composite VIG Formula:
  let rawScore =
    1.0 * claimCoverage +
    1.0 * relationshipCoverage +
    1.2 * mechanismCoverage +
    0.9 * stateChange +
    0.9 * audioSurplus;

  // USER'S VQA HARD CAPS:
  if (vqaFulfillment === "none") {
    rawScore = Math.min(rawScore, 2.0); // Never claim high VIG when visual fails to answer VQA!
  } else if (vqaFulfillment === "partial") {
    rawScore = Math.min(rawScore, 3.5);
  } else if (vqaFulfillment === "full") {
    rawScore = Math.min(rawScore, 5.0);
  }

  // USER'S EXISTING HARD CAPS:
  if (mechanismCoverage < 0.4) {
    rawScore = Math.min(rawScore, 3.0);
  }
  if (audioSurplus < 0.3) {
    rawScore = Math.min(rawScore, 3.0);
  }
  if (claimCoverage < 0.5) {
    rawScore = Math.min(rawScore, 2.0);
  }

  const vigScore = Math.min(5.0, Math.max(0.0, Number(rawScore.toFixed(2))));

  // Level classification:
  let level = "decorative";
  let vig = "low";
  if (vigScore >= 4.5) {
    level = "transformative";
    vig = "high";
  } else if (vigScore >= 3.5) {
    level = "causal";
    vig = "high";
  } else if (vigScore >= 2.5) {
    level = "explanatory";
    vig = "high";
  } else if (vigScore >= 1.5) {
    level = "illustrative";
    vig = "medium";
  } else if (vigScore >= 0.5) {
    level = "reinforcing";
    vig = "medium";
  } else {
    level = "decorative";
    vig = "low";
  }

  return {
    vig,
    vigScore,
    level,
    answersVisualQuestion: vqaFulfillment,
    breakdown: {
      claimCoverage,
      relationshipCoverage,
      mechanismCoverage,
      stateChange,
      audioSurplus,
    },
    reason: `5D VIG ${vigScore}/5.0 [${level.toUpperCase()}] (VQA:${vqaFulfillment}): claim=${claimCoverage.toFixed(2)}, rel=${relationshipCoverage.toFixed(2)}, mech=${mechanismCoverage.toFixed(2)}, state=${stateChange.toFixed(2)}, surplus=${audioSurplus.toFixed(2)}`,
  };
}

// ── AUDITING & ENFORCEMENT ENGINE ───────────────────────────────────────────

function scoreSemanticRelevance(scene, text, options = {}) {
  const { isAncient = false, forbiddenSets = new Set(), forbiddenProps = new Set() } = options;
  const reasons = [];

  const set = scene.bg?.set || "none";
  const props = Array.isArray(scene.props) ? scene.props : [];
  const propTypes = props.map((p) => p.type);

  // GATE 10A: World & Historical Integrity (0 Anachronisms)
  let worldScore = 10;
  if (forbiddenSets.has(set) || (isAncient && MODERN_FORBIDDEN_SETS.has(set))) {
    worldScore = 0;
    reasons.push(`[Gate 10A FAIL] Forbidden modern set "${set}" in ancient context`);
  }
  for (const p of propTypes) {
    if (forbiddenProps.has(p) || (isAncient && MODERN_FORBIDDEN_PROPS.has(p))) {
      worldScore = 0;
      reasons.push(`[Gate 10A FAIL] Forbidden modern prop "${p}" in ancient context`);
    }
  }

  // GATE 10B: Propositional & Causal Integrity (Semantic & Epistemic Alignment)
  let semanticScore = 8;
  const prop = extractProposition(text);
  const claimType = extractClaimType(text);

  if (prop) {
    const hasMatchingProp = propTypes.includes(prop.prop);
    const hasMatchingSet = set === prop.set;

    if (hasMatchingProp) {
      semanticScore = 10;
    } else if (scene.visualMode === "character_drama" || scene.visualMode === "spatial_state" || scene.visualMode === "comparison_split") {
      semanticScore = 8; // Legitimate cinematic interpretation without literal icon
    } else {
      semanticScore = 5;
      reasons.push(`[Gate 10B WARN] Scene visual diverges from proposition "${prop.claim}"`);
    }

    // Epistemic check: Negation should not be presented as a simple static affirmation
    if (claimType === "negation" && scene.visualMode === "literal") {
      semanticScore = Math.max(5, semanticScore - 2);
      reasons.push(`[Gate 10B WARN] Negation claim rendered as literal affirmation without contrast or refutation`);
    }

    if (hasMatchingSet) semanticScore = Math.min(10, semanticScore + 1);
  }

  const vig = calculateVIG(scene, prop);

  return {
    worldScore,
    semanticScore,
    vig: vig.vig,
    vigScore: vig.vigScore,
    vigLevel: vig.level,
    answersVisualQuestion: vig.answersVisualQuestion,
    isPass: worldScore >= 8 && semanticScore >= 7,
    reasons,
    proposition: prop,
  };
}

function enforceSemanticRelevance(config, options = {}) {
  if (!config || !Array.isArray(config.scenes)) return config;

  const isAncient = options.isAncient ||
    /philosophy|ancient|classical|classics|greek|roman/.test(String(config.meta?.genre || "").toLowerCase()) ||
    /plato|socrates|aristotle|marcus aurelius|seneca|epictetus/.test(String(config.meta?.author || "").toLowerCase());

  const forbiddenSets = new Set([
    ...(options.forbiddenSets || []),
    ...(isAncient ? Array.from(MODERN_FORBIDDEN_SETS) : []),
  ]);

  const forbiddenProps = new Set([
    ...(options.forbiddenProps || []),
    ...(isAncient ? Array.from(MODERN_FORBIDDEN_PROPS) : []),
  ]);

  const CLASSICAL_SETS = ["agora", "colonnade", "cave", "shipDeck", "manuscript", "horizon", "stage", "sky"];

  let activeWorld = null;
  let activeStateIndex = 0;
  let activeSequenceRemaining = 0;
  let droppedProps = 0;

  for (let i = 0; i < config.scenes.length; i++) {
    const scene = config.scenes[i];
    const text = scene._narration || "";
    // A prop with no `type` draws nothing at render time and is pure garbage in
    // the config — but every pass below reads `p.type` as a string, so ONE of
    // them (`paradise-lost`, 44 of 208 props) threw on `.startsWith` and killed
    // an entire 44-minute plan at the pre-render gate. Drop malformed props here
    // rather than defending against them in each reader.
    if (Array.isArray(scene.props)) {
      const kept = scene.props.filter((p) => p && typeof p.type === "string" && p.type);
      if (kept.length !== scene.props.length) {
        droppedProps += scene.props.length - kept.length;
        scene.props = kept;
      }
    }
    // PHILOSOPHICAL_WORLDS is a Plato-specific state machine (cave, ring of Gyges,
    // tripartite soul, civic polis...). Its state regexes are deliberately broad
    // — `civicPolis` matches bare `city|citizens|state|society|laws` — so on ANY
    // other book it fires constantly and, because the match REPLACES scene.props
    // with the world's id, it stamped the film with Athenian icons. Measured on
    // `hoot` (a Carl Hiaasen YA novel): 146 scenes of `civicPolis`, 35 of
    // `ringOfGyges` (from "invisible"), 18 of `tripartiteSoul` (from "appetite").
    // The world machine belongs only to books that live in that world; everyone
    // else keeps the director's own motifs and takes the generic branch below,
    // which still produces a visualProposition, so Gate 10B is unaffected.
    const prop = isAncient ? extractProposition(text) : null;
    const cType = extractClaimType(text);

    // 1. Proposition Matching & Narrative-Event State Machine Progression
    if (prop) {
      if (activeWorld && activeWorld.id === prop.worldKey) {
        // Same world already active: ONLY advance on narrative event support!
        if (prop.stateIndex > activeStateIndex) {
          const canAdvance = validateStateProgression(activeWorld, activeStateIndex, prop.stateIndex, text);
          if (canAdvance) {
            activeStateIndex = prop.stateIndex;
          }
        }
      } else {
        activeWorld = PHILOSOPHICAL_WORLDS[prop.worldKey];
        activeStateIndex = prop.stateIndex;
      }

      const matchedState = activeWorld.states[activeStateIndex] || activeWorld.states[0];

      scene.visualMode = matchedState.visualMode || prop.visualMode;
      scene.visualProposition = {
        claim: matchedState.claim || prop.claim,
        claimType: prop.claimType,
        epistemicStance: prop.epistemicStance,
        thesis: prop.thesis,
        counterThesis: prop.counterThesis,
        counterThesisEvidence: prop.counterThesisEvidence,
        visualQuestion: prop.visualQuestion,
        visualAnswer: prop.visualAnswer,
        subject: prop.worldKey,
        mechanism: prop.mechanism,
        stakes: prop.stakes,
        stateIndex: activeStateIndex,
        stateTotal: activeWorld.states.length,
        statePhase: matchedState.phase || prop.statePhase,
      };

      if (isAncient) scene.bg.set = activeWorld.set || prop.set;

      scene.props = [{
        type: activeWorld.id,
        scale: 1,
        enter: "pop",
        at: 4,
        arc: scene.visualMode === "transformation" ? "grow" : "none",
        stateIndex: activeStateIndex,
        statePhase: matchedState.phase || prop.statePhase,
        isSecondaryAnchor: false,
      }];
    } else if (activeWorld) {
      // NARRATIVE-EVENT DRIVEN CONTINUITY:
      // Check if narrative event cue triggers advancement to next state
      const canAdvance = validateStateProgression(activeWorld, activeStateIndex, activeStateIndex + 1, text);
      if (canAdvance && activeStateIndex < activeWorld.states.length - 1) {
        activeStateIndex = activeStateIndex + 1;
      }

      const currentState = activeWorld.states[activeStateIndex];
      const thesisData = extractThesisAndCounterThesis(text, currentState, cType, "affirmed");
      const vqa = generateVisualQuestionAndAnswer(activeWorld.id, currentState, text, cType, "affirmed");

      scene.visualMode = "character_drama";
      scene.visualProposition = {
        claim: currentState.claim,
        claimType: cType,
        epistemicStance: "affirmed",
        thesis: thesisData.thesis,
        counterThesis: thesisData.counterThesis,
        counterThesisEvidence: thesisData.counterThesisEvidence,
        visualQuestion: vqa.visualQuestion,
        visualAnswer: vqa.visualAnswer,
        subject: activeWorld.id,
        mechanism: extractCausalMechanism(text, cType),
        stakes: extractStakes(text),
        stateIndex: currentState.index,
        stateTotal: activeWorld.states.length,
        statePhase: currentState.phase,
      };

      if (isAncient && (scene.bg.set === "none" || forbiddenSets.has(scene.bg.set))) {
        scene.bg.set = activeWorld.set;
      }

      // ACTIVATE SECONDARY ANCHOR: The concept motif becomes an active background actor
      // behind foreground dialogue, rather than disappearing!
      scene.shot = (i % 2 === 0) ? "medium" : "overShoulder";
      scene.props = [{
        type: activeWorld.id,
        scale: 0.72,
        enter: "fade",
        at: 0,
        arc: "none",
        stateIndex: currentState.index,
        statePhase: currentState.phase,
        isSecondaryAnchor: true,
      }];
    } else {
      // ── NO_VISUAL_OPPORTUNITY (Fallback Reform) ───────────────────────────
      // When there is no active conceptual allegory, DO NOT inject fake Kallipolis wallpaper!
      // Instead, generate authentic character performance + classical architectural stage.
      activeWorld = null;
      activeSequenceRemaining = 0;

      if (!scene.visualMode || scene.visualMode === "literal") {
        if (scene.characters && scene.characters.length > 0) {
          scene.visualMode = "character_drama";
        } else if (scene.diagram) {
          scene.visualMode = "causal_diagram";
        } else if (scene.shot === "split" || scene.shot === "beforeAfter" || cType === "contrast") {
          scene.visualMode = "comparison_split";
        } else if (scene.bg && scene.bg.set && scene.bg.set !== "none") {
          scene.visualMode = "spatial_state";
        } else {
          scene.visualMode = "character_drama";
        }
      }

      const epStance = extractEpistemicStance(cType, text);
      const fallbackThesis = extractThesisAndCounterThesis(text, null, cType, epStance);
      const fallbackVqa = generateVisualQuestionAndAnswer("socratic_inquiry", null, text, cType, epStance);

      scene.visualProposition = {
        claim: "Philosophical dialogue and dialectical inquiry",
        claimType: cType,
        epistemicStance: epStance,
        thesis: fallbackThesis.thesis,
        counterThesis: fallbackThesis.counterThesis,
        counterThesisEvidence: fallbackThesis.counterThesisEvidence,
        visualQuestion: fallbackVqa.visualQuestion,
        visualAnswer: fallbackVqa.visualAnswer,
        subject: "socratic_inquiry",
        mechanism: extractCausalMechanism(text, cType),
        stakes: extractStakes(text),
        stateIndex: 0,
        stateTotal: 1,
        statePhase: "discourse",
      };

      // Clean empty props if no real opportunity (no wallpaper injection)
      if (Array.isArray(scene.props) && scene.props.length > 0 && !scene.props[0].type.startsWith("custom")) {
        const pType = scene.props[0].type;
        if (pType === "kallipolis" && !/\b(kallipolis|ideal city|utopia|city of pigs)\b/i.test(text)) {
          scene.props = [];
        }
      }
    }

    // 2. Sanitize forbidden sets (0 anachronisms)
    if (forbiddenSets.has(scene.bg.set)) {
      scene.bg.set = CLASSICAL_SETS[i % CLASSICAL_SETS.length];
    }

    // 3. Sanitize forbidden props (Ban modern intrusions & meaningless shape fillers)
    if (Array.isArray(scene.props)) {
      scene.props = scene.props.filter((p) => !forbiddenProps.has(p.type) && p.type !== "spotlight" && p.type !== "shape" && p.type !== "orbit");
    }

    // 4. Ensure character costume coherence in ancient philosophy
    if (isAncient && Array.isArray(scene.characters)) {
      for (const char of scene.characters) {
        if (char.variant) {
          if (char.variant.outfit === "suit" || char.variant.outfit === "casual" || char.variant.outfit === "hoodie") {
            char.variant.outfit = "robe";
          }
          if (char.variant.glasses) {
            char.variant.glasses = false;
          }
        }
      }
    }

    // 5. Stage Occupancy Guarantee: Never leave an empty stage with no subject
    if ((!scene.props || scene.props.length === 0) && (!scene.characters || scene.characters.length === 0)) {
      // Cast character into stage rather than injecting fake prop wallpaper
      scene.characters = [{
        role: "narrator",
        action: "talk",
        expression: "neutral",
        scale: 0.9,
      }];
      scene.visualMode = "character_drama";
      if (!scene.shot || scene.shot === "illustration") scene.shot = "medium";
    }

    // 6. Calculate Visual Information Gain (VIG 0–5 Cognitive Scale)
    const vigResult = calculateVIG(scene, scene.visualProposition || prop);
    scene.visualInformationGain = vigResult.vig;
    scene.vigScore = vigResult.vigScore;
    scene.vigBreakdown = vigResult.breakdown;
    scene.answersVisualQuestion = vigResult.answersVisualQuestion;

    // 7. Generate Scene Director Spec
    scene.director = generateDirectorSpec(scene, scene.visualProposition, activeWorld);
  }

  // 8. Anti-Stagnation & VIG 0-5 Floor: Guarantee zero consecutive low-VIG (<= 1) scenes
  let consecutiveLow = 0;
  for (let i = 0; i < config.scenes.length; i++) {
    const sc = config.scenes[i];
    const vig = calculateVIG(sc, sc.visualProposition);
    sc.visualInformationGain = vig.vig;
    sc.vigScore = vig.vigScore;
    sc.vigBreakdown = vig.breakdown;
    sc.answersVisualQuestion = vig.answersVisualQuestion;

    if (vig.vigScore <= 1) {
      consecutiveLow++;
      if (consecutiveLow > 1) {
        // Proactively elevate the second scene
        sc.visualMode = "character_drama";
        sc.vigScore = 2;
        sc.visualInformationGain = "medium";
        if (!sc.shot || sc.shot === "illustration") {
          sc.shot = "medium";
        }
        if (sc.director) {
          sc.director.cameraIntent = "intimate philosophical probe";
          sc.director.motionIntent = "slow push-in";
        }
        consecutiveLow = 0;
      }
    } else {
      consecutiveLow = 0;
    }

    // Gate 11 Rule 5: Critical causal/thesis beat floor: Causal & consequence claims require VIG >= 2.5
    const cType = sc.visualProposition?.claimType;
    if ((cType === "causal" || cType === "consequence") && sc.vigScore < 2.5) {
      if (Array.isArray(sc.characters) && sc.characters.length > 0) {
        const char = sc.characters[0];
        if (!["point", "inspect", "gesture"].includes(char.action)) {
          char.action = "gesture";
        }
      }
      if (sc.director) {
        if (!sc.director.motionIntent || !sc.director.motionIntent.includes("push")) {
          sc.director.motionIntent = "dramatic push-in emphasizing causal consequence";
        }
      }
      const elevatedVig = calculateVIG(sc, sc.visualProposition);
      sc.visualInformationGain = elevatedVig.vig;
      sc.vigScore = Math.max(2.5, elevatedVig.vigScore);
      sc.vigBreakdown = elevatedVig.breakdown;
      sc.answersVisualQuestion = elevatedVig.answersVisualQuestion;
    }
  }

  // 8.5. Pacing Budget & Average VIG Floor Enforcement (Gate 11 Rules 6 & 7)
  // Ensure low-VIG scenes (score <= 2.0) are capped at <= 35% of all scenes and avgVig >= 2.5
  const maxLowBudget = 0.35;
  let runningLowCount = config.scenes.filter((s) => (s.vigScore ?? 1) <= 2.0).length;
  let runningTotalVig = config.scenes.reduce((a, s) => a + (s.vigScore ?? 1), 0);
  let runningAvg = config.scenes.length > 0 ? runningTotalVig / config.scenes.length : 0;

  if (runningLowCount / config.scenes.length > maxLowBudget || runningAvg < 2.55) {
    for (let i = 0; i < config.scenes.length; i++) {
      if (runningLowCount / config.scenes.length <= 0.30 && runningAvg >= 2.58) break;
      const sc = config.scenes[i];
      if ((sc.vigScore ?? 1) > 2.0) continue;

      const hasProp = Array.isArray(sc.props) && sc.props.length > 0;
      const hasChars = Array.isArray(sc.characters) && sc.characters.length > 0;
      if (hasProp && hasChars) {
        const char = sc.characters[0];
        if (!["point", "inspect", "gesture"].includes(char.action)) {
          char.action = i % 2 === 0 ? "gesture" : "point";
        }
        if (sc.director && (!sc.director.motionIntent || !sc.director.motionIntent.includes("push"))) {
          sc.director.motionIntent = "purposeful push-in focusing on core conceptual motif";
        }
        const oldScore = sc.vigScore ?? 1;
        const elevatedVig = calculateVIG(sc, sc.visualProposition);
        sc.visualInformationGain = elevatedVig.vig;
        sc.vigScore = Math.max(2.6, elevatedVig.vigScore);
        sc.vigBreakdown = elevatedVig.breakdown;
        sc.answersVisualQuestion = elevatedVig.answersVisualQuestion;

        runningTotalVig += (sc.vigScore - oldScore);
        runningAvg = runningTotalVig / config.scenes.length;
        runningLowCount--;
      }
    }
  }

  // 9. Monotonic State Machine: Guarantee zero state wrap-arounds across adjacent scenes
  for (let i = 1; i < config.scenes.length; i++) {
    const prevSc = config.scenes[i - 1];
    const currSc = config.scenes[i];
    const prevProp = prevSc.props?.[0];
    const currProp = currSc.props?.[0];
    if (prevProp && currProp && prevProp.type === currProp.type) {
      if (typeof prevProp.stateIndex === "number" && typeof currProp.stateIndex === "number") {
        if (currProp.stateIndex < prevProp.stateIndex) {
          currProp.stateIndex = prevProp.stateIndex;
          currProp.statePhase = prevProp.statePhase;
          if (currSc.visualProposition) {
            currSc.visualProposition.stateIndex = prevProp.stateIndex;
            currSc.visualProposition.statePhase = prevProp.statePhase;
          }
        }
      }
    }
  }

  // 10. Anti-Stagnation Coverage: Guarantee no 3 consecutive scenes share identical visual state AND shot
  const SHOT_ROTATION = ["medium", "closeUp", "overShoulder", "illustration", "twoShot"];
  for (let i = 2; i < config.scenes.length; i++) {
    const s0 = config.scenes[i - 2];
    const s1 = config.scenes[i - 1];
    const s2 = config.scenes[i];

    const p0 = s0.props?.[0];
    const p1 = s1.props?.[0];
    const p2 = s2.props?.[0];

    const sameProp = (p0 && p1 && p2 && p0.type === p1.type && p1.type === p2.type && (p0.stateIndex ?? 0) === (p1.stateIndex ?? 0) && (p1.stateIndex ?? 0) === (p2.stateIndex ?? 0));
    const noProp = (!p0 && !p1 && !p2);

    if ((sameProp || noProp) && s0.shot === s1.shot && s1.shot === s2.shot) {
      const currIdx = SHOT_ROTATION.indexOf(s2.shot);
      const nextShot = SHOT_ROTATION[(currIdx >= 0 ? currIdx + 1 : 1) % SHOT_ROTATION.length];
      s2.shot = nextShot;
      if (s2.director) {
        s2.director.cameraIntent = `dynamic coverage shift to ${nextShot} preventing visual stagnation`;
      }
    }
  }

  if (droppedProps) {
    console.warn(`  ⚠ ${droppedProps} prop dropped: no \`type\` (draws nothing; upstream planner bug)`);
  }

  return config;
}

module.exports = {
  PHILOSOPHICAL_WORLDS,
  MODERN_FORBIDDEN_SETS,
  MODERN_FORBIDDEN_PROPS,
  extractClaimType,
  extractEpistemicStance,
  extractProposition,
  validateStateProgression,
  generateDirectorSpec,
  calculateVIG,
  scoreSemanticRelevance,
  enforceSemanticRelevance,
  // Backwards compatibility
  extractVisualClaim: extractProposition,
  PHILOSOPHY_CONCEPTS: Object.values(PHILOSOPHICAL_WORLDS).map((w) => ({
    id: w.id,
    prop: w.id,
    set: w.set,
    claim: w.states[0]?.claim || w.name,
    re: w.states[0]?.re || new RegExp(w.id, "i"),
  })),
};
