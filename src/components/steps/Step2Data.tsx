import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Download, RefreshCw, ChevronRight,
  Database, TableProperties, Loader2, AlertCircle, BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "../ui/Button";
import { ChatSidebar } from "../chat/ChatSidebar";
import { synthosApi, DataCard, TableData } from "../../lib/synthosApi";
import { cn } from "@/src/lib/utils";

interface Step2DataProps {
  projectId: string;
  onBack: () => void;
  onNext: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRows(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyDataState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 32, delay: 0.1 }}
      className="flex flex-col items-center justify-center h-full gap-5 px-8 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-accent/6 border border-accent/15 flex items-center justify-center">
        <Database className="w-7 h-7 text-accent/40" />
      </div>
      <div className="space-y-2 max-w-xs">
        <p className="text-sm font-semibold text-[color:var(--text-color)]/70">No data generated yet</p>
        <p className="text-xs text-muted/60 leading-relaxed">
          Ask Synthos in the chat to generate data for your schema — it will appear here once ready.
        </p>
      </div>
      <div className="inline-flex items-center gap-1.5 text-xs text-muted/50 font-mono bg-surface border border-border/50 px-3 py-1.5 rounded-full">
        Try: "Generate 100 rows per table"
        <ChevronRight className="w-3 h-3" />
      </div>
    </motion.div>
  );
}

// ── Data cards grid ──────────────────────────────────────────────────────────
function DataCards({
  cards,
  onSelect,
  projectId,
}: {
  cards: DataCard[];
  onSelect: (table: string) => void;
  projectId: string;
}) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 p-5">
      <AnimatePresence initial={false}>
        {cards.map((card, i) => (
          <motion.div
            key={card.table}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, delay: i * 0.04 }}
            className="group relative bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-muted/50 hover:bg-surface-hover transition-all duration-200 flex flex-col gap-3"
            onClick={() => onSelect(card.table)}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-accent/8 border border-accent/15 flex items-center justify-center flex-none">
                  <TableProperties className="w-3.5 h-3.5 text-accent/60" />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-[color:var(--text-color)] truncate">{card.table}</p>
                  <p className="text-[10px] text-muted/50 mt-0.5">{formatBytes(card.size_bytes)}</p>
                </div>
              </div>
              <a
                href={synthosApi.getTableDownloadUrl(projectId, card.table)}
                download
                onClick={(e) => e.stopPropagation()}
                className="flex-none p-1.5 rounded-md hover:bg-white/8 text-muted/40 hover:text-[color:var(--text-color)] transition-colors duration-150"
                title={`Download ${card.table}.csv`}
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Row count + sparkline */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-display font-semibold text-[color:var(--text-color)] leading-none">
                  {formatRows(card.rows)}
                </p>
                <p className="text-[10px] text-muted/50 mt-1">rows</p>
              </div>
              <div className="flex items-end gap-0.5 h-8">
                {Array.from({ length: 8 }, (_, j) => (
                  <div
                    key={j}
                    className="w-1.5 rounded-t-sm bg-accent/20 group-hover:bg-accent/35 transition-colors duration-200"
                    style={{ height: `${30 + Math.abs(Math.sin((i * 3 + j) * 1.3)) * 70}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Hover caret */}
            <div className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <ChevronRight className="w-3.5 h-3.5 text-muted/50" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Table drill-down ─────────────────────────────────────────────────────────
function TableView({
  projectId,
  tableName,
  onBack,
}: {
  projectId: string;
  tableName: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    synthosApi.getTableData(projectId, tableName, 50)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message ?? "Failed to load"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [projectId, tableName]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-header */}
      <div className="flex-none flex items-center gap-3 px-5 py-2.5 border-b border-border/60 bg-base/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-[color:var(--text-color)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Tables
        </button>
        <ChevronRight className="w-3 h-3 text-border" />
        <span className="font-mono text-sm font-semibold text-[color:var(--text-color)]">{tableName}</span>
        {data && (
          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-border/60 text-[10px] font-mono text-muted/60">
            {data.rows.length} of {data.total_rows.toLocaleString()} rows
          </span>
        )}
        <div className="ml-auto">
          <a
            href={synthosApi.getTableDownloadUrl(projectId, tableName)}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-[color:var(--text-color)] hover:border-muted/50 transition-all duration-150"
          >
            <Download className="w-3.5 h-3.5" /> Download CSV
          </a>
        </div>
      </div>

      {/* Table content */}
      {loading && (
        <div className="flex-1 flex items-center justify-center gap-3 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm font-mono">Loading {tableName}…</span>
        </div>
      )}
      {error && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        </div>
      )}
      {data && !loading && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-xs font-mono whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-10 bg-surface border-b border-border">
              <tr>
                {data.columns.map((col) => (
                  <th key={col} className="px-4 py-2.5 font-medium text-muted/70 text-[11px] uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {data.rows.map((row, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.008, 0.3) }}
                  className="hover:bg-white/[0.02] transition-colors duration-100"
                >
                  {data.columns.map((col) => {
                    const val = row[col];
                    const isNull = val === null || val === undefined;
                    return (
                      <td key={col} className={cn(
                        "px-4 py-2 text-[12px] max-w-[200px] truncate",
                        isNull ? "text-muted/30 italic" : "text-[color:var(--text-color)]/80"
                      )}>
                        {isNull ? "null" : String(val)}
                      </td>
                    );
                  })}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Step2Data ───────────────────────────────────────────────────────────
export function Step2Data({ projectId, onBack, onNext }: Step2DataProps) {
  const [cards, setCards] = useState<DataCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const fetchCards = useCallback(() => {
    setCardsError(null);
    synthosApi.getProjectData(projectId)
      .then(setCards)
      .catch((e) => setCardsError(e.message ?? "Failed to load data"))
      .finally(() => setLoadingCards(false));
  }, [projectId]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const totalRows = cards.reduce((s, c) => s + c.rows, 0);
  const totalSize = cards.reduce((s, c) => s + c.size_bytes, 0);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className="flex-1 flex flex-col bg-base overflow-hidden min-w-0">
        {/* Page header */}
        <div className="flex-none border-b border-border bg-surface">
          <div className="flex items-center gap-3 px-5 h-12">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-[color:var(--text-color)] transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
              Canvas
            </button>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent/60" />
              <span className="font-display font-semibold text-sm text-[color:var(--text-color)]">Generated Data</span>
              {cards.length > 0 && (
                <span className="text-[10px] font-mono text-muted/50 bg-white/4 border border-border/60 px-1.5 py-0.5 rounded-full">
                  {cards.length} table{cards.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              {!selectedTable && (
                <button
                  onClick={fetchCards}
                  className="p-1.5 rounded-md hover:bg-white/5 text-muted/40 hover:text-muted transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              {cards.length > 0 && (
                <Button variant="primary" size="sm" onClick={onNext}>
                  Export &rarr;
                </Button>
              )}
            </div>
          </div>

          {/* Stats strip */}
          {cards.length > 0 && !selectedTable && (
            <div className="flex items-center gap-5 px-5 pb-2.5 text-[11px] font-mono text-muted/60">
              <span>
                <span className="text-[color:var(--text-color)]/80 font-semibold">{totalRows.toLocaleString()}</span> rows
              </span>
              <span className="w-px h-3 bg-border" />
              <span>
                <span className="text-[color:var(--text-color)]/80 font-semibold">{formatBytes(totalSize)}</span> total
              </span>
              <span className="w-px h-3 bg-border" />
              <span>
                <span className="text-[color:var(--text-color)]/80 font-semibold">{cards.length}</span> tables
              </span>
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto min-h-0">
          {loadingCards && (
            <div className="flex items-center justify-center h-full gap-3 text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">Loading tables…</span>
            </div>
          )}

          {cardsError && !loadingCards && (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" /> {cardsError}
                </div>
                <button onClick={fetchCards} className="text-xs text-muted hover:text-[color:var(--text-color)] transition-colors">
                  Try again
                </button>
              </div>
            </div>
          )}

          {!loadingCards && !cardsError && (
            <AnimatePresence mode="wait">
              {selectedTable ? (
                <motion.div
                  key={`table-${selectedTable}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="h-full"
                >
                  <TableView
                    projectId={projectId}
                    tableName={selectedTable}
                    onBack={() => setSelectedTable(null)}
                  />
                </motion.div>
              ) : cards.length === 0 ? (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                  <EmptyDataState />
                </motion.div>
              ) : (
                <motion.div key="cards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <DataCards cards={cards} onSelect={setSelectedTable} projectId={projectId} />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Right panel: Chat ── */}
      <ChatSidebar
        title="Synthos"
        projectId={projectId}
        onRunComplete={fetchCards}
        bottomAction={
          cards.length > 0 ? (
            <Button variant="primary" className="w-full" onClick={onNext}>
              Export data &rarr;
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}
