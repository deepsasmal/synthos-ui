# 00 — Synthos Frontend Spec

Source: README.md + inline spec from user.

## Phase 1 Objective
Collaborative ER schema designer where user and AI agent co-edit the same `schema_json` in real-time.

## Layout
- **Left pane:** ReactFlow canvas — add/delete tables, define columns (name, type, PK, FK), draw FK relationships
- **Right pane:** AI chat panel — natural language instructions to the schema agent

## Live Sync
- Schema stored as JSON in SQLite via FastAPI backend (port 7777)
- Manual edits: `PUT /synthos/projects/{id}/schema`
- AI edits: agent commits directly; SSE stream `GET /synthos/projects/{id}/schema/stream` pushes full snapshot to all clients
- Canvas re-renders on every SSE event — no polling

## Agent Endpoint
`POST /agents/synthos-schema-agent/runs` — multipart FormData, `stream=true` for SSE token stream.
`session_id` must equal `project_id`. First message appends `(project_id=…)` for agent context.
