import { describe, expect, it } from "vitest";
import {
  DEFAULT_STORY_ROSTER,
  STORY_MODE_MAX_CHARS,
  buildStoryModeSystemPrompt,
  enforceStoryCoherence,
  initializeStoryState,
  normalizeStoryModeText,
  resolveStoryTurnBeat,
} from "./orchestration.js";

describe("slack story orchestration", () => {
  it("includes turn beat and final boss rule in story mode prompt", () => {
    const prompt = buildStoryModeSystemPrompt({
      agentId: "drclaw",
      roster: DEFAULT_STORY_ROSTER,
      turnIndex: 5,
      maxTurns: 6,
      seedPrompt: "tell me a story about rescuing inspector gadget",
      transcript: [{ agentId: "brain", text: "Brain disarms the trap." }],
      state: initializeStoryState("rescue inspector gadget from the clock tower"),
    });

    expect(prompt).toContain("Turn beat:");
    expect(prompt).toContain("Series style guide:");
    expect(prompt).toContain("Canon anchors available:");
    expect(prompt).toContain("You are the final boss");
    expect(prompt).toContain("your ruse was disrupted");
    expect(prompt).toContain("Turn order for this run:");
    expect(prompt).toContain("Voice marker (style only, do not quote verbatim):");
    expect(prompt).toContain(resolveStoryTurnBeat(5));
  });

  it("rewrites weak off-anchor output to include continuity anchors", () => {
    const rewritten = enforceStoryCoherence({
      text: "The weather is pretty today.",
      agentId: "gadget",
      turnIndex: 1,
      transcript: [{ agentId: "penny", text: "Penny finds a code near Gadget's cage." }],
      state: {
        mission: "rescue gadget",
        currentScene: "factory catwalk",
        continuityAnchors: ["gadget", "code", "cage"],
      },
    });

    expect(rewritten.toLowerCase()).toContain("factory catwalk");
    expect(rewritten.toLowerCase()).toContain("gadget");
    expect(rewritten.toLowerCase()).toContain("go go gadget");
  });

  it("rewrites meta handoff filler into a concrete in-character turn", () => {
    const rewritten = enforceStoryCoherence({
      text: "Following penny's move around development, Inspector Gadget excited field report. what happens next.",
      agentId: "gadget",
      turnIndex: 1,
      transcript: [
        { agentId: "penny", text: "Penny spots a hidden code near Gadget's cage." },
        { agentId: "gadget", text: "Inspector Gadget scans the hallway." },
      ],
      state: {
        mission: "rescue gadget",
        currentScene: "factory catwalk",
        continuityAnchors: ["gadget", "code", "cage"],
      },
    });

    expect(rewritten.toLowerCase()).not.toContain("what happens next");
    expect(rewritten.toLowerCase()).not.toContain("following penny");
    expect(rewritten.toLowerCase()).toContain("factory catwalk");
    expect(rewritten.toLowerCase()).toContain("gadget");
  });

  it("normalizes long text to a short sentence without ellipsis", () => {
    const longText =
      "I am Inspector Gadget. Go go Gadget Grappling Arm, I leap across the collapsing corridor while alarms scream and sparks flood the rail, then I over-explain every clue in painful detail while describing each hinge and gear and trap trigger and backup lock for far too long in one giant run-on answer with no stop.";
    const normalized = normalizeStoryModeText(longText);

    expect(normalized.length).toBeLessThanOrEqual(STORY_MODE_MAX_CHARS);
    expect(normalized.includes("…")).toBe(false);
    expect(normalized.includes("...")).toBe(false);
  });

  it("strips leading character labels because Slack already shows speaker name", () => {
    const normalized = normalizeStoryModeText(
      "Chief Quimby: Secure the corridor before the mission window closes.",
    );

    expect(normalized.toLowerCase().startsWith("chief quimby")).toBe(false);
    expect(normalized).toContain("Secure the corridor");
  });

  it("strips trailing handoff labels to avoid dangling names", () => {
    const normalized = normalizeStoryModeText(
      `Go go gadget extend maintenance arm—wowsers! I got the passphrase. MAD Cat.`,
    );
    const normalized2 = normalizeStoryModeText(`The decoy tripped and alarms woke the base. Dr.`);

    expect(normalized.toLowerCase().endsWith("mad cat.")).toBe(false);
    expect(normalized.toLowerCase().includes("mad cat")).toBe(false);
    expect(normalized2.toLowerCase().endsWith("dr.")).toBe(false);
  });
});
