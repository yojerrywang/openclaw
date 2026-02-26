# OpenClaw Slack Integration: Sprint Tracking

## Sprint 1: Stabilization & Save Point [COMPLETE]

- [x] Finalize project scope to 6-bot fleet (Dr. Claw, Brain, Inspector Gadget, Penny, MAD Cat, Chief Quimby)
- [x] Implement robust profile-based loop prevention
- [x] Repository sanitation & boundary documentation
- [x] Save-point rollback and clean repo state (Codex sync)
- [x] Verified verification: "Best run yet" confirmed in Slack

## Sprint 2: Story Mode Reliability [COMPLETE]

- [x] Draft implementation plan for Sprint 2 (`DRC-11`)
- [x] Refine system prompts (Strict identity silence & extreme brevity)
- [x] Enforce 1-2 sentence maximum & zero self-identification
- [x] Execute final acceptance tests (`DRC-7`, `DRC-8`, `DRC-9`)
  - [x] **Brevity**: 1-2 sentences max (`DRC-7`)
  - [x] **No Intro**: Zero "Bot here" noise (`DRC-8`)
  - [x] **Order**: Verify sequencing (`DRC-9`)
- [x] Implement deterministic baton watchdog and race protection
- [x] Add story-mode coherence guardrails and persona turn prompts
- [x] Migrate Inspector Gadget internal agent id from `talon` to `gadget`

## Sprint 3: Runtime Ops [COMPLETE]

- [x] Diagnose non-responsive Slack channel behavior
- [x] Confirm gateway unreachable on loopback (`127.0.0.1:18789`)
- [x] Restart gateway via daemon service and verify Slack provider reconnection
- [x] Verify orchestrator-only greeting behavior (`hi` -> Penny lead)
- [x] Verify full 6-agent baton continuity in live Slack threads
- [x] Enforce canonical story turn order (`DRC-12`)
- [x] Harden duplicate-turn prevention
- [x] Story output cleanup

## Sprint 4: Story Quality (Next)

- [ ] Improve episode-style coherence over 6-turn runs (`DRC-22`)
- [ ] Add per-character lexical constraints from Inspector Gadget script corpus (`DRC-23`)
- [ ] Tune Dr Claw close so it always lands as single final line (`DRC-24`)
- [ ] Add acceptance harness for content quality (`DRC-25`)
- [ ] Production Deployment: Await final Slack tokens for production fleet (`DRC-10`)
- [ ] Add optional "Council mode" prompt contract for non-story project collaboration (`DRC-26`)

## Collaboration Rooms Backlog (Synced to Linear)

- [ ] Council Room: Multi-model strategic rivals (`DRC-17`)
- [ ] War Room: Incident response protocol (`DRC-18`)
- [ ] Scouting Room: Research and intel pipeline (`DRC-19`)
- [ ] Work Room: Delivery pipeline orchestration (`DRC-20`)
- [ ] Play Room: Sandbox simulation mode (`DRC-21`)

## Build Order: Attention Ops + Revenue (Next 14 Days)

- [ ] Foundation: Single inbox + taxonomy for decisions and handoffs (`DRC-43`)
  - Scope: Slack = command inbox, Obsidian = memory, Linear = execution tracker.
  - Deliverables: tag schema (`council`, `war-room`, `scouting`, `work`, `play`), naming convention, and routing rules.
  - Acceptance: every new digest/trade/job/action maps to one project tag and one owner.

- [ ] Scouting Pipeline v1: Social/media ingestion + dedupe + ranking (`DRC-44`)
  - Sources: Reddit, YouTube, Facebook groups, LinkedIn, TikTok, Instagram, X.
  - Behavior: read-only collection, duplicate collapse, relevance scoring, urgency flag.
  - Acceptance: two daily high-signal digests with less than 20 items each and escalation only for urgent signals.

- [ ] Digest Engine v1: Push briefings to Slack + Obsidian (`DRC-45`)
  - Format: top item, why it matters, confidence, and action tag (`ignore`, `watch`, `act`).
  - Cadence: morning briefing, evening briefing, and urgent interrupt lane.
  - Acceptance: no manual feed scrolling required to stay current on selected topics.

- [ ] Content Production Pipeline v1: Turn high-signal briefings into published assets (`DRC-76`)
  - Integration: Bridge Digest Engine (`DRC-45`) with `extensions/open-prose/skills/prose`.
  - Behavior: Automated drafting, editorial review loops, and social media variant generation.
  - Acceptance: one "briefing-to-blog" run completed end-to-end without manual intervention.

- [ ] Trading Copilot v1 (Read-only): Setup cards and risk guardrails (`DRC-46`)
  - Sources: Robinhood + AfterHour signals/news/watchlists.
  - Behavior: generate setup cards (thesis, trigger, invalidation, sizing suggestion).
  - Guardrail: manual execution only until strategy review passes.
  - Acceptance: every trade idea is journaled and scored before any execution decision.

- [ ] Job Ops Copilot v1: Assisted apply pipeline (not blind auto-apply) (`DRC-47`)
  - Sources: LinkedIn + Indeed role ingestion.
  - Behavior: score fit, tailor resume/cover letter draft, queue one-click approve/send.
  - Guardrail: human approval required per submission.
  - Acceptance: measurable conversion funnel (`sourced` -> `applied` -> `interview` -> `offer`).

- [ ] Intake + Booking Automation v1: Sell setup sessions (`DRC-48`)
  - Offer: "OpenClaw Setup Sprint" at $150 for 90 minutes.
  - Flow: intake form -> qualification check -> booking link -> calendar + reminder automation.
  - Deliverables: post-call action plan and handoff checklist.
  - Acceptance: first paid session can be booked and fulfilled end-to-end without manual admin overhead.

- [ ] Weekly KPI Loop v1: Operator dashboard + optimization (`DRC-49`)
  - KPIs: feed-time reduction, digest action rate, interview conversion, trade setup quality, booked revenue.
  - Cadence: weekly review with "keep / change / remove" decisions.
  - Acceptance: week-over-week trend report posted automatically with top 3 optimization actions.

## Content Ops Integration: Obsidian -> Linear (Complete)

- [x] Created content project in Linear: **Content Production & Marketing**
- [x] Defined content workflow states:
  - [x] Content: Unpublished
  - [x] Content: Drafting
  - [x] Content: Reviewed
  - [x] Content: Short Script Ready
  - [x] Content: Short Produced
  - [x] Content: Scheduled
  - [x] Content: Published
  - [x] Content: Postmortem
- [x] Imported Obsidian vault content as Linear issues (`DRC-51` to `DRC-75`)
- [x] Mapped post notes with `status: ready` to **Content: Reviewed**
- [x] Mapped `video-scripts/*` notes to **Content: Short Script Ready**
- [x] Added metadata in issue descriptions for source traceability:
  - [x] `source_file`
  - [x] `content_type`
  - [x] `obsidian_uri`
  - [x] `last_modified`

## Agent Capabilities: Subagent Delegation (Next)

- [ ] Implement recursive subagent delegation for Penny, Brain, and Gadget tool loops (`DRC-27`)

## Future Roadmap

- [ ] Dockerize for 24/7 uptime (`DRC-16`)
- [ ] MCP integrations (`DRC-15`)
- [ ] Long-term memory (`DRC-14`)
- [ ] Voice transcription (`DRC-13`)
