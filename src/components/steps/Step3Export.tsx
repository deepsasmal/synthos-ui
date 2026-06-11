import { useState, useEffect, useCallback } from "react";
import { Download, FileJson, FileSpreadsheet, Database, FileCode2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "../ui/Button";
import { ChatSidebar } from "../chat/ChatSidebar";
import { synthosApi, DataCard } from "../../lib/synthosApi";
import { cn } from "@/src/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Step3ExportProps {
  projectId: string;
  onBack: () => void;
  onRestart: () => void;
}

export function Step3Export({ projectId, onBack, onRestart }: Step3ExportProps) {
  const [format, setFormat] = useState("CSV");
  const [splitChunks, setSplitChunks] = useState(false);
  const [cards, setCards] = useState<DataCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const fetchCards = useCallback(() => {
    synthosApi.getProjectData(projectId)
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoadingCards(false));
  }, [projectId]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel - Summary & Export */}
      <div className="flex-1 flex flex-col bg-base overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex-none border-b border-border bg-surface px-5 h-12 flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-[color:var(--text-color)] transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
            Data
          </button>
          <div className="w-px h-4 bg-border" />
          <span className="font-display font-semibold text-sm text-[color:var(--text-color)]">Export</span>
          {cards.length > 0 && (
            <span className="text-[10px] font-mono text-muted/50 bg-white/4 border border-border/60 px-1.5 py-0.5 rounded-full">
              {cards.length} table{cards.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 min-h-0">
          {loadingCards ? (
            <div className="flex items-center justify-center h-full gap-3 text-muted">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-mono">Loading dataset…</span>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
              <div>
                <h2 className="font-display text-2xl font-semibold mb-1.5">Export Dataset</h2>
                <p className="text-muted text-sm">
                  {cards.length > 0
                    ? `${cards.length} table${cards.length !== 1 ? "s" : ""} ready — ${cards.reduce((s, c) => s + c.rows, 0).toLocaleString()} total rows, ${formatBytes(cards.reduce((s, c) => s + c.size_bytes, 0))}`
                    : "No data generated yet. Ask Synthos to generate data first."}
                </p>
              </div>

              {/* Per-table download cards */}
              {cards.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {cards.map((card, i) => (
                    <div key={card.table} className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 hover:border-muted/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-mono text-[1rem] font-semibold text-[color:var(--text-color)]">{card.table}</h3>
                          <p className="text-xs text-muted mt-1">{card.rows.toLocaleString()} rows &bull; {formatBytes(card.size_bytes)}</p>
                        </div>
                        <a
                          href={synthosApi.getTableDownloadUrl(projectId, card.table)}
                          download
                          className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/5 border border-border hover:bg-white/10 hover:border-muted/50 text-muted hover:text-[color:var(--text-color)] transition-all duration-150"
                          title={`Download ${card.table}.csv`}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      {/* Sparkline */}
                      <div className="h-10 flex items-end gap-0.5">
                        {Array.from({ length: 12 }, (_, j) => (
                          <div
                            key={j}
                            className="flex-1 bg-accent/20 hover:bg-accent/35 rounded-t-sm transition-colors"
                            style={{ height: `${30 + Math.abs(Math.sin((i * 3 + j) * 1.3)) * 70}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Chat */}
      <ChatSidebar
        title="Synthos"
        projectId={projectId}
        onRunComplete={fetchCards}
        configPanel={
          <div className="flex flex-col gap-5 text-sm">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-muted">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "CSV", icon: FileSpreadsheet },
                  { id: "JSON", icon: FileJson },
                  { id: "Parquet", icon: Database },
                  { id: "SQL INSERT", icon: FileCode2 },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFormat(f.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-mono transition-colors",
                      format === f.id 
                        ? "bg-accent text-accent-fg border-accent" 
                        : "bg-surface border-border text-muted hover:text-[color:var(--text-color)]"
                    )}
                  >
                    <f.icon className="h-3.5 w-3.5" />
                    {f.id}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-xs text-muted">Options</label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Include headers</span>
                <input type="checkbox" defaultChecked className="accent-accent w-4 h-4" />
              </label>
              
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm">Compress output (GZIP)</span>
                <input type="checkbox" className="accent-accent w-4 h-4" />
              </label>
              
              <div className="flex flex-col gap-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Split into chunks</span>
                  <input 
                    type="checkbox" 
                    checked={splitChunks}
                    onChange={(e) => setSplitChunks(e.target.checked)}
                    className="accent-accent w-4 h-4" 
                  />
                </label>
                {splitChunks && (
                  <div className="pl-4 border-l-2 border-border mt-1 flex items-center gap-2 animate-in slide-in-from-top-1">
                    <input type="number" defaultValue="10000" className="w-24 bg-surface border border-border rounded px-2 py-1 text-[color:var(--text-color)] font-mono text-xs focus:outline-none focus:border-muted" />
                    <span className="text-xs text-muted">rows per file</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        }
        bottomAction={
          <Button variant="ghost" className="w-full" onClick={onRestart}>
            Start New Schema
          </Button>
        }
      />
    </div>
  );
}
