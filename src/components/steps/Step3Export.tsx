import { useState, useEffect } from "react";
import { Download, FileJson, FileSpreadsheet, Database, FileCode2, Loader2 } from "lucide-react";
import { Button } from "../ui/Button";
import { ChatSidebar } from "../chat/ChatSidebar";
import { cn } from "@/src/lib/utils";

const summaryCards = [
  { name: "users", rows: "10,000", size: "~2.4 MB CSV", bars: [30, 45, 60, 50, 70, 85, 100, 90, 75, 60, 40, 55] },
  { name: "orders", rows: "47,832", size: "~8.1 MB CSV", bars: [20, 35, 50, 40, 60, 80, 95, 85, 70, 55, 35, 45] },
  { name: "products", rows: "2,500", size: "~0.8 MB CSV", bars: [100, 95, 98, 100, 90, 85, 95, 100, 98, 95, 90, 85] },
  { name: "order_items", rows: "143,496", size: "~15.2 MB CSV", bars: [15, 30, 45, 35, 55, 75, 90, 80, 65, 50, 30, 40] },
];

const chatMessages = [
  { role: "user" as const, content: "Scale to full dataset — 10k users, proportional orders and items" },
  { role: "ai" as const, content: "Full dataset generated. Applied Gaussian copula for price/quantity distributions. Markov chain for order status sequences. Referential integrity validated — 0 orphaned FKs." },
];

export function Step3Export({ onRestart }: { onRestart: () => void }) {
  const [format, setFormat] = useState("CSV");
  const [splitChunks, setSplitChunks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsGenerating(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Panel - Summary & Export */}
      <div className="flex-1 flex flex-col bg-base overflow-y-auto p-8 relative">
        {isGenerating && (
          <div className="absolute inset-0 z-50 bg-base flex flex-col items-center justify-center">
            <Loader2 className="h-12 w-12 text-accent animate-spin mb-6" />
            <h2 className="font-display text-2xl font-semibold mb-2">Data generation in progress</h2>
            <p className="text-muted text-sm font-mono animate-pulse">Generating full dataset and validating referential integrity...</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full flex flex-col gap-8">
          
          <div>
            <h2 className="font-display text-2xl font-semibold mb-2">Dataset Ready</h2>
            <p className="text-muted text-sm">
              ML distribution model applied — Gaussian copula for numeric columns, Markov chain for sequences.
            </p>
          </div>

          {/* Quality Report Strip */}
          <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs text-muted uppercase tracking-wider font-mono mb-1">Fidelity Score</span>
              <span className="text-xl font-display font-medium text-green-400">94.2%</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col">
              <span className="text-xs text-muted uppercase tracking-wider font-mono mb-1">Statistical Similarity</span>
              <span className="text-xl font-display font-medium text-green-400">96.8%</span>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex flex-col">
              <span className="text-xs text-muted uppercase tracking-wider font-mono mb-1">Referential Integrity</span>
              <span className="text-xl font-display font-medium text-green-400">100%</span>
            </div>
          </div>

          {/* Summary Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {summaryCards.map((card) => (
              <div key={card.name} className="bg-surface border border-border rounded-lg p-5 flex flex-col gap-4 hover:border-muted transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-mono text-lg font-medium text-[color:var(--text-color)]">{card.name}</h3>
                    <p className="text-sm text-muted mt-1">{card.rows} rows &bull; {card.size}</p>
                  </div>
                  <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Sparkline */}
                <div className="h-12 flex items-end gap-1 mt-2">
                  {card.bars.map((height, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-accent/20 rounded-t-sm hover:bg-accent/40 transition-colors"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button variant="primary" size="lg" className="w-full text-lg gap-2 h-14">
              <Download className="h-5 w-5" /> Download All as ZIP
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Chat */}
      <ChatSidebar 
        title="Export Config"
        messages={chatMessages}
        disabled={isGenerating}
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
          <Button variant="ghost" className="w-full" onClick={onRestart} disabled={isGenerating}>
            Start New Schema
          </Button>
        }
      />
    </div>
  );
}
