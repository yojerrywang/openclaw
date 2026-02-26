---
summary: "Spec for role-based multi-agent collaboration in shared chat channels"
title: "Multi-Agent Interaction Model"
read_when: "You want several agents in shared channels without reply storms, including turn-based baton workflows."
status: active
---

# Multi-Agent Interaction Model

Goal: run a team of agents in shared channels (for example Slack) with clear role behavior, controlled collaboration, and loop-safe baton passing.

## Current implementation status

Implemented in the Slack monitor pipeline:

- `orchestratorOnly` channel gating for human untargeted chatter
- deterministic baton state (`runId`/thread key, roster, turn index, max turns)
- watchdog + stall skip for dropped Slack events
- strict per-turn claim lock + stale dispatch drop to prevent duplicate turns
- story output normalization (short replies, no self-name prefixes, no dangling handoff tails)

## Problem statement

A plain "all bots can reply to all bot messages" setup is unstable:

- casual chats become noisy
- handoffs recurse into bot loops
- no clear ownership of replies
- senior/junior role behavior is inconsistent

This spec defines an interaction contract that keeps group chats usable while still supporting multi-agent collaboration.

## Scope

In scope:

- six-agent team design
- channel behavior for `#general`, `#marketing`, `#research`, `#projects`
- greeting behavior in shared rooms
- turn-based storytelling with ordered baton passing
- role seniority (junior chatty, boss final)
- loop controls and stopping conditions

Out of scope:

- model-provider selection/tuning
- UI/dashboard implementation details
- channel-specific setup steps beyond config examples

## Agent roster model

Define six agents with explicit classes:

- 2 `boss` agents (strategic synthesis, final decisions, speak last in orchestrated runs)
- 4 `junior` agents (exploration, draft content, chatty style allowed)

Each agent has:

- `agentId`
- role class (`boss` or `junior`)
- personality profile in workspace identity files
- default response style constraints (length, tone, initiative level)

## Channel model

### `#general` (control room)

- Human-facing room for requests, status, and concise discussion.
- Default policy: only one owner agent replies per request unless a multi-agent mode is explicitly invoked.
- Multi-agent runs are orchestrated by protocol, not free-form bot chatter.

### `#marketing`, `#research`, `#projects` (work rooms)

- Task execution rooms.
- Delegation and collaboration are allowed under bounded turn and hop policies.
- Summaries are posted back to `#general` by an owner agent.

## Conversation modes

Each inbound request is classified into one mode:

1. `casual`: greeting/small talk.
2. `orchestrated`: structured multi-agent sequence (for example story baton).
3. `autonomous`: deeper collaboration in a work room with periodic summaries.

Default routing:

- `#general`: `casual` unless request explicitly asks for team workflow.
- work rooms: `autonomous` by default.

## Ownership and speaking rules

For each run, assign a single `owner` agent.

Rules:

- only `owner` may post unprompted run-level updates in the channel
- non-owner agents post only when:
  - explicitly called by owner, or
  - explicitly mentioned by human, or
  - they hold the current baton turn
- owner is responsible for run completion and stop conditions

## Baton protocol (turn-based coherence)

Use a deterministic turn contract:

- `runId`
- ordered `roster`
- `turnIndex`
- `maxTurns`
- `stopReason`

Required constraints:

- one agent speaks per turn
- each turn produces one bounded chunk (for example 1 scene/paragraph)
- baton passes only to next roster agent
- run ends on `maxTurns`, explicit stop, timeout, or owner-complete

### Story workflow (example)

Human: "tell me a story"

Roster example (Inspector Gadget mode):

1. Chief Quimby (mission brief)
2. Penny (plan)
3. Brain (technical refinement)
4. Inspector Gadget (bumbling execution)
5. MAD Cat (sabotage)
6. Dr Claw (final boss close)

Behavior:

- Quimby opens the assignment with stakes and a mission window
- Penny and Brain coordinate plan + technical execution
- Gadget executes with comic friction while still advancing the mission
- MAD Cat sabotages
- Dr Claw closes with strategic menace
- owner publishes stitched final output

## Role behavior policy

### Junior agents

- may be more verbose/chatty
- produce drafts, options, and speculative ideas
- should ask for boss review when confidence is low

### Boss agents

- concise, high-confidence synthesis
- resolve conflicts between junior drafts
- produce final recommendation/ending

## Collaboration and escalation policy

Agents should decide between:

- `work solo`: simple request, high confidence
- `collaborate`: task spans multiple domains
- `escalate`: uncertainty, conflict, high-impact decision

Escalation triggers:

- conflicting findings across agents
- missing key input/dependency
- policy ambiguity
- repeated failed attempts

## Loop and storm prevention

Hard requirements:

- no bot may auto-reply to untargeted bot chatter in shared channels
- cross-agent exchanges must be run-scoped (`runId`) with hop limits
- maintain dedupe/idempotency keys per channel message
- enforce per-run guardrails:
  - `maxTurns`
  - `maxHops`
  - wall-clock timeout
  - max consecutive bot posts without human input
  - one locked processor per turn (duplicate events must be dropped)

Operational recommendation:

- keep channel-level bot-to-bot auto-replies disabled by default
- perform inter-agent coordination through explicit session tools and owner mediation

## OpenClaw mapping

Use OpenClaw primitives:

- `agents.list[]` for isolated personas/workspaces
- `bindings[]` to map channels/accounts to default owner agents
- `sessions_send` / `sessions_spawn` for explicit cross-agent collaboration
- `session.agentToAgent.maxPingPongTurns` for bounded reply-back behavior
- per-channel mention and bot policies to suppress passive bot loops

## Acceptance criteria

1. Greeting in `#general` produces bounded responses (no storm).
2. Story request runs full baton sequence with coherent ordering.
3. Boss agents always speak last in orchestrated mode.
4. Runs terminate deterministically with a clear `stopReason`.
5. No infinite loop occurs when agents collaborate.
6. No duplicate turn posts from the same agent in one baton turn.
7. Story lines do not self-prefix with speaker names (Slack label is the source of identity).

## Rollout plan

1. Define roster + role profiles.
2. Enable owner-only posting in `#general`.
3. Implement baton protocol for `orchestrated` mode.
4. Add loop guard metrics/logs (`runId`, turn, hop, stop reason).
5. Expand to autonomous work-room workflows.
