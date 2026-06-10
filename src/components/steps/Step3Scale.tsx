import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft, ChevronRight, Download, Table2, Loader2,
  AlertCircle, BarChart3, ShieldCheck, Sparkles, RefreshCw, Info,
} from "lucide-react";
import { synthosApi, DataCard, ScaledQuality, TableData } from "../../lib/synthosApi";
import { ChatSidebar } from "../chat/ChatSidebar";
import { cn } from "@/src/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

interface Step3ScaleProps {
  projectId: string;
  onBack: () => void;
  onNext: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtRows(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.round(value * 100);
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 44 44" className="w-full h-full -rotate-90">
          <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-border" />
          <motion.circle
            cx="22" cy="22" r={r} fill="none" strokeWidth="4"
            strokeLinecap="round"
            stroke={color}
            strokeDasharray={`${dash} ${circ - dash}`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${dash} ${circ - dash}` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-mono font-semibold" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <span className="text-[10px] font-mono text-muted/60 text-center leading-tight">{label}</span>
    </div>
  );
}

function TableViewPanel({
  projectId, table, onClose,
}: {
  projectId: string;
  table: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    synthosApi.getScaledTableData(projectId, table, 50)
      .then(setData)
      .catch((e) => setError(e.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [projectId, table]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }} transition={{ type: "spring", stiffness: 400, damping: 36 }}
      className="flex flex-col bg-surface rounded-xl border border-border overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={onClose} className="p-1 rounded hover:bg-white/6 text-muted hover:text-[color:var(--text-color)] transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <Table2 className="w-3.5 h-3.5 text-accent/60" />
        <span className="font-mono text-sm font-medium">{table}</span>
        {data && <span className="ml-auto text-[10px] font-mono text-muted/40">{fmtRows(data.total_rows)} rows</span>}
        <a
          href={synthosApi.getScaledDownloadUrl(projectId, table)}
          download
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/8 border border-accent/20 text-[11px] font-mono text-accent/80 hover:bg-accent/15 transition-colors"
        >
          <Download className="w-2.5 h-2.5" /> CSV
        </a>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 gap-2 text-muted/50">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-[11px] font-mono">Loading…</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-6 text-red-400/70 text-xs font-mono">
          <AlertCircle className="w-3.5 h-3.5 flex-none" /> {error}
        </div>
      )}
      {data && !loading && (
        <div className="overflow-auto flex-1" style={{ maxHeight: "340px" }}>
          <table className="w-full text-[11px] font-mono border-collapse">
            <thead className="sticky top-0 bg-surface/95 backdrop-blur-sm z-10">
              <tr className="border-b border-border">
                {data.columns.map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-semibold text-muted/60 whitespace-nowrap border-r border-border/40 last:border-r-0">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {data.rows.map((row, i) => (
                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                  {data.columns.map((col) => (
                    <td key={col} className="px-3 py-1.5 text-muted/70 whitespace-nowrap max-w-[200px] truncate border-r border-border/25 last:border-r-0">
                      {row[col] === null || row[col] === undefined ? <span className="text-muted/25 italic">null</span> : String(row[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.total_rows > 50 && (
            <div className="px-3 py-2 border-t border-border/40 text-[10px] font-mono text-muted/30 text-center">
              Showing first 50 of {fmtRows(data.total_rows)} rows
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Step3Scale({ projectId, onBack, onNext }: Step3ScaleProps) {
  const [tables, setTables] = useState<DataCard[]>([]);
  const [quality, setQuality] = useState<ScaledQuality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, q] = await Promise.all([
        synthosApi.getScaledData(projectId),
        synthosApi.getScaledQuality(projectId),
      ]);
      setTables(t);
      setQuality(q);
    } catch (e: any) {
      setError(e.message ?? "Failed to load scaled data");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const isEmpty = !loading && tables.length === 0;

  return (
    <div className="flex-1 flex overflow-hidden min-h-0">
      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0">
        {/* Header bar */}
        <div className="flex-none flex items-center justify-between px-6 py-3.5 border-b border-border bg-surface/50">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-mono text-muted/60 hover:text-[color:var(--text-color)] transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /> Seed Data
            </button>
            <span className="text-border">/</span>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent/60" />
              <span className="font-display font-semibold text-sm">Scale Dataset</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button onClick={refresh} disabled={loading}
              className="p-1.5 rounded-md hover:bg-white/6 text-muted hover:text-[color:var(--text-color)] transition-colors disabled:opacity-40">
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            </button>
            {!isEmpty && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={onNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Export <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ minHeight: 0 }}>
          {loading && (
            <div className="flex items-center justify-center h-32 gap-2 text-muted/40">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-mono">Loading scaled data…</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg bg-red-500/6 border border-red-500/20 text-red-400/80 text-xs font-mono">
              <AlertCircle className="w-3.5 h-3.5 flex-none" /> {error}
            </div>
          )}

          {isEmpty && !error && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className="flex flex-col items-center justify-center py-16 gap-5 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent/6 border border-accent/12 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-accent/40" />
              </div>
              <div className="space-y-2 max-w-xs">
                <p className="font-medium text-sm text-[color:var(--text-color)]/70">No scaled data yet</p>
                <p className="text-xs text-muted/50 leading-relaxed">
                  Use the chat to ask Synthos to scale your seed data. Say something like{" "}
                  <span className="font-mono text-muted/70">"scale the dataset 10×"</span>.
                </p>
              </div>
            </motion.div>
          )}

          {!loading && !isEmpty && (
            <>
              {/* Quality panel */}
              <AnimatePresence mode="wait">
                {quality ? (
                  <motion.div
                    key="quality"
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-accent/60" />
                      <span className="text-sm font-semibold">Data Quality</span>
                      <span className="ml-1 text-[10px] font-mono text-muted/40">{quality.scale}× scale</span>
                    </div>
                    <div className="flex items-start gap-8">
                      <ScoreRing
                        value={quality.validity_score}
                        label="Data integrity"
                        color={quality.validity_score >= 0.8 ? "#34d399" : quality.validity_score >= 0.6 ? "#fbbf24" : "#f87171"}
                      />
                      <ScoreRing
                        value={quality.quality_score}
                        label="Statistical fidelity"
                        color={quality.quality_score >= 0.8 ? "#34d399" : quality.quality_score >= 0.6 ? "#fbbf24" : "#f87171"}
                      />
                      <div className="flex-1 space-y-1.5">
                        {Object.entries(quality.tables).map(([tbl, rows]) => (
                          <div key={tbl} className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-muted/50 truncate">{tbl}</span>
                            <div className="flex-1 h-px bg-border/40" />
                            <span className="text-muted/70">{fmtRows(Number(rows))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {quality.quality_score < 0.6 && (
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/6 border border-amber-500/20 text-amber-400/80 text-[11px]">
                        <Info className="w-3 h-3 flex-none mt-0.5" />
                        Fidelity improves with a larger seed — generate more seed rows before scaling.
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="no-quality"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-border/50 text-[11px] font-mono text-muted/40"
                  >
                    <Info className="w-3 h-3 flex-none" /> Quality metrics will appear after scaling completes.
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table cards */}
              <div>
                <p className="text-[10px] font-mono text-muted/40 uppercase tracking-wider mb-2.5">Scaled Tables</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {tables.map((card) => (
                    <motion.button
                      key={card.table}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedTable(card.table)}
                      className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-surface hover:border-accent/30 hover:bg-surface-hover transition-all text-left group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Table2 className="w-3.5 h-3.5 text-accent/50 flex-none" />
                          <span className="text-sm font-mono font-medium text-[color:var(--text-color)] group-hover:text-accent transition-colors truncate">
                            {card.table}
                          </span>
                        </div>
                        <a
                          href={synthosApi.getScaledDownloadUrl(projectId, card.table)}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-accent/6 border border-accent/15 text-[10px] font-mono text-accent/60 hover:bg-accent/15 hover:text-accent/90 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Download className="w-2 h-2" /> CSV
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-muted/50">
                        <span>{fmtRows(card.rows)} rows</span>
                        <span className="text-border/60">·</span>
                        <span>{fmtBytes(card.size_bytes)}</span>
                      </div>
                      <div className="h-0.5 rounded-full bg-border overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                          className="h-full bg-accent/30 rounded-full"
                        />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Drill-down table */}
              <AnimatePresence>
                {selectedTable && (
                  <TableViewPanel
                    projectId={projectId}
                    table={selectedTable}
                    onClose={() => setSelectedTable(null)}
                  />
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>

      {/* Chat sidebar */}
      <ChatSidebar
        title="Synthos"
        projectId={projectId}
        onRunComplete={refresh}
        bottomAction={
          !isEmpty ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onNext}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-sm font-mono text-muted hover:text-[color:var(--text-color)] transition-all"
            >
              Continue to Export <ChevronRight className="w-3.5 h-3.5" />
            </motion.button>
          ) : null
        }
      />
    </div>
  );
}
