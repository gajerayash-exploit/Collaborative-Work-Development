import { useState, useEffect, useRef } from "react";
import {
  useListSandboxes, useCreateSandbox, useDeleteSandbox, useToggleSandboxPitchMode,
  useGetSandbox, getListSandboxesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Box, Plus, ExternalLink, Trash2, MoreHorizontal, Presentation,
  Loader2, CheckCircle2, XCircle, Zap, Copy, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { WorkspaceRole } from "@workspace/api-client-react";

const FRAMEWORKS = [
  { id: "react-vite", label: "React + Vite", icon: "⚛️", desc: "Fast SPA with Vite bundler" },
  { id: "nextjs", label: "Next.js", icon: "▲", desc: "Full-stack React framework" },
  { id: "express-api", label: "Express API", icon: "🚀", desc: "REST API with Express.js" },
  { id: "vue-vite", label: "Vue + Vite", icon: "💚", desc: "Vue 3 with Vite" },
  { id: "svelte", label: "Svelte", icon: "🔶", desc: "Svelte + Vite setup" },
] as const;

const STATUS_CONFIG = {
  creating: { label: "Creating", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: Loader2, spin: true },
  running: { label: "Running", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2, spin: false },
  stopped: { label: "Stopped", color: "text-slate-400", bg: "bg-slate-500/10 border-slate-500/20", icon: XCircle, spin: false },
  error: { label: "Error", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle, spin: false },
};

function CreatingAnimation() {
  const steps = [
    "Provisioning cloud container…",
    "Installing dependencies…",
    "Compiling source files…",
    "Starting dev server…",
    "Generating preview URL…",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep(s => Math.min(s + 1, steps.length - 1)), 800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-2">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2.5 text-xs">
          {i < step ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
          ) : i === step ? (
            <Loader2 className="h-3.5 w-3.5 text-amber-400 animate-spin flex-shrink-0" />
          ) : (
            <div className="h-3.5 w-3.5 rounded-full border border-border flex-shrink-0" />
          )}
          <span className={i <= step ? "text-foreground" : "text-muted-foreground/50"}>{s}</span>
        </div>
      ))}
    </div>
  );
}

function SandboxCard({ sandbox, workspaceId, role }: {
  sandbox: any; workspaceId: string; role: WorkspaceRole;
}) {
  const qc = useQueryClient();
  const deleteSandbox = useDeleteSandbox();
  const togglePitchMode = useToggleSandboxPitchMode();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const canEdit = role !== "viewer";
  const status = STATUS_CONFIG[sandbox.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.stopped;
  const Icon = status.icon;

  const invalidate = () => qc.invalidateQueries({ queryKey: getListSandboxesQueryKey(workspaceId) });

  const handleDelete = () => {
    if (!confirm(`Delete sandbox "${sandbox.name}"?`)) return;
    deleteSandbox.mutate({ workspaceId, sandboxId: sandbox.id }, { onSuccess: invalidate });
  };

  const handlePitchMode = (enabled: boolean) => {
    togglePitchMode.mutate({ workspaceId, sandboxId: sandbox.id, data: { enabled } }, { onSuccess: invalidate });
  };

  const copyUrl = () => {
    if (!sandbox.previewUrl) return;
    navigator.clipboard.writeText(sandbox.previewUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const fw = FRAMEWORKS.find(f => f.id === sandbox.framework);

  return (
    <div className={`rounded-xl border bg-card overflow-hidden group transition-all hover:shadow-md ${sandbox.pitchMode ? "ring-1 ring-violet-500/40" : ""}`}>
      {/* Card header */}
      <div className="px-4 py-3 border-b bg-muted/20 flex items-center gap-3">
        <div className="text-lg w-8 text-center">{fw?.icon ?? "📦"}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{sandbox.name}</p>
          <p className="text-xs text-muted-foreground">{fw?.label ?? sandbox.framework}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {sandbox.pitchMode && (
            <Badge className="text-[10px] h-4 px-1.5 gap-0.5 bg-violet-500/20 text-violet-400 border-violet-500/30 hover:bg-violet-500/20">
              <Presentation className="h-2.5 w-2.5" />
              Pitch
            </Badge>
          )}
          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 border ${status.bg} ${status.color}`}>
            <Icon className={`h-2.5 w-2.5 mr-0.5 ${status.spin ? "animate-spin" : ""}`} />
            {status.label}
          </Badge>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Delete sandbox
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {sandbox.status === "creating" && <CreatingAnimation />}

        {sandbox.status === "running" && sandbox.previewUrl && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/40 border px-3 py-2">
            <span className="text-xs font-mono text-muted-foreground flex-1 truncate">{sandbox.previewUrl}</span>
            <button onClick={copyUrl} className="text-muted-foreground hover:text-foreground transition-colors">
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <a href={sandbox.previewUrl} target="_blank" rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {sandbox.creatorName && <span>by {sandbox.creatorName} · </span>}
            {formatDistanceToNow(new Date(sandbox.createdAt), { addSuffix: true })}
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 text-xs">
              <Presentation className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Pitch Mode</span>
              <Switch
                checked={sandbox.pitchMode}
                onCheckedChange={handlePitchMode}
                className="scale-75"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SandboxTab({ workspaceId, role }: { workspaceId: string; role: WorkspaceRole }) {
  const qc = useQueryClient();
  const { data: sandboxes, isLoading } = useListSandboxes(workspaceId, {
    query: { queryKey: getListSandboxesQueryKey(workspaceId), refetchInterval: 3000 },
  });
  const createSandbox = useCreateSandbox();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState<string>("react-vite");

  const canCreate = role !== "viewer";

  const handleCreate = () => {
    if (!name.trim()) return;
    createSandbox.mutate({ workspaceId, data: { name, framework } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListSandboxesQueryKey(workspaceId) });
        setCreateOpen(false);
        setName("");
        setFramework("react-vite");
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="rounded-xl border bg-gradient-to-br from-violet-500/10 to-purple-600/5 border-violet-500/20 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1">One-Click Sandbox</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Spin up a live cloud environment in seconds. Share a preview URL with your team or use <strong>Pitch Mode</strong> to show investors without exposing source code.
            </p>
          </div>
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5 flex-shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                  New Sandbox
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Sandbox</DialogTitle>
                  <DialogDescription>Launch a cloud environment with live preview in seconds.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-1.5">
                    <Label>Sandbox Name</Label>
                    <Input placeholder="e.g. Frontend Demo, API v2" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Framework</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {FRAMEWORKS.map(fw => (
                        <button
                          key={fw.id}
                          type="button"
                          onClick={() => setFramework(fw.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${framework === fw.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        >
                          <span className="text-xl w-7 text-center">{fw.icon}</span>
                          <div>
                            <p className="text-sm font-medium">{fw.label}</p>
                            <p className="text-xs text-muted-foreground">{fw.desc}</p>
                          </div>
                          {framework === fw.id && <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createSandbox.isPending || !name.trim()} className="gap-1.5">
                    {createSandbox.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Launching…</> : <><Zap className="h-3.5 w-3.5" />Launch Sandbox</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Sandbox list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2].map(i => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
        </div>
      ) : sandboxes?.length === 0 ? (
        <div className="text-center py-14 rounded-xl border border-dashed bg-muted/20">
          <Box className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">No sandboxes yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {canCreate ? "Create your first sandbox to get a live preview URL." : "No sandboxes have been created yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {sandboxes?.map(sb => (
            <SandboxCard key={sb.id} sandbox={sb} workspaceId={workspaceId} role={role} />
          ))}
        </div>
      )}
    </div>
  );
}
