import { useState } from "react";
import { useGetBurndownAnalytics, getGetBurndownAnalyticsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "60 days", days: 60 },
];

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

function StatRing({ label, value, total, emoji, color }: { label: string; value: number; total: number; emoji: string; color: string }) {
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
          <span>{emoji}</span>
          <span className="text-xl font-black">{value}</span>
        </div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

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
      </div>
    );
  }

  if (!data) return null;

  const { dailyData, summary, velocity, priorityBreakdown } = data;

  // Only show ticks every N days to avoid crowding
  const tickInterval = days <= 14 ? 1 : days <= 30 ? 4 : 9;

  const priorityData = [
    { name: "🔴 High", value: priorityBreakdown.high, color: "#ef4444" },
    { name: "🟡 Medium", value: priorityBreakdown.medium, color: "#f59e0b" },
    { name: "🟢 Low", value: priorityBreakdown.low, color: "#22c55e" },
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
        <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 p-1">
          {RANGE_OPTIONS.map(opt => (
            <Button
              key={opt.days}
              variant={days === opt.days ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setDays(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <div className="text-3xl mb-1">📋</div>
            <div className="text-3xl font-black">{summary.total}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Total Tasks</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-3xl font-black">{summary.completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Completion Rate</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <div className="text-3xl mb-1">⚡</div>
            <div className="text-3xl font-black">{velocity}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">Tasks / day (7d)</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/10" />
          <CardContent className="pt-5 pb-4 relative z-10">
            <div className="text-3xl mb-1">🔄</div>
            <div className="text-3xl font-black">{summary.inProgress}</div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">In Progress</p>
          </CardContent>
        </Card>
      </div>

      {/* Main burn-up chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">📊 Burn-up Chart</CardTitle>
          <CardDescription>Cumulative tasks created vs completed over the last {days} days</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <div className="text-5xl mb-3">🌱</div>
              <p className="font-semibold">No task data yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create tasks to start tracking progress.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
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
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  iconType="circle"
                  iconSize={8}
                />
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

      {/* Bottom row: progress rings + priority breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status rings */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">🎯 Status Breakdown</CardTitle>
            <CardDescription>How tasks are distributed across columns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around flex-wrap gap-2">
              <StatRing label="Done" value={summary.done} total={summary.total} emoji="✅" color="#22c55e" />
              <StatRing label="In Progress" value={summary.inProgress} total={summary.total} emoji="🔄" color="#3b82f6" />
              <StatRing label="To Do" value={summary.todo} total={summary.total} emoji="⭕" color="#94a3b8" />
            </div>
          </CardContent>
        </Card>

        {/* Priority breakdown bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">🚦 Priority Breakdown</CardTitle>
            <CardDescription>Task distribution by priority level</CardDescription>
          </CardHeader>
          <CardContent>
            {summary.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="text-4xl mb-2">📭</div>
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

      {/* Daily activity bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">📅 Daily Activity</CardTitle>
          <CardDescription>Tasks created and completed each day</CardDescription>
        </CardHeader>
        <CardContent>
          {summary.total === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <div className="text-4xl mb-2">🏝️</div>
              <p className="text-sm text-muted-foreground">No activity in this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={days > 20 ? 6 : 14} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Bar dataKey="created" name="Created" fill="#6366f1" fillOpacity={0.7} radius={[3, 3, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#22c55e" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
