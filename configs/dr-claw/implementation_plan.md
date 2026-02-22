# Slack Integration & HR Agent (Pam) Workflow

Enable a professional multi-agent hub in Slack where specialized agents manage background projects and delegate tasks to each other.

## User Review Required

> [!IMPORTANT]
> **Slack App Setup**: You will need to create a Slack App and provide a Bot User OAuth Token. I will guide you through the specific permissions needed (e.g., `app_mentions:read`, `chat:write`, `groups:read`).

> [!NOTE]
> **Inter-Agent Communication**: In Slack, agents can "see" each other. We will enable `allowBots: true` so Pam can delegate technical reviews to Brain automatically.

## Proposed Changes

### Configuration
#### [MODIFY] [openclaw.json](file:///Users/admin/.openclaw/openclaw.json)
- Add Slack channel configuration.
- Set `allowBots: true` for the Slack channel.
- Add `hr` agent to the `agents.list`.
- Configure `groups` policy for Slack to ensure orchestrated responses.

### Agents & Workspaces
#### [NEW] [workspace-hr](file:///Users/admin/.openclaw/workspace-hr/)
- **IDENTITY.md**: Name: Pam, Creature: Recruiter AI, Vibe: Professional/Efficient.
- **SOUL.md**: Focus on job hunt management, checklists, and proactive reporting.
- **TEAMMATES.md**: Rules for delegating to Brain (@clawd84ctobot) for technical stack reviews.
- **TOOLS.md**: Shell tools to interface with your Python job-apply project.

## Workflow: The "Pam to Brain" Handoff
1. **Detection**: Pam's Heartbeat script finds a new job lead.
2. **Analysis**: Pam reads the job description. If she sees complex tech (e.g., "Must have 5 years of Rust and Kubernetes"), she triggers a delegation.
3. **Delegation**: Pam posts in the Slack thread: `@Brain, please review the tech stack for this role. Is our current project compatible?`
4. **Brain's Turn**: Brain (agent:builder) sees the mention, analyzes the tech vs. your local source code, and replies.
5. **Synthesis**: Pam sees Brain's reply and gives you the final verdict: `[Match: 85%] @Jer, Brain says we're good on the tech, but we need to update our Docker config first.`

## Verification Plan

### Automated Tests
- `openclaw doctor`: Verify the new Slack and HR agent configuration is valid.
- `openclaw gateway --test-channel slack`: Test connection to the Slack API.

### Manual Verification
- **@Pam Mention**: Tag @Pam in Slack and ask for a status update on the jobs.
- **Delegation Test**: Ask @Pam: "Can you ask @Brain if this job's tech stack is a good fit?" and verify that Brain responds in the thread.
