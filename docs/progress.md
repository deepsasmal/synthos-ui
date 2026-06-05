# Progress Log

## Session 4 — ChatSidebar Layout Fix + HubSpot-Inspired Redesign

### Layout / scroll fix
- Root cause: `h-full` percentage chain silently resolves to `auto` when any ancestor lacks a definite bounded height
- Fixed `main` in `App.tsx`: added `overflow-hidden min-h-0` so flex children get a strictly bounded height
- ChatSidebar wrapper in `Step1Schema`: changed `h-full` → `self-stretch` (more reliable; flex stretch provides a definite height without a `%` chain)
- ChatSidebar root: replaced `h-full` with `self-stretch`; added `overflow-hidden` to cap the flex column
- Messages div: `flex-1 overflow-y-auto` with inline `minHeight: 0` as hard override — now scrolls correctly
- Added drag-to-resize handle on the left edge (280–700 px range); sets `document.body` cursor during drag to prevent flicker

### HubSpot-inspired redesign
- **Header**: two-row layout — title row (Sparkles avatar + "Synthos" + live "Thinking" spring badge + collapse) + toolbar strip (tool status pill / message count)
- **Message list**: `divide-y divide-border/30` row separators instead of heavy bubbles; each row has role avatar + sender label (`You` / `Synthos` / `Error`) + content
- **AgentAvatar**: Sparkles icon in gradient box; pulsing dot overlay when streaming
- **Footer bar**: unified input container with `focus-within` border highlight + spring-animated send button; `bottomAction` strip below (mirrors HubSpot's "N contacts · Export · Clone" bar)
- **Scroll-to-bottom pill**: floats above footer when user scrolls up; spring entrance/exit
- **Collapsed state**: springs to `w-12`; shows unread count badge
- All transitions use spring physics (`stiffness 380–500, damping 32–36`) for Apple-like feel

## Session 3 — Centered Fresh-Project Chat + Transition

### Centered chat for fresh projects
- `Step1Schema` checks `getSessionRuns` on mount; if no COMPLETED runs → `chatLayout='centered'`, else → `chatLayout='sidebar'`
- `CenteredChat` component: full-screen `absolute inset-0` overlay with `backdrop-blur-md`, ambient glow blobs, canvas visible behind
- Hero state: animated heading ("What schema should we build for {projectName}?"), multi-line textarea, Enter to send
- After send: user bubble slides in from right, agent bubble from left, streaming content fills in, TypingDots until first token
- After response complete: "View on canvas →" link with ArrowRight that calls `onComplete()`; auto-transitions after 2s
- `CenteredChat` exits: `scale(0.96) + opacity(0) + blur(8px)` over 0.5s
- `ChatSidebar` enters: slides from `x:48` with spring easing `[0.22,1,0.36,1]` over 0.45s
- Canvas always rendered underneath so SSE schema updates appear live during centered chat
- Removed default e-commerce schema seeding for fresh projects (empty canvas is correct; agent creates it)
- Removed dead mock gathering phase state and UI entirely

## Session 2 — Chat History

### Chat history per project session
- `synthosApi.getAgentDbId()`: GET /agents, finds synthos-schema-agent, caches `db_id` in-memory
- `synthosApi.getSessionRuns(projectId)`: GET /sessions/{id}/runs?type=agent&db_id=…, returns [] on 404
- `AgentRun` interface exported from synthosApi: `{ run_id, status, run_input, content, created_at }`
- ChatSidebar: `useEffect` keyed on `projectId` loads history on mount/project-switch, maps COMPLETED runs → user+ai message pairs, strips `\n\n(project_id=…)` suffix from user bubbles
- Pulse skeleton (3 alternating bars) shown while loading; input disabled with "Loading history…" placeholder
- New messages appended locally after send — no refetch needed
- Verified: seeded session returns correct `run_input` / `content` fields; `npm run lint` clean

## Session 1 — Phase 1 Frontend

### Canvas Legend + Animation Polish
- `CanvasLegend` component added top-left of canvas (amber Key = PK, blue Link = FK), animates in with motion
- `TableNode` gets scale-in entrance; all buttons get `hover:scale-110 active:scale-95`; column rows smooth `duration-200` transitions
- `ChatSidebar` panel slides in from right on mount

### AI Chat Panel — Agent Streaming
- `synthosApi.streamAgentRun()`: POST multipart FormData, manual SSE ReadableStream parser, fires `onDelta` + `onEvent`
- `ChatSidebar` rewritten as self-contained: owns message/streaming state, markdown renderer, tool-call status ("Reading schema…" / "Editing schema…"), error bubbles with Retry
- `Step1Schema`: removed dead mock chat state from designing phase, passes `projectId` to ChatSidebar
- Verified: `tsc --noEmit` clean, backend stream tested with real project_id
