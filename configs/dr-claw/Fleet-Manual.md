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

The fleet's backlog is synchronized with Linear using a custom GraphQL integration.

- **Local Source**: `configs/dr-claw/task.md`
- **Sync Command**: `node scripts/sync-linear.mjs` (Custom lead automation)

Each task marked `[ ]` in `task.md` is mirrored as a Linear issue.

---

## 4. Automated Health Checks

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

## 5. Troubleshooting

- **Dropped Baton**: If the bots stop responding in a thread, the baton may have been "dropped" due to a timeout. Restarting the Gateway or manually mentioning an agent will reset the state.
- **Rate Limits**: With 6 bots, Slack may occasionally rate-limit the workspace. The Gateway handles retries, but a 10-second delay between messages is normal.
