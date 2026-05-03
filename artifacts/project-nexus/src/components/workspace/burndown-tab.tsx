import { useState, useRef } from "react";
import React from "react";
import {
  useGetBurndownAnalytics,
  getGetBurndownAnalyticsQueryKey,
  useGetLeaderboard,
  getGetLeaderboardQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, CheckCircle2, Zap, Clock, TrendingUp, BarChart2,
  Target, Layers, CalendarDays, Users, Download, Sprout, Circle,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";

function exportToCsv(dailyData: any[], summary: any, days: number) {
  const rows = [
    ["Date", "Created", "Completed", "Cumulative Created", "Cumulative Completed"],
    ...dailyData.map((d: any) => [
      d.date, d.created, d.completed, d.cumCreated, d.cumCompleted,
    ]),
    [],
    ["Summary", ""],
    ["Total Tasks", summary.total],
    ["Completed", summary.done],
    ["In Progress", summary.inProgress],
    ["To Do", summary.todo],
    ["Completion Rate", `${summary.completionRate}%`],
    ["Period (days)", days],
  ];

  const csv = rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analytics-${days}d-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
];

const MEDALS = ["🥇", "🥈", "🥉"];
const WORKSPACE_EMOJIS = ["🚀", "⚡", "🎯", "🔥", "💡", "🌟", "🎨", "🛸", "🦋", "🌊"];

function nameToEmoji(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return WORKSPACE_EMOJIS[Math.abs(hash) % WORKSPACE_EMOJIS.length];
}

function ProgressRing({ pct, size = 80, stroke = 8, color = "hsl(var(--primary))" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted/30" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
    </svg>
  );
}

function StatRing({ label, value, total, icon: Icon, color }: { label: string; value: number; total: number; icon: React.ElementType; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-2 p-4">
      <div className="relative">
        <ProgressRing pct={pct} size={84} stroke={7} color={color} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-black">{pct}%</span>
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center gap-1">
          <Icon className="h-4 w-4 text-[#2b2b2b] dark:text-[#d4d4d4]" />
          <span className="text-xl font-black">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── 3D Bar helpers ────────────────────────────────────────────────────────

interface Bar3DProps {
  x: number; bottomY: number; w: number; h: number;
  dx: number; dy: number;
  front: string; top: string; side: string;
}

function Bar3D({ x, bottomY, w, h, dx, dy, front, top, side }: Bar3DProps) {
  if (h <= 0) return null;
  const topY = bottomY - h;
  const fp = `${x},${bottomY} ${x},${topY} ${x + w},${topY} ${x + w},${bottomY}`;
  const tp = `${x},${topY} ${x + dx},${topY + dy} ${x + w + dx},${topY + dy} ${x + w},${topY}`;
  const sp = `${x + w},${topY} ${x + w + dx},${topY + dy} ${x + w + dx},${bottomY + dy} ${x + w},${bottomY}`;
  return (
    <g>
      <polygon points={fp} fill={front} fillOpacity={0.88} />
      <polygon points={tp} fill={top} />
      <polygon points={sp} fill={side} fillOpacity={0.92} />
    </g>
  );
}

interface DailyActivity3DChartProps {
  data: { date: string; created: number; completed: number }[];
  days: number;
  tickInterval: number;
}

function DailyActivity3DChart({ data, days, tickInterval }: DailyActivity3DChartProps) {
  const VW = 700; const VH = 200;
  const PL = 32; const PR = 16; const PT = 16; const PB = 34;
  const CW = VW - PL - PR;
  const CH = VH - PT - PB;
  const DX = 9; const DY = -5;

  const maxVal = Math.max(...data.map(d => Math.max(d.created || 0, d.completed || 0)), 1);
  const toY = (v: number) => CH - (v / maxVal) * CH;
  const bottomY = PT + CH;

  const groupW = CW / Math.max(data.length, 1);
  const bw = days > 20 ? Math.max(groupW * 0.33, 3) : Math.max(groupW * 0.28, 7);
  const gap = Math.max(groupW * 0.06, 1.5);

  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((maxVal / yTickCount) * i)
  );

  const labelEvery = tickInterval + 1;

  const [tooltip, setTooltip] = useState<{ svgX: number; svgY: number; d: typeof data[0] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const toSvgCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * VW,
      y: ((clientY - rect.top) / rect.height) * VH,
    };
  };

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        className="w-full"
        style={{ height: 200, overflow: "visible" }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* grid + y-axis labels */}
        {yTicks.map((tick) => {
          const y = PT + toY(tick);
          return (
            <g key={tick}>
              <line x1={PL} y1={y} x2={VW - PR} y2={y}
                stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={0.8} />
              <text x={PL - 5} y={y + 3.5} textAnchor="end" fontSize={9}
                fill="hsl(var(--muted-foreground))">{tick}</text>
            </g>
          );
        })}

        {/* bars */}
        {data.map((d, i) => {
          const gx = PL + i * groupW;
          const cx = gx + groupW / 2;
          const createdX = cx - bw - gap / 2;
          const completedX = cx + gap / 2;
          const cH = (d.created / maxVal) * CH;
          const doneH = (d.completed / maxVal) * CH;
          const showLabel = i % labelEvery === 0;

          return (
            <g
              key={i}
              onMouseMove={(e) => {
                const { x, y } = toSvgCoords(e.clientX, e.clientY);
                setTooltip({ svgX: x, svgY: y, d });
              }}
              style={{ cursor: "default" }}
            >
              {/* hover hit area */}
              <rect x={gx} y={PT} width={groupW} height={CH} fill="transparent" />

              <Bar3D x={createdX} bottomY={bottomY} w={bw} h={cH}
                dx={DX} dy={DY}
                front="#6366f1" top="#a5b4fc" side="#3730a3" />
              <Bar3D x={completedX} bottomY={bottomY} w={bw} h={doneH}
                dx={DX} dy={DY}
                front="#22c55e" top="#86efac" side="#15803d" />

              {showLabel && (
                <text x={cx} y={bottomY + 15} textAnchor="middle" fontSize={9}
                  fill="hsl(var(--muted-foreground))">{d.date}</text>
              )}
            </g>
          );
        })}

        {/* x-axis baseline */}
        <line x1={PL} y1={bottomY} x2={VW - PR + DX} y2={bottomY}
          stroke="hsl(var(--border))" strokeWidth={0.8} />
      </svg>

      {/* floating tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 rounded-xl border bg-card shadow-lg px-3 py-2 text-xs"
          style={{
            left: `${(tooltip.svgX / VW) * 100}%`,
            top: `${(tooltip.svgY / VH) * 100}%`,
            transform: "translate(-50%, calc(-100% - 8px))",
            minWidth: 130,
          }}
        >
          <p className="font-semibold mb-1.5">{tooltip.d.date}</p>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#6366f1" }} />
            <span className="text-muted-foreground">Created:</span>
            <span className="font-bold ml-auto">{tooltip.d.created}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: "#22c55e" }} />
            <span className="text-muted-foreground">Completed:</span>
            <span className="font-bold ml-auto">{tooltip.d.completed}</span>
          </div>
        </div>
      )}

      {/* legend */}
      <div className="flex items-center justify-center gap-5 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: "#6366f1" }} />
          Created
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: "#22c55e" }} />
          Completed
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────

const CUSTOM_TOOLTIP = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function LeaderboardSection({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useGetLeaderboard(workspaceId, {
    query: {
      queryKey: getGetLeaderboardQueryKey(workspaceId),
      refetchInterval: 60_000,
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">🏆 Team Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2 w-full" />
              </div>
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const entries = data?.leaderboard ?? [];
  const topCompleted = entries[0]?.completed ?? 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">🏆 Team Leaderboard</CardTitle>
            <CardDescription className="mt-0.5">Ranked by tasks completed · streak = consecutive active days</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className="text-4xl mb-2">👥</div>
            <p className="text-sm text-muted-foreground">No members found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, idx) => {
              const pct = topCompleted > 0 ? Math.round((entry.completed / topCompleted) * 100) : 0;
              const medal = MEDALS[idx] ?? null;
              const avatar = nameToEmoji(entry.name);
              const isTop3 = idx < 3;
              return (
                <div
                  key={entry.userId}
                  className={`relative flex items-center gap-3 rounded-xl p-3 transition-colors ${isTop3 ? "bg-muted/40 border border-border/60" : "hover:bg-muted/20"}`}
                >
                  {/* Rank */}
                  <div className="w-7 text-center flex-shrink-0">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className="text-sm font-bold text-muted-foreground">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                    idx === 0 ? "bg-amber-100 dark:bg-amber-900/30 ring-2 ring-amber-400/50" :
                    idx === 1 ? "bg-slate-100 dark:bg-slate-800/50 ring-2 ring-slate-400/40" :
                    idx === 2 ? "bg-orange-100 dark:bg-orange-900/30 ring-2 ring-orange-400/40" :
                    "bg-muted"
                  }`}>
                    {avatar}
                  </div>

                  {/* Name + progress */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm truncate">{entry.name}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 capitalize font-normal flex-shrink-0"
                      >
                        {entry.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            idx === 0 ? "bg-amber-500" :
                            idx === 1 ? "bg-slate-400" :
                            idx === 2 ? "bg-orange-500" :
                            "bg-primary/60"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {entry.inProgress > 0 && (
                          <span className="text-blue-500 mr-1">{entry.inProgress} active</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {entry.streak > 0 && (
                      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                        entry.streak >= 7 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
                        entry.streak >= 3 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        🔥 {entry.streak}d
                      </div>
                    )}
                    <div className="text-right">
                      <div className="text-lg font-black leading-none">{entry.completed}</div>
                      <div className="text-[10px] text-muted-foreground">done</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BurndownTab({ workspaceId }: { workspaceId: string }) {
  const [days, setDays] = useState(30);
  const params = { days };
  const { data, isLoading } = useGetBurndownAnalytics(workspaceId, params, {
    query: {
      queryKey: getGetBurndownAnalyticsQueryKey(workspaceId, params),
      refetchInterval: 60_000,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  const { dailyData, summary, velocity, priorityBreakdown } = data;
  const tickInterval = days <= 14 ? 1 : days <= 30 ? 4 : 9;

  const priorityData = [
    { name: "High", value: priorityBreakdown.high, color: "#ef4444" },
    { name: "Medium", value: priorityBreakdown.medium, color: "#f59e0b" },
    { name: "Low", value: priorityBreakdown.low, color: "#22c55e" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📈 Analytics</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Task velocity and burn-down trends for this workspace
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {RANGE_OPTIONS.map(opt => (
              <Button
                key={opt.days}
                variant={days === opt.days ? "default" : "ghost"}
                size="sm"
                className="h-7 px-2 sm:px-3 text-xs"
                onClick={() => setDays(opt.days)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => exportToCsv(dailyData, summary, days)}
            disabled={summary.total === 0}
            title="Export daily data as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </Button>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <ClipboardList className="h-6 w-6 mb-2 text-[#2b2b2b] dark:text-[#d4d4d4]" />
            <div className="text-3xl font-black">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <CheckCircle2 className="h-6 w-6 mb-2 text-[#2b2b2b] dark:text-[#d4d4d4]" />
            <div className="text-3xl font-black">{summary.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Completion Rate</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <Zap className="h-6 w-6 mb-2 text-[#2b2b2b] dark:text-[#d4d4d4]" />
            <div className="text-3xl font-black">{velocity}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Tasks / day (7d)</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <Clock className="h-6 w-6 mb-2 text-[#2b2b2b] dark:text-[#d4d4d4]" />
            <div className="text-3xl font-black">{summary.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard + burn-up chart side by side on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Burn-up chart takes 3 cols */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">📊 Burn-up Chart</CardTitle>
            <CardDescription>Cumulative tasks created vs completed over {days} days</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-56 text-center">
                <Sprout className="h-10 w-10 mb-3 text-[#2b2b2b] dark:text-[#d4d4d4] opacity-40" />
                <p className="font-semibold">No task data yet</p>
                <p className="text-sm text-muted-foreground mt-1">Create tasks to start tracking progress.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={dailyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={tickInterval}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
                  <Area
                    type="monotone"
                    dataKey="cumCreated"
                    name="Total Created"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#gradCreated)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumCompleted"
                    name="Completed"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fill="url(#gradCompleted)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard takes 2 cols */}
        <div className="xl:col-span-2">
          <LeaderboardSection workspaceId={workspaceId} />
        </div>
      </div>

      {/* Status rings + priority breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">🎯 Status Breakdown</CardTitle>
            <CardDescription>How tasks are distributed across columns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around flex-wrap gap-2">
              <StatRing label="Done" value={summary.done} total={summary.total} icon={CheckCircle2} color="#22c55e" />
              <StatRing label="In Progress" value={summary.inProgress} total={summary.total} icon={Clock} color="#3b82f6" />
              <StatRing label="To Do" value={summary.todo} total={summary.total} icon={Circle} color="#94a3b8" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#2b2b2b] dark:text-[#d4d4d4]" /> Priority Breakdown
          </CardTitle>
            <CardDescription>Task distribution by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Layers className="h-8 w-8 mb-2 text-[#2b2b2b] dark:text-[#d4d4d4] opacity-40" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={priorityData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CUSTOM_TOOLTIP />} />
                  <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily activity 3D bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#2b2b2b] dark:text-[#d4d4d4]" /> Daily Activity
          </CardTitle>
          <CardDescription>Tasks created and completed each day — 3D view</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <p className="text-sm text-muted-foreground">No activity in this period</p>
            </div>
          ) : (
            <DailyActivity3DChart data={dailyData} days={days} tickInterval={tickInterval} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
