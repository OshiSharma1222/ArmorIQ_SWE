# ArmorIQ -- Guarded AI Agent with MCP Support

A full-stack application that combines an AI agent, MCP (Model Context Protocol) servers, and a policy/guardrails dashboard. The dashboard controls the agent's behavior in real time -- block tools, require approval, validate inputs -- all without restarting anything.

## Architecture

```
Frontend (React + Tailwind)  <-->  Backend (Express)  <-->  MCP Servers
     Dashboard UI                    Agent Loop              Custom (SSE)
     Chat Interface                  Policy Engine           External (stdio)
     Conversation Logs               WebSocket Sync
```

**Three main parts:**

1. **AI Agent Backend** -- Express server running a Gemini-powered tool-use loop. Connects to MCP servers, discovers tools at runtime, and routes every tool call through the policy engine before execution.

2. **Policy / Guardrails Dashboard** -- React frontend where you create rules (block tools, require human approval, validate inputs). Changes propagate instantly via WebSocket.

3. **Custom MCP Server** -- Notes CRUD + weather API, exposed over SSE transport. Any MCP-compatible client can connect and discover tools automatically.

## Quick Start

### Prerequisites

- Node.js 18+
- A Google Gemini API key (free tier works: https://aistudio.google.com/apikey)

### 1. Clone and install

```bash
git clone https://github.com/OshiSharma1222/ArmorIQ_SWE.git
cd ArmorIQ_SWE
```

Install dependencies for all three packages:

```bash
cd mcp-server && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### 2. Configure

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_key_here
PORT=3000
MCP_SERVER_URL=http://localhost:3001
```

### 3. Run (three terminals)

**Terminal 1 -- MCP Server:**
```bash
cd mcp-server
npm run dev
```

**Terminal 2 -- Backend:**
```bash
cd backend
npm run dev
```

**Terminal 3 -- Frontend:**
```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## How It Works

### Tool Discovery

When the backend starts, it connects to the MCP server via SSE and calls `tools/list`. Whatever tools the server exposes are automatically available to the agent -- no hardcoded tool lists anywhere.

### Policy Engine

The policy engine is a self-contained module that evaluates every tool call before execution:

- **Block** -- completely prevents a tool from running
- **Require Approval** -- queues the call for human approval in the dashboard
- **Input Validation** -- checks tool arguments against regex patterns

Rules are stored in SQLite and cached in memory. When you create or toggle a rule in the dashboard, a WebSocket message tells the policy engine to refresh its cache immediately.

### Prompt Injection Detection

Tool call arguments are scanned for suspicious patterns before execution:
- "ignore previous instructions" and similar override attempts
- "jailbreak", "DAN mode", "pretend you are"
- Base64-encoded versions of the above

Detected injections are blocked and logged.

### Agent Loop

1. User sends a message
2. Message goes to Gemini with all discovered tool schemas
3. If Gemini wants to call a tool, the call goes through the policy engine
4. If allowed, the tool is executed via MCP; result goes back to Gemini
5. Loop continues until Gemini returns a text response
6. Everything is logged (tool calls, policy decisions, token counts)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/agent/chat | Send a message to the agent |
| GET | /api/agent/tools | List all discovered tools |
| GET | /api/agent/approvals | List pending approval requests |
| POST | /api/agent/approve/:id | Approve a tool call |
| POST | /api/agent/reject/:id | Reject a tool call |
| GET | /api/policies | List all policies |
| POST | /api/policies | Create a policy |
| PUT | /api/policies/:id | Update a policy |
| DELETE | /api/policies/:id | Delete a policy |
| PATCH | /api/policies/:id/toggle | Toggle a policy on/off |
| GET | /api/logs/conversations | List conversations |
| GET | /api/logs/conversations/:id | Get conversation with messages |

## MCP Server Tools

The custom MCP server exposes 5 tools:

| Tool | Description |
|------|-------------|
| create_note | Create a note with title and content |
| list_notes | List all saved notes |
| get_note | Get a note by ID |
| delete_note | Delete a note by ID |
| get_weather | Get weather for a city (via wttr.in) |

## Tech Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: React, Vite, TailwindCSS
- **LLM**: Google Gemini 2.0 Flash
- **MCP**: @modelcontextprotocol/sdk (SSE transport)
- **Real-time**: WebSocket (ws)

## Edge Cases

- **MCP server crash mid-call**: Tool calls have a 30s timeout. If the server crashes, the agent gets a graceful error instead of hanging forever.
- **Conflicting rules**: Block beats approval beats validation. If any rule blocks, the call is blocked.
- **Approver offline**: Approval requests time out after 60s and auto-reject.
- **Prompt injection**: Arguments are scanned before tool execution, not just tool names.
