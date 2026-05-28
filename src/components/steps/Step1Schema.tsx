import { useState, useCallback, useMemo, useEffect, FormEvent } from "react";
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
import { Plus, Trash2, Key, Link as LinkIcon, Send, Sparkles, Database, Loader2 } from "lucide-react";
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

// Custom Node Component
function TableNode({ id, data }: NodeProps) {
  const tableData = data as any;
  
  return (
    <div className="bg-surface border border-border rounded-xl shadow-2xl w-80 flex flex-col overflow-hidden">
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
            className="bg-transparent font-display font-semibold text-[color:var(--text-color)] focus:outline-none focus:bg-black/20 focus:ring-1 focus:ring-indigo-500/50 rounded px-1 w-full transition-colors"
          />
        </div>
        <button
          onClick={() => tableData.onDeleteTable(id)}
          className="text-indigo-300/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity z-10 ml-2"
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
              "relative flex items-center gap-2 p-2 border-b border-border/50 group transition-colors",
              col.isPk ? "bg-amber-500/10 hover:bg-amber-500/20" : 
              col.isFk ? "bg-blue-500/10 hover:bg-blue-500/20" : 
              "hover:bg-surface-hover/50"
            )}
          >
            {/* Target Handle for incoming FKs */}
            <Handle
              type="target"
              position={Position.Left}
              id={col.id}
              className={cn("w-3 h-3 !bg-surface border-2", col.isPk ? "!border-amber-500" : "!border-muted")}
            />
            
            <div className="flex-1 flex items-center gap-2">
              <input
                value={col.name}
                onChange={(e) => tableData.onUpdateColumn(id, col.id, { name: e.target.value })}
                onBlur={() => tableData.onPersistSchema()}
                className={cn(
                  "w-24 bg-transparent font-mono text-xs focus:outline-none focus:bg-black/20 px-1 rounded transition-colors",
                  col.isPk ? "text-amber-500 font-medium" : 
                  col.isFk ? "text-blue-500 font-medium" : 
                  "text-[color:var(--text-color)]"
                )}
              />
              <select
                value={col.type}
                onChange={(e) => tableData.onColumnChangeAndPersist(id, col.id, { type: e.target.value })}
                className="w-24 bg-transparent font-mono text-[10px] text-muted focus:outline-none focus:bg-base px-1 rounded appearance-none cursor-pointer"
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
                className={cn("p-1 rounded", col.isPk ? "bg-amber-500/20 text-amber-500" : "text-muted hover:bg-base")}
                title="Primary Key"
              >
                <Key className="h-3 w-3" />
              </button>
              <button
                onClick={() => tableData.onColumnChangeAndPersist(id, col.id, { isFk: !col.isFk })}
                className={cn("p-1 rounded", col.isFk ? "bg-blue-500/20 text-blue-500" : "text-muted hover:bg-base")}
                title="Foreign Key"
              >
                <LinkIcon className="h-3 w-3" />
              </button>
              <button
                onClick={() => tableData.onDeleteColumn(id, col.id)}
                className="p-1 rounded text-muted hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Source Handle for outgoing FKs */}
            <Handle
              type="source"
              position={Position.Right}
              id={col.id}
              className={cn("w-3 h-3 !bg-surface border-2", col.isFk ? "!border-blue-500" : "!border-muted")}
            />
          </div>
        ))}
      </div>

      {/* Add Column */}
      <div className="p-2 bg-base/30">
        <button
          onClick={() => tableData.onAddColumn(id)}
          className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-[color:var(--text-color)] transition-colors px-2 py-1"
        >
          <Plus className="h-3 w-3" /> Add Column
        </button>
      </div>
    </div>
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
  const [phase, setPhase] = useState<'gathering' | 'designing'>('designing');
  const [inputText, setInputText] = useState("");
  const [turnCount, setTurnCount] = useState(0);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);

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

  // Initial Seed & SSE Live Sync
  useEffect(() => {
    let isMounted = true;

    async function initializeSchema() {
      try {
        const data = await synthosApi.getSchema(projectId);
        if (!isMounted) return;

        if (data.schema_data && (data.schema_data.tables.length > 0 || data.schema_data.relationships.length > 0)) {
          const { nds, eds } = mapSchemaToCanvas(data.schema_data, projectId);
          setNodes(nds);
          setEdges(eds);
        } else {
          // Seed empty project with a default e-commerce layout
          const defaultSchema = mapCanvasToSchema(initialNodes, initialEdges);
          await synthosApi.updateSchema(projectId, defaultSchema);
          if (!isMounted) return;
          setNodes(initialNodes);
          setEdges(initialEdges);
        }
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

  const handleSendMessage = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { role: "user", content: inputText };
    setChatMessages(prev => [...prev, userMsg]);
    setInputText("");
    setTurnCount(prev => prev + 1);
    setIsAiTyping(true);

    // Mock/Simulated AI interaction (Phase 1 wiring readiness)
    setTimeout(() => {
      const responses = [
        "That sounds like a solid start for $PROJECT. What specific entities or tables should we prioritize first?",
        "I've noted that. Should we also include auditing fields like created_at and updated_at for these tables?",
        "Perfect. I have enough information to generate the first version of the schema. Let's see the diagram!"
      ];
      
      const aiMsg = { 
        role: "ai", 
        content: responses[turnCount] || "Understood. The schema is being refined based on your requirements."
      }.content.replace('$PROJECT', projectName);

      setChatMessages(prev => [...prev, { role: "ai", content: aiMsg }]);
      setIsAiTyping(false);

      if (turnCount >= 2) {
        setTimeout(() => {
          setPhase('designing');
        }, 1500);
      }
    }, 1000);
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative">
      {isLoadingSchema ? (
        <div className="absolute inset-0 z-50 bg-base flex flex-col items-center justify-center">
          <Loader2 className="h-10 w-10 text-accent animate-spin mb-4" />
          <p className="text-sm font-mono text-muted animate-pulse">Loading collaborative ER canvas...</p>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {phase === 'gathering' ? (
          <motion.div 
            key="gathering"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col items-center justify-center p-6 bg-base relative overflow-hidden"
          >
            {/* Background decorative elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

            <div className={cn(
              "max-w-2xl w-full flex flex-col gap-8 z-10 transition-all duration-500",
              turnCount > 0 ? "h-full justify-end pb-8" : ""
            )}>
              <AnimatePresence>
                {turnCount === 0 && (
                  <motion.div 
                    initial={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    className="text-center overflow-hidden"
                  >
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-full text-xs font-mono text-muted mb-6">
                      <Sparkles className="h-3 w-3 text-accent" />
                      Step 1: Requirement Gathering
                    </div>
                    <h1 className="font-display text-4xl font-bold tracking-tight mb-4">
                      What kind of data are we generating for <span className="text-accent">{projectName}</span>?
                    </h1>
                    <p className="text-muted text-lg max-w-lg mx-auto">
                      Describe your schema, tables, or industry, and Synthos will design the ER diagram.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat output */}
              <div className={cn(
                "flex flex-col gap-4 overflow-y-auto mb-4 px-2 custom-scrollbar transition-all duration-500",
                turnCount > 0 ? "flex-1 max-h-none" : "max-h-[40vh]"
              )}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "flex flex-col gap-1 max-w-[85%]",
                    msg.role === "user" ? "ml-auto items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-3 rounded-2xl text-sm",
                      msg.role === "user" 
                        ? "bg-accent text-accent-fg" 
                        : "bg-surface border border-border text-[color:var(--text-color)]"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex items-center gap-2 p-3 bg-surface border border-border rounded-2xl text-sm w-fit animate-pulse">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-muted rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-muted rounded-full animate-bounce delay-75" />
                      <div className="w-1 h-1 bg-muted rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <form onSubmit={handleSendMessage} className="relative group">
                  <input
                    autoFocus
                    disabled={isAiTyping || phase === 'designing'}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="e.g. A library management system with books, authors, and loans..."
                    className="w-full bg-surface border-2 border-border rounded-2xl px-6 py-5 text-lg shadow-xl focus:outline-none focus:border-accent transition-all placeholder:text-muted/50 pr-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted mr-2 hidden sm:block">Press Enter</span>
                    <Button 
                      type="submit" 
                      variant="primary" 
                      size="icon" 
                      disabled={isAiTyping || !inputText.trim() || phase === 'designing'}
                      className="h-12 w-12 rounded-xl group-hover:scale-105 transition-transform shadow-lg"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                </form>

                <div className="flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 text-xs text-muted font-mono">
                    <Database className="h-4 w-4" /> Relational
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted font-mono">
                    <Sparkles className="h-4 w-4" /> AI Designed
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted font-mono">
                    <div className="h-2 w-2 rounded-full bg-green-500" /> Turner {turnCount}/3
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="designing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex h-full w-full overflow-hidden"
          >
            {/* Left Panel - Canvas */}
            <div className="flex-1 relative flex flex-col bg-base">
              {/* Toolbar */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-surface border border-border p-1.5 rounded-lg shadow-lg">
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleAddTable}>
                  <Plus className="h-3.5 w-3.5" /> Table
                </Button>
              </div>

              {/* React Flow Container */}
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
                  <svg style={{ position: 'absolute', width: 0, height: 0 }}>
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

            {/* Right Panel - Chat */}
            <ChatSidebar 
              title="Synthos"
              messages={chatMessages}
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
