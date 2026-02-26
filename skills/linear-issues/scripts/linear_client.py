#!/usr/bin/env python3
import sys
import json
import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError

LINEAR_API_URL = "https://api.linear.app/graphql"

def query_linear(query, variables=None, api_key=None):
    if not api_key:
        api_key = os.environ.get("LINEAR_API_KEY")
    
    if not api_key:
        print("Error: LINEAR_API_KEY environment variable not set.", file=sys.stderr)
        sys.exit(1)

    data = {"query": query}
    if variables:
        data["variables"] = variables

    req = Request(LINEAR_API_URL, data=json.dumps(data).encode("utf-8"))
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", str(api_key))

    try:
        with urlopen(req) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if "errors" in res_data:
                print(f"Linear API Errors: {json.dumps(res_data['errors'], indent=2)}", file=sys.stderr)
                return None
            return res_data.get("data")
    except HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

def list_issues(api_key=None):
    query = """
    query {
      issues(first: 10) {
        nodes {
          id
          identifier
          title
          description
          state {
            name
          }
        }
      }
    }
    """
    return query_linear(query, api_key=api_key)

def create_issue(title, description, team_id, api_key=None):
    query = """
    mutation IssueCreate($title: String!, $description: String, $teamId: String!) {
      issueCreate(input: { title: $title, description: $description, teamId: $teamId }) {
        success
        issue {
          id
          identifier
          url
        }
      }
    }
    """
    variables = {"title": title, "description": description, "teamId": team_id}
    return query_linear(query, variables, api_key=api_key)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: linear_client.py <command> [args]")
        print("Commands: list, create <title> <description> <team_id>")
        sys.exit(1)

    command = sys.argv[1]
    if command == "list":
        result = list_issues()
        if result:
            print(json.dumps(result, indent=2))
    elif command == "create":
        if len(sys.argv) < 5:
            print("Missing arguments for create command")
            sys.exit(1)
        title, desc, team_id = sys.argv[2], sys.argv[3], sys.argv[4]
        result = create_issue(title, desc, team_id)
        if result:
            print(json.dumps(result, indent=2))
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
