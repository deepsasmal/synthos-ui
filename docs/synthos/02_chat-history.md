# 02 — Chat History per Project Session

## What was built

Load and render the persisted chat transcript for each project when the workspace opens.

## API shape (confirmed against live backend)

```
GET /agents
→ array; find { id: "synthos-schema-agent" } → read db_id
   db_id: "21138089-9477-5cb5-98c0-fdc32ef6f1e0" (cached in-memory)

GET /sessions/{project_id}/runs?type=agent&db_id={db_id}
→ array of AgentRun objects (ordered chronologically)
   run.run_input  — user's message text (may have "\n\n(project_id=…)" suffix)
   run.content    — agent's markdown reply
   run.status     — only render "COMPLETED" runs
→ 404 / empty array = no chat yet, show empty panel (not an error)
```

## Implementation

**`synthosApi.ts`**
- `getAgentDbId()`: GET /agents, find synthos-schema-agent, cache `db_id` in `this._agentDbId`
- `getSessionRuns(projectId)`: calls `getAgentDbId()`, hits the runs endpoint, swallows 404 as `[]`
- `AgentRun` interface exported: `{ run_id, status, run_input, content, created_at }`

**`ChatSidebar.tsx`**
- `useEffect([projectId])`: resets messages, sets `isLoadingHistory=true`, calls `getSessionRuns`
- Maps COMPLETED runs → `[{ role: "user" }, { role: "ai" }]` pairs
- Strips `\n\n(project_id=…)` suffix from `run_input` before display
- Swallows errors silently — missing history is non-fatal
- Skeleton: 3 alternating-width pulse bars while loading
- Input disabled + placeholder "Loading history…" during fetch
- After a new send, messages are appended locally — no refetch

## Verification
- Created real agent session, confirmed `run_input` / `content` field names
- `tsc --noEmit` passes clean
- 404 path tested: returns `[]`, empty panel shown with welcome message
