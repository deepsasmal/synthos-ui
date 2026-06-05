import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
  NodeProps,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Trash2, Key, Link as LinkIcon, Send, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "../ui/Button";
import { ChatSidebar } from "../chat/ChatSidebar";
import { cn } from "@/src/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { synthosApi, SchemaData } from "../../lib/synthosApi";

type Column = { 
  id: string; 
  name: string; 
  type: string; 
  isPk?: boolean; 
  isFk?: boolean; 
  isNullable?: boolean;
};

// Canvas legend explaining icon meanings
function CanvasLegend() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
      className="flex items-center gap-3 bg-surface/90 backdrop-blur-sm border border-border px-3 py-2 rounded-lg shadow-lg"
    >
      <span className="text-[10px] font-mono text-muted uppercase tracking-widest mr-1">Legend</span>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40">
          <Key className="h-3 w-3 text-amber-400" />
        </div>
        <span className="text-[11px] font-mono text-amber-400/90 font-medium">Primary Key</span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1.5">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/40">
          <LinkIcon className="h-3 w-3 text-blue-400" />
        </div>
        <span className="text-[11px] font-mono text-blue-400/90 font-medium">Foreign Key</span>
      </div>
    </motion.div>
  );
}

// Simple markdown renderer for the centered chat response preview
function renderSimpleMarkdown(text: string): string {
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, "<h4>$1</h4>")
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/((?:^- .+\n?)+)/gm, (block) => {
      const items = block.trim().split("\n").filter(Boolean)
        .map((l) => `<li>${l.slice(2)}</li>`).join("");
      return `<ul>${items}</ul>`;
    })
    .replace(/\n\n+/g, "<br/><br/>")
    .replace(/\n/g, " ");
}

interface CenteredChatProps {
  projectId: string;
  projectName: string;
  onComplete: () => void;
}

function CenteredChat({ projectId, projectName, onComplete }: CenteredChatProps) {
  const [input, setInput] = useState("");
  const [hasSent, setHasSent] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [streamingContent]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const msgText = `${text}\n\n(project_id=${projectId})`;
    setUserMessage(text);
    setInput("");
    setHasSent(true);
    setIsStreaming(true);

    let accumulated = "";
    try {
      await synthosApi.streamAgentRun(msgText, projectId, {
        onDelta: (chunk) => { accumulated += chunk; setStreamingContent(accumulated); },
        onEvent: () => {},
      });
    } catch { /* non-fatal */ } finally {
      setIsStreaming(false);
      setIsDone(true);
      setTimeout(onComplete, 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96, filter: "blur(8px)" }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-base/80 backdrop-blur-md"
    >
      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-indigo-500/6 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl w-full px-6 flex flex-col gap-6 max-h-[85vh]">
        <AnimatePresence mode="wait">
          {!hasSent ? (
            /* ── Hero state ── */
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface/80 border border-border/60 rounded-full text-xs font-mono text-muted mb-7 backdrop-blur-sm"
                >
                  <Sparkles className="h-3 w-3 text-accent" />
                  Synthos Schema Agent · Live on canvas
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="font-display text-4xl font-bold tracking-tight mb-3 leading-tight"
                >
                  What schema should we build
                  <br />for{" "}
                  <span className="text-accent">{projectName}</span>?
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-muted text-base max-w-md mx-auto leading-relaxed"
                >
                  Describe your domain and I'll design the ER diagram live on the canvas behind me.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder="e.g. An e-commerce platform with customers, orders, products and inventory tracking..."
                    rows={3}
                    style={{ color: 'var(--text-color)' }}
                    className="w-full bg-surface/90 border-2 border-border hover:border-muted/50 focus:border-accent/60 rounded-2xl px-6 py-5 text-base shadow-2xl focus:outline-none transition-all duration-200 placeholder:text-muted/40 pr-20 resize-none backdrop-blur-sm"
                  />
                  <Button
                    variant="primary"
                    size="icon"
                    disabled={!input.trim()}
                    onClick={handleSend}
                    className="absolute right-4 bottom-4 h-10 w-10 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-center text-[11px] font-mono text-muted/40 mt-3 tracking-wide">
                  Enter to send · Shift+Enter for new line
                </p>
              </motion.div>
            </motion.div>
          ) : (
            /* ── Chat state (after send) ── */
            <motion.div
              key="chat"
              ref={scrollRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4 overflow-y-auto"
            >
              {/* User bubble */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex justify-end"
              >
                <div className="max-w-[80%] bg-border rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                  {userMessage}
                </div>
              </motion.div>

              {/* Agent bubble */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] bg-surface/90 border border-border/60 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-muted backdrop-blur-sm leading-relaxed min-w-[120px]">
                  {streamingContent ? (
                    <div
                      className="[&_strong]:font-semibold [&_strong]:text-[color:var(--text-color)] [&_code]:font-mono [&_code]:text-xs [&_code]:bg-base/60 [&_code]:px-1 [&_code]:rounded [&_ul]:list-disc [&_ul]:pl-4 [&_li]:text-sm"
                      dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(streamingContent) }}
                    />
                  ) : (
                    <div className="flex gap-1 items-center py-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Schema-ready CTA */}
              <AnimatePresence>
                {isDone && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-center mt-2"
                  >
                    <button
                      onClick={onComplete}
                      className="flex items-center gap-2 text-sm font-mono text-accent hover:text-accent/70 transition-colors group"
                    >
                      View on canvas
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Custom Node Component
function TableNode({ id, data }: NodeProps) {
  const tableData = data as any;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="bg-surface border border-border rounded-xl shadow-2xl w-80 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-3 border-b border-indigo-500/20 flex items-center justify-between group relative overflow-hidden">
        {/* Subtle top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/50 via-indigo-500/50 to-purple-500/50" />

        <div className="flex items-center gap-2 w-full z-10">
          <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
          <input
            value={tableData.name}
            onChange={(e) => tableData.onUpdateTable(id, { name: e.target.value })}
            onBlur={() => tableData.onPersistSchema()}
            className="bg-transparent font-display font-semibold text-[color:var(--text-color)] focus:outline-none focus:bg-black/20 focus:ring-1 focus:ring-indigo-500/50 rounded px-1 w-full transition-all duration-150"
          />
        </div>
        <button
          onClick={() => tableData.onDeleteTable(id)}
          className="text-indigo-300/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10 ml-2 hover:scale-110 active:scale-95"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Columns */}
      <div className="flex flex-col">
        {tableData.columns.map((col: Column) => (
          <div
            key={col.id}
            className={cn(
              "relative flex items-center gap-2 p-2 border-b border-border/50 group transition-all duration-200",
              col.isPk ? "bg-amber-500/10 hover:bg-amber-500/20" :
              col.isFk ? "bg-blue-500/10 hover:bg-blue-500/20" :
              "hover:bg-white/5"
            )}
          >
            {/* Target Handle for incoming FKs */}
            <Handle
              type="target"
              position={Position.Left}
              id={col.id}
              className={cn("w-3 h-3 !bg-surface border-2 transition-all duration-200", col.isPk ? "!border-amber-500" : "!border-muted")}
            />

            <div className="flex-1 flex items-center gap-2">
              <input
                value={col.name}
                onChange={(e) => tableData.onUpdateColumn(id, col.id, { name: e.target.value })}
                onBlur={() => tableData.onPersistSchema()}
                className={cn(
                  "w-24 bg-transparent font-mono text-xs focus:outline-none focus:bg-black/20 px-1 rounded transition-all duration-150",
                  col.isPk ? "text-amber-500 font-medium" :
                  col.isFk ? "text-blue-500 font-medium" :
                  "text-[color:var(--text-color)]"
                )}
              />
              <select
                value={col.type}
                onChange={(e) => tableData.onColumnChangeAndPersist(id, col.id, { type: e.target.value })}
                className="w-24 bg-transparent font-mono text-[10px] text-muted focus:outline-none focus:bg-base px-1 rounded appearance-none cursor-pointer transition-colors duration-150"
              >
                <option value="INTEGER">INTEGER</option>
                <option value="TEXT">TEXT</option>
                <option value="REAL">REAL</option>
                <option value="BLOB">BLOB</option>
                <option value="BOOLEAN">BOOLEAN</option>
                <option value="DATETIME">DATETIME</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => tableData.onColumnChangeAndPersist(id, col.id, { isPk: !col.isPk })}
                className={cn(
                  "p-1 rounded transition-all duration-200 hover:scale-110 active:scale-95",
                  col.isPk ? "bg-amber-500/20 text-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.3)]" : "text-muted hover:bg-base hover:text-amber-400"
                )}
                title="Primary Key"
              >
                <Key className="h-3 w-3" />
              </button>
              <button
                onClick={() => tableData.onColumnChangeAndPersist(id, col.id, { isFk: !col.isFk })}
                className={cn(
                  "p-1 rounded transition-all duration-200 hover:scale-110 active:scale-95",
                  col.isFk ? "bg-blue-500/20 text-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.3)]" : "text-muted hover:bg-base hover:text-blue-400"
                )}
                title="Foreign Key"
              >
                <LinkIcon className="h-3 w-3" />
              </button>
              <button
                onClick={() => tableData.onDeleteColumn(id, col.id)}
                className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Source Handle for outgoing FKs */}
            <Handle
              type="source"
              position={Position.Right}
              id={col.id}
              className={cn("w-3 h-3 !bg-surface border-2 transition-all duration-200", col.isFk ? "!border-blue-500" : "!border-muted")}
            />
          </div>
        ))}
      </div>

      {/* Add Column */}
      <div className="p-2 bg-base/30">
        <button
          onClick={() => tableData.onAddColumn(id)}
          className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-[color:var(--text-color)] transition-all duration-200 px-2 py-1 rounded hover:bg-white/5 active:scale-95"
        >
          <Plus className="h-3 w-3" /> Add Column
        </button>
      </div>
    </motion.div>
  );
}

const defaultEdgeOptions = {
  type: "smoothstep",
  animated: true,
  style: { stroke: 'url(#fk-pk-gradient)', strokeWidth: 3 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 15,
    height: 15,
    color: '#f59e0b',
  },
  pathOptions: { borderRadius: 24 },
};

// SQLite-compliant Initial Seed Nodes
const initialNodes: Node[] = [
  {
    id: "users",
    type: "tableNode",
    position: { x: 800, y: 50 },
    data: {
      name: "users",
      columns: [
        { id: "u1", name: "id", type: "TEXT", isPk: true, isNullable: false },
        { id: "u2", name: "email", type: "TEXT", isPk: false, isNullable: false },
        { id: "u3", name: "full_name", type: "TEXT", isPk: false, isNullable: true },
        { id: "u4", name: "created_at", type: "DATETIME", isPk: false, isNullable: false },
        { id: "u5", name: "is_active", type: "BOOLEAN", isPk: false, isNullable: false },
      ]
    }
  },
  {
    id: "orders",
    type: "tableNode",
    position: { x: 450, y: 50 },
    data: {
      name: "orders",
      columns: [
        { id: "o1", name: "id", type: "TEXT", isPk: true, isNullable: false },
        { id: "o2", name: "user_id", type: "TEXT", isPk: false, isFk: true, isNullable: false },
        { id: "o3", name: "status", type: "TEXT", isPk: false, isNullable: false },
        { id: "o4", name: "total_amount", type: "REAL", isPk: false, isNullable: false },
        { id: "o5", name: "created_at", type: "DATETIME", isPk: false, isNullable: false },
      ]
    }
  },
  {
    id: "products",
    type: "tableNode",
    position: { x: 450, y: 400 },
    data: {
      name: "products",
      columns: [
        { id: "p1", name: "id", type: "TEXT", isPk: true, isNullable: false },
        { id: "p2", name: "name", type: "TEXT", isPk: false, isNullable: false },
        { id: "p3", name: "category", type: "TEXT", isPk: false, isNullable: false },
        { id: "p4", name: "price", type: "REAL", isPk: false, isNullable: false },
        { id: "p5", name: "stock_qty", type: "INTEGER", isPk: false, isNullable: false },
        { id: "p6", name: "sku", type: "TEXT", isPk: false, isNullable: false },
      ]
    }
  },
  {
    id: "order_items",
    type: "tableNode",
    position: { x: 50, y: 225 },
    data: {
      name: "order_items",
      columns: [
        { id: "oi1", name: "id", type: "TEXT", isPk: true, isNullable: false },
        { id: "oi2", name: "order_id", type: "TEXT", isPk: false, isFk: true, isNullable: false },
        { id: "oi3", name: "product_id", type: "TEXT", isPk: false, isFk: true, isNullable: false },
        { id: "oi4", name: "quantity", type: "INTEGER", isPk: false, isNullable: false },
        { id: "oi5", name: "unit_price", type: "REAL", isPk: false, isNullable: false },
      ]
    }
  }
];

const initialEdges: Edge[] = [
  { id: "e1", source: "orders", sourceHandle: "o2", target: "users", targetHandle: "u1", ...defaultEdgeOptions },
  { id: "e2", source: "order_items", sourceHandle: "oi2", target: "orders", targetHandle: "o1", ...defaultEdgeOptions },
  { id: "e3", source: "order_items", sourceHandle: "oi3", target: "products", targetHandle: "p1", ...defaultEdgeOptions },
];

// Translation: Map ReactFlow nodes and edges to backend SchemaData format
const mapCanvasToSchema = (nds: Node[], eds: Edge[]): SchemaData => {
  const tables = nds.map((node) => {
    const rawCols = (node.data.columns as Column[] | undefined) || [];
    const columns = rawCols.map((col) => ({
      id: col.id,
      name: col.name,
      type: col.type,
      pk: !!col.isPk,
      nullable: col.isNullable !== undefined ? !!col.isNullable : true,
      unique: false,
      default: null,
    }));

    return {
      id: node.id,
      name: node.data.name as string,
      columns,
    };
  });

  const relationships = eds.map((edge) => ({
    id: edge.id,
    from_table: edge.source,
    from_column: edge.sourceHandle || "",
    to_table: edge.target,
    to_column: edge.targetHandle || "",
    type: (edge.data?.type || "many-to-one") as any,
  }));

  return { tables, relationships };
};

// Translation: Map backend SchemaData format to ReactFlow nodes and edges
const mapSchemaToCanvas = (schema: SchemaData, projectId: string): { nds: Node[]; eds: Edge[] } => {
  const savedPositionsStr = localStorage.getItem(`synthos_positions_${projectId}`);
  const savedPositions = savedPositionsStr ? JSON.parse(savedPositionsStr) : {};

  const nds = schema.tables.map((table, index) => {
    const position = savedPositions[table.id] || {
      x: (index % 3) * 350 + 100,
      y: Math.floor(index / 3) * 350 + 100,
    };

    const columns = table.columns.map((col) => {
      // Dynamically determine if this column is a foreign key
      const isFk = schema.relationships.some(
        (rel) => rel.from_table === table.id && rel.from_column === col.id
      );

      return {
        id: col.id,
        name: col.name,
        type: col.type,
        isPk: !!col.pk,
        isFk: isFk,
        isNullable: !!col.nullable,
      };
    });

    return {
      id: table.id,
      type: "tableNode",
      position,
      data: {
        name: table.name,
        columns,
      },
    };
  });

  const eds = schema.relationships.map((rel) => ({
    id: rel.id,
    source: rel.from_table,
    sourceHandle: rel.from_column,
    target: rel.to_table,
    targetHandle: rel.to_column,
    data: { type: rel.type },
    ...defaultEdgeOptions,
  }));

  return { nds, eds };
};

interface Step1SchemaProps {
  onNext: () => void;
  theme: "dark" | "light";
  projectName: string;
  userName: string;
  userId: string;
  projectId: string;
}

export function Step1Schema({ onNext, theme, projectName, userName, userId, projectId }: Step1SchemaProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  // 'detecting' while history check runs, 'centered' for fresh projects, 'sidebar' for returning ones
  const [chatLayout, setChatLayout] = useState<'detecting' | 'centered' | 'sidebar'>('detecting');

  // Persists schema state to FastAPI REST backend
  const persistSchema = useCallback(async (currentNodes: Node[], currentEdges: Edge[]) => {
    try {
      const schemaData = mapCanvasToSchema(currentNodes, currentEdges);
      await synthosApi.updateSchema(projectId, schemaData);
      // SSE stream will push the updated snapshot back automatically
    } catch (err) {
      console.error("Failed to persist schema to backend:", err);
    }
  }, [projectId]);

  // Visual position cache save on drag stop
  const onNodeDragStop = useCallback((event: any, node: Node) => {
    const savedPositionsStr = localStorage.getItem(`synthos_positions_${projectId}`);
    const savedPositions = savedPositionsStr ? JSON.parse(savedPositionsStr) : {};
    savedPositions[node.id] = node.position;
    localStorage.setItem(`synthos_positions_${projectId}`, JSON.stringify(savedPositions));
  }, [projectId]);

  // Determine chat layout from session history
  useEffect(() => {
    let cancelled = false;
    synthosApi.getSessionRuns(projectId)
      .then((runs) => {
        if (cancelled) return;
        const hasHistory = runs.some((r) => r.status === "COMPLETED");
        setChatLayout(hasHistory ? "sidebar" : "centered");
      })
      .catch(() => { if (!cancelled) setChatLayout("centered"); });
    return () => { cancelled = true; };
  }, [projectId]);

  // Initial schema load & SSE Live Sync (no seeding — agent creates the schema for fresh projects)
  useEffect(() => {
    let isMounted = true;

    async function initializeSchema() {
      try {
        const data = await synthosApi.getSchema(projectId);
        if (!isMounted) return;

        if (data.schema_data && data.schema_data.tables.length > 0) {
          const { nds, eds } = mapSchemaToCanvas(data.schema_data, projectId);
          setNodes(nds);
          setEdges(eds);
        }
        // Fresh project: leave canvas empty — agent fills it via the centered chat
      } catch (err) {
        console.error("Failed to load initial schema:", err);
      } finally {
        if (isMounted) setIsLoadingSchema(false);
      }
    }

    initializeSchema();

    // SSE live sync — server pushes a full snapshot on every change
    const es = synthosApi.openSchemaStream(projectId);

    es.onmessage = (e) => {
      if (!isMounted) return;
      try {
        const data = JSON.parse(e.data);
        const { nds, eds } = mapSchemaToCanvas(data.schema_data, projectId);
        setNodes(nds);
        setEdges(eds);
      } catch (err) {
        console.warn("SSE parse error:", err);
      }
    };

    es.onerror = () => {
      // browser auto-reconnects on transient failures
    };

    return () => {
      isMounted = false;
      es.close();
    };
  }, [projectId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => {
        const nextEdges = applyEdgeChanges(changes, eds);
        persistSchema(nodes, nextEdges);
        return nextEdges;
      });
    },
    [nodes, persistSchema]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const nextEdges = addEdge({ 
          ...params, 
          ...defaultEdgeOptions
        }, eds);
        persistSchema(nodes, nextEdges);
        return nextEdges;
      });
    },
    [nodes, persistSchema]
  );

  // Table operations
  const onUpdateTable = useCallback((id: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      })
    );
  }, []);

  const onDeleteTable = useCallback((id: string) => {
    setNodes((nds) => {
      const nextNodes = nds.filter((node) => node.id !== id);
      setEdges((eds) => {
        const nextEdges = eds.filter((edge) => edge.source !== id && edge.target !== id);
        persistSchema(nextNodes, nextEdges);
        return nextEdges;
      });
      return nextNodes;
    });
  }, [persistSchema]);

  const onAddColumn = useCallback((tableId: string) => {
    setNodes((nds) => {
      const nextNodes = nds.map((node) => {
        if (node.id === tableId) {
          const newCol = { id: `c${Date.now()}`, name: "new_column", type: "TEXT", isPk: false, isNullable: true };
          const columns = [...(node.data.columns as Column[]), newCol];
          return { ...node, data: { ...node.data, columns } };
        }
        return node;
      });
      persistSchema(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, persistSchema]);

  const onUpdateColumn = useCallback((tableId: string, colId: string, updates: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === tableId) {
          const columns = (node.data.columns as Column[]).map((col) =>
            col.id === colId ? { ...col, ...updates } : col
          );
          return { ...node, data: { ...node.data, columns } };
        }
        return node;
      })
    );
  }, []);

  // For immediate-commit changes (type select, pk/fk toggles) — updates state and
  // persists in a single functional updater so the persist never sees stale nodes.
  const onColumnChangeAndPersist = useCallback((tableId: string, colId: string, updates: Partial<Column>) => {
    setNodes((nds) => {
      const nextNodes = nds.map((node) => {
        if (node.id === tableId) {
          const columns = (node.data.columns as Column[]).map((col) =>
            col.id === colId ? { ...col, ...updates } : col
          );
          return { ...node, data: { ...node.data, columns } };
        }
        return node;
      });
      persistSchema(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, persistSchema]);

  const onDeleteColumn = useCallback((tableId: string, colId: string) => {
    setNodes((nds) => {
      const nextNodes = nds.map((node) => {
        if (node.id === tableId) {
          const columns = (node.data.columns as Column[]).filter((col) => col.id !== colId);
          return { ...node, data: { ...node.data, columns } };
        }
        return node;
      });
      setEdges((eds) => {
        const nextEdges = eds.filter((edge) => edge.sourceHandle !== colId && edge.targetHandle !== colId);
        persistSchema(nextNodes, nextEdges);
        return nextEdges;
      });
      return nextNodes;
    });
  }, [persistSchema]);

  // Inject callbacks (including manual save triggers) into custom node data
  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onUpdateTable,
        onDeleteTable,
        onAddColumn,
        onUpdateColumn,
        onColumnChangeAndPersist,
        onDeleteColumn,
        onPersistSchema: () => persistSchema(nodes, edges),
      },
    }));
  }, [nodes, edges, onUpdateTable, onDeleteTable, onAddColumn, onUpdateColumn, onColumnChangeAndPersist, onDeleteColumn, persistSchema]);

  const nodeTypes = useMemo(() => ({ tableNode: TableNode }), []);

  const handleAddTable = useCallback(() => {
    const newTableId = `t${Date.now()}`;
    const newNode: Node = {
      id: newTableId,
      type: "tableNode",
      position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 100 },
      data: {
        name: "new_table",
        columns: [{ id: `c${Date.now()}`, name: "id", type: "TEXT", isPk: true, isNullable: false }],
      },
    };
    setNodes((nds) => {
      const nextNodes = [...nds, newNode];
      persistSchema(nextNodes, edges);
      return nextNodes;
    });
  }, [edges, persistSchema]);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Schema loading overlay */}
      <AnimatePresence>
        {isLoadingSchema && (
          <motion.div
            key="schema-loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-50 bg-base flex flex-col items-center justify-center"
          >
            <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
            <p className="text-sm font-mono text-muted animate-pulse">Loading collaborative ER canvas...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Canvas — always rendered so SSE updates appear live during centered chat */}
      <div className="flex-1 relative flex flex-col bg-base">
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <div className="flex items-center gap-2 bg-surface border border-border p-1.5 rounded-lg shadow-lg">
            <Button variant="ghost" size="sm" className="gap-1.5 transition-all duration-150 hover:scale-105 active:scale-95" onClick={handleAddTable}>
              <Plus className="h-3.5 w-3.5" /> Table
            </Button>
          </div>
          <CanvasLegend />
        </div>

        <div className="flex-1 w-full h-full">
          <ReactFlow
            nodes={nodesWithCallbacks}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            colorMode={theme}
            fitView
            className="bg-base"
          >
            <svg style={{ position: "absolute", width: 0, height: 0 }}>
              <defs>
                <linearGradient id="fk-pk-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
            <Background color="#2a2d35" gap={24} size={2} />
            <Controls className="!bg-surface !border-border !fill-white" />
          </ReactFlow>
        </div>
      </div>

      {/* Centered chat overlay — fresh projects only */}
      <AnimatePresence>
        {chatLayout === "centered" && (
          <CenteredChat
            projectId={projectId}
            projectName={projectName}
            onComplete={() => setChatLayout("sidebar")}
          />
        )}
      </AnimatePresence>

      {/* Right sidebar — returning projects or after first agent exchange */}
      <AnimatePresence>
        {chatLayout === "sidebar" && (
          <motion.div
            key="chat-sidebar"
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0 flex self-stretch"
          >
            <ChatSidebar
              title="Synthos"
              projectId={projectId}
              bottomAction={
                <Button variant="primary" className="w-full" onClick={onNext}>
                  Finalize Schema &rarr;
                </Button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
