import { Send, ChevronRight, MessageSquare, AlertCircle, Wrench, RefreshCw, Sparkles, ChevronDown } from "lucide-react";
import React, { useState, useRef, useEffect, ReactNode, useCallback } from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "motion/react";
import { synthosApi, AgentRun } from "../../lib/synthosApi";
import { cn } from "@/src/lib/utils";

interface Message {
  role: "user" | "ai" | "error";
  content: string;
}

interface ChatSidebarProps {
  title: string;
  projectId?: string;
  disabled?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages?: any[];
  bottomAction?: ReactNode;
  configPanel?: ReactNode;
  onRunComplete?: () => void;
}

function renderMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/^---$/gm, "<hr/>")
    .replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split("\n").filter(Boolean).map((l) => `<li>${l.slice(2)}</li>`).join("");
      return `<ul>${items}</ul>`;
    })
    .replace(/\n\n+/g, "<br/><br/>")
    .replace(/\n/g, " ");
}

function MarkdownMessage({ content }: { content: string }) {
  return (
    <div
      className="text-sm leading-[1.65] [&_strong]:font-semibold [&_strong]:text-[color:var(--text-color)] [&_em]:italic [&_code]:font-mono [&_code]:text-xs [&_code]:bg-white/6 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_pre]:bg-white/5 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mt-1.5 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_h2]:font-semibold [&_h2]:text-[color:var(--text-color)] [&_h2]:text-sm [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:font-semibold [&_h3]:text-[color:var(--text-color)] [&_h3]:text-xs [&_h3]:mt-2 [&_h4]:font-medium [&_h4]:text-xs [&_ul]:list-none [&_ul]:space-y-1 [&_ul]:mt-1.5 [&_li]:flex [&_li]:gap-2 [&_li]:before:content-['·'] [&_li]:before:text-muted/60 [&_li]:before:font-bold [&_hr]:border-border [&_hr]:my-2"
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

const MIN_WIDTH = 300;
const MAX_WIDTH = 700;
const DEFAULT_WIDTH = 380;

export function ChatSidebar({ title, projectId = "", disabled: externalDisabled, bottomAction, configPanel, onRunComplete }: ChatSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const isFirstMessage = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragStartX = useRef<number | null>(null);
  const dragStartWidth = useRef<number>(DEFAULT_WIDTH);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (atBottom) el.scrollTop = el.scrollHeight;
  }, [messages, streamingContent, toolStatus, isLoadingHistory]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setShowScrollBtn(!atBottom);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const msgText = `${text}\n\n(project_id=${projectId})`;
    setInput("");
    setLastError(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setIsStreaming(true);
    setStreamingContent("");
    setToolStatus(null);
    isFirstMessage.current = false;

    const abort = new AbortController();
    abortRef.current = abort;
    let accumulated = "";

    try {
      await synthosApi.streamTeamRun(
        msgText,
        projectId,
        {
          onDelta: (chunk) => { accumulated += chunk; setStreamingContent(accumulated); },
          onEvent: (name, data) => {
            if (name === "ToolCallStarted") {
              const toolName: string = data.tool?.tool_name ?? data.tool_name ?? "tool";
              setToolStatus(
                toolName.includes("edit") || toolName.includes("write") || toolName.includes("update") ? "Editing schema…"
                : toolName.includes("load") || toolName.includes("read") || toolName.includes("get") ? "Reading schema…"
                : toolName.includes("valid") ? "Validating tables…"
                : `Calling ${toolName}…`
              );
            } else if (name === "ToolCallCompleted") {
              setToolStatus(null);
            } else if (name === "RunFailed") {
              throw new Error(data.error ?? "Agent run failed");
            }
          },
        },
        abort.signal
      );
      setMessages((prev) => [...prev, { role: "ai", content: accumulated || "(no response)" }]);
      onRunComplete?.();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = err?.message ?? "Unknown error";
      setLastError(msg);
      setMessages((prev) => [...prev, { role: "error", content: msg }]);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      setToolStatus(null);
      abortRef.current = null;
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, isStreaming, projectId]);

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

  /* ── Collapsed state ─────────────────────────────── */
  if (isCollapsed) {
    return (
      <motion.div
        initial={{ width: DEFAULT_WIDTH, opacity: 0.6 }}
        animate={{ width: 48, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 38 }}
        className="border-l border-border bg-surface flex flex-col items-center py-4 gap-3 self-stretch overflow-hidden"
      >
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 rounded-lg hover:bg-white/6 transition-colors duration-150 group"
          title="Expand"
        >
          <MessageSquare className="h-4 w-4 text-muted group-hover:text-[color:var(--text-color)] transition-colors" />
        </button>
        {msgCount > 0 && (
          <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center">
            <span className="text-[9px] font-mono text-accent font-semibold">{msgCount > 9 ? "9+" : msgCount}</span>
          </div>
        )}
        <div
          className="text-muted/30 font-display text-[10px] tracking-[0.2em] uppercase mt-auto mb-2 select-none"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        >
          {title}
        </div>
      </motion.div>
    );
  }

  /* ── Expanded state ──────────────────────────────── */
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 36 }}
      style={{ width }}
      className="relative border-l border-border bg-surface flex flex-col self-stretch overflow-hidden shrink-0"
    >
      {/* Resize grip */}
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 z-20 cursor-ew-resize group"
      >
        <div className="absolute inset-y-0 left-0 w-px bg-transparent group-hover:bg-accent/30 group-active:bg-accent/60 transition-colors duration-200" />
      </div>

      {/* ── Top header ── */}
      <div className="flex-none border-b border-border">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center gap-2.5">
            <AgentAvatar streaming={isStreaming} />
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-[13px] tracking-tight text-[color:var(--text-color)]">
                {title}
              </span>
              <AnimatePresence>
                {isStreaming && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-[10px] font-mono text-accent/80"
                  >
                    Thinking
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-md hover:bg-white/5 transition-colors duration-150 text-muted/50 hover:text-muted"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Toolbar strip — mirrors the HubSpot filter row */}
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-0.5">
          {toolStatus ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/4 border border-border text-[11px] font-mono text-muted/70"
            >
              <Wrench className="h-2.5 w-2.5 animate-spin shrink-0" style={{ animationDuration: "2s" }} />
              {toolStatus}
            </motion.div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/3 border border-border/50 text-[11px] font-mono text-muted/40">
              <span className="w-1.5 h-1.5 rounded-full bg-muted/30" />
              {isLoadingHistory ? "Loading history…" : !projectId ? "No project" : msgCount === 0 ? "Ready" : `${msgCount} message${msgCount !== 1 ? "s" : ""}`}
            </div>
          )}
        </div>
      </div>

      {/* ── Message list ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden"
        style={{ minHeight: 0 }}
      >
        {/* Loading skeleton */}
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

        {/* Empty state */}
        {!isLoadingHistory && messages.length === 0 && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 32 }}
            className="flex flex-col items-center justify-center h-full min-h-[200px] gap-4 px-6 text-center"
          >
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

        {/* Messages — HubSpot-style divider list */}
        {!isLoadingHistory && (
          <div className="divide-y divide-border/30">
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
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
                        <div className="text-muted">
                          <MarkdownMessage content={msg.content} />
                        </div>
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
                          <button
                            onClick={handleRetry}
                            className="inline-flex items-center gap-1.5 mt-1 text-[11px] text-red-400/50 hover:text-red-400 transition-colors"
                          >
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
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  className="px-4 py-3.5"
                >
                  <div className="flex gap-2.5">
                    <AgentAvatar streaming />
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-accent/50 tracking-wide">Synthos</span>
                      <div className="text-muted">
                        {streamingContent ? <MarkdownMessage content={streamingContent} /> : <TypingDots />}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Spacer so last message isn't flush with the input bar */}
        <div className="h-2" />
      </div>

      {/* Scroll-to-bottom pill */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            onClick={scrollToBottom}
            className="absolute bottom-[72px] left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/90 border border-border/80 shadow-lg backdrop-blur-sm text-xs text-muted hover:text-[color:var(--text-color)] hover:border-muted/50 transition-colors duration-150"
          >
            <ChevronDown className="h-3 w-3" /> Scroll to bottom
          </motion.button>
        )}
      </AnimatePresence>

      {configPanel && (
        <div className="flex-none px-4 py-3 border-t border-border bg-base/30">
          {configPanel}
        </div>
      )}

      {/* ── Footer bar — mirrors HubSpot bottom strip ── */}
      <div className="flex-none border-t border-border bg-surface">
        <div className="px-3 py-2.5">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200",
            input.length > 0 ? "border-muted/40 bg-base/50" : "border-border bg-base/30"
          )}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming ? "Agent is thinking…"
                : isLoadingHistory ? "Loading history…"
                : !projectId ? "No project connected"
                : "Ask Synthos…"
              }
              disabled={isStreaming || isLoadingHistory || externalDisabled || !projectId}
              className="flex-1 min-w-0 bg-transparent text-sm text-[color:var(--text-color)] placeholder:text-muted/35 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <motion.button
              disabled={isStreaming || isLoadingHistory || externalDisabled || !projectId || !input.trim()}
              onClick={handleSend}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 28 }}
              className={cn(
                "flex-none w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150",
                input.trim() && !isStreaming && !isLoadingHistory && projectId
                  ? "bg-accent text-accent-fg shadow-sm hover:opacity-90 cursor-pointer"
                  : "bg-white/4 text-muted/30 cursor-not-allowed"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </motion.button>
          </div>
        </div>

        {/* Bottom action strip — same height as HubSpot footer */}
        {bottomAction && (
          <div className="px-3 pb-3">
            {bottomAction}
          </div>
        )}
      </div>
    </motion.div>
  );
}
