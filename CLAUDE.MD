## Engineering Rules

**R1 — Think before coding.** State assumptions explicitly. Ask rather than guess. Push back when a simpler approach exists. Stop when confused.

**R2 — Simplicity first.** Minimum code that solves the problem. Nothing speculative. No abstractions for single-use code.

**R3 — Surgical changes.** Touch only what you must. Don't improve adjacent code. Match existing style. Don't refactor what isn't broken.

**R4 — Goal-driven execution.** Define success criteria upfront. Loop until verified. Strong criteria let Claude loop independently.

**R5 — Use the model only for judgment calls.** Use for: classification, drafting, summarization, extraction. Do NOT use for: routing, retries, deterministic transforms. If code can answer, code answers.

**R6 — Token budgets are not advisory.** Per-task: 4,000 tokens. Per-session: 30,000 tokens. If approaching budget, summarize and start fresh. Surface the breach — do not silently overrun.

**R7 — Surface conflicts, don't average them.** If two patterns contradict, pick one (more recent / more tested). Explain why. Flag the other for cleanup.

**R8 — Read before you write.** Before adding code, read exports, immediate callers, shared utilities. If unsure why existing code is structured a certain way, ask.

**R9 — Tests verify intent, not just behavior.** Tests must encode WHY behavior matters. A test that can't fail when business logic changes is wrong.

**R10 — Checkpoint after every significant step.** Summarize: what was done, what's verified, what's left. Don't continue from a state you can't describe back.

**R11 — Match the codebase's conventions, even if you disagree.** Conformance > taste inside the codebase. If a convention is harmful, surface it. Don't fork silently.

**R12 — Fail loud.** "Completed" is wrong if anything was skipped silently. "Tests pass" is wrong if any were skipped. Default to surfacing uncertainty, not hiding it.

## Task Management

- Write plan to `tasks/todo.md` with checkable items. Check in before starting implementation.
- Also write what you have done in `docs/progress.md` with writing what you have done and implemented
- Mark items done as you go. Add a review section when complete.
- After ANY user correction: update `docs/lessons.md` with a rule that prevents recurrence.
- Enter plan mode for non-trivial tasks (3+ steps or architectural decisions). Re-plan immediately if something goes sideways.
- Use subagents to keep main context clean — offload research and parallel analysis.


## Documentation Convention

Every implemented feature gets a corresponding document under `docs/<feature>/`, numbered in chronological order with a two-digit prefix: `00_<name>.md`, `01_<name>.md`, `02_<name>.md`, …

- `00_` is the spec/overview; later numbers are plans, implementations, and follow-ups in the order they happened.
- When you implement something, add (or update) its numbered doc in the feature's folder — what was built, key decisions, verification results, known constraints.
- Continue the existing sequence in a folder — never renumber existing files. Fix cross-links if files are renamed.
- Example: `docs/synthos/00_frontend-spec.md`, `01_feature-plan.md`, `02_frontend-implementation.md`.


## If You Encounter Something Surprising

Alert me and suggest adding it to this file. The goal is to fix the code, not grow these instructions.

