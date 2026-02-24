---
name: linear-issues
description: "Manage Linear issues via the GraphQL API. Use when Codex needs to: (1) List recent issues, (2) Create new issues, (3) Search for issues, (4) Update issue status. Requires LINEAR_API_KEY."
metadata: { "openclaw": { "requires": { "bins": ["python3"] }, "primaryEnv": "LINEAR_API_KEY" } }
---

# linear-issues — Manage tasks in Linear

This skill allows you to interact with the Linear workspace. Follow these steps to manage issues.

## Authentication

Identify the `LINEAR_API_KEY`. It should be in your environment or found in `~/.openclaw/openclaw.json` under `skills.entries["linear-issues"].apiKey`.

```bash
export LINEAR_API_KEY=$(cat ~/.openclaw/openclaw.json | jq -r '.skills.entries["linear-issues"].apiKey // empty')
```

## Operations

### 1. List Recent Issues

Use the helper script to fetch the last 10 issues.

```bash
python3 scripts/linear_client.py list
```

### 2. Create a New Issue

To create an issue, you need a `teamId`. You can find it by listing existing issues or querying teams.

```bash
python3 scripts/linear_client.py create "Title" "Description" "TEAM_ID"
```

### 3. Advanced GraphQL Queries

For complex operations (filters, deep searches), you can construct custom GraphQL queries and use the `linear_client.py`'s internal methods or `curl` directly.

Endpoint: `https://api.linear.app/graphql`
Method: `POST`
Headers:

- `Content-Type: application/json`
- `Authorization: $LINEAR_API_KEY`

Example search query:

```graphql
query {
  issueSearch(query: "search term", first: 5) {
    nodes {
      id
      title
      identifier
    }
  }
}
```

## Workflow: Fixing an Issue

1. **Detect**: Fetch issues assigned to you or with a specific label.
2. **Implement**: Spawn sub-agents to fix the code (using the same pattern as `gh-issues`).
3. **Update**: Once fixed, update the Linear issue status to "Done" or "Completed".

```graphql
mutation IssueUpdate($id: String!, $stateId: String!) {
  issueUpdate(id: $id, input: { stateId: $stateId }) {
    success
  }
}
```
