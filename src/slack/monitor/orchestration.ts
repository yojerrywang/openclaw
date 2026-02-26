/**
 * Configuration for orchestrated multi-agent runs (Story Mode).
 */

export const STORY_MODE_TRIGGERS = ["tell me a story", "start story"];
export const ORCHESTRATOR_ACCOUNT_ID = "penny";

/**
 * Default roster for a full 6-agent coordinated interaction.
 * Canon order: mission brief -> planning -> execution -> sabotage -> villain setback.
 */
export const DEFAULT_STORY_ROSTER = ["quimby", "penny", "brain", "gadget", "madcat", "drclaw"];

export const MAX_STORY_TURNS = 12;
export const STORY_MODE_MAX_SENTENCES = 2;
export const STORY_MODE_MAX_CHARS = 180;

type StoryPersona = {
  displayName: string;
  role: string;
  tone: string;
  objective: string;
  signatureCue: string;
  canonBehaviors: string[];
  canonKeywords: string[];
};

const STORY_PERSONAS: Record<string, StoryPersona> = {
  penny: {
    displayName: "Penny",
    role: "orchestrator and field tactician",
    tone: "clear, decisive, clever",
    objective: "turn Quimby's assignment into a practical team plan",
    signatureCue: "maps a crisp next move with Brain",
    canonBehaviors: [
      "coordinate covertly and protect Gadget from avoidable mistakes",
      "call out practical clues, maps, or control-room logic",
    ],
    canonKeywords: ["computer book", "mission", "signal", "control room"],
  },
  gadget: {
    displayName: "Inspector Gadget",
    role: "heroic but accident-prone field inspector",
    tone: "confident, earnest, comic-action",
    objective: "execute the plan with one bumbling move that still helps the mission",
    signatureCue: "bold gadget action with comic friction",
    canonBehaviors: [
      "advance the scene with one specific gadget action and one concrete clue",
      "sound bravely certain even when the move is slightly chaotic",
    ],
    canonKeywords: ["go go gadget", "wowsers", "clue", "route"],
  },
  madcat: {
    displayName: "MAD Cat",
    role: "chaotic wildcard",
    tone: "dramatic, sly, punchy",
    objective: "sabotage Gadget's progress with a concrete trap or decoy",
    signatureCue: "sly sabotage with theatrical menace",
    canonBehaviors: [
      "introduce traps, ambushes, decoys, or chaotic pressure",
      "play mischief without derailing continuity",
    ],
    canonKeywords: ["trap", "decoy", "alarm", "ambush"],
  },
  quimby: {
    displayName: "Chief Quimby",
    role: "frustrated mission sponsor",
    tone: "brief, urgent, directive",
    objective: "open with the assignment, stakes, and mission window",
    signatureCue: "urgent mission brief under pressure",
    canonBehaviors: [
      "deliver assignment-style urgency and clear objective",
      "tight command voice with consequences if the team fails",
    ],
    canonKeywords: ["assignment", "objective", "urgent", "mission window"],
  },
  brain: {
    displayName: "Brain",
    role: "silent analyst and fixer",
    tone: "calm, practical, competent",
    objective: "tighten Penny's plan with one precise technical fix",
    signatureCue: "quietly locks in the plan",
    canonBehaviors: [
      "solve technical or tactical blockers with minimal drama",
      "support Penny's plan and stabilize chaos from others",
    ],
    canonKeywords: ["reroute", "disable", "bypass", "thermal"],
  },
  drclaw: {
    displayName: "Dr. Claw",
    role: "final boss strategist",
    tone: "cold, theatrical, strategic",
    objective: "close with a villain reaction as his ruse is spoiled",
    signatureCue: "ominous setback and threat",
    canonBehaviors: [
      "react to a failed or compromised M.A.D. move, then threaten the next phase",
      "end the scene with menace, not a successful command execution",
    ],
    canonKeywords: ["M.A.D.", "ruse", "spoiled", "next phase"],
  },
};

const STORY_TURN_BEATS = [
  "Chief Quimby delivers the assignment, objective, and hard mission window.",
  "Penny proposes a concrete plan with tactical next steps.",
  "Brain sharpens Penny's plan with one precise technical move.",
  "Inspector Gadget attempts execution with comic friction but accidental progress.",
  "MAD Cat sabotages the execution with a trap, decoy, or alarm.",
  "Dr. Claw reacts as his ruse is spoiled and threatens the next phase.",
];

const INSPECTOR_GADGET_STYLE_GUIDE = [
  "Episode grammar: odd setup -> hidden M.A.D. mechanism -> false confidence -> near disaster -> clever recovery -> villain cliffhanger.",
  "Keep world references grounded in classic Gadget canon (M.A.D., hidden control rooms, gadgets, traps, mission briefings).",
  "Tone mix: light comedy + mission urgency + tactical problem solving.",
  "Keep voices distinct: Penny = clever field planner, Inspector Gadget = earnest comic action hero, Quimby = urgent assignment voice, Brain = quiet fixer, Dr. Claw = strategic menace.",
  "Characters should act, not narrate meta process; no roleplay stage directions.",
  "Do not start replies with your own name; Slack already shows the speaker.",
  "Never use process templates like 'Following X move...' or 'based on the last development'.",
  "Never reply with filler like 'what happens next' or generic handoff questions.",
  "Use concrete nouns (locations, devices, clues, alarms) every turn.",
];

const INSPECTOR_GADGET_CADENCE_GUIDE = [
  "Mission cadence: Quimby briefing -> Penny plan -> Brain refinement -> Gadget bumble -> MAD Cat sabotage -> Dr. Claw setback.",
  "Include one specific action per turn (trigger, decode, reroute, disable, evade, recover).",
  "Character lines should feel episodic, not modern chat assistant prose.",
];

const INSPECTOR_GADGET_CANON_ANCHORS = [
  "M.A.D.",
  "hidden base",
  "control room",
  "trap",
  "alarm",
  "gadget",
  "mission",
  "code",
  "signal",
  "armored convoy",
];

const INSPECTOR_GADGET_SCRIPT_MOTIFS = [
  "Use mission-brief language: assignment, suspect M.A.D., protect target asset.",
  "Seed tangible obstacles: hidden tunnels, trap doors, false walls, decoys, alarms.",
  "Include one mechanical action beat: trigger, reroute, disable, lockout, evade.",
  "Let villain pressure feel theatrical and specific, not generic evil narration.",
  "Keep comedic friction grounded in action mistakes, not random non-sequiturs.",
  "Let Quimby and Penny lines carry mission control energy while Brain solves quietly in one precise action.",
];

const STORY_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "over",
  "under",
  "then",
  "they",
  "them",
  "their",
  "your",
  "have",
  "been",
  "were",
  "will",
  "would",
  "about",
  "after",
  "before",
  "when",
  "where",
  "while",
  "because",
  "there",
  "here",
  "just",
  "very",
  "really",
  "tell",
  "happens",
  "next",
  "following",
  "move",
  "development",
  "concrete",
  "around",
  "rookie",
  "report",
  "excited",
  "story",
  "episode",
  "team",
]);

export type StoryState = {
  mission: string;
  currentScene?: string;
  unresolvedClue?: string;
  antagonistPressure?: string;
  lastBeat?: string;
  continuityAnchors: string[];
};

export function resolveStoryPersona(accountId: string): StoryPersona {
  return (
    STORY_PERSONAS[accountId.toLowerCase()] ?? {
      displayName: accountId,
      role: "team specialist",
      tone: "focused and concise",
      objective: "advance the story coherently",
      signatureCue: "adds one concrete mission detail",
    }
  );
}

export function resolveStoryTurnBeat(turnIndex: number): string {
  return STORY_TURN_BEATS[turnIndex % STORY_TURN_BEATS.length] ?? STORY_TURN_BEATS[0];
}

function tokenizeForAnchors(text: string): string[] {
  return (text.toLowerCase().match(/[a-z][a-z0-9-]{2,}/g) ?? []).filter(
    (token) => !STORY_STOP_WORDS.has(token),
  );
}

export function extractStoryAnchors(text: string, max = 8): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const token of tokenizeForAnchors(text)) {
    if (seen.has(token)) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
    if (tokens.length >= max) {
      break;
    }
  }
  return tokens;
}

function firstSentence(text: string): string {
  return splitIntoSentences(text)[0] ?? text.trim();
}

export function initializeStoryState(seedPrompt?: string): StoryState {
  const mission =
    (seedPrompt ?? "").trim() || "Rescue Inspector Gadget and neutralize Dr. Claw's plan.";
  return {
    mission,
    continuityAnchors: extractStoryAnchors(mission, 10),
  };
}

export function advanceStoryState(params: {
  prev: StoryState;
  turnText: string;
  turnBeat: string;
}): StoryState {
  const cleanedTurn = params.turnText.replace(/\s+/g, " ").trim();
  const scene = firstSentence(cleanedTurn);
  const clueMatch = cleanedTurn.match(/\b(clue|code|signal|map|key|trace|blueprint)\b/i);
  const pressureMatch = cleanedTurn.match(/\b(timer|alarm|trap|danger|countdown|ambush)\b/i);
  const anchors = [...params.prev.continuityAnchors, ...extractStoryAnchors(cleanedTurn, 8)];
  const dedupAnchors = [...new Set(anchors)].slice(-12);

  return {
    mission: params.prev.mission,
    currentScene: scene || params.prev.currentScene,
    unresolvedClue: clueMatch ? clueMatch[0].toLowerCase() : params.prev.unresolvedClue,
    antagonistPressure: pressureMatch
      ? pressureMatch[0].toLowerCase()
      : params.prev.antagonistPressure,
    lastBeat: params.turnBeat,
    continuityAnchors: dedupAnchors,
  };
}

function formatStoryTranscript(
  transcript: Array<{ agentId: string; text: string }>,
  maxEntries = 8,
): string {
  const slice = transcript.slice(-maxEntries);
  if (slice.length === 0) {
    return "No prior turns yet.";
  }
  return slice
    .map((entry) => `- ${entry.agentId}: ${entry.text.replace(/\s+/g, " ").trim()}`)
    .join("\n");
}

export function buildStoryModeSystemPrompt(params: {
  agentId: string;
  roster: string[];
  turnIndex: number;
  maxTurns: number;
  seedPrompt?: string;
  transcript: Array<{ agentId: string; text: string }>;
  state?: StoryState;
}): string {
  const persona = resolveStoryPersona(params.agentId);
  const position = Math.min(params.turnIndex + 1, params.roster.length);
  const isFinalBossTurn = params.agentId.toLowerCase() === "drclaw";
  const mission =
    (params.state?.mission ?? params.seedPrompt ?? "").trim() || "Tell a coherent mini-episode.";
  const turnBeat = resolveStoryTurnBeat(params.turnIndex);

  const finalBeatRule = isFinalBossTurn
    ? "You are the final boss: your ruse was disrupted, so close with menace and a next-time threat."
    : "Do not end the episode; hand off naturally to the next teammate.";
  const rosterOrder = params.roster.map((id) => resolveStoryPersona(id).displayName).join(" -> ");

  return [
    "Story Mode: Inspector Gadget collaborative episode.",
    "Series style guide:",
    ...INSPECTOR_GADGET_STYLE_GUIDE.map((line) => `- ${line}`),
    "Dialogue cadence guide:",
    ...INSPECTOR_GADGET_CADENCE_GUIDE.map((line) => `- ${line}`),
    `Turn order for this run: ${rosterOrder}.`,
    "Script motif guide:",
    ...INSPECTOR_GADGET_SCRIPT_MOTIFS.map((line) => `- ${line}`),
    `You are ${persona.displayName}, the ${persona.role}.`,
    `Voice: ${persona.tone}.`,
    `Objective for this turn: ${persona.objective}.`,
    "Character behavior rules:",
    ...persona.canonBehaviors.map((line) => `- ${line}`),
    `Preferred keywords for this character: ${persona.canonKeywords.join(", ")}`,
    `Turn beat: ${turnBeat}`,
    `Voice marker (style only, do not quote verbatim): ${persona.signatureCue}.`,
    `Mission prompt: ${mission}`,
    `Turn position: ${position}/${Math.min(params.maxTurns, params.roster.length)}.`,
    finalBeatRule,
    `Current scene: ${params.state?.currentScene ?? "Unknown - infer from recent turns."}`,
    `Unresolved clue: ${params.state?.unresolvedClue ?? "None yet"}`,
    `Antagonist pressure: ${params.state?.antagonistPressure ?? "Low"}`,
    `Anchors to reference: ${(params.state?.continuityAnchors ?? []).slice(-4).join(", ") || "None yet"}`,
    `Canon anchors available: ${INSPECTOR_GADGET_CANON_ANCHORS.join(", ")}`,
    "Continuity rules:",
    "- Continue directly from prior turns; do not restart the story.",
    "- Stay in-character and mention concrete scene details.",
    `- Keep reply to 1-2 short sentences and under ${STORY_MODE_MAX_CHARS} characters.`,
    "- Never emit extra turns or speak for another character.",
    "- Do not ask the audience what happens next; advance the scene yourself.",
    "Recent turns:",
    formatStoryTranscript(params.transcript),
  ].join("\n");
}

export function enforceStoryCoherence(params: {
  text: string;
  agentId: string;
  turnIndex: number;
  state?: StoryState;
  transcript: Array<{ agentId: string; text: string }>;
}): string {
  const normalized = normalizeStoryModeText(params.text);
  const lower = normalized.toLowerCase();
  const persona = resolveStoryPersona(params.agentId);
  const words = lower.match(/[a-z0-9'-]+/g) ?? [];
  const anchors = (params.state?.continuityAnchors ?? []).slice(-5);
  const hasAnchor = anchors.some((anchor) => lower.includes(anchor));
  const hasBridgeWord = /\b(then|after|while|as|meanwhile|next|following|because)\b/i.test(
    normalized,
  );
  const hasSceneReference = Boolean(
    params.state?.currentScene &&
    extractStoryAnchors(params.state.currentScene, 5).some((anchor) => lower.includes(anchor)),
  );
  const asksWhatHappensNext = /\bwhat happens next\b/i.test(normalized);
  const lowEffortQuestion = (words.length <= 8 && normalized.endsWith("?")) || asksWhatHappensNext;
  const metaTemplateLeak =
    /\bfollowing\b.{0,80}\b(move|development|step|update)\b/i.test(normalized) ||
    /\bbased on\b.{0,80}\b(last|previous)\b.{0,40}\b(move|development|update)\b/i.test(
      normalized,
    ) ||
    /\b(turn beat|signature cue|objective for this turn)\b/i.test(normalized);
  const recentDuplicate = params.transcript
    .slice(-3)
    .some((entry) => normalizeStoryModeText(entry.text).toLowerCase() === lower);
  const anchorLead = anchors[0] ?? "the mission";
  const sceneLead = params.state?.currentScene ?? "the hidden corridor";

  if (
    !metaTemplateLeak &&
    !recentDuplicate &&
    !lowEffortQuestion &&
    words.length >= 7 &&
    (hasAnchor || hasBridgeWord || hasSceneReference)
  ) {
    return normalized;
  }

  const rewritten = buildFallbackStoryTurn({
    agentId: params.agentId,
    persona,
    sceneLead,
    anchorLead,
  });
  return normalizeStoryModeText(rewritten);
}

function buildFallbackStoryTurn(params: {
  agentId: string;
  persona: StoryPersona;
  sceneLead: string;
  anchorLead: string;
}): string {
  const agentId = params.agentId.toLowerCase();
  switch (agentId) {
    case "quimby":
      return `Assignment at ${params.sceneLead}: secure ${params.anchorLead} before the mission window closes.`;
    case "penny":
      return `I'll map the plan at ${params.sceneLead}, assign roles around ${params.anchorLead}, and keep M.A.D. reacting to us.`;
    case "brain":
      return `I'll quietly refine the plan at ${params.sceneLead} and lock ${params.anchorLead} into a workable route.`;
    case "gadget":
      return `Go go Gadget! I bumble through ${params.sceneLead} and somehow secure ${params.anchorLead} anyway.`;
    case "madcat":
      return `I'll sabotage the move at ${params.sceneLead} and turn ${params.anchorLead} into a fresh decoy trap.`;
    case "drclaw":
      return `My ruse at ${params.sceneLead} is spoiled, but M.A.D. will strike again over ${params.anchorLead}.`;
    default:
      return `I advance the mission at ${params.sceneLead}, keeping ${params.anchorLead} in play.`;
  }
}

export function isOrchestratorAccount(accountId: string): boolean {
  return accountId.trim().toLowerCase() === ORCHESTRATOR_ACCOUNT_ID;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripLeadingCharacterLabel(text: string): string {
  return text.replace(
    /^\s*(?:chief\s+quimby|penny|brain|inspector\s+gadget|mad\s*cat|dr\.?\s*claw)\s*[:\-–—]\s*/i,
    "",
  );
}

function stripTrailingHandoffLabel(text: string): string {
  let output = text.trim();
  const patterns = [
    /\s*[—\-,:;]?\s*(?:mad\s*cat|dr\.?\s*claw|inspector\s+gadget|chief\s+quimby|penny|brain)\.?\s*$/i,
    /\s*[—\-,:;]?\s*dr\.?\s*$/i,
    /\s*[—\-,:;]?\s*(?:next|over to)\s+(?:mad\s*cat|dr\.?\s*claw|inspector\s+gadget|chief\s+quimby|penny|brain)\.?\s*$/i,
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const pattern of patterns) {
      const next = output.replace(pattern, "").trimEnd();
      if (next !== output) {
        output = next;
        changed = true;
      }
    }
  }

  return output;
}

function stripLeadingSelfIntro(text: string): string {
  return text.replace(/^\s*(i am|i'm|this is)\s+[a-z][^.!?\n]*[.!?]?\s*/i, "");
}

/**
 * Baton mode output normalization:
 * - remove common self-intro lead-ins
 * - keep at most two sentences
 * - cap length to keep replies concise in shared threads
 */
export function normalizeStoryModeText(text: string): string {
  const trimmed = stripLeadingCharacterLabel(stripLeadingSelfIntro(text.trim())).replace(
    /\s+/g,
    " ",
  );
  const firstTwo = splitIntoSentences(trimmed).slice(0, STORY_MODE_MAX_SENTENCES).join(" ").trim();
  const candidate = stripTrailingHandoffLabel((firstTwo || trimmed).trim());
  if (candidate.length <= STORY_MODE_MAX_CHARS) {
    return candidate;
  }
  const hardSlice = candidate.slice(0, STORY_MODE_MAX_CHARS).trimEnd();
  const wordSafe = hardSlice.replace(/\s+\S*$/, "").trimEnd();
  const base = stripTrailingHandoffLabel(
    (wordSafe || hardSlice).replace(/[,:;–-]+\s*$/, "").trimEnd(),
  );
  if (!base) {
    return stripTrailingHandoffLabel(candidate.slice(0, STORY_MODE_MAX_CHARS).trimEnd());
  }
  return /[.!?]$/.test(base) ? base : `${base}.`;
}
