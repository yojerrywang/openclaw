/**
 * Shared state for tracking bot activity across all Slack agents in the same gateway process.
 * This tracks both casual loop prevention and the orchestrated Baton Protocol.
 */

import {
  advanceStoryState,
  initializeStoryState,
  resolveStoryTurnBeat,
  type StoryState,
} from "./orchestration.js";

const THREAD_BOT_REPLY_COUNTS = new Map<string, number>();
const MAX_CONSECUTIVE_BOTS = 3;
const BOT_USER_TO_AGENT = new Map<string, string>();

interface BatonState {
  channelId: string;
  threadTs: string;
  roster: string[];
  turnIndex: number;
  maxTurns: number;
  seedPrompt?: string;
  transcript: Array<{ agentId: string; text: string }>;
  state: StoryState;
  turnStartedAt: number;
  lastNudgeAt?: number;
  stallNudges: number;
  // Prevent simultaneous processing of the same baton turn.
  claim?: { agentId: string; claimedAt: number };
}

const THREAD_BATONS = new Map<string, BatonState>();
const BATON_CLAIM_TTL_MS = 20_000;
const BATON_WATCHDOG_INTERVAL_MS = 5_000;
const BATON_TURN_STALL_MS = 25_000;
const BATON_MAX_STALL_NUDGES = 2;

type BatonWaiter = {
  agentId: string;
  resolve: (value: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
};
const THREAD_BATON_WAITERS = new Map<string, BatonWaiter[]>();
let batonWatchdogTimer: ReturnType<typeof setInterval> | null = null;

function resolveBatonKey(params: { channelId: string; threadTs: string }): string {
  return `${params.channelId}:${params.threadTs}`;
}

function removeWaiter(key: string, waiter: BatonWaiter): void {
  const list = THREAD_BATON_WAITERS.get(key);
  if (!list) {
    return;
  }
  const next = list.filter((entry) => entry !== waiter);
  if (next.length === 0) {
    THREAD_BATON_WAITERS.delete(key);
  } else {
    THREAD_BATON_WAITERS.set(key, next);
  }
}

function notifyWaiters(key: string): void {
  const waiters = THREAD_BATON_WAITERS.get(key);
  if (!waiters || waiters.length === 0) {
    return;
  }

  const baton = THREAD_BATONS.get(key);
  for (const waiter of waiters) {
    const canProcess = baton
      ? shouldProcessBotMessage({
          channelId: baton.channelId,
          threadTs: baton.threadTs,
          agentId: waiter.agentId,
        })
      : false;
    if (canProcess || !baton) {
      clearTimeout(waiter.timer);
      removeWaiter(key, waiter);
      waiter.resolve(canProcess);
    }
  }
}

function runBatonWatchdogTick(now: number): void {
  for (const [key, baton] of THREAD_BATONS.entries()) {
    const expectedAgentId = baton.roster[baton.turnIndex];
    if (!expectedAgentId) {
      continue;
    }
    if (baton.claim && now - baton.claim.claimedAt > BATON_CLAIM_TTL_MS) {
      delete baton.claim;
      THREAD_BATONS.set(key, baton);
    }

    const stalledForMs = now - baton.turnStartedAt;
    if (stalledForMs < BATON_TURN_STALL_MS) {
      continue;
    }

    if (!baton.lastNudgeAt || now - baton.lastNudgeAt >= BATON_TURN_STALL_MS) {
      baton.lastNudgeAt = now;
      baton.turnStartedAt = now;
      baton.stallNudges += 1;
      delete baton.claim;

      if (baton.stallNudges >= BATON_MAX_STALL_NUDGES) {
        const skippedAgentId = baton.roster[baton.turnIndex];
        baton.turnIndex += 1;
        baton.turnStartedAt = now;
        baton.stallNudges = 0;
        delete baton.lastNudgeAt;
        console.log(`[baton] watchdog skip key=${key} skipped=${skippedAgentId ?? "unknown"}`);

        if (baton.turnIndex >= baton.roster.length || baton.turnIndex >= baton.maxTurns) {
          console.log(`[baton] completed key=${key}`);
          THREAD_BATONS.delete(key);
          notifyWaiters(key);
          continue;
        }
      } else {
        console.log(
          `[baton] watchdog nudge key=${key} expected=${expectedAgentId} stalledMs=${stalledForMs}`,
        );
      }

      THREAD_BATONS.set(key, baton);
    }
    notifyWaiters(key);
  }
}

function startBatonWatchdogIfNeeded(): void {
  if (batonWatchdogTimer || THREAD_BATONS.size === 0) {
    return;
  }
  batonWatchdogTimer = setInterval(() => {
    runBatonWatchdogTick(Date.now());

    if (THREAD_BATONS.size === 0) {
      if (batonWatchdogTimer) {
        clearInterval(batonWatchdogTimer);
      }
      batonWatchdogTimer = null;
    }
  }, BATON_WATCHDOG_INTERVAL_MS);
  batonWatchdogTimer.unref?.();
}

function stopBatonWatchdogIfIdle(): void {
  if (THREAD_BATONS.size > 0 || !batonWatchdogTimer) {
    return;
  }
  clearInterval(batonWatchdogTimer);
  batonWatchdogTimer = null;
}

/**
 * Starts a new orchestrated baton run for a thread.
 */
export function startBatonRun(params: {
  channelId: string;
  threadTs: string;
  roster: string[];
  maxTurns: number;
  seedPrompt?: string;
}): void {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  THREAD_BATONS.set(key, {
    channelId: params.channelId,
    threadTs: params.threadTs,
    roster: params.roster.map((id) => id.toLowerCase()),
    turnIndex: 0,
    maxTurns: params.maxTurns,
    seedPrompt: params.seedPrompt?.trim() || undefined,
    transcript: [],
    state: initializeStoryState(params.seedPrompt),
    turnStartedAt: Date.now(),
    stallNudges: 0,
  });
  console.log(`[baton] start key=${key} roster=${params.roster.join(",")}`);
  startBatonWatchdogIfNeeded();
  notifyWaiters(key);
}

/**
 * Registers a Slack bot user ID to an internal agent ID mapping.
 * This lets other agents identify bot-originated messages without
 * expensive profile lookups on every event.
 */
export function registerBotUserForAgent(params: { botUserId?: string; agentId: string }): void {
  const botUserId = params.botUserId?.trim();
  if (!botUserId) {
    return;
  }
  BOT_USER_TO_AGENT.set(botUserId, params.agentId.toLowerCase());
}

/**
 * Resolves a previously registered agent ID for a Slack bot user ID.
 */
export function resolveAgentForBotUser(botUserId?: string): string | undefined {
  if (!botUserId) {
    return undefined;
  }
  return BOT_USER_TO_AGENT.get(botUserId);
}

/**
 * Checks if there is an active orchestrated baton run for this thread.
 */
export function isBatonActive(params: { channelId: string; threadTs: string }): boolean {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  return THREAD_BATONS.has(key);
}

/**
 * Checks if a bot message should be processed.
 * Prioritizes the Baton Protocol (turn-based) over casual loop prevention.
 */
export function shouldProcessBotMessage(params: {
  channelId: string;
  threadTs: string;
  agentId: string;
}): boolean {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  const agentId = params.agentId.toLowerCase();

  // 1. Check Baton Protocol (Orchestrated Mode)
  const baton = THREAD_BATONS.get(key);
  if (baton) {
    if (baton.claim && Date.now() - baton.claim.claimedAt > BATON_CLAIM_TTL_MS) {
      delete baton.claim;
    }

    if (baton.claim) {
      console.log(
        `[baton] locked key=${key} claimedBy=${baton.claim.agentId} agent=${agentId} allow=false`,
      );
      // Strict lock: once a turn is claimed, no additional processors (including
      // the same agent on duplicate Slack events) may enter until advance/expiry.
      return false;
    }

    const expectedAgentId = baton.roster[baton.turnIndex];
    const isTurn = expectedAgentId === agentId;
    console.log(
      `[baton] check key=${key} agent=${agentId} expected=${expectedAgentId} isTurn=${isTurn}`,
    );
    if (isTurn) {
      baton.claim = { agentId, claimedAt: Date.now() };
      baton.turnStartedAt = Date.now();
      THREAD_BATONS.set(key, baton);
    }
    return isTurn;
  }

  // 2. Check Casual Loop Prevention
  const count = THREAD_BOT_REPLY_COUNTS.get(key) ?? 0;
  return count < MAX_CONSECUTIVE_BOTS;
}

/**
 * Records a bot reply and advances the state.
 */
export function recordBotReply(params: {
  channelId: string;
  threadTs: string;
  agentId: string;
  text?: string;
}): void {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  const agentId = params.agentId.toLowerCase();

  // 1. Advance Baton
  const baton = THREAD_BATONS.get(key);
  if (baton) {
    if (baton.claim && baton.claim.agentId === agentId) {
      delete baton.claim;
    }
    // Only advance if the agent who spoke was actually the one we expected
    const expectedAgentId = baton.roster[baton.turnIndex];
    if (expectedAgentId === agentId) {
      const turnText = params.text?.replace(/\s+/g, " ").trim();
      if (turnText) {
        const turnBeat = resolveStoryTurnBeat(baton.turnIndex);
        baton.transcript.push({ agentId, text: turnText });
        baton.state = advanceStoryState({
          prev: baton.state,
          turnText,
          turnBeat,
        });
        if (baton.transcript.length > 32) {
          baton.transcript = baton.transcript.slice(-32);
        }
      }
      baton.turnIndex++;
      baton.turnStartedAt = Date.now();
      delete baton.lastNudgeAt;
      baton.stallNudges = 0;
      console.log(
        `[baton] advance key=${key} nextIndex=${baton.turnIndex} rosterSize=${baton.roster.length}`,
      );

      // If we've reached the end of the roster or max turns, clear the baton
      if (baton.turnIndex >= baton.roster.length || baton.turnIndex >= baton.maxTurns) {
        console.log(`[baton] completed key=${key}`);
        THREAD_BATONS.delete(key);
        notifyWaiters(key);
        stopBatonWatchdogIfIdle();
      } else {
        THREAD_BATONS.set(key, baton);
        notifyWaiters(key);
      }
    } else {
      THREAD_BATONS.set(key, baton);
    }
  }

  // 2. Update Casual Counter
  const count = (THREAD_BOT_REPLY_COUNTS.get(key) ?? 0) + 1;
  THREAD_BOT_REPLY_COUNTS.set(key, count);

  // Auto-evict old keys
  if (THREAD_BOT_REPLY_COUNTS.size > 1000) {
    const firstKey = THREAD_BOT_REPLY_COUNTS.keys().next().value;
    if (firstKey !== undefined) {
      THREAD_BOT_REPLY_COUNTS.delete(firstKey);
      THREAD_BATONS.delete(firstKey);
      notifyWaiters(firstKey);
    }
  }
}

/**
 * Resets state when a human speaks.
 */
export function recordHumanMessage(params: { channelId: string; threadTs: string }): void {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  THREAD_BOT_REPLY_COUNTS.delete(key);
  // We do NOT delete the baton here to allow human interjections without breaking the run
}

/**
 * Returns a realistic per-turn delay for baton mode to reduce simultaneous post races
 * and make turn-taking feel conversational.
 */
export function resolveBatonTurnDelayMs(params: {
  channelId: string;
  threadTs: string;
  agentId: string;
}): number {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  const baton = THREAD_BATONS.get(key);
  if (!baton) {
    return 0;
  }

  const expectedAgentId = baton.roster[baton.turnIndex];
  if (expectedAgentId !== params.agentId.toLowerCase()) {
    return 0;
  }

  // 2-5s delay window. Later turns speak slightly later.
  const turnOffset = Math.min(2000, baton.turnIndex * 350);
  const jitterSeed = params.agentId
    .split("")
    .reduce((sum, ch) => (sum + ch.charCodeAt(0)) % 500, 0);
  return 2000 + turnOffset + jitterSeed;
}

/**
 * Waits until the given agent can claim the baton turn.
 * Resolves false on timeout or when baton run is no longer active.
 */
export function waitForBatonTurn(params: {
  channelId: string;
  threadTs: string;
  agentId: string;
  timeoutMs?: number;
}): Promise<boolean> {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  const timeoutMs = Math.max(1000, params.timeoutMs ?? 180_000);

  if (!THREAD_BATONS.has(key)) {
    return Promise.resolve(false);
  }

  const immediate = shouldProcessBotMessage({
    channelId: params.channelId,
    threadTs: params.threadTs,
    agentId: params.agentId,
  });
  if (immediate) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    const waiter: BatonWaiter = {
      agentId: params.agentId.toLowerCase(),
      resolve,
      timer: setTimeout(() => {
        removeWaiter(key, waiter);
        resolve(false);
      }, timeoutMs),
    };
    const list = THREAD_BATON_WAITERS.get(key) ?? [];
    list.push(waiter);
    THREAD_BATON_WAITERS.set(key, list);
    startBatonWatchdogIfNeeded();
  });
}

export function getBatonSnapshot(params: { channelId: string; threadTs: string }): {
  roster: string[];
  turnIndex: number;
  maxTurns: number;
  seedPrompt?: string;
  transcript: Array<{ agentId: string; text: string }>;
  state: StoryState;
} | null {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  const baton = THREAD_BATONS.get(key);
  if (!baton) {
    return null;
  }
  return {
    roster: [...baton.roster],
    turnIndex: baton.turnIndex,
    maxTurns: baton.maxTurns,
    seedPrompt: baton.seedPrompt,
    transcript: [...baton.transcript],
    state: {
      ...baton.state,
      continuityAnchors: [...baton.state.continuityAnchors],
    },
  };
}

/**
 * Test helper to clear in-memory relay state.
 */
export function resetThreadRelayStateForTests(): void {
  THREAD_BOT_REPLY_COUNTS.clear();
  THREAD_BATONS.clear();
  BOT_USER_TO_AGENT.clear();
  for (const waiters of THREAD_BATON_WAITERS.values()) {
    for (const waiter of waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(false);
    }
  }
  THREAD_BATON_WAITERS.clear();
  if (batonWatchdogTimer) {
    clearInterval(batonWatchdogTimer);
    batonWatchdogTimer = null;
  }
}

export function runBatonWatchdogTickForTests(now: number): void {
  runBatonWatchdogTick(now);
  if (THREAD_BATONS.size === 0) {
    stopBatonWatchdogIfIdle();
  }
}

export function forceBatonStallForTests(params: {
  channelId: string;
  threadTs: string;
  staleByMs?: number;
}): void {
  const key = resolveBatonKey({ channelId: params.channelId, threadTs: params.threadTs });
  const baton = THREAD_BATONS.get(key);
  if (!baton) {
    return;
  }
  const staleByMs = Math.max(BATON_TURN_STALL_MS + 1, params.staleByMs ?? BATON_TURN_STALL_MS + 1);
  baton.turnStartedAt = Date.now() - staleByMs;
  baton.lastNudgeAt = Date.now() - staleByMs;
  THREAD_BATONS.set(key, baton);
}
