# 01 — Frontend Implementation

## Canvas Legend + Animation Polish

**Files:** `src/components/steps/Step1Schema.tsx`

- Added `CanvasLegend` component: amber Key icon = Primary Key, blue Link icon = Foreign Key
- Placed top-left of canvas next to the "+ Table" toolbar button
- Enters with `motion` fade + slide (opacity 0→1, y -8→0, 0.4s ease-out, 0.2s delay)
- `TableNode` wraps in `motion.div` with scale-in entrance (0.95→1, 250ms)
- PK/FK toggle buttons: `hover:scale-110 active:scale-95`, active state adds color glow shadow
- Column rows: `transition-all duration-200` across all colour variants
- "+ Add Column" and "+ Table" buttons get active scale feedback

## AI Chat Panel — Agent Streaming

**Files:** `src/lib/synthosApi.ts`, `src/components/chat/ChatSidebar.tsx`, `src/components/steps/Step1Schema.tsx`

### synthosApi.streamAgentRun()
- `POST /agents/synthos-schema-agent/runs?session_id=…` with `multipart/form-data`
- Reads response as `ReadableStream`, splits on `\n\n` SSE block boundaries
- `onDelta(chunk)` for `RunContent` events with a `content` field
- `onEvent(name, data)` for all named events (ToolCallStarted, RunFailed, etc.)
- Accepts optional `AbortSignal` for cancellation

### ChatSidebar (rewrite)
- Self-contained: owns `messages`, `input`, `streamingContent`, `toolStatus` state
- Appends `(project_id=…)` to every outgoing message body
- `TypingDots` animation until first token; then streams text into the AI bubble live
- `ToolCallStarted` → spinning wrench + label derived from `data.tool.tool_name`
  - `load/read/get` → "Reading schema…"
  - `edit/write/update` → "Editing schema…"
  - `valid` → "Validating tables…"
- Error bubble: red border + AlertCircle icon + Retry button (re-queues last user message)
- Concurrent run guard via `isStreaming` flag
- `projectId` optional for Step2/Step3 backward compat (input disabled with placeholder when absent)
- `messages` + `disabled` kept as optional stubs for Step2/Step3

### Markdown renderer (`renderMarkdown`)
Handles: `##` headings, `**bold**`, `*italic*`, `` `inline code` ``, fenced code blocks, `- bullet` lists, `\n\n` paragraph breaks.
Rendered via `dangerouslySetInnerHTML` — safe because content is exclusively from our own agent.

### Step1Schema changes
- Removed `chatMessages` / `isAiTyping` from designing phase
- Renamed gathering-phase state to `gatherMessages` (no behaviour change)
- ChatSidebar in designing phase receives `projectId` + `bottomAction` only

## Verification
- `npm run lint` (tsc --noEmit): zero errors
- Backend stream tested manually with real project_id: token deltas confirmed, `ToolCallStarted` data shape confirmed (`data.tool.tool_name`)
