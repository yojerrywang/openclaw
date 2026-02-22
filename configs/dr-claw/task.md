# OpenClaw Multi-Agent Setup

## Phase 1: Telegram bots & Group Chat [DONE]
- [x] Fix configuration issues (account keys, polling offsets)
- [x] Configure 3-bot group chat with `@team` shortcuts
- [x] Apply unique personalities (Dr. Claw, Brain, Penny)
- [x] Create documentation (README, CHANGELOG)
- [x] Git-save configuration to private `dr-claw` repo

## Phase 2: Professional Workspace (Slack) [/]
- [ ] Create Slack App and obtain Bot User OAuth Token
- [ ] Configure Slack channel in `openclaw.json`
- [ ] Implement "HR Agent" (Pam) and `workspace-hr`
- [ ] Enable `allowBots: true` for inter-agent delegation
- [ ] Verify multi-agent orchestration in Slack threads

## Phase 3: Background Project Management
- [ ] Create specialized tools for HR agent to control Python job-apply script
- [ ] Implement Heartbeat for job-hunt status updates in Slack

## Future Roadmap
- [ ] Voice transcription (Groq/Whisper)
- [ ] Long-term memory (Pinecone)
- [ ] MCP integrations (Email, Calendar)
- [ ] Dockerize for 24/7 uptime
