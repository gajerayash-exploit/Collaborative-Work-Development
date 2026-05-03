import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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
  Pencil, X, Check, AlertTriangle, ShieldAlert, CircleDot,
  Link2Off, GitMerge, ArrowRight, Sparkles, CheckCircle2,
  Wand2, SendHorizonal, FileText,
} from "lucide-react";
import { exportSRSPdf } from "@/lib/srs-pdf";

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
  highlighted?: boolean;
  auditKind?: "orphan" | "missing-critical-link" | "cycle" | null;
};

type AuditIssue = {
  kind: "orphan" | "missing-critical-link" | "cycle";
  nodeIds: string[];
  message: string;
};

function computeAudit(nodes: Node[], edges: Edge[]): AuditIssue[] {
  const issues: AuditIssue[] = [];

  const connected = new Set<string>();
  edges.forEach(e => { connected.add(e.source); connected.add(e.target); });
  nodes.filter(n => !connected.has(n.id)).forEach(n =>
    issues.push({ kind: "orphan", nodeIds: [n.id], message: `"${(n.data as SRSNodeData).title}" has no connections` })
  );

  const hasOutgoing = new Set(edges.map(e => e.source));
  nodes.filter(n => (n.data as SRSNodeData).priority === "critical" && !hasOutgoing.has(n.id)).forEach(n =>
    issues.push({ kind: "missing-critical-link", nodeIds: [n.id], message: `"${(n.data as SRSNodeData).title}" is critical but has no outgoing links` })
  );

  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => { adj.get(e.source)?.push(e.target); });
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cycleSet = new Set<string>();
  function dfs(id: string) {
    visited.add(id); inStack.add(id);
    for (const nb of (adj.get(id) ?? [])) {
      if (!visited.has(nb)) dfs(nb);
      if (inStack.has(nb)) { cycleSet.add(id); cycleSet.add(nb); }
    }
    inStack.delete(id);
  }
  nodes.forEach(n => { if (!visited.has(n.id)) dfs(n.id); });
  if (cycleSet.size > 0) {
    const ids = [...cycleSet];
    issues.push({ kind: "cycle", nodeIds: ids, message: `Circular dependency between ${ids.length} node${ids.length > 1 ? "s" : ""}` });
  }

  return issues;
}

function SRSNodeComponent({ data, id, selected }: NodeProps) {
  const d = data as SRSNodeData;
  const neo = d.neoMode;
  const catColor = CATEGORY_COLORS[d.category] ?? VIOLET;

  const AUDIT_COLORS = { orphan: "#ef4444", "missing-critical-link": "#f59e0b", cycle: "#a855f7" };
  const auditColor = d.auditKind ? AUDIT_COLORS[d.auditKind] : null;

  if (neo) {
    return (
      <div
        className="relative"
        style={{
          width: 220,
          background: "#fff",
          border: auditColor ? `3px solid ${auditColor}` : `3px solid #000`,
          boxShadow: auditColor
            ? `4px 4px 0 ${auditColor}`
            : selected ? "8px 8px 0 #000" : "4px 4px 0 #000",
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
        border: auditColor
          ? `1.5px solid ${auditColor}`
          : selected ? `1.5px solid ${catColor}` : `1px solid ${VIOLET_DIM}`,
        borderRadius: 12,
        boxShadow: auditColor
          ? `0 0 18px ${auditColor}88, 0 0 36px ${auditColor}33`
          : selected
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

function PulseEdge({ id, sourceX, sourceY, targetX, targetY, selected, data }: EdgeProps) {
  const label = (data as { label?: string } | undefined)?.label ?? "";
  const neoMode = (data as { neoMode?: boolean } | undefined)?.neoMode ?? false;
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  const pillW = Math.max(label.length * 6 + 20, 60);
  const pillH = 18;

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
      {/* Label pill */}
      {label ? (
        <foreignObject
          x={labelX - pillW / 2}
          y={labelY - pillH / 2}
          width={pillW}
          height={pillH}
          style={{ overflow: "visible" }}
        >
          <div
            style={{
              background: neoMode ? "#000" : VIOLET,
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: neoMode ? 2 : 10,
              textAlign: "center",
              whiteSpace: "nowrap",
              letterSpacing: 0.5,
              border: neoMode ? "2px solid #000" : `1px solid ${VIOLET}`,
              boxShadow: neoMode ? "none" : `0 0 8px ${VIOLET}66`,
              lineHeight: "14px",
            }}
          >
            {label}
          </div>
        </foreignObject>
      ) : selected ? (
        /* Hint when selected but no label */
        <foreignObject x={labelX - 56} y={labelY - 9} width={112} height={18} style={{ overflow: "visible" }}>
          <div style={{
            background: "rgba(139,92,246,0.12)",
            border: `1px dashed ${VIOLET_DIM}`,
            color: "rgba(139,92,246,0.5)",
            fontSize: 8,
            fontWeight: 600,
            padding: "1px 8px",
            borderRadius: 8,
            textAlign: "center",
            whiteSpace: "nowrap",
            letterSpacing: 0.5,
            lineHeight: "15px",
          }}>
            double-click to label
          </div>
        </foreignObject>
      ) : null}
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

function SRSInner({ workspaceId, role, onAuditCount }: { workspaceId: string; role: string; onAuditCount?: (n: number) => void }) {
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
  const [mode, setMode] = useState<"galaxy" | "radar" | "sunburst" | "audit">("galaxy");
  const [neo, setNeo] = useState(false);
  const [mermaid, setMermaid] = useState("graph TD;\nLogin-->Auth;\nAuth-->DB;\nDB-->API;\nAPI-->UI;");
  const [mounted, setMounted] = useState(false);
  const { fitView } = useReactFlow();

  const [auditIssues, setAuditIssues] = useState<AuditIssue[]>([]);
  const [auditHighlight, setAuditHighlight] = useState<Set<string>>(new Set());

  type AISuggestion = {
    fromId: string; toId: string;
    fromTitle: string; toTitle: string;
    reason: string;
    confidence: "high" | "medium" | "low";
  };
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const fetchSuggestions = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestions([]);
    setDismissedSuggestions(new Set());
    try {
      const payload = {
        nodes: nodes.map(n => {
          const d = n.data as SRSNodeData;
          return { id: n.id, title: d.title, description: d.description, category: d.category, priority: d.priority };
        }),
        edges: edges.map(e => ({ source: e.source, target: e.target })),
      };
      const resp = await fetch("/api/srs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Request failed");
      const data = await resp.json() as { suggestions: AISuggestion[] };
      setSuggestions(data.suggestions ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestLoading(false);
    }
  }, [nodes, edges]);

  const acceptSuggestion = useCallback((s: AISuggestion) => {
    setEdges(es => addEdge({ source: s.fromId, target: s.toId, type: "pulseEdge", id: `ai-${Date.now()}`, data: { label: "", neoMode: neo } }, es));
    setDismissedSuggestions(prev => new Set([...prev, `${s.fromId}→${s.toId}`]));
  }, [setEdges, neo]);

  const dismissSuggestion = useCallback((s: AISuggestion) => {
    setDismissedSuggestions(prev => new Set([...prev, `${s.fromId}→${s.toId}`]));
  }, []);

  const [genNodeOpen, setGenNodeOpen] = useState(false);
  const [genNodePrompt, setGenNodePrompt] = useState("");
  const [genNodeLoading, setGenNodeLoading] = useState(false);
  const genInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (genNodeOpen) setTimeout(() => genInputRef.current?.focus(), 80);
  }, [genNodeOpen]);

  const generateNode = useCallback(async () => {
    if (!genNodePrompt.trim() || genNodeLoading) return;
    setGenNodeLoading(true);
    try {
      const payload = {
        prompt: genNodePrompt.trim(),
        nodes: nodes.map(n => {
          const d = n.data as SRSNodeData;
          return { id: n.id, title: d.title, description: d.description, category: d.category, priority: d.priority };
        }),
      };
      const resp = await fetch("/api/srs/generate-node", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Request failed");
      const data = await resp.json() as {
        title: string; description: string;
        category: SRSNodeData["category"]; priority: SRSNodeData["priority"];
        suggestedEdges: Array<{ targetId: string; direction: "to" | "from"; reason: string }>;
      };

      const newId = `ai-gen-${Date.now()}`;
      const cx = nodes.reduce((s, n) => s + n.position.x, 0) / Math.max(nodes.length, 1);
      const cy = nodes.reduce((s, n) => s + n.position.y, 0) / Math.max(nodes.length, 1);
      const angle = Math.random() * Math.PI * 2;
      const radius = 300 + Math.random() * 120;
      const newPos = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };

      setNodes(ns => [...ns, {
        id: newId,
        type: "srsNode",
        position: newPos,
        data: {
          title: data.title,
          description: data.description,
          category: data.category,
          priority: data.priority,
          locked: false,
        },
      }]);

      if (data.suggestedEdges?.length) {
        setEdges(es => {
          let next = es;
          for (const se of data.suggestedEdges) {
            const source = se.direction === "to" ? newId : se.targetId;
            const target = se.direction === "to" ? se.targetId : newId;
            next = addEdge({ source, target, type: "pulseEdge", id: `ae-${Date.now()}-${Math.random()}`, data: { label: "", neoMode: neo } }, next);
          }
          return next;
        });
      }

      setTimeout(() => fitView({ nodes: [{ id: newId }], duration: 600, padding: 0.4 }), 120);
      setGenNodePrompt("");
      setGenNodeOpen(false);
    } catch {
    } finally {
      setGenNodeLoading(false);
    }
  }, [genNodePrompt, genNodeLoading, nodes, setNodes, setEdges, fitView, neo]);

  useEffect(() => {
    const issues = computeAudit(nodes, edges);
    setAuditIssues(issues);
    onAuditCount?.(issues.length);
  }, [nodes, edges, onAuditCount]);

  const focusAuditNode = useCallback((nodeId: string) => {
    setAuditHighlight(new Set([nodeId]));
    fitView({ nodes: [{ id: nodeId }], duration: 500, padding: 0.35 });
    setTimeout(() => setAuditHighlight(new Set()), 2500);
  }, [fitView]);

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

  const [editingEdge, setEditingEdge] = useState<{ id: string; currentLabel: string } | null>(null);
  const [edgeLabelDraft, setEdgeLabelDraft] = useState("");

  const openEdgeEdit = useCallback((_: React.MouseEvent, edge: Edge) => {
    const current = (edge.data as { label?: string } | undefined)?.label ?? "";
    setEditingEdge({ id: edge.id, currentLabel: current });
    setEdgeLabelDraft(current);
  }, []);

  const commitEdgeLabel = useCallback((clear = false) => {
    if (!editingEdge) return;
    setEdges(es => es.map(e => e.id === editingEdge.id
      ? { ...e, data: { ...(e.data as object), label: clear ? "" : edgeLabelDraft.trim() } }
      : e
    ));
    setEditingEdge(null);
    setEdgeLabelDraft("");
  }, [editingEdge, edgeLabelDraft, setEdges]);

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

  const senderId = useMemo(() => `s-${Math.random().toString(36).slice(2, 9)}`, []);
  const remoteGenRef = useRef(0);
  const [colabCount, setColabCount] = useState(0);
  const [colabPulse, setColabPulse] = useState(false);

  const fetchPresence = useCallback(async (wsId: string) => {
    try {
      const r = await fetch(`/api/srs/presence/${encodeURIComponent(wsId)}`);
      if (r.ok) {
        const d = await r.json() as { count: number };
        setColabCount(d.count);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    const url = `/api/srs/stream?workspaceId=${encodeURIComponent(workspaceId)}&senderId=${encodeURIComponent(senderId)}`;
    const es = new EventSource(url);

    fetchPresence(workspaceId);

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          type: string;
          nodes?: Node[];
          edges?: Edge[];
          senderId?: string;
        };

        if (msg.type === "graph-update" || msg.type === "initial-state") {
          if (msg.senderId === senderId) return;
          if (!msg.nodes || !msg.edges) return;
          remoteGenRef.current += 1;
          setNodes(msg.nodes as Node[]);
          setEdges(msg.edges as Edge[]);
          setColabPulse(true);
          setTimeout(() => setColabPulse(false), 1200);
        }
        if (msg.type === "connected") {
          fetchPresence(workspaceId);
        }
      } catch {}
    };

    es.onerror = () => {};

    const presenceInterval = setInterval(() => fetchPresence(workspaceId), 10000);

    return () => {
      es.close();
      clearInterval(presenceInterval);
    };
  }, [workspaceId, senderId, setNodes, setEdges, fetchPresence]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGenRef = useRef(0);

  useEffect(() => {
    const capturedRemoteGen = remoteGenRef.current;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncGenRef.current += 1;
    const thisGen = syncGenRef.current;
    syncTimeoutRef.current = setTimeout(async () => {
      if (remoteGenRef.current !== capturedRemoteGen) return;
      if (thisGen !== syncGenRef.current) return;
      try {
        const cleanNodes = nodes.map(n => ({ ...n, data: { ...n.data, onLock: undefined, onDelete: undefined, neoMode: undefined } }));
        await fetch("/api/srs/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, nodes: cleanNodes, edges, senderId }),
        });
      } catch {}
    }, 1000);
    return () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
  }, [nodes, edges, workspaceId, senderId]);

  const toggleLock = useCallback((id: string) => {
    if (!isAdmin) return;
    setNodes(ns => ns.map(n => n.id === id ? { ...n, data: { ...n.data, locked: !n.data.locked } } : n));
  }, [isAdmin, setNodes]);

  const deleteNode = useCallback((id: string) => {
    if (!isAdmin) return;
    setNodes(ns => ns.filter(n => n.id !== id));
    setEdges(es => es.filter(e => e.source !== id && e.target !== id));
  }, [isAdmin, setNodes, setEdges]);

  const auditKindMap = new Map<string, AuditIssue["kind"]>();
  auditIssues.forEach(issue => { issue.nodeIds.forEach(nid => auditKindMap.set(nid, issue.kind)); });

  const enrichedNodes = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onLock: toggleLock, onDelete: deleteNode, onEdit: openEdit, neoMode: neo,
      highlighted: auditHighlight.has(n.id),
      auditKind: auditKindMap.get(n.id) ?? null,
    },
    draggable: !(n.data as SRSNodeData).locked,
  }));

  const onConnect = useCallback((c: Connection) => {
    setEdges(es => addEdge({ ...c, type: "pulseEdge", id: `e-${Date.now()}`, data: { label: "", neoMode: neo } }, es));
  }, [setEdges, neo]);

  const enrichedEdges = edges.map(e => ({
    ...e,
    data: { ...(e.data as object | undefined ?? {}), neoMode: neo },
  }));

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

  const [pdfExporting, setPdfExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    if (pdfExporting) return;
    setPdfExporting(true);
    try {
      await exportSRSPdf(nodes, edges, workspaceId);
    } finally {
      setPdfExporting(false);
    }
  }, [pdfExporting, nodes, edges, workspaceId]);

  const bgStyle = neo
    ? { background: "#fff" }
    : { background: CANVAS_BG };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ width: "100%", height: "100%", display: "flex", position: "relative", minHeight: 0, overflow: "hidden" }}
    >
      {/* Pulse + spin animations */}
      <style>{`
        @keyframes srs-dash { to { stroke-dashoffset: -24; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .react-flow__minimap { border-radius: 8px; overflow: hidden; }
        .react-flow__controls button { background: rgba(139,92,246,0.15) !important; border-color: rgba(139,92,246,0.3) !important; color: #8B5CF6 !important; }
        .react-flow__controls button:hover { background: rgba(139,92,246,0.3) !important; }
        .srs-spin { animation: spin 1s linear infinite; }
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
              width: 260, maxWidth: "min(260px, 78vw)",
            }}
          >
            <div style={{ padding: "12px 14px", borderBottom: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`, flexShrink: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 11, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>
                SRS Workspace
              </div>
              {/* Mode tabs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4 }}>
                {([["galaxy", GitBranch], ["radar", Target], ["sunburst", Layers], ["audit", ShieldAlert]] as const).map(([m, Icon]) => {
                  const isAudit = m === "audit";
                  const badgeCount = isAudit ? auditIssues.length : 0;
                  return (
                    <button
                      key={m}
                      onClick={() => setMode(m as typeof mode)}
                      title={m.charAt(0).toUpperCase() + m.slice(1)}
                      style={{
                        width: "100%", padding: "8px 0", border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                        background: mode === m ? (neo ? "#000" : isAudit && badgeCount > 0 ? "#ef4444" : VIOLET) : "transparent",
                        color: mode === m ? "#fff" : (neo ? "#000" : "rgba(255,255,255,0.5)"),
                        borderRadius: neo ? 0 : 6, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 3,
                        transition: "all 0.15s", position: "relative",
                      }}
                    >
                      <Icon size={13} />
                      {badgeCount > 0 && (
                        <span style={{
                          position: "absolute", top: -5, right: -3, width: 14, height: 14,
                          background: "#ef4444", color: "#fff", borderRadius: "50%",
                          fontSize: 8, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center",
                          border: neo ? "2px solid #f5f5f5" : `2px solid rgba(5,2,8,0.97)`,
                        }}>
                          {badgeCount > 9 ? "9+" : badgeCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              {mode === "galaxy" && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                    Visual Graph Builder
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

              {mode === "audit" && (() => {
                const byKind = {
                  orphan: auditIssues.filter(i => i.kind === "orphan"),
                  "missing-critical-link": auditIssues.filter(i => i.kind === "missing-critical-link"),
                  cycle: auditIssues.filter(i => i.kind === "cycle"),
                };
                const kindMeta: Record<string, { label: string; color: string; Icon: React.ElementType; desc: string }> = {
                  orphan: { label: "Orphaned Nodes", color: "#ef4444", Icon: Link2Off, desc: "No connections" },
                  "missing-critical-link": { label: "Incomplete Critical", color: "#f59e0b", Icon: AlertTriangle, desc: "Critical, no outgoing links" },
                  cycle: { label: "Circular Dependencies", color: "#a855f7", Icon: GitMerge, desc: "Cycle detected" },
                };
                return (
                  <div>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : "#ef4444", textTransform: "uppercase", letterSpacing: 1 }}>
                        Graph Audit
                      </div>
                      <div style={{
                        fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 10,
                        background: auditIssues.length > 0 ? "#ef4444" : "#22c55e", color: "#fff",
                      }}>
                        {auditIssues.length > 0 ? `${auditIssues.length} issue${auditIssues.length > 1 ? "s" : ""}` : "All clear"}
                      </div>
                    </div>

                    {auditIssues.length === 0 && (
                      <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#22c55e" }}>No issues found</div>
                        <div style={{ fontSize: 9, color: neo ? "#666" : "rgba(255,255,255,0.3)", marginTop: 4 }}>
                          Graph structure looks healthy
                        </div>
                      </div>
                    )}

                    {(["orphan", "missing-critical-link", "cycle"] as const).map(kind => {
                      const group = byKind[kind];
                      if (group.length === 0) return null;
                      const meta = kindMeta[kind];
                      const MetaIcon = meta.Icon;
                      return (
                        <div key={kind} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                            <MetaIcon size={11} style={{ color: meta.color }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                            <span style={{ marginLeft: "auto", fontSize: 8, background: `${meta.color}22`, color: meta.color, padding: "1px 6px", borderRadius: 8, fontWeight: 700 }}>
                              {group.length}
                            </span>
                          </div>
                          {group.flatMap(issue => issue.nodeIds).map(nodeId => {
                            const node = nodes.find(n => n.id === nodeId);
                            const title = (node?.data as SRSNodeData | undefined)?.title ?? nodeId;
                            return (
                              <button
                                key={nodeId}
                                onClick={() => focusAuditNode(nodeId)}
                                style={{
                                  width: "100%", textAlign: "left", marginBottom: 4, padding: "7px 9px",
                                  background: neo ? "#fff" : `${meta.color}0d`,
                                  border: neo ? `2px solid ${meta.color}` : `1px solid ${meta.color}44`,
                                  borderRadius: neo ? 2 : 6, cursor: "pointer",
                                  display: "flex", alignItems: "center", gap: 6,
                                  transition: "background 0.1s",
                                }}
                              >
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                                <span style={{ fontSize: 10, fontWeight: 600, color: neo ? "#000" : "rgba(255,255,255,0.8)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {title}
                                </span>
                                <ArrowRight size={9} style={{ color: meta.color, flexShrink: 0 }} />
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}

                    <div style={{ marginTop: 10, padding: "8px 10px", background: neo ? "#eee" : "rgba(139,92,246,0.06)", borderRadius: 6, border: neo ? "1px solid #ccc" : `1px solid ${VIOLET_DIM}` }}>
                      <div style={{ fontSize: 9, color: neo ? "#555" : "rgba(255,255,255,0.35)", lineHeight: 1.7 }}>
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>●</span> Orphan — no edges<br />
                        <span style={{ color: "#f59e0b", fontWeight: 700 }}>●</span> Critical — no outgoing links<br />
                        <span style={{ color: "#a855f7", fontWeight: 700 }}>●</span> Cycle — circular dependency<br />
                        Click any item to zoom to the node.
                      </div>
                    </div>

                    {/* AI Suggestions */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: neo ? "#000" : VIOLET, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center", gap: 5 }}>
                          <Sparkles size={11} /> Real-time AI Suggestions
                        </div>
                        <button
                          onClick={fetchSuggestions}
                          disabled={suggestLoading}
                          style={{
                            padding: "3px 10px", fontSize: 9, fontWeight: 700, cursor: suggestLoading ? "default" : "pointer",
                            background: neo ? "#000" : VIOLET, color: "#fff",
                            border: "none", borderRadius: neo ? 2 : 6,
                            opacity: suggestLoading ? 0.6 : 1,
                            display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {suggestLoading ? <RefreshCw size={9} className="srs-spin" /> : <Sparkles size={9} />}
                          {suggestLoading ? "Analyzing…" : "Refresh"}
                        </button>
                      </div>

                      {suggestions.length === 0 && !suggestLoading && (
                        <div style={{
                          fontSize: 9,
                          color: neo ? "#777" : "rgba(255,255,255,0.3)",
                          textAlign: "center",
                          padding: "10px 12px",
                          border: neo ? "1px dashed #ccc" : `1px dashed ${VIOLET_DIM}`,
                          borderRadius: neo ? 2 : 8,
                          background: neo ? "#fff" : "rgba(139,92,246,0.04)",
                        }}>
                          Refresh anytime to get live AI-powered connection recommendations.
                        </div>
                      )}

                      {(() => {
                        const CONF_COLORS = { high: "#22c55e", medium: "#f59e0b", low: neo ? "#6b7280" : "rgba(255,255,255,0.4)" };
                        const visible = suggestions.filter(s => !dismissedSuggestions.has(`${s.fromId}→${s.toId}`));
                        return visible.map(s => {
                          const key = `${s.fromId}→${s.toId}`;
                          const confColor = CONF_COLORS[s.confidence] ?? CONF_COLORS.medium;
                          return (
                            <div
                              key={key}
                              style={{
                                marginBottom: 7, padding: "10px 10px",
                                background: neo ? "#fff" : "rgba(139,92,246,0.08)",
                                border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                                borderRadius: neo ? 2 : 10,
                                boxShadow: neo ? "none" : "0 8px 20px rgba(0,0,0,0.08)",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 9, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.85)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>
                                  {s.fromTitle}
                                </span>
                                <ArrowRight size={9} style={{ color: VIOLET, flexShrink: 0 }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.85)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 80 }}>
                                  {s.toTitle}
                                </span>
                                <span style={{ fontSize: 7, fontWeight: 900, color: confColor, textTransform: "uppercase", flexShrink: 0 }}>
                                  {s.confidence}
                                </span>
                              </div>
                              <div style={{ fontSize: 9, color: neo ? "#555" : "rgba(255,255,255,0.4)", marginBottom: 7, lineHeight: 1.5 }}>
                                {s.reason}
                              </div>
                              <div style={{ display: "flex", gap: 5 }}>
                                <button
                                  onClick={() => acceptSuggestion(s)}
                                  style={{
                                    flex: 1, padding: "3px 0", fontSize: 9, fontWeight: 700, cursor: "pointer",
                                    background: "#22c55e", color: "#fff", border: "none",
                                    borderRadius: neo ? 2 : 4,
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
                                  }}
                                >
                                  <CheckCircle2 size={9} /> Add Edge
                                </button>
                                <button
                                  onClick={() => dismissSuggestion(s)}
                                  style={{
                                    padding: "3px 8px", fontSize: 9, fontWeight: 700, cursor: "pointer",
                                    background: "transparent", color: neo ? "#666" : "rgba(255,255,255,0.35)",
                                    border: neo ? "1px solid #ccc" : `1px solid rgba(255,255,255,0.12)`,
                                    borderRadius: neo ? 2 : 4,
                                  }}
                                >
                                  <X size={9} />
                                </button>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                );
              })()}
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

      {/* ───── Edge Label Editor ───── */}
      <AnimatePresence>
        {editingEdge && (
          <motion.div
            key="edge-label-editor"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            style={{
              position: "absolute",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 50,
              width: 300,
              background: neo ? "#f5f5f5" : "rgba(10,7,18,0.98)",
              border: neo ? "3px solid #000" : `1px solid ${VIOLET_DIM}`,
              borderRadius: neo ? 4 : 12,
              boxShadow: neo ? "6px 6px 0 #000" : `0 0 40px rgba(139,92,246,0.25), 0 20px 60px rgba(0,0,0,0.6)`,
              backdropFilter: "blur(20px)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "11px 14px 10px",
              borderBottom: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: neo ? "#000" : `linear-gradient(135deg, ${VIOLET}18, transparent)`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: VIOLET, boxShadow: neo ? "none" : `0 0 6px ${VIOLET}` }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: neo ? "#fff" : VIOLET, textTransform: "uppercase", letterSpacing: 1.5 }}>
                  Edge Relationship
                </span>
              </div>
              <button
                onClick={() => setEditingEdge(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: neo ? "#fff" : "rgba(255,255,255,0.4)", padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Input */}
            <div style={{ padding: "14px 14px 10px" }}>
              <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 7 }}>
                Relationship label
              </label>
              <Input
                autoFocus
                value={edgeLabelDraft}
                onChange={e => setEdgeLabelDraft(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") commitEdgeLabel(false);
                  if (e.key === "Escape") setEditingEdge(null);
                }}
                placeholder='e.g. "depends on", "triggers", "writes to"'
                style={{
                  fontFamily: "inherit", fontSize: 12,
                  background: neo ? "#fff" : "rgba(139,92,246,0.06)",
                  border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                  color: neo ? "#000" : "#fff",
                  borderRadius: neo ? 2 : 7,
                }}
              />
              <div style={{ fontSize: 9, color: neo ? "#777" : "rgba(255,255,255,0.25)", marginTop: 6 }}>
                Press Enter to save · Escape to cancel
              </div>

              {/* Presets */}
              <div style={{ marginTop: 12, marginBottom: 2 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: neo ? "#000" : "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                  Quick presets
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {["depends on", "triggers", "writes to", "reads from", "authenticates", "validates", "extends"].map(preset => (
                    <button
                      key={preset}
                      onClick={() => setEdgeLabelDraft(preset)}
                      style={{
                        padding: "3px 9px", fontSize: 9, fontWeight: 600, cursor: "pointer",
                        background: edgeLabelDraft === preset ? (neo ? "#000" : VIOLET) : (neo ? "#fff" : "transparent"),
                        color: edgeLabelDraft === preset ? "#fff" : (neo ? "#333" : "rgba(255,255,255,0.45)"),
                        border: neo ? `2px solid ${edgeLabelDraft === preset ? "#000" : "#ccc"}` : `1px solid ${edgeLabelDraft === preset ? VIOLET : VIOLET_DIM}`,
                        borderRadius: neo ? 2 : 20,
                        transition: "all 0.1s",
                        boxShadow: edgeLabelDraft === preset && !neo ? `0 0 6px ${VIOLET}55` : "none",
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ padding: "0 14px 14px", display: "flex", gap: 7 }}>
              <button
                onClick={() => commitEdgeLabel(false)}
                style={{
                  flex: 1, padding: "7px 0",
                  background: neo ? "#000" : VIOLET,
                  color: "#fff", border: "none", borderRadius: neo ? 2 : 7,
                  fontWeight: 700, fontSize: 11, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  boxShadow: neo ? "none" : `0 0 10px ${VIOLET}55`,
                }}
              >
                <Check size={11} /> Set Label
              </button>
              {editingEdge.currentLabel && (
                <button
                  onClick={() => commitEdgeLabel(true)}
                  style={{
                    padding: "7px 12px", fontWeight: 600, fontSize: 11, cursor: "pointer",
                    background: "transparent",
                    color: neo ? "#ef4444" : "rgba(239,68,68,0.7)",
                    border: neo ? "2px solid #ef4444" : "1px solid rgba(239,68,68,0.3)",
                    borderRadius: neo ? 2 : 7,
                  }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setEditingEdge(null)}
                style={{
                  padding: "7px 12px", fontWeight: 600, fontSize: 11, cursor: "pointer",
                  background: "transparent",
                  color: neo ? "#000" : "rgba(255,255,255,0.4)",
                  border: neo ? "2px solid #000" : `1px solid ${VIOLET_DIM}`,
                  borderRadius: neo ? 2 : 7,
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── Smart Node Generator ───── */}
      <AnimatePresence>
        {genNodeOpen && (
          <>
            <motion.div
              key="gen-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!genNodeLoading) { setGenNodeOpen(false); setGenNodePrompt(""); } }}
              style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)" }}
            />
            <motion.div
              key="gen-dialog"
              initial={{ opacity: 0, scale: 0.92, y: -24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -24 }}
              transition={{ type: "spring", stiffness: 380, damping: 26 }}
              style={{
                position: "absolute", top: "18%", left: "50%",
                transform: "translateX(-50%)",
                zIndex: 60, width: 480, maxWidth: "calc(100% - 40px)",
                background: neo ? "#f5f5f5" : "rgba(8,4,20,0.98)",
                border: neo ? "3px solid #000" : `1px solid rgba(168,85,247,0.4)`,
                borderRadius: neo ? 4 : 16,
                boxShadow: neo ? "8px 8px 0 #000" : "0 0 60px rgba(139,92,246,0.3), 0 24px 80px rgba(0,0,0,0.7)",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div style={{
                padding: "14px 16px 12px",
                borderBottom: neo ? "2px solid #000" : "1px solid rgba(168,85,247,0.2)",
                background: neo ? "#000" : "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(168,85,247,0.08))",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: neo ? 2 : 8,
                    background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: neo ? "none" : "0 0 12px rgba(168,85,247,0.5)",
                  }}>
                    <Wand2 size={14} style={{ color: "#fff" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: neo ? "#fff" : "#e9d5ff", letterSpacing: 0.5 }}>
                      Smart Node Generator
                    </div>
                    <div style={{ fontSize: 9, color: neo ? "rgba(255,255,255,0.6)" : "rgba(168,85,247,0.7)", fontWeight: 500 }}>
                      Describe a requirement in plain English
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => { if (!genNodeLoading) { setGenNodeOpen(false); setGenNodePrompt(""); } }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: neo ? "#fff" : "rgba(255,255,255,0.4)", padding: 4, borderRadius: 4 }}
                >
                  <X size={14} />
                </button>
              </div>

              {/* Input area */}
              <div style={{ padding: "16px" }}>
                <div style={{
                  display: "flex", gap: 8, alignItems: "flex-start",
                  background: neo ? "#fff" : "rgba(255,255,255,0.04)",
                  border: neo ? "2px solid #000" : "1px solid rgba(168,85,247,0.25)",
                  borderRadius: neo ? 2 : 10, padding: "10px 12px",
                  boxShadow: neo ? "none" : "inset 0 1px 4px rgba(0,0,0,0.3)",
                }}>
                  <Sparkles size={14} style={{ color: "#a855f7", flexShrink: 0, marginTop: 2 }} />
                  <input
                    ref={genInputRef}
                    value={genNodePrompt}
                    onChange={e => setGenNodePrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); generateNode(); }
                      if (e.key === "Escape") { setGenNodeOpen(false); setGenNodePrompt(""); }
                    }}
                    disabled={genNodeLoading}
                    placeholder="e.g. Rate limiting middleware for API endpoints..."
                    style={{
                      flex: 1, border: "none", outline: "none", background: "transparent",
                      color: neo ? "#000" : "#e9d5ff", fontSize: 13, fontWeight: 500,
                      lineHeight: 1.5,
                    }}
                  />
                </div>

                {/* Example prompts */}
                {!genNodeLoading && genNodePrompt.length === 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {[
                      "Email notification system",
                      "Two-factor authentication",
                      "File upload size limit constraint",
                      "Audit log for admin actions",
                    ].map(ex => (
                      <button
                        key={ex}
                        onClick={() => { setGenNodePrompt(ex); genInputRef.current?.focus(); }}
                        style={{
                          fontSize: 9, fontWeight: 600, padding: "3px 9px", cursor: "pointer",
                          background: neo ? "#eee" : "rgba(168,85,247,0.1)",
                          color: neo ? "#333" : "rgba(168,85,247,0.8)",
                          border: neo ? "1px solid #ccc" : "1px solid rgba(168,85,247,0.2)",
                          borderRadius: 20, whiteSpace: "nowrap",
                          transition: "all 0.1s",
                        }}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                )}

                {/* Loading state */}
                {genNodeLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: neo ? "#eee" : "rgba(168,85,247,0.08)", borderRadius: 8, border: neo ? "1px solid #ccc" : "1px solid rgba(168,85,247,0.15)" }}
                  >
                    <RefreshCw size={12} className="srs-spin" style={{ color: "#a855f7" }} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: neo ? "#555" : "rgba(168,85,247,0.8)" }}>
                      GPT is analyzing your requirement and existing graph…
                    </span>
                  </motion.div>
                )}

                {/* Generate button */}
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <button
                    onClick={generateNode}
                    disabled={genNodeLoading || !genNodePrompt.trim()}
                    style={{
                      flex: 1, padding: "9px 0", fontWeight: 800, fontSize: 12, cursor: genNodeLoading || !genNodePrompt.trim() ? "default" : "pointer",
                      background: genNodeLoading || !genNodePrompt.trim()
                        ? (neo ? "#ccc" : "rgba(168,85,247,0.3)")
                        : (neo ? "#000" : "linear-gradient(135deg, #7c3aed, #a855f7)"),
                      color: "#fff", border: "none",
                      borderRadius: neo ? 2 : 9,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      boxShadow: (!genNodeLoading && genNodePrompt.trim() && !neo) ? "0 0 20px rgba(168,85,247,0.5)" : "none",
                      transition: "all 0.15s",
                      letterSpacing: 0.3,
                    }}
                  >
                    {genNodeLoading
                      ? <><RefreshCw size={12} className="srs-spin" /> Generating…</>
                      : <><Wand2 size={12} /> Generate Node</>
                    }
                  </button>
                  <button
                    onClick={() => { setGenNodeOpen(false); setGenNodePrompt(""); }}
                    disabled={genNodeLoading}
                    style={{
                      padding: "9px 16px", fontWeight: 600, fontSize: 11, cursor: "pointer",
                      background: "transparent", color: neo ? "#666" : "rgba(255,255,255,0.35)",
                      border: neo ? "2px solid #ccc" : `1px solid ${VIOLET_DIM}`,
                      borderRadius: neo ? 2 : 9,
                    }}
                  >
                    Cancel
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 9, color: neo ? "#888" : "rgba(255,255,255,0.2)", textAlign: "center" }}>
                  Press Enter to generate · Escape to close · Node auto-connects to related nodes
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
                position: "absolute", right: 0, top: 0, bottom: 0, width: 300, maxWidth: "min(300px, 92vw)", zIndex: 31,
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
      <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
        <ReactFlow
          nodes={enrichedNodes}
          edges={enrichedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => openEdit(node.id)}
          onEdgeDoubleClick={openEdgeEdit}
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
              {/* Live presence indicator */}
              <motion.div
                animate={colabPulse ? { scale: [1, 1.12, 1], opacity: [1, 0.7, 1] } : {}}
                transition={{ duration: 0.6 }}
                title={colabCount > 1 ? `${colabCount} people viewing this graph` : "You are viewing this graph"}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: neo ? 2 : 20,
                  background: colabPulse
                    ? (neo ? "#000" : "rgba(34,197,94,0.18)")
                    : (neo ? "#f5f5f5" : "rgba(255,255,255,0.04)"),
                  border: colabPulse
                    ? (neo ? "2px solid #16a34a" : "1px solid rgba(34,197,94,0.5)")
                    : (neo ? "1px solid #ccc" : "1px solid rgba(255,255,255,0.08)"),
                  transition: "all 0.4s",
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: colabPulse ? "#22c55e" : (colabCount > 1 ? "#22c55e" : "#6366f1"),
                  boxShadow: colabPulse ? "0 0 6px #22c55e" : (colabCount > 1 ? "0 0 4px #22c55e" : "none"),
                  flexShrink: 0, transition: "all 0.4s",
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  color: colabPulse ? (neo ? "#16a34a" : "#22c55e") : (neo ? "#555" : "rgba(255,255,255,0.4)"),
                  whiteSpace: "nowrap", transition: "all 0.4s",
                }}>
                  {colabPulse ? "Syncing…" : colabCount > 1 ? `${colabCount} live` : "Live"}
                </span>
              </motion.div>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setGenNodeOpen(true)}
                    title="Generate node from description (AI)"
                    style={{
                      background: neo ? "#000" : "linear-gradient(135deg, #7c3aed, #a855f7)",
                      color: "#fff", border: "none", borderRadius: neo ? 2 : 7,
                      padding: "6px 12px", cursor: "pointer", fontWeight: 700, fontSize: 11,
                      display: "flex", alignItems: "center", gap: 5,
                      boxShadow: neo ? "none" : "0 0 16px rgba(168,85,247,0.5)",
                    }}
                  >
                    <Wand2 size={13} /> Generate
                  </button>
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
                </>
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
                onClick={exportPdf}
                disabled={pdfExporting || nodes.length === 0}
                title="Export SRS as PDF document"
                style={{
                  background: pdfExporting
                    ? (neo ? "#ccc" : "rgba(239,68,68,0.3)")
                    : (neo ? "#000" : "rgba(239,68,68,0.15)"),
                  color: neo ? (pdfExporting ? "#999" : "#fff") : "#f87171",
                  border: neo ? "2px solid #000" : "1px solid rgba(239,68,68,0.35)",
                  borderRadius: neo ? 2 : 7, padding: "6px 11px",
                  cursor: pdfExporting || nodes.length === 0 ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                  fontWeight: 700, fontSize: 11,
                  opacity: nodes.length === 0 ? 0.4 : 1,
                  transition: "all 0.15s",
                }}
              >
                {pdfExporting
                  ? <><RefreshCw size={12} className="srs-spin" /> Exporting…</>
                  : <><FileText size={12} /> PDF</>
                }
              </button>
              <button
                onClick={exportCanvas}
                title="Export graph as JSON"
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
              {auditIssues.length > 0 && (
                <span style={{
                  marginLeft: 8, padding: "1px 7px", borderRadius: 8,
                  background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 900,
                }}>
                  ⚠ {auditIssues.length} audit issue{auditIssues.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </motion.div>
  );
}

export function SRSTab({ workspaceId, role, onAuditCount }: { workspaceId: string; role: string; onAuditCount?: (n: number) => void }) {
  return (
    <ReactFlowProvider>
      <SRSInner workspaceId={workspaceId} role={role} onAuditCount={onAuditCount} />
    </ReactFlowProvider>
  );
}
