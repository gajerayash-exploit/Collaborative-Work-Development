import { useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow, Background, Controls, MiniMap,
  addEdge, useNodesState, useEdgesState,
  Handle, Position, BaseEdge, getStraightPath,
  type Node, type Edge, type NodeProps, type EdgeProps, type Connection,
  useReactFlow, ReactFlowProvider,
  getBezierPath,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus, Lock, Download, Zap, ChevronLeft, ChevronRight,
  GitBranch, Target, Layers, Code2, RefreshCw, Trash2,
  Pencil, X, Check, AlertTriangle,
} from "lucide-react";

const VIOLET = "#8B5CF6";
const VIOLET_DIM = "rgba(139,92,246,0.3)";
const CANVAS_BG = "#050208";

const CATEGORY_COLORS: Record<string, string> = {
  functional: "#6366f1",
  database:   "#22c55e",
  auth:       "#f59e0b",
  api:        "#3b82f6",
  constraint: "#ef4444",
  ui:         "#ec4899",
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high:     "#f59e0b",
  medium:   "#6366f1",
  low:      "#22c55e",
};

type SRSNodeData = {
  title: string;
  description: string;
  category: keyof typeof CATEGORY_COLORS;
  priority: keyof typeof PRIORITY_COLORS;
  locked: boolean;
  onLock?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  neoMode?: boolean;
};

function SRSNodeComponent({ data, id, selected }: NodeProps) {
  const d = data as SRSNodeData;
  const neo = d.neoMode;
  const catColor = CATEGORY_COLORS[d.category] ?? VIOLET;

  if (neo) {
    return (
      <div
        className="relative"
        style={{
          width: 220,
          background: "#fff",
          border: `3px solid #000`,
          boxShadow: selected ? "8px 8px 0 #000" : "4px 4px 0 #000",
          fontFamily: "monospace",
          transition: "box-shadow 0.15s",
        }}
      >
        <Handle type="target" position={Position.Top} style={{ background: "#000", border: "2px solid #000" }} />
        <div style={{ background: "#000", color: "#fff", padding: "4px 10px", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1 }}>
          {d.category} · {d.priority}
        </div>
        <div style={{ padding: "10px 12px" }}>
          {d.locked && <span style={{ color: "#000", fontWeight: 900, fontSize: 10 }}>🔒 LOCKED  </span>}
          <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 4, color: "#000" }}>{d.title}</div>
          {d.description && <div style={{ fontSize: 11, color: "#444", lineHeight: 1.4 }}>{d.description}</div>}
        </div>
        <div style={{ display: "flex", gap: 4, padding: "4px 8px 8px", justifyContent: "flex-end" }}>
          <button
            onClick={(e) => { e.stopPropagation(); d.onEdit?.(id); }}
            style={{ border: "2px solid #000", background: "#8B5CF6", color: "#fff", cursor: "pointer", padding: "2px 8px", fontSize: 10, fontWeight: 700 }}
          >EDIT</button>
          {!d.locked && (
            <button onClick={(e) => { e.stopPropagation(); d.onLock?.(id); }} style={{ border: "2px solid #000", background: "transparent", cursor: "pointer", padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>LOCK</button>
          )}
          {d.locked && (
            <button onClick={(e) => { e.stopPropagation(); d.onLock?.(id); }} style={{ border: "2px solid #000", background: "#000", color: "#fff", cursor: "pointer", padding: "2px 6px", fontSize: 10, fontWeight: 700 }}>UNLOCK</button>
          )}
          <button onClick={(e) => { e.stopPropagation(); d.onDelete?.(id); }} style={{ border: "2px solid #ef4444", background: "transparent", cursor: "pointer", padding: "2px 6px", fontSize: 10, fontWeight: 700, color: "#ef4444" }}>DEL</button>
        </div>
        <Handle type="source" position={Position.Bottom} style={{ background: "#000", border: "2px solid #000" }} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      style={{
        width: 230,
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(12px)",
        border: selected ? `1.5px solid ${catColor}` : `1px solid ${VIOLET_DIM}`,
        borderRadius: 12,
        boxShadow: selected
          ? `0 0 20px ${catColor}66, 0 0 40px ${catColor}33`
          : `0 0 8px rgba(139,92,246,0.1)`,
        transition: "box-shadow 0.2s, border 0.2s",
        overflow: "hidden",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: VIOLET, border: `2px solid ${VIOLET}`, width: 10, height: 10 }}
      />
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
        borderBottom: `1px solid rgba(139,92,246,0.15)`,
        background: `linear-gradient(135deg, ${catColor}22, transparent)`,
      }}>
        <span style={{
          display: "inline-block", width: 8, height: 8, borderRadius: "50%",
          background: catColor, boxShadow: `0 0 6px ${catColor}`,
        }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: catColor, textTransform: "uppercase", letterSpacing: 1 }}>
          {d.category}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 9, fontWeight: 600, color: PRIORITY_COLORS[d.priority], textTransform: "uppercase" }}>
          {d.priority}
        </span>
        {d.locked && <Lock style={{ width: 10, height: 10, color: "#f59e0b" }} />}
      </div>
      {/* Body */}
      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: "#fff", marginBottom: 4, lineHeight: 1.3 }}>{d.title}</div>
        {d.description && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>{d.description}</div>
        )}
      </div>
      {/* Actions */}
      <div style={{ display: "flex", gap: 4, padding: "4px 10px 8px", justifyContent: "flex-end" }}>
        <button
          onClick={(e) => { e.stopPropagation(); d.onEdit?.(id); }}
          style={{ background: `${VIOLET}22`, border: `1px solid ${VIOLET}55`, borderRadius: 4, cursor: "pointer", padding: "2px 7px", fontSize: 9, color: VIOLET, display: "flex", alignItems: "center", gap: 3 }}
        >
          <Pencil size={8} /> Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); d.onLock?.(id); }}
          style={{ background: "transparent", border: `1px solid ${VIOLET_DIM}`, borderRadius: 4, cursor: "pointer", padding: "2px 7px", fontSize: 9, color: "rgba(255,255,255,0.5)" }}
        >
          {d.locked ? "Unlock" : "Lock"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); d.onDelete?.(id); }}
          style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 4, cursor: "pointer", padding: "2px 7px", fontSize: 9, color: "rgba(239,68,68,0.7)" }}
        >
          Del
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: VIOLET, border: `2px solid ${VIOLET}`, width: 10, height: 10 }}
      />
    </motion.div>
  );
}

function PulseEdge({ id, sourceX, sourceY, targetX, targetY, selected }: EdgeProps) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });
  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: VIOLET_DIM, strokeWidth: 1.5 }} />
      <path
        d={edgePath}
        fill="none"
        stroke={selected ? VIOLET : "rgba(139,92,246,0.6)"}
        strokeWidth={selected ? 2 : 1.5}
        strokeDasharray="8 16"
        style={{
          animation: "srs-dash 2s linear infinite",
          filter: selected ? `drop-shadow(0 0 6px ${VIOLET})` : undefined,
        }}
      />
    </>
  );
}

const NODE_TYPES = { srsNode: SRSNodeComponent };
const EDGE_TYPES = { pulseEdge: PulseEdge };

const DEFAULT_NODES: Node[] = [
  { id: "n1", type: "srsNode", position: { x: 80,  y: 80  }, data: { title: "User Authentication", description: "JWT + OAuth2 via Clerk. Session management with refresh tokens.", category: "auth", priority: "critical", locked: false } },
  { id: "n2", type: "srsNode", position: { x: 380, y: 60  }, data: { title: "Workspace API",       description: "RESTful endpoints for CRUD workspace operations. Rate-limited.", category: "api",        priority: "high",     locked: false } },
  { id: "n3", type: "srsNode", position: { x: 640, y: 80  }, data: { title: "PostgreSQL Schema",   description: "Drizzle ORM migrations. Relational data model with FK constraints.", category: "database",  priority: "critical", locked: true  } },
  { id: "n4", type: "srsNode", position: { x: 80,  y: 320 }, data: { title: "Role-based Access",   description: "Admin / Editor / Viewer permissions enforced server-side.", category: "constraint", priority: "high",     locked: false } },
  { id: "n5", type: "srsNode", position: { x: 380, y: 310 }, data: { title: "Real-time Chat",      description: "Polling + optimistic updates. Activity feed with timestamps.", category: "functional", priority: "medium",   locked: false } },
  { id: "n6", type: "srsNode", position: { x: 640, y: 310 }, data: { title: "Dashboard UI",        description: "Kanban board, analytics charts, file manager. Responsive.", category: "ui",         priority: "medium",   locked: false } },
];

const DEFAULT_EDGES: Edge[] = [
  { id: "e1", source: "n1", target: "n2", type: "pulseEdge" },
  { id: "e2", source: "n2", target: "n3", type: "pulseEdge" },
  { id: "e3", source: "n1", target: "n4", type: "pulseEdge" },
  { id: "e4", source: "n4", target: "n5", type: "pulseEdge" },
  { id: "e5", source: "n2", target: "n5", type: "pulseEdge" },
  { id: "e6", source: "n5", target: "n6", type: "pulseEdge" },
  { id: "e7", source: "n3", target: "n6", type: "pulseEdge" },
];

const RADAR_DATA = [
  { subject: "Documentation", value: 78 },
  { subject: "Code Coverage", value: 62 },
  { subject: "Security",      value: 91 },
  { subject: "Performance",   value: 74 },
  { subject: "Accessibility", value: 55 },
  { subject: "Testing",       value: 48 },
];

function SunburstChart() {
  const cx = 110, cy = 110, rings = [
    { label: "Core",    r1: 20, r2: 46, segments: [{ label: "Auth", color: "#f59e0b", pct: 1 }] },
    { label: "Modules", r1: 50, r2: 76, segments: [
      { label: "API",   color: "#3b82f6", pct: 0.35 },
      { label: "DB",    color: "#22c55e", pct: 0.25 },
      { label: "UI",    color: "#ec4899", pct: 0.25 },
      { label: "RBAC",  color: "#ef4444", pct: 0.15 },
    ]},
    { label: "Funcs",   r1: 80, r2: 108, segments: [
      { label: "Login",   color: "#f59e0b88", pct: 0.15 },
      { label: "Session", color: "#f59e0b55", pct: 0.12 },
      { label: "Users",   color: "#3b82f688", pct: 0.13 },
      { label: "Routes",  color: "#3b82f655", pct: 0.12 },
      { label: "Schema",  color: "#22c55e88", pct: 0.12 },
      { label: "Migrate", color: "#22c55e55", pct: 0.10 },
      { label: "Board",   color: "#ec4899aa", pct: 0.14 },
      { label: "Chat",    color: "#ec489966", pct: 0.12 },
    ]},
  ];

  function arcPath(cx: number, cy: number, r1: number, r2: number, startAngle: number, endAngle: number) {
    const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
    const s1 = toRad(startAngle), e1 = toRad(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${cx + r1 * Math.cos(s1)} ${cy + r1 * Math.sin(s1)}`,
      `A ${r1} ${r1} 0 ${large} 1 ${cx + r1 * Math.cos(e1)} ${cy + r1 * Math.sin(e1)}`,
      `L ${cx + r2 * Math.cos(e1)} ${cy + r2 * Math.sin(e1)}`,
      `A ${r2} ${r2} 0 ${large} 0 ${cx + r2 * Math.cos(s1)} ${cy + r2 * Math.sin(s1)}`,
      "Z",
    ].join(" ");
  }

  return (
    <svg width={220} height={220} viewBox="0 0 220 220">
      <circle cx={cx} cy={cy} r={18} fill={VIOLET} opacity={0.9} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={8} fill="#fff" fontWeight={700}>CORE</text>
      {rings.map((ring) => {
        let start = 0;
        return ring.segments.map((seg, i) => {
          const sweep = seg.pct * 360 - 1;
          const path = arcPath(cx, cy, ring.r1, ring.r2, start, start + sweep);
          const mid = start + sweep / 2;
          const toRad = (a: number) => ((a - 90) * Math.PI) / 180;
          const lr = (ring.r1 + ring.r2) / 2;
          const lx = cx + lr * Math.cos(toRad(mid));
          const ly = cy + lr * Math.sin(toRad(mid));
          start += seg.pct * 360;
          return (
            <g key={i}>
              <path d={path} fill={seg.color} stroke="#050208" strokeWidth={1.5} />
              {seg.pct > 0.12 && (
                <text x={lx} y={ly + 3} textAnchor="middle" fontSize={6} fill="#fff" fontWeight={600}>{seg.label}</text>
              )}
            </g>
          );
        });
      })}
    </svg>
  );
}

function parseMermaid(input: string): { nodes: Node[]; edges: Edge[] } {
  const lines = input.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("graph") && !l.startsWith("flowchart"));
  const nodeMap = new Map<string, string>();
  const edgeList: { from: string; to: string }[] = [];
  for (const line of lines) {
    const match = line.match(/([A-Za-z0-9_]+)(?:\[([^\]]+)\])?\s*--?>?\s*([A-Za-z0-9_]+)(?:\[([^\]]+)\])?/);
    if (match) {
      const [, fromId, fromLabel, toId, toLabel] = match;
      nodeMap.set(fromId, fromLabel || fromId);
      nodeMap.set(toId, toLabel || toId);
      edgeList.push({ from: fromId, to: toId });
    }
  }
  const nodeArr = Array.from(nodeMap.entries());
  const cols = Math.ceil(Math.sqrt(nodeArr.length)) || 1;
  const nodes: Node[] = nodeArr.map(([id, label], i) => ({
    id,
    type: "srsNode",
    position: { x: 80 + (i % cols) * 280, y: 80 + Math.floor(i / cols) * 220 },
    data: { title: label, description: "", category: "functional", priority: "medium", locked: false },
  }));
  const edges: Edge[] = edgeList.map((e, i) => ({
    id: `me-${i}`,
    source: e.from,
    target: e.to,
    type: "pulseEdge",
  }));
  return { nodes, edges };
}

let nodeCounter = DEFAULT_NODES.length + 1;
function newId() { return `n${++nodeCounter}`; }

const CATEGORIES = ["functional", "database", "auth", "api", "constraint", "ui"] as const;

function SRSInner({ workspaceId, role }: { workspaceId: string; role: string }) {
  const storageKey = `srs-${workspaceId}`;

  const loadNodes = (): Node[] => {
    try {
      const s = localStorage.getItem(storageKey + "-nodes");
      return s ? JSON.parse(s) : DEFAULT_NODES;
    } catch { return DEFAULT_NODES; }
  };
  const loadEdges = (): Edge[] => {
    try {
      const s = localStorage.getItem(storageKey + "-edges");
      return s ? JSON.parse(s) : DEFAULT_EDGES;
    } catch { return DEFAULT_EDGES; }
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(loadNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(loadEdges());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState<"galaxy" | "radar" | "sunburst">("galaxy");
  const [neo, setNeo] = useState(false);
  const [mermaid, setMermaid] = useState("graph TD;\nLogin-->Auth;\nAuth-->DB;\nDB-->API;\nAPI-->UI;");
  const [mounted, setMounted] = useState(false);
  const { fitView } = useReactFlow();

  type EditDraft = { title: string; description: string; category: string; priority: string; locked: boolean };
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);

  const openEdit = useCallback((id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const d = node.data as SRSNodeData;
    setEditDraft({ title: d.title, description: d.description, category: d.category, priority: d.priority, locked: d.locked });
    setEditingNodeId(id);
  }, [nodes]);

  const commitEdit = useCallback(() => {
    if (!editingNodeId || !editDraft) return;
    setNodes(ns => ns.map(n => n.id === editingNodeId ? { ...n, data: { ...n.data, ...editDraft } } : n));
    setEditingNodeId(null);
    setEditDraft(null);
  }, [editingNodeId, editDraft, setNodes]);

  const cancelEdit = useCallback(() => {
    setEditingNodeId(null);
    setEditDraft(null);
  }, []);

  const isAdmin = role === "admin";

  useEffect(() => {
    setMounted(true);
    setTimeout(() => fitView({ duration: 600, padding: 0.15 }), 200);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey + "-nodes", JSON.stringify(nodes.map(n => ({ ...n, data: { ...n.data, onLock: undefined, onDelete: undefined, neoMode: undefined } }))));
      localStorage.setItem(storageKey + "-edges", JSON.stringify(edges));
    } catch {}
  }, [nodes, edges]);

  const toggleLock = useCallback((id: string) => {
    if (!isAdmin) return;
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, locked: !n.data.locked } } : n));
  }, [isAdmin, setNodes]);

  const deleteNode = useCallback((id: string) => {
    if (!isAdmin) return;
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
  }, [isAdmin, setNodes, setEdges]);

  const enrichedNodes = nodes.map(n => ({
    ...n,
    data: { ...n.data, onLock: toggleLock, onDelete: deleteNode, onEdit: openEdit, neoMode: neo },
    draggable: !(n.data as SRSNodeData).locked,
  }));

  const onConnect = useCallback((c: Connection) => {
    setEdges(es => addEdge({ ...c, type: "pulseEdge", id: `e-${Date.now()}` }, es));
  }, [setEdges]);

  const addNode = () => {
    const id = newId();
    setNodes(ns => [...ns, {
      id,
      type: "srsNode",
      position: { x: 150 + Math.random() * 400, y: 150 + Math.random() * 300 },
      data: { title: "New Requirement", description: "Click to edit...", category: "functional", priority: "medium", locked: false },
    }]);
  };

  const applyMermaid = () => {
    const { nodes: mn, edges: me } = parseMermaid(mermaid);
    setNodes(mn);
    setEdges(me);
    setMode("galaxy");
    setTimeout(() => fitView({ duration: 500, padding: 0.2 }), 100);
  };

  const exportCanvas = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `srs-${workspaceId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bgStyle = neo
    ? { background: "#fff" }
    : { background: CANVAS_BG };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: "100%", height: "100%", display: "flex", position: "relative" }}
    >
      {/* Pulse animation */}
      <style>{`
        @keyframes srs-dash { to { stroke-dashoffset: -24; } }
        .react-flow__minimap { border-radius: 8px; overflow: hidden; }
        .react-flow__controls button { background: rgba(139,92,246,0.15) !important; border-color: rgba(139,92,246,0.3) !important; color: #8B5CF6 !important; }
        .react-flow__controls button:hover { background: rgba(139,92,246,0.3) !important; }
      `}</style>

      {/* ───── Sidebar ───── */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            key="sidebar"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{
              flexShrink: 0, overflow: "hidden", borderRight: neo ? "3px solid #000" : `1px solid ${VIOLET_DIM}`,
              background: neo ? "#f5f5f5" : "rgba(5,2,8,0.97)",
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "12px 14px", borderBottom: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`, flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
                SRS Engine
              </div>
              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 4 }}>
                {([["galaxy", GitBranch], ["radar", Target], ["sunburst", Layers]] as const).map(([m, Icon]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m as typeof mode)}
                    title={m.charAt(0).toUpperCase() + m.slice(1)}
                    style={{
                      flex: 1, padding: "5px 0", border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                      background: mode === m ? (neo ? "#000" : VIOLET) : "transparent",
                      color: mode === m ? "#fff" : (neo ? "#000" : "rgba(255,255,255,0.5)"),
                      borderRadius: neo ? 0 : 6, cursor: "pointer", display: "flex", justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              {mode === "galaxy" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Mermaid Engine
                  </div>
                  <Textarea
                    value={mermaid}
                    onChange={e => setMermaid(e.target.value)}
                    rows={7}
                    style={{
                      fontFamily: "monospace", fontSize: 11, resize: "none",
                      background: neo ? "#fff" : "rgba(139,92,246,0.05)",
                      border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                      color: neo ? "#000" : "#a78bfa", borderRadius: neo ? 0 : 6,
                    }}
                  />
                  <button
                    onClick={applyMermaid}
                    style={{
                      marginTop: 8, width: "100%", padding: "7px 0",
                      background: neo ? "#000" : VIOLET,
                      color: "#fff", border: "none", borderRadius: neo ? 0 : 6,
                      fontWeight: 700, fontSize: 11, cursor: "pointer",
                      letterSpacing: 0.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    }}
                  >
                    <Zap size={11} /> Apply Graph
                  </button>

                  <div style={{ marginTop: 16, fontSize: 10, color: neo ? "#555" : "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
                    Syntax: <code style={{ color: neo ? "#000" : "#a78bfa" }}>A[Label] --&gt; B</code><br />
                    Supports <code style={{ color: neo ? "#000" : "#a78bfa" }}>graph TD</code> / <code style={{ color: neo ? "#000" : "#a78bfa" }}>flowchart LR</code>
                  </div>

                  {/* Legend */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Categories</div>
                    {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: neo ? "none" : `0 0 4px ${color}`, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: neo ? "#333" : "rgba(255,255,255,0.5)", textTransform: "capitalize" }}>{cat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === "radar" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                    Project Health Radar
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke={neo ? "#ccc" : "rgba(139,92,246,0.2)"} />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: neo ? "#333" : "rgba(255,255,255,0.5)" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Score" dataKey="value" stroke={VIOLET} fill={VIOLET} fillOpacity={0.25} strokeWidth={1.5} />
                      <Tooltip
                        contentStyle={{ background: neo ? "#fff" : "#0d0a14", border: `1px solid ${VIOLET_DIM}`, borderRadius: 6, fontSize: 11 }}
                        formatter={(v: number) => [`${v}%`, "Score"]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 8 }}>
                    {RADAR_DATA.map(d => (
                      <div key={d.subject} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                        <div style={{ flex: 1, height: 3, background: neo ? "#eee" : "rgba(139,92,246,0.15)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${d.value}%`, height: "100%", background: VIOLET, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 9, color: neo ? "#555" : "rgba(255,255,255,0.4)", width: 26, textAlign: "right" }}>{d.value}%</span>
                        <span style={{ fontSize: 9, color: neo ? "#000" : "rgba(255,255,255,0.6)", width: 80 }}>{d.subject}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === "sunburst" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                    Module Hierarchy
                  </div>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <SunburstChart />
                  </div>
                  <div style={{ marginTop: 10, fontSize: 9, color: neo ? "#555" : "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.6 }}>
                    Rings: Core → Modules → Functions<br />
                    Hover segments in the graph to explore hierarchy
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar toggle tab */}
      <button
        onClick={() => setSidebarOpen(o => !o)}
        style={{
          position: "absolute", left: sidebarOpen ? 248 : 0, top: "50%", transform: "translateY(-50%)",
          zIndex: 20, background: neo ? "#000" : VIOLET,
          border: "none", color: "#fff", cursor: "pointer",
          padding: "10px 3px", borderRadius: "0 6px 6px 0",
          display: "flex", alignItems: "center", transition: "left 0.25s",
        }}
      >
        {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
      </button>

      {/* ───── Node Editor Panel ───── */}
      <AnimatePresence>
        {editingNodeId && editDraft && (
          <>
            {/* Backdrop */}
            <motion.div
              key="editor-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={cancelEdit}
              style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(0,0,0,0.25)" }}
            />
            {/* Panel */}
            <motion.div
              key="editor-panel"
              initial={{ x: 320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 320, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: 300, zIndex: 31,
                background: neo ? "#f5f5f5" : "rgba(10,7,18,0.97)",
                borderLeft: neo ? "3px solid #000" : `1px solid ${VIOLET_DIM}`,
                display: "flex", flexDirection: "column",
                backdropFilter: "blur(16px)",
                boxShadow: neo ? "-6px 0 0 #000" : `-8px 0 32px rgba(0,0,0,0.5)`,
              }}
            >
              {/* Header */}
              <div style={{
                padding: "14px 16px 12px",
                borderBottom: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1.5 }}>
                    Edit Requirement
                  </div>
                  <div style={{ fontSize: 9, color: neo ? "#666" : "rgba(255,255,255,0.3)", marginTop: 2, fontFamily: "monospace" }}>
                    id: {editingNodeId}
                  </div>
                </div>
                <button onClick={cancelEdit} style={{ background: "transparent", border: "none", cursor: "pointer", color: neo ? "#000" : "rgba(255,255,255,0.4)", padding: 4 }}>
                  <X size={15} />
                </button>
              </div>

              {/* Fields */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
                {/* Locked warning */}
                {editDraft.locked && !isAdmin && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 6, marginBottom: 14 }}>
                    <AlertTriangle size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: "#f59e0b" }}>Node is locked — view only</span>
                  </div>
                )}

                {/* Title */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    Title
                  </label>
                  <Input
                    value={editDraft.title}
                    onChange={e => setEditDraft(d => d ? { ...d, title: e.target.value } : d)}
                    disabled={editDraft.locked && !isAdmin}
                    style={{
                      background: neo ? "#fff" : "rgba(139,92,246,0.06)",
                      border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                      color: neo ? "#000" : "#fff",
                      borderRadius: neo ? 2 : 6, fontSize: 12,
                    }}
                  />
                </div>

                {/* Description */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    Description
                  </label>
                  <Textarea
                    value={editDraft.description}
                    onChange={e => setEditDraft(d => d ? { ...d, description: e.target.value } : d)}
                    disabled={editDraft.locked && !isAdmin}
                    rows={4}
                    style={{
                      fontFamily: "inherit", fontSize: 11, resize: "none",
                      background: neo ? "#fff" : "rgba(139,92,246,0.06)",
                      border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                      color: neo ? "#000" : "rgba(255,255,255,0.8)",
                      borderRadius: neo ? 2 : 6,
                    }}
                  />
                </div>

                {/* Category */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Category
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
                      const active = editDraft.category === cat;
                      return (
                        <button
                          key={cat}
                          disabled={editDraft.locked && !isAdmin}
                          onClick={() => setEditDraft(d => d ? { ...d, category: cat } : d)}
                          style={{
                            padding: "4px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer",
                            textTransform: "capitalize", letterSpacing: 0.5,
                            background: active ? (neo ? "#000" : color) : (neo ? "#fff" : "transparent"),
                            color: active ? "#fff" : (neo ? "#333" : "rgba(255,255,255,0.5)"),
                            border: neo ? `2px solid ${active ? "#000" : "#ccc"}` : `1px solid ${active ? color : VIOLET_DIM}`,
                            borderRadius: neo ? 2 : 20,
                            boxShadow: active && !neo ? `0 0 8px ${color}66` : "none",
                            transition: "all 0.12s",
                          }}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Priority
                  </label>
                  <div style={{ display: "flex", gap: 5 }}>
                    {(["critical", "high", "medium", "low"] as const).map(p => {
                      const active = editDraft.priority === p;
                      const color = PRIORITY_COLORS[p];
                      return (
                        <button
                          key={p}
                          disabled={editDraft.locked && !isAdmin}
                          onClick={() => setEditDraft(d => d ? { ...d, priority: p } : d)}
                          style={{
                            flex: 1, padding: "5px 0", fontSize: 9, fontWeight: 700, cursor: "pointer",
                            textTransform: "capitalize",
                            background: active ? (neo ? "#000" : color) : (neo ? "#fff" : "transparent"),
                            color: active ? "#fff" : (neo ? "#555" : "rgba(255,255,255,0.4)"),
                            border: neo ? `2px solid ${active ? "#000" : "#ccc"}` : `1px solid ${active ? color : VIOLET_DIM}`,
                            borderRadius: neo ? 2 : 6,
                            boxShadow: active && !neo ? `0 0 8px ${color}55` : "none",
                            transition: "all 0.12s",
                          }}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div style={{
                padding: "12px 16px",
                borderTop: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                display: "flex", gap: 8, flexShrink: 0,
              }}>
                <button
                  onClick={commitEdit}
                  disabled={!!(editDraft.locked && !isAdmin)}
                  style={{
                    flex: 1, padding: "8px 0",
                    background: neo ? "#000" : VIOLET,
                    color: "#fff", border: "none", borderRadius: neo ? 2 : 7,
                    fontWeight: 700, fontSize: 11, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    opacity: editDraft.locked && !isAdmin ? 0.4 : 1,
                    boxShadow: neo ? "none" : `0 0 12px ${VIOLET}66`,
                  }}
                >
                  <Check size={12} /> Save Changes
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: "8px 14px",
                    background: "transparent", border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                    color: neo ? "#000" : "rgba(255,255,255,0.5)",
                    borderRadius: neo ? 2 : 7, fontWeight: 600, fontSize: 11, cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ───── Canvas ───── */}
      <div style={{ flex: 1, position: "relative" }}>
        <ReactFlow
          nodes={enrichedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => openEdit(node.id)}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          style={bgStyle}
          minZoom={0.15}
          maxZoom={2.5}
          deleteKeyCode="Delete"
        >
          <Background
            color={neo ? "#ccc" : VIOLET_DIM}
            gap={neo ? 20 : 28}
            size={neo ? 1 : 0.8}
            style={{ opacity: neo ? 0.5 : 0.35 }}
          />
          <Controls style={{ bottom: 80, left: 12 }} />
          <MiniMap
            nodeColor={(n) => {
              const cat = (n.data as SRSNodeData).category;
              return CATEGORY_COLORS[cat] ?? VIOLET;
            }}
            maskColor={neo ? "rgba(200,200,200,0.6)" : "rgba(5,2,8,0.8)"}
            style={{
              background: neo ? "#f5f5f5" : "rgba(5,2,8,0.9)",
              border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
            }}
          />

          {/* Toolbar */}
          <Panel position="top-right">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isAdmin && (
                <button
                  onClick={addNode}
                  title="Add requirement node"
                  style={{
                    background: neo ? "#000" : VIOLET,
                    color: "#fff", border: "none", borderRadius: neo ? 2 : 7,
                    padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 11,
                    display: "flex", alignItems: "center", gap: 5,
                    boxShadow: neo ? "none" : `0 0 12px ${VIOLET}66`,
                  }}
                >
                  <Plus size={13} /> Add Node
                </button>
              )}
              <button
                onClick={() => setNeo(n => !n)}
                title="Toggle Neo-Brutalist mode"
                style={{
                  background: neo ? "#fff" : "rgba(255,255,255,0.07)",
                  color: neo ? "#000" : "rgba(255,255,255,0.7)",
                  border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                  borderRadius: neo ? 2 : 7, padding: "6px 12px",
                  cursor: "pointer", fontWeight: 700, fontSize: 11,
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <Code2 size={13} /> {neo ? "Violet" : "Neo-Brutal"}
              </button>
              <button
                onClick={() => fitView({ duration: 500, padding: 0.15 })}
                title="Fit view"
                style={{
                  background: "transparent", color: neo ? "#000" : "rgba(255,255,255,0.5)",
                  border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                  borderRadius: neo ? 2 : 7, padding: "6px 10px",
                  cursor: "pointer", display: "flex", alignItems: "center",
                }}
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={exportCanvas}
                title="Export canvas as PNG"
                style={{
                  background: "transparent", color: neo ? "#000" : "rgba(255,255,255,0.5)",
                  border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                  borderRadius: neo ? 2 : 7, padding: "6px 10px",
                  cursor: "pointer", display: "flex", alignItems: "center",
                }}
              >
                <Download size={13} />
              </button>
            </div>
          </Panel>

          {/* Mode label */}
          <Panel position="top-left">
            <div style={{
              fontSize: 9, fontWeight: 700,
              color: neo ? "#000" : VIOLET,
              textTransform: "uppercase", letterSpacing: 2,
              padding: "4px 10px",
              background: neo ? "rgba(255,255,255,0.9)" : "rgba(5,2,8,0.7)",
              border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
              borderRadius: neo ? 2 : 6,
            }}>
              {neo ? "◼ Neo-Brutalist" : "◉ Dependency Galaxy"} · {nodes.length} nodes
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </motion.div>
  );
}

export function SRSTab({ workspaceId, role }: { workspaceId: string; role: string }) {
  return (
    <ReactFlowProvider>
      <SRSInner workspaceId={workspaceId} role={role} />
    </ReactFlowProvider>
  );
}
