import { useState, useEffect } from "react";
import {
  useListSyncEvents, usePushSyncEvent, getListSyncEventsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Zap, Copy, Check, FilePlus, FilePen, Trash2, RefreshCw, Terminal } from "lucide-react";

const ACTION_CONFIG = {
  created: { icon: FilePlus, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Created" },
  modified: { icon: FilePen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Modified" },
  deleted: { icon: Trash2, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Deleted" },
};

function PulseIndicator({ active }: { active: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
    </span>
  );
}

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
}

export function SyncTab({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const { data: events, isLoading, refetch } = useListSyncEvents(workspaceId, {
    query: { queryKey: getListSyncEventsQueryKey(workspaceId), refetchInterval: 5000 },
  });
  const pushSync = usePushSyncEvent();

  const [copied, setCopied] = useState(false);
  const [testFile, setTestFile] = useState("src/index.ts");
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!events) return;
    const recent = events.filter(e => {
      const age = Date.now() - new Date(e.pushedAt).getTime();
      return age < 8000;
    });
    if (recent.length > 0) {
      setPulsingIds(new Set(recent.map(e => e.id)));
      const t = setTimeout(() => setPulsingIds(new Set()), 6000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [events]);

  const domain = window.location.origin;
  const agentCommand = `npx nexus-sync-agent --workspace ${workspaceId} --server ${domain}/api --token YOUR_API_TOKEN --watch ./src`;

  const copyCommand = () => {
    navigator.clipboard.writeText(agentCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestPush = () => {
    const parts = testFile.split("/");
    pushSync.mutate({
      workspaceId,
      data: { fileName: parts[parts.length - 1], filePath: testFile, action: "modified" },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSyncEventsQueryKey(workspaceId) });
      },
    });
  };

  const liveCount = events?.filter(e => Date.now() - new Date(e.pushedAt).getTime() < 30000).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <PulseIndicator active={liveCount > 0} />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {liveCount > 0 ? `${liveCount} live update${liveCount !== 1 ? "s" : ""} in the last 30s` : "No recent activity"}
          </p>
          <p className="text-xs text-muted-foreground">Live-sync engine is watching for file changes</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Sync Agent Setup */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Sync Agent Setup</span>
          <Badge variant="secondary" className="ml-auto text-[10px]">Step 1</Badge>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Run the Nexus Sync Agent locally. It watches your project files and pushes changes to this workspace in real time — like CTRL+S for your whole team.
          </p>
          <div className="rounded-lg bg-[#0d0d1a] border border-border/50 p-3 flex items-start gap-3">
            <span className="text-muted-foreground text-xs font-mono mt-0.5 select-none">$</span>
            <code className="text-xs font-mono text-violet-300 flex-1 break-all leading-relaxed">{agentCommand}</code>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={copyCommand}>
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Replace <code className="bg-muted px-1 rounded text-[10px]">YOUR_API_TOKEN</code> with a token from your profile settings.</p>
        </div>
      </div>

      {/* Test push */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Simulate a Push</span>
          <Badge variant="secondary" className="ml-auto text-[10px]">Test</Badge>
        </div>
        <div className="p-4 flex gap-2">
          <Input
            placeholder="src/index.ts"
            value={testFile}
            onChange={e => setTestFile(e.target.value)}
            className="font-mono text-sm h-9"
          />
          <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={handleTestPush} disabled={pushSync.isPending}>
            <Zap className="h-3.5 w-3.5" />
            {pushSync.isPending ? "Pushing…" : "Push"}
          </Button>
        </div>
      </div>

      {/* Live feed */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <span>Live Sync Feed</span>
          {events && events.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{events.length}</Badge>
          )}
        </h3>

        {isLoading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : events?.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed bg-muted/20">
            <Zap className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">No sync events yet</p>
            <p className="text-xs text-muted-foreground mt-1">Run the Sync Agent or simulate a push above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events?.map(event => {
              const cfg = ACTION_CONFIG[event.action as keyof typeof ACTION_CONFIG] ?? ACTION_CONFIG.modified;
              const Icon = cfg.icon;
              const isPulsing = pulsingIds.has(event.id);
              return (
                <div
                  key={event.id}
                  className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-500 ${isPulsing ? "ring-1 ring-primary/40 bg-primary/5" : ""}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center ${cfg.bg}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground truncate">{event.fileName}</span>
                      {isPulsing && <PulseIndicator active />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{event.filePath}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.pushedAt), { addSuffix: true })}</p>
                      {event.pusherName && (
                        <p className="text-[10px] text-muted-foreground/70 truncate max-w-20">{event.pusherName}</p>
                      )}
                    </div>
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={event.pusherAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-[9px]">{getInitials(event.pusherName)}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
