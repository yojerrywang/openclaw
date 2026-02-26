import { describe, expect, it } from "vitest";
import {
  forceBatonStallForTests,
  recordBotReply,
  resetThreadRelayStateForTests,
  runBatonWatchdogTickForTests,
  shouldProcessBotMessage,
  startBatonRun,
  waitForBatonTurn,
} from "./thread-relay.js";

describe("thread-relay watchdog", () => {
  it("skips a missing turn after repeated stall nudges and unblocks the next agent", async () => {
    resetThreadRelayStateForTests();
    startBatonRun({
      channelId: "C1",
      threadTs: "100.100",
      roster: ["penny", "gadget", "madcat"],
      maxTurns: 3,
    });

    // Penny completed the first turn, gadget should be next.
    recordBotReply({ channelId: "C1", threadTs: "100.100", agentId: "penny" });

    const madcatTurnPromise = waitForBatonTurn({
      channelId: "C1",
      threadTs: "100.100",
      agentId: "madcat",
      timeoutMs: 5_000,
    });

    // Simulate repeated watchdog stalls with no gadget activity.
    forceBatonStallForTests({ channelId: "C1", threadTs: "100.100", staleByMs: 30_000 });
    runBatonWatchdogTickForTests(Date.now() + 30_000);

    forceBatonStallForTests({ channelId: "C1", threadTs: "100.100", staleByMs: 30_000 });
    runBatonWatchdogTickForTests(Date.now() + 60_000);

    await expect(madcatTurnPromise).resolves.toBe(true);
  });

  it("enforces a strict claim lock so duplicate same-agent events are dropped", () => {
    resetThreadRelayStateForTests();
    startBatonRun({
      channelId: "C1",
      threadTs: "200.100",
      roster: ["penny", "gadget"],
      maxTurns: 2,
    });

    // First claim wins.
    expect(
      shouldProcessBotMessage({
        channelId: "C1",
        threadTs: "200.100",
        agentId: "penny",
      }),
    ).toBe(true);

    // Duplicate same-agent processing must be rejected while lock is held.
    expect(
      shouldProcessBotMessage({
        channelId: "C1",
        threadTs: "200.100",
        agentId: "penny",
      }),
    ).toBe(false);

    // Out-of-turn agents are also rejected while lock is held.
    expect(
      shouldProcessBotMessage({
        channelId: "C1",
        threadTs: "200.100",
        agentId: "gadget",
      }),
    ).toBe(false);

    // After Penny replies, baton advances and gadget can claim.
    recordBotReply({ channelId: "C1", threadTs: "200.100", agentId: "penny", text: "turn done" });
    expect(
      shouldProcessBotMessage({
        channelId: "C1",
        threadTs: "200.100",
        agentId: "gadget",
      }),
    ).toBe(true);
  });
});
