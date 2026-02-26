# Dr. Claw Fleet Manual (Senior Handoff)

This manual documents the production-grade deployment of the 6-bot Dr. Claw fleet.

## 1. Fleet Architecture: The Baton Protocol

The fleet operates using a **Baton Protocol** for multi-agent orchestration in Slack. This prevents message loops and ensures coherent storytelling.

### How it Works:

- **Turn-taking**: Only one agent holds the "baton" at a time.
- **Relay Logic**: When an agent finishes a turn, they explicitly relay to the next logical character (e.g., `Quimby -> Penny -> Gadget`).
- **Loop Prevention**: Agents are configured to ignore messages from other bots UNLESS they are specifically mentioned or it is their turn in the state machine.

### The 6-Bot Roster:

1. **Dr. Claw**: Strategic menace / Final boss.
2. **Brain**: Quiet fixer / Technical solver.
3. **Penny**: Chief of Staff / Field planner.
4. **Inspector Gadget**: Comic action / Bumbling hero.
5. **MAD Cat**: Saboteur.
6. **Chief Quimby**: Mission briefer.

---

## 2. Operations (Ops)

### Daemon Management

The gateway is managed via `launchd`.

- **Label**: `ai.openclaw.gateway`
- **Config**: `/Users/admin/Library/LaunchAgents/ai.openclaw.gateway.plist`

**Commands:**

```bash
# Restart the gateway
launchctl unload ~/Library/LaunchAgents/ai.openclaw.gateway.plist
launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist

# Check if it's running
launchctl list | grep openclaw
```

### Logging

- **Primary log**: `/Users/admin/.openclaw/logs/gateway.log`
- **Error log**: `/Users/admin/.openclaw/logs/gateway.err.log`

---

## 3. Project Management (Linear Sync)

The fleet's backlog is synchronized with Linear using the **Python Linear client** plus explicit GraphQL mutations for advanced workflows.

- **Local Source**: `configs/dr-claw/task.md`
- **Canonical Client**: `python3 skills/linear-issues/scripts/linear_client.py`
- **Auth Source**: `~/.openclaw/openclaw.json` -> `skills.entries["linear-issues"].apiKey`

### Canonical Process

1. **Create backlog issues from task.md entries**
   - Use the Python Linear client for issue creation/listing.
   - Write the resulting `DRC-*` identifier back into `task.md`.
2. **Assign issues into projects**
   - Engineering work -> `Dev Production`
   - Content work -> `Content Production & Marketing`
3. **Move issues by workflow state**
   - Product and execution states for build tasks.
   - Content-prefixed states for editorial and publication tasks.
4. **Keep local and remote in lockstep**
   - `task.md` remains the local planning source of truth.
   - Linear is the execution system of record.

### Notes

- The old ad-hoc `scripts/sync-linear.mjs` flow is deprecated and removed.
- For bulk operations (state creation, project assignment, Obsidian imports), use authenticated Python GraphQL scripts to avoid schema drift.

---

## 4. Product to Content Workflow (Integrated)

The fleet now runs a single integrated lifecycle across product execution and content production.

### Lifecycle Stages

1. **Product Thinking**  
   Capture strategy and requirements as backlog tasks in `configs/dr-claw/task.md` and mirror to Linear.
2. **Issue Creation**  
   Create and assign implementation issues in **Dev Production**.
3. **Issue Completion**  
   Move implementation issues through the engineering lane to completion.
4. **Postmortem Review**  
   Record what worked/failed and conversion opportunities.
5. **Content Generation**  
   Convert outputs to publishable assets in **Content Production & Marketing**.
6. **Content Process Progress**  
   Track each content item through workflow states.
7. **Content Publication**  
   Publish and log outcomes for weekly KPI optimization.

### Obsidian -> Linear Content Sync

- **Vault source**: active Obsidian vault (from `~/Library/Application Support/obsidian/obsidian.json`)
- **Linear destination**: project `Content Production & Marketing`
- **Imported content**: `posts/*`, `video-scripts/*`, `pages/*`, `channels/*` Markdown notes

### Content Workflow States

- `Content: Unpublished`
- `Content: Drafting`
- `Content: Reviewed`
- `Content: Short Script Ready`
- `Content: Short Produced`
- `Content: Scheduled`
- `Content: Published`
- `Content: Postmortem`

### State Mapping Rules

- Obsidian `status: ready` -> `Content: Reviewed`
- Obsidian `status: draft` -> `Content: Drafting`
- `video-scripts/*` -> `Content: Short Script Ready`
- No explicit status -> `Content: Unpublished`

### Traceability Contract

Every synced content issue stores source metadata in description:

- `source_file`
- `content_type`
- `obsidian_uri`
- `last_modified`

This guarantees deterministic round-tripping between content notes and execution tracking.

---

## 5. Automated Health Checks

A dedicated script is provided to verify the fleet's operational status:

```bash
./scripts/check-fleet-health.sh
```

This script performs the following checks:

1.  **Gateway Daemon:** Confirms the `ai.openclaw.gateway` is registered and running.
2.  **Bot Connectivity:** Probes all 6 Slack bots and verifies they are "OK" with healthy response times.
3.  **Log Integrity:** Scans the last 100 lines of `gateway.err.log` for new errors (ignoring known historical SDK issues).
4.  **Security Audit:** Checks for accidental token or sensitive data leaks in the logs.

### Troubleshooting Failed Checks

- **Gateway Down:** Run `launchctl load ~/Library/LaunchAgents/ai.openclaw.gateway.plist`.
- **Bot Connectivity FAIL:** Check the bot tokens in the configuration and ensure the Gateway has internet access.
- **Log Errors:** Review `~/.openclaw/logs/gateway.err.log` for specific stack traces.

---

## 6. Troubleshooting

- **Dropped Baton**: If the bots stop responding in a thread, the baton may have been "dropped" due to a timeout. Restarting the Gateway or manually mentioning an agent will reset the state.
- **Rate Limits**: With 6 bots, Slack may occasionally rate-limit the workspace. The Gateway handles retries, but a 10-second delay between messages is normal.
