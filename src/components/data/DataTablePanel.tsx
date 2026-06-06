import { useState, useEffect } from "react";
import { ArrowLeft, Download, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { synthosApi, DataCard, TableData } from "../../lib/synthosApi";
import { cn } from "@/src/lib/utils";

interface DataTablePanelProps {
  projectId: string;
  tables: DataCard[];
  onBack: () => void;
}

export function DataTablePanel({ projectId, tables, onBack }: DataTablePanelProps) {
  const [activeTable, setActiveTable] = useState<string>(tables[0]?.table ?? "");
  const [data, setData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep activeTable valid when tables list changes
  useEffect(() => {
    if (tables.length > 0 && !tables.find((t) => t.table === activeTable)) {
      setActiveTable(tables[0].table);
    }
  }, [tables, activeTable]);

  useEffect(() => {
    if (!activeTable) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    synthosApi.getTableData(projectId, activeTable, 50)
      .then((d) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message ?? "Failed to load"); setLoading(false); } });
    return () => { cancelled = true; };
  }, [projectId, activeTable]);

  const activeCard = tables.find((t) => t.table === activeTable);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex-none border-b border-border bg-surface">
        {/* Top row: back + meta */}
        <div className="flex items-center gap-3 px-4 h-11">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-[color:var(--text-color)] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
            Schema
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="font-mono text-sm font-semibold text-[color:var(--text-color)]">{activeTable}</span>
          {data && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white/5 border border-border/60 text-[10px] font-mono text-muted/60">
              {data.rows.length} of {data.total_rows.toLocaleString()}
            </span>
          )}
          {activeCard && (
            <span className="text-[10px] font-mono text-muted/40">
              {activeCard.rows.toLocaleString()} rows
            </span>
          )}
          <div className="ml-auto">
            <a
              href={synthosApi.getTableDownloadUrl(projectId, activeTable)}
              download
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-[color:var(--text-color)] hover:border-muted/50 transition-all duration-150"
            >
              <Download className="w-3 h-3" /> CSV
            </a>
          </div>
        </div>

        {/* Table tabs */}
        <div className="flex items-center gap-0 px-4 overflow-x-auto">
          {tables.map((t) => (
            <button
              key={t.table}
              onClick={() => setActiveTable(t.table)}
              className={cn(
                "px-3 py-2 text-xs font-mono border-b-2 transition-colors duration-150 whitespace-nowrap",
                t.table === activeTable
                  ? "border-accent text-[color:var(--text-color)]"
                  : "border-transparent text-muted hover:text-[color:var(--text-color)]"
              )}
            >
              {t.table}
              <span className="ml-1.5 text-[10px] text-muted/40">{t.rows}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table content */}
      <div className="flex-1 overflow-auto min-h-0">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full gap-2.5 text-muted"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-mono">Loading {activeTable}…</span>
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            </motion.div>
          )}

          {data && !loading && (
            <motion.div
              key={activeTable}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="h-full"
            >
              <table className="w-full text-left text-xs font-mono whitespace-nowrap border-collapse">
                <thead className="sticky top-0 z-10 bg-surface border-b border-border">
                  <tr>
                    {data.columns.map((col) => (
                      <th key={col} className="px-4 py-2.5 text-[11px] font-medium text-muted/70 uppercase tracking-wide">
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
                      transition={{ delay: Math.min(i * 0.01, 0.25) }}
                      className="hover:bg-white/[0.02] transition-colors duration-100"
                    >
                      {data.columns.map((col) => {
                        const val = row[col];
                        const isNull = val === null || val === undefined;
                        return (
                          <td
                            key={col}
                            className={cn(
                              "px-4 py-2 text-[12px] max-w-[260px] truncate",
                              isNull ? "text-muted/30 italic" : "text-[color:var(--text-color)]/80"
                            )}
                          >
                            {isNull ? "null" : String(val)}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
