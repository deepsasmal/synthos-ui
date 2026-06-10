import {
  Send, ChevronRight, MessageSquare, AlertCircle, RefreshCw,
  Sparkles, ChevronDown, Loader2, Check, X, Zap, Activity, Pause,
} from "lucide-react";
import React, { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { synthosApi, AgentRun, HITLRequirement } from "../../lib/synthosApi";
import { cn } from "@/src/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "ai" | "error";
  content: string;
  toolCalls?: ToolCallItem[];
}

interface ToolCallItem {
  id: string;
  name: string;
  label: string;
  status: "running" | "done" | "error";
}

interface PhaseItem {
  phase: string;
  label: string;
  message: string;
  status: "active" | "done";
}

interface ChatSidebarProps {
  title: string;
  projectId?: string;
  disabled?: boolean;
  messages?: any[];
  bottomAction?: ReactNode;
  configPanel?: ReactNode;
  onRunComplete?: () => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const MIN_WIDTH = 300;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 380;

const PHASE_LABELS: Record<string, string> = {
  reading_schema: "Reading schema",
  generating: "Generating data",
  reading_seed: "Reading seed data",
  writing: "Writing dataset",
  evaluating: "Evaluating fidelity",
  done: "Complete",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toolLabel(rawName: string): string {
  const n = rawName.toLowerCase();
  if (n.includes("get_schema") || n.includes("load_schema") || n.includes("read_schema")) return "Reading schema";
  if (n.includes("update_schema") || n.includes("edit_schema") || n.includes("patch_schema")) return "Editing schema";
  if (n.includes("create_table") || n.includes("add_table")) return "Creating table";
  if (n.includes("delete_table") || n.includes("drop_table")) return "Removing table";
  if (n.includes("add_column") || n.includes("create_column")) return "Adding column";
  if (n.includes("validate")) return "Validating schema";
  if (n.includes("generate")) return "Generating data";
  if (n.includes("scale")) return "Scaling dataset";
  if (n.includes("relationship") || n.includes("foreign_key")) return "Linking tables";
  if (n.includes("get") || n.includes("fetch") || n.includes("read") || n.includes("load")) return "Fetching data";
  return rawName.replace(/_/g, " ");
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\r/g, "")
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/((?:^\|.+\|\s*\n?){2,})/gm, (block) => {
      const lines = block.trim().split("\n").filter(Boolean);
      if (lines.length < 2) return block;
      const parse = (line: string) => line.split("|").slice(1, -1).map((c) => c.trim());
      const headers = parse(lines[0]);
      const isSep = (l: string) => /^\|[\s\-|:]+\|$/.test(l.trim());
      const bodyLines = lines.slice(isSep(lines[1]) ? 2 : 1);
      const thead = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
      const tbody = bodyLines.map((l) => `<tr>${parse(l).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
      return `<table>${thead}<tbody>${tbody}</tbody></table>`;
    })
    .replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split("\n").filter(Boolean).map((l) => `<li>${l.slice(2)}</li>`).join("");
      return `<ul>${items}</ul>`;
    })
    .replace(/\n\n+/g, "<br/><br/>")
    .replace(/\n/g, " ");
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div
      className="text-sm leading-[1.65] [&_strong]:font-semibold [&_strong]:text-[color:var(--text-color)] [&_em]:italic [&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/6 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_pre]:bg-white/5 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mt-1.5 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_h2]:font-semibold [&_h2]:text-[color:var(--text-color)] [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:text-[color:var(--text-color)] [&_h3]:text-xs [&_h3]:mt-2 [&_h4]:font-medium [&_h4]:text-xs [&_ul]:list-none [&_ul]:space-y-1 [&_ul]:mt-1.5 [&_li]:flex [&_li]:gap-2 [&_li]:before:content-['·'] [&_li]:before:text-muted/60 [&_li]:before:font-bold [&_hr]:border-border [&_hr]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:font-mono [&_table]:my-2 [&_thead]:bg-white/5 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-[color:var(--text-color)]/70 [&_th]:border-b [&_th]:border-border/50 [&_td]:px-3 [&_td]:py-1.5 [&_td]:border-b [&_td]:border-border/25 [&_td]:text-muted/80 [&_tr:last-child_td]:border-b-0 [&_tr:hover_td]:bg-white/[0.02]"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center h-4">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-1 h-1 rounded-full bg-muted/50"
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.2, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function AgentAvatar({ streaming }: { streaming?: boolean }) {
  return (
    <div className="relative flex-none">
      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center">
        <Sparkles className="w-3 h-3 text-accent/70" />
      </div>
      {streaming && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

// Phase progress checklist (driven by CustomEvent)
function PhaseProgress({ phases }: { phases: PhaseItem[] }) {
  if (phases.length === 0) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2.5 rounded-lg border border-border/60 bg-white/[0.025] overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/40">
        <Activity className="w-2.5 h-2.5 text-accent/50 flex-none" />
        <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider">Progress</span>
      </div>
      <div className="py-1">
        <AnimatePresence initial={false}>
          {phases.map((p) => (
            <motion.div
              key={p.phase}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 36 }}
              className="flex items-start gap-2.5 px-3 py-1.5"
            >
              <div className="flex-none mt-0.5">
                {p.status === "active" ? (
                  <Loader2 className="w-3 h-3 text-accent/70 animate-spin" />
                ) : (
                  <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600 }}>
                    <Check className="w-3 h-3 text-emerald-400/60" />
                  </motion.div>
                )}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className={cn("text-[11px] font-mono transition-colors duration-300", p.status === "active" ? "text-muted/80" : "text-muted/35")}>
                  {p.label}
                </span>
                {p.status === "active" && p.message && p.message !== p.label && (
                  <span className="text-[10px] text-muted/40 leading-snug">{p.message}</span>
                )}
              </div>
              {p.status === "active" && (
                <motion.div
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="ml-auto w-1 h-1 rounded-full bg-accent/60 flex-none mt-1.5"
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Tool call feed (driven by ToolCallStarted/ToolCallCompleted)
function ToolCallFeed({ calls }: { calls: ToolCallItem[] }) {
  const [isOpen, setIsOpen] = useState(true);
  if (calls.length === 0) return null;
  const runningCount = calls.filter((c) => c.status === "running").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-2.5 rounded-lg border border-border/60 bg-white/[0.025] overflow-hidden"
    >
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-border/40 hover:bg-white/[0.02]"
      >
        <Zap className="w-2.5 h-2.5 text-accent/50 flex-none" />
        <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider flex-1 text-left">Agent Actions</span>
        {runningCount > 0 && (
          <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1, repeat: Infinity }}
            className="text-[9px] font-mono text-accent/70 px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20">
            {runningCount} running
          </motion.span>
        )}
        <motion.div animate={{ rotate: isOpen ? 0 : -90 }} transition={{ type: "spring", stiffness: 500, damping: 36 }}>
          <ChevronDown className="w-2.5 h-2.5 text-muted/30" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 38 }} className="overflow-hidden">
            <div className="py-1">
              {calls.map((call, i) => (
                <motion.div key={call.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 36, delay: i * 0.03 }}
                  className="flex items-center gap-2.5 px-3 py-1.5 group">
                  <div className="flex-none w-4 flex items-center justify-center">
                    {call.status === "running" ? <Loader2 className="w-3 h-3 text-accent/70 animate-spin" />
                      : call.status === "done" ? <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600 }}><Check className="w-3 h-3 text-emerald-400/60" /></motion.div>
                      : <X className="w-3 h-3 text-red-400/60" />}
                  </div>
                  <span className={cn("text-[11px] font-mono flex-1 transition-colors duration-400", call.status === "running" ? "text-muted/80" : "text-muted/35")}>
                    {call.label}
                  </span>
                  <span className="text-[9px] font-mono text-muted/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 truncate max-w-[90px]">
                    {call.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// HITL inline form — renders when TeamRunPaused fires
function HITLForm({
  requirements, projectId, onSubmit, onCancel,
}: {
  requirements: HITLRequirement[];
  projectId: string;
  onSubmit: (filled: HITLRequirement[]) => void;
  onCancel: () => void;
}) {
  const req = requirements[0];
  const toolName = req?.tool_execution?.tool_name ?? "";

  const [tableNames, setTableNames] = useState<string[]>([]);
  const [sampleSizes, setSampleSizes] = useState<Record<string, number>>({});
  const [scaleValue, setScaleValue] = useState(10);
  const [targetRows, setTargetRows] = useState<number | "">("");
  const [tableFilter, setTableFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (toolName === "generate_data") {
      synthosApi.getSchema(projectId)
        .then((s) => {
          const names = s.schema_data.tables.map((t) => t.name);
          setTableNames(names);
          setSampleSizes(Object.fromEntries(names.map((n) => [n, 20])));
        })
        .catch(() => {});
    }
  }, [projectId, toolName]);

  const buildFilled = (): HITLRequirement[] => {
    const vals: Record<string, any> = {};
    if (toolName === "generate_data") {
      vals["sample_sizes"] = sampleSizes;
    } else if (toolName === "scale_data") {
      vals["scale"] = scaleValue;
      if (targetRows !== "") vals["target_rows"] = targetRows;
      if (tableFilter) vals["table"] = tableFilter;
    } else {
      // Generic: pass through any existing values
    }

    const fillSchema = (fields: HITLRequirement["user_input_schema"]) =>
      fields.map((f) => ({ ...f, value: vals[f.name] !== undefined ? vals[f.name] : f.value }));

    return requirements.map((r) => ({
      ...r,
      user_input_schema: fillSchema(r.user_input_schema ?? []),
      tool_execution: {
        ...r.tool_execution,
        user_input_schema: fillSchema(r.tool_execution?.user_input_schema ?? []),
      },
    }));
  };

  const title = toolName === "generate_data" ? "Confirm Data Generation"
    : toolName === "scale_data" ? "Confirm Scaling"
    : "Confirm Action";
  const submitLabel = toolName === "generate_data" ? "Generate →"
    : toolName === "scale_data" ? "Scale →"
    : "Confirm →";
  const canSubmit = !submitting && (toolName !== "generate_data" || tableNames.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className="mt-2.5 rounded-xl border border-accent/25 bg-accent/[0.04] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-accent/12 bg-accent/[0.03]">
        <Pause className="w-3 h-3 text-accent/60 flex-none" />
        <span className="text-[11px] font-semibold text-accent/80 uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-[9px] font-mono text-muted/35">{req?.member_agent_id ?? toolName}</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-3">
        {toolName === "generate_data" && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider">Rows per table</span>
            {tableNames.length === 0 ? (
              <div className="flex items-center gap-2 text-[11px] text-muted/40 font-mono py-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading tables…
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {tableNames.map((name) => (
                  <div key={name} className="flex items-center gap-2 bg-white/5 border border-border/50 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] font-mono text-muted/60 flex-1 truncate">{name}</span>
                    <input
                      type="number" min={1} max={10000}
                      value={sampleSizes[name] ?? 20}
                      onChange={(e) => setSampleSizes((prev) => ({ ...prev, [name]: parseInt(e.target.value) || 20 }))}
                      className="w-14 bg-transparent text-right text-[11px] font-mono text-[color:var(--text-color)] focus:outline-none border-b border-border/40 focus:border-accent/60 pb-0.5"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {toolName === "scale_data" && (
          <>
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono text-muted/50 uppercase tracking-wider">Scale factor</span>
              <div className="flex items-center gap-2.5">
                <input
                  type="number" min={2} max={1000}
                  value={scaleValue}
                  onChange={(e) => setScaleValue(Number(e.target.value) || 10)}
                  className="w-20 bg-white/5 border border-border/50 rounded-lg px-3 py-1.5 text-sm font-mono text-[color:var(--text-color)] focus:outline-none focus:border-accent/60 text-center"
                />
                <span className="text-sm text-muted/50 font-mono">×</span>
                <span className="text-[11px] text-muted/40">multiply each table</span>
              </div>
            </div>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted/40 hover:text-muted/70 transition-colors w-fit"
            >
              <ChevronDown className={cn("w-2.5 h-2.5 transition-transform duration-200", showAdvanced && "rotate-180")} />
              Advanced options
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  className="overflow-hidden flex flex-col gap-2 pl-3 border-l border-border/40"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-muted/40 w-20 shrink-0">Target rows</span>
                    <input type="number" value={targetRows} onChange={(e) => setTargetRows(e.target.value ? Number(e.target.value) : "")}
                      placeholder="auto"
                      className="w-24 bg-white/5 border border-border/40 rounded px-2 py-1 text-[11px] font-mono text-[color:var(--text-color)] focus:outline-none focus:border-accent/40 placeholder:text-muted/25" />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-mono text-muted/40 w-20 shrink-0">Table only</span>
                    <input type="text" value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}
                      placeholder="all tables"
                      className="w-32 bg-white/5 border border-border/40 rounded px-2 py-1 text-[11px] font-mono text-[color:var(--text-color)] focus:outline-none focus:border-accent/40 placeholder:text-muted/25" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-accent/10">
        <button onClick={onCancel} className="px-3 py-1.5 text-[11px] font-mono text-muted/50 hover:text-muted/80 transition-colors rounded-lg hover:bg-white/5">
          Cancel
        </button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setSubmitting(true); onSubmit(buildFilled()); }}
          disabled={!canSubmit}
          className={cn(
            "px-3 py-1.5 text-[11px] font-mono rounded-lg transition-all flex items-center gap-1.5",
            canSubmit ? "bg-accent text-accent-fg hover:opacity-90 cursor-pointer" : "bg-accent/30 text-accent-fg/40 cursor-not-allowed"
          )}
        >
          {submitting ? <><Loader2 className="w-3 h-3 animate-spin" /> Working…</> : submitLabel}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChatSidebar({ title, projectId = "", disabled: externalDisabled, bottomAction, configPanel, onRunComplete }: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [activeTools, setActiveTools] = useState<ToolCallItem[]>([]);
  const [phases, setPhases] = useState<PhaseItem[]>([]);
  const [hitl, setHitl] = useState<{ runId: string; requirements: HITLRequirement[] } | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number>(DEFAULT_WIDTH);
  // Refs used inside streaming callbacks to avoid stale closures
  const isPausedRef = useRef(false);
  const hitlRef = useRef<{ runId: string; requirements: HITLRequirement[] } | null>(null);

  // ── Resize drag ──────────────────────────────────────────────────────────
  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStartX.current = e.clientX;
    dragStartWidth.current = width;
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev: MouseEvent) => {
      if (dragStartX.current === null) return;
      const delta = dragStartX.current - ev.clientX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragStartWidth.current + delta)));
    };
    const onMouseUp = () => {
      dragStartX.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [width]);

  // ── Load history ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setMessages([]);
    setIsLoadingHistory(true);
    synthosApi.getTeamSessionRuns(projectId)
      .then((runs: AgentRun[]) => {
        if (cancelled) return;
        const historical: Message[] = [];
        for (const run of runs) {
          if (run.status !== "COMPLETED") continue;
          const userText = run.run_input.replace(/\n\n\(project_id=[^)]+\)\s*$/, "").trim();
          if (userText) historical.push({ role: "user", content: userText });
          if (run.content) historical.push({ role: "ai", content: run.content });
        }
        setMessages(historical);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, phases, activeTools, hitl, isLoadingHistory]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 80);
  };

  // ── Shared event handler factory ─────────────────────────────────────────
  const makeEventHandler = (setSnapshotTools: (tools: ToolCallItem[]) => void) =>
    (name: string, data: any) => {
      console.debug("[SSE]", name, data);

      if (name === "ToolCallStarted") {
        const rawName: string = data.tool?.tool_name ?? data.tool_name ?? "unknown_tool";
        const id = data.tool_call_id ?? data.id ?? `${rawName}-${Date.now()}`;
        const item: ToolCallItem = { id, name: rawName, label: toolLabel(rawName), status: "running" };
        setActiveTools((prev) => { const next = [...prev, item]; setSnapshotTools(next); return next; });
      } else if (name === "ToolCallCompleted") {
        const id = data.tool_call_id ?? data.id ?? null;
        setActiveTools((prev) => {
          const updated = id
            ? prev.map((t) => t.id === id ? { ...t, status: "done" as const } : t)
            : prev.map((t, i, arr) => i === arr.map((x, j) => x.status === "running" ? j : -1).filter(x => x >= 0).at(-1) ? { ...t, status: "done" as const } : t);
          setSnapshotTools(updated);
          return updated;
        });
      } else if (name === "CustomEvent") {
        if (!data.phase) return;
        const phase: string = data.phase;
        const phaseLabel = PHASE_LABELS[phase] ?? phase.replace(/_/g, " ");
        const message: string = data.message ?? phaseLabel;
        if (phase === "done") {
          setPhases((prev) => prev.map((p) => ({ ...p, status: "done" as const })));
        } else {
          setPhases((prev) => {
            if (prev.find((p) => p.phase === phase)) {
              return prev.map((p) => p.phase === phase ? { ...p, message, status: "active" as const } : p);
            }
            return [
              ...prev.map((p) => p.status === "active" ? { ...p, status: "done" as const } : p),
              { phase, label: phaseLabel, message, status: "active" as const },
            ];
          });
        }
      } else if (name === "TeamRunPaused") {
        isPausedRef.current = true;
        hitlRef.current = { runId: data.run_id, requirements: data.requirements ?? [] };
      } else if (name === "TeamRunError") {
        throw new Error(data.error ?? data.message ?? "Team run error");
      } else if (name === "RunFailed") {
        throw new Error(data.error ?? "Run failed");
      }
    };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const msgText = `${text}\n\n(project_id=${projectId})`;
    setInput("");
    setLastError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);
    setStreamingContent("");
    setActiveTools([]);
    setPhases([]);
    isPausedRef.current = false;
    hitlRef.current = null;

    const abort = new AbortController();
    abortRef.current = abort;
    let accumulated = "";
    let snapshotTools: ToolCallItem[] = [];

    try {
      await synthosApi.streamTeamRun(
        msgText, projectId,
        {
          onDelta: (chunk) => { accumulated += chunk; setStreamingContent(accumulated); },
          onEvent: makeEventHandler((tools) => { snapshotTools = tools; }),
        },
        abort.signal
      );

      if (isPausedRef.current && hitlRef.current) {
        if (accumulated) setMessages((prev) => [...prev, { role: "ai", content: accumulated }]);
        setHitl(hitlRef.current);
      } else {
        setMessages((prev) => [...prev, {
          role: "ai",
          content: accumulated || "(no response)",
          toolCalls: snapshotTools.length > 0 ? snapshotTools : undefined,
        }]);
        onRunComplete?.();
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = err?.message ?? "Unknown error";
      setLastError(msg);
      setMessages((prev) => [...prev, { role: "error", content: msg }]);
    } finally {
      const wasPaused = isPausedRef.current;
      setIsStreaming(false);
      setStreamingContent("");
      setActiveTools([]);
      if (!wasPaused) setPhases([]);
      isPausedRef.current = false;
      hitlRef.current = null;
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isStreaming, projectId, onRunComplete]);

  // ── HITL submit ───────────────────────────────────────────────────────────
  const handleHitlSubmit = useCallback(async (filledRequirements: HITLRequirement[]) => {
    if (!hitl) return;
    const { runId } = hitl;

    setHitl(null);
    setIsStreaming(true);
    setStreamingContent("");
    setActiveTools([]);
    setPhases([]);

    const abort = new AbortController();
    abortRef.current = abort;
    let accumulated = "";
    let snapshotTools: ToolCallItem[] = [];

    try {
      await synthosApi.continueTeamRun(
        runId, filledRequirements, projectId,
        {
          onDelta: (chunk) => { accumulated += chunk; setStreamingContent(accumulated); },
          onEvent: makeEventHandler((tools) => { snapshotTools = tools; }),
        },
        abort.signal
      );
      setMessages((prev) => [...prev, {
        role: "ai",
        content: accumulated || "(no response)",
        toolCalls: snapshotTools.length > 0 ? snapshotTools : undefined,
      }]);
      onRunComplete?.();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = err?.message ?? "Unknown error";
      setLastError(msg);
      setMessages((prev) => [...prev, { role: "error", content: msg }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setActiveTools([]);
      setPhases([]);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [hitl, projectId, onRunComplete]);

  const handleHitlCancel = useCallback(() => {
    setHitl(null);
    setPhases([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleRetry = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.filter((m) => m.role !== "error"));
    setInput(lastUser.content);
    setTimeout(() => handleSend(), 0);
  };

  const msgCount = messages.length + (isStreaming ? 1 : 0);
  const runningTools = activeTools.filter((t) => t.status === "running");
  const isInputDisabled = isStreaming || isLoadingHistory || externalDisabled || !projectId || !!hitl;

  /* ── Collapsed ── */
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: DEFAULT_WIDTH, opacity: 0.6 }}
        animate={{ width: 48, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="border-l border-border bg-surface flex flex-col items-center py-4 gap-3 self-stretch overflow-hidden"
      >
        <button onClick={() => setIsCollapsed(false)} className="p-2 rounded-lg hover:bg-white/6 transition-colors group" title="Expand">
          <MessageSquare className="h-4 w-4 text-muted group-hover:text-[color:var(--text-color)] transition-colors" />
        </button>
        {msgCount > 0 && (
          <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
            <span className="text-[9px] font-mono text-accent font-semibold">{msgCount > 9 ? "9+" : msgCount}</span>
          </div>
        )}
        <div className="text-muted/30 font-display text-[10px] tracking-[0.2em] uppercase mt-auto mb-2 select-none"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
          {title}
        </div>
      </motion.div>
    );
  }

  /* ── Expanded ── */
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      style={{ width }}
      className="relative border-l border-border bg-surface flex flex-col self-stretch overflow-hidden shrink-0"
    >
      {/* Resize grip */}
      <div onMouseDown={handleResizeMouseDown} className="absolute left-0 top-0 bottom-0 w-1 z-20 cursor-ew-resize group">
        <div className="absolute inset-y-0 left-0 w-px bg-transparent group-hover:bg-accent/30 group-active:bg-accent/60 transition-colors duration-200" />
      </div>

      {/* Header */}
      <div className="flex-none border-b border-border">
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center gap-2.5">
            <AgentAvatar streaming={isStreaming} />
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-[13px] tracking-tight text-[color:var(--text-color)]">{title}</span>
              <AnimatePresence mode="wait">
                {isStreaming && (
                  <motion.span key={runningTools[0]?.label ?? "thinking"}
                    initial={{ opacity: 0, scale: 0.85, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent/80"
                  >
                    {runningTools.length > 0 ? <><Loader2 className="w-2.5 h-2.5 animate-spin" />{runningTools[0].label}</> : phases.length > 0 ? <><Loader2 className="w-2.5 h-2.5 animate-spin" />{phases.filter(p => p.status === "active").at(-1)?.label ?? "Working…"}</> : "Thinking…"}
                  </motion.span>
                )}
                {hitl && !isStreaming && (
                  <motion.span key="paused"
                    initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[10px] font-mono text-amber-400/80"
                  >
                    <Pause className="w-2.5 h-2.5" /> Waiting for input
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          <button onClick={() => setIsCollapsed(true)} className="p-1.5 rounded-md hover:bg-white/5 transition-colors duration-150 text-muted/50 hover:text-muted">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Status strip */}
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-0.5">
          <AnimatePresence mode="wait">
            {isStreaming && (phases.length > 0 || activeTools.length > 0) ? (
              <motion.div key="tools" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {(phases.length > 0 ? phases : activeTools).map((item, i) => (
                    <motion.div key={i}
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 28, delay: i * 0.05 }}
                      className={cn("w-2 h-2 rounded-full border", ("status" in item ? item.status : "running") === "active" || ("status" in item ? item.status : "running") === "running"
                        ? "bg-accent/60 border-accent/40" : "bg-emerald-400/40 border-emerald-400/30")}
                      title={"label" in item ? item.label : ""}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-mono text-muted/50">
                  {phases.length > 0
                    ? (phases.filter(p => p.status === "active").at(-1)?.label ?? "Working…")
                    : runningTools.length > 0 ? `${runningTools.length} tool${runningTools.length > 1 ? "s" : ""} running` : "tools called"}
                </span>
              </motion.div>
            ) : (
              <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/3 border border-border/50 text-[11px] font-mono text-muted/40">
                <span className={cn("w-1.5 h-1.5 rounded-full", hitl ? "bg-amber-400/60" : "bg-muted/30")} />
                {isLoadingHistory ? "Loading history…" : !projectId ? "No project" : hitl ? "Waiting for input" : msgCount === 0 ? "Ready" : `${msgCount} message${msgCount !== 1 ? "s" : ""}`}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ minHeight: 0 }}>
        {isLoadingHistory && (
          <div className="px-4 py-4 flex flex-col gap-0 divide-y divide-border/40">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-4 flex gap-3">
                <div className="w-6 h-6 rounded-md bg-border/40 animate-pulse flex-none" />
                <div className="flex-1 space-y-2">
                  <div className="h-2.5 w-16 rounded-full bg-border/40 animate-pulse" />
                  <div className="h-3 rounded-full bg-border/30 animate-pulse" style={{ width: `${55 + i * 15}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoadingHistory && messages.length === 0 && !isStreaming && !hitl && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 32 }}
            className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 px-6 text-center">
            <div className="w-10 h-10 rounded-2xl bg-accent/8 border border-accent/15 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent/50" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-[color:var(--text-color)]/70">Synthos Agent</p>
              <p className="text-xs text-muted/60 leading-relaxed max-w-[220px]">
                Describe the schema you need and I'll build it on the canvas, or ask me to modify existing tables.
              </p>
            </div>
          </motion.div>
        )}

        {!isLoadingHistory && (
          <div className="divide-y divide-border/30">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 36, delay: 0.03 }}
                  className={cn(
                    "group relative px-4 py-3.5 transition-colors duration-150",
                    msg.role === "user" ? "hover:bg-white/[0.015]" : "hover:bg-white/[0.02]",
                    msg.role === "error" && "bg-red-500/4 hover:bg-red-500/6"
                  )}
                >
                  {msg.role === "user" && (
                    <div className="flex gap-2.5 justify-end">
                      <div className="flex flex-col gap-1 items-end max-w-[88%]">
                        <span className="text-[10px] font-mono text-muted/40 tracking-wide">You</span>
                        <div className="px-3 py-2 rounded-xl rounded-tr-sm bg-white/8 border border-white/10 text-sm text-[color:var(--text-color)] leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-md bg-white/10 border border-white/10 flex items-center justify-center flex-none mt-5">
                        <span className="text-[9px] font-semibold text-[color:var(--text-color)]/70">U</span>
                      </div>
                    </div>
                  )}
                  {msg.role === "ai" && (
                    <div className="flex gap-2.5">
                      <AgentAvatar />
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-accent/50 tracking-wide">Synthos</span>
                        {msg.toolCalls && msg.toolCalls.length > 0 && <ToolCallFeed calls={msg.toolCalls} />}
                        <div className="text-muted"><MarkdownMessage content={msg.content} /></div>
                      </div>
                    </div>
                  )}
                  {msg.role === "error" && (
                    <div className="flex gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-red-500/15 border border-red-500/25 flex items-center justify-center flex-none">
                        <AlertCircle className="w-3 h-3 text-red-400" />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-red-500/60 tracking-wide">Error</span>
                        <p className="text-sm text-red-400/80 leading-relaxed">{msg.content}</p>
                        {lastError && (
                          <button onClick={handleRetry} className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-red-400/50 hover:text-red-400 transition-colors">
                            <RefreshCw className="h-2.5 w-2.5" /> Try again
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming row */}
            <AnimatePresence>
              {isStreaming && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }} transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  className="px-4 py-3.5"
                >
                  <div className="flex gap-2.5">
                    <AgentAvatar streaming />
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-accent/50 tracking-wide">Synthos</span>
                      <div className="text-muted">
                        {phases.length > 0 ? <PhaseProgress phases={phases} /> : <ToolCallFeed calls={activeTools} />}
                        {streamingContent ? <MarkdownMessage content={streamingContent} /> : phases.length === 0 && activeTools.length === 0 && <TypingDots />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HITL form */}
            <AnimatePresence>
              {hitl && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="px-4 py-3.5"
                >
                  <div className="flex gap-2.5">
                    <AgentAvatar />
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-accent/50 tracking-wide">Synthos</span>
                      <HITLForm
                        requirements={hitl.requirements}
                        projectId={projectId}
                        onSubmit={handleHitlSubmit}
                        onCancel={handleHitlCancel}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="h-2" />
      </div>

      {/* Scroll-to-bottom pill */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }} transition={{ type: "spring", stiffness: 500, damping: 32 }}
            onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })}
            className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/90 border border-border/80 shadow-lg backdrop-blur-sm text-xs text-muted hover:text-[color:var(--text-color)] hover:border-muted/50 transition-colors duration-150"
          >
            <ChevronDown className="h-3 w-3" /> Scroll to bottom
          </motion.button>
        )}
      </AnimatePresence>

      {configPanel && <div className="flex-none px-4 py-3 border-t border-border bg-base/30">{configPanel}</div>}

      {/* Footer */}
      <div className="flex-none border-t border-border bg-surface">
        <div className="px-3 py-2.5">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200",
            input.length > 0 ? "border-muted/40 bg-base/50" : "border-border bg-base/30",
            hitl && "opacity-50"
          )}>
            <input
              ref={inputRef} type="text" value={input}
              onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={hitl ? "Complete the form above first…" : isStreaming ? "Agent is working…" : isLoadingHistory ? "Loading history…" : !projectId ? "No project connected" : "Ask Synthos…"}
              disabled={isInputDisabled}
              className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--text-color)] placeholder:text-muted/35 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <motion.button
              disabled={isInputDisabled || !input.trim()}
              onClick={handleSend}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className={cn(
                "flex-none w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150",
                input.trim() && !isInputDisabled ? "bg-accent text-accent-fg shadow-sm hover:opacity-90 cursor-pointer" : "bg-white/4 text-muted/30 cursor-not-allowed"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>
        {bottomAction && <div className="px-3 pb-3">{bottomAction}</div>}
      </div>
    </motion.div>
  );
}
