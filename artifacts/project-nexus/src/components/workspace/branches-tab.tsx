import { useState } from "react";
import {
  useListBranches, useCreateBranch, useUpdateBranch, useDeleteBranch,
  getListBranchesQueryKey, WorkspaceRole,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GitBranch, Lock, ShieldCheck, MoreHorizontal, Plus, Trash2, Pencil, Crown, Pen, Eye } from "lucide-react";

const ROLE_CONFIG = {
  admin: {
    label: "Admin",
    icon: Crown,
    color: "from-amber-500/20 to-amber-600/10 border-amber-500/30",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    desc: "Full control: create, delete, configure",
    dot: "bg-amber-400",
  },
  editor: {
    label: "Editor",
    icon: Pen,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    badge: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    desc: "Can read, write, and merge changes",
    dot: "bg-violet-400",
  },
  viewer: {
    label: "Viewer",
    icon: Eye,
    color: "from-slate-500/20 to-slate-600/10 border-slate-500/30",
    badge: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    desc: "Read-only access to this branch",
    dot: "bg-slate-400",
  },
};

function RoleHierarchy() {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        Role Hierarchy
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["admin", "editor", "viewer"] as const).map((role) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <div
              key={role}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <RoleIcon role={role} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{cfg.label}</span>
                    <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cfg.desc}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoleIcon({ role }: { role: "admin" | "editor" | "viewer" }) {
  if (role === "admin") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
        <rect x="4" y="4.5" width="16" height="15" rx="3.5" fill="#fef3c7" />
        <path d="M6 8.2 8.7 6l2.3 2.5L13.2 6 16 8.2V17H6V8.2Z" fill="#f59e0b" />
        <path d="M6 15.6h10" stroke="#b45309" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="9" cy="10" r="0.9" fill="#fff7ed" />
        <circle cx="15" cy="10" r="0.9" fill="#fff7ed" />
      </svg>
    );
  }

  if (role === "editor") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
        <rect x="4" y="4.5" width="16" height="15" rx="3.5" fill="#f3e8ff" />
        <path d="M7 15.8 15.7 7.1l1.2 1.2L8.2 17H7v-1.2Z" fill="#7c3aed" />
        <path d="M15.7 7.1 17 5.8 18.2 7l-1.3 1.3" fill="#a855f7" />
        <path d="M7.5 9.2h5.2" stroke="#ddd6fe" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7.5 14.8h2.8" stroke="#ddd6fe" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <rect x="4" y="4.5" width="16" height="15" rx="3.5" fill="#dbeafe" />
      <path d="M7 12.8c1.1-2.2 3-3.4 5-3.4s3.9 1.2 5 3.4V17H7v-4.2Z" fill="#2563eb" />
      <path d="M8.5 11.5c.8-1.3 2-2 3.5-2s2.7.7 3.5 2" stroke="#93c5fd" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="12" cy="11.5" r="1.2" fill="#eff6ff" />
      <path d="M7.5 15.7h9" stroke="#bfdbfe" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function BranchesTab({ workspaceId, role }: { workspaceId: string; role: WorkspaceRole }) {
  const isAdmin = role === "admin";
  const qc = useQueryClient();
  const { data: branches, isLoading } = useListBranches(workspaceId, {
    query: { queryKey: getListBranchesQueryKey(workspaceId) },
  });
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [createOpen, setCreateOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", isProtected: false, allowedRoles: ["admin", "editor", "viewer"] });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListBranchesQueryKey(workspaceId) });

  const handleCreate = () => {
    if (!form.name.trim()) return;
    createBranch.mutate({ workspaceId, data: { name: form.name, description: form.description, isProtected: form.isProtected, allowedRoles: form.allowedRoles } }, {
      onSuccess: () => { invalidate(); setCreateOpen(false); setForm({ name: "", description: "", isProtected: false, allowedRoles: ["admin", "editor", "viewer"] }); },
    });
  };

  const handleDelete = (branchId: string) => {
    if (!confirm("Delete this branch?")) return;
    deleteBranch.mutate({ workspaceId, branchId }, { onSuccess: invalidate });
  };

  const toggleProtection = (branchId: string, current: boolean) => {
    updateBranch.mutate({ workspaceId, branchId, data: { isProtected: !current } }, { onSuccess: invalidate });
  };

  const toggleRole = (roleKey: string) => {
    setForm(f => ({
      ...f,
      allowedRoles: f.allowedRoles.includes(roleKey)
        ? f.allowedRoles.filter(r => r !== roleKey)
        : [...f.allowedRoles, roleKey],
    }));
  };

  const editingBranch = branches?.find(b => b.id === editBranch);

  return (
    <div className="space-y-6">
      <RoleHierarchy />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-primary" />
            Branches
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Control which roles can access each branch</p>
        </div>
        {isAdmin && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                New Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Branch</DialogTitle>
                <DialogDescription>Add a new workspace branch with custom permissions.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input placeholder="e.g. production, feature/auth" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea placeholder="What is this branch for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="resize-none h-20" />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Protected</p>
                    <p className="text-xs text-muted-foreground">Only admins can write</p>
                  </div>
                  <Switch checked={form.isProtected} onCheckedChange={v => setForm(f => ({ ...f, isProtected: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>Allowed Roles</Label>
                  <div className="flex gap-2">
                    {(["admin", "editor", "viewer"] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${form.allowedRoles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary/50"}`}
                      >
                        {ROLE_CONFIG[r].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createBranch.isPending || !form.name.trim()}>
                  {createBranch.isPending ? "Creating…" : "Create Branch"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : branches?.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-dashed bg-muted/20">
          <GitBranch className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">No branches yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdmin ? "Create branches to control who can access what." : "No branches have been created yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {branches?.map(branch => (
            <div key={branch.id} className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:bg-accent/30 transition-colors group">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <GitBranch className="h-4 w-4 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-sm font-semibold text-foreground truncate">{branch.name}</span>
                  {branch.isProtected && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] gap-0.5 border-amber-500/40 text-amber-400 bg-amber-500/10">
                      <Lock className="h-2.5 w-2.5" />
                      Protected
                    </Badge>
                  )}
                </div>
                {branch.description && (
                  <p className="text-xs text-muted-foreground truncate">{branch.description}</p>
                )}
                <div className="flex gap-1 mt-1.5">
                  {(branch.allowedRoles as string[]).map(r => (
                    <span key={r} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${ROLE_CONFIG[r as keyof typeof ROLE_CONFIG]?.badge ?? "bg-muted text-muted-foreground"}`}>
                      {ROLE_CONFIG[r as keyof typeof ROLE_CONFIG]?.label ?? r}
                    </span>
                  ))}
                </div>
              </div>
              {isAdmin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleProtection(branch.id, branch.isProtected)}>
                      <Lock className="h-3.5 w-3.5 mr-2" />
                      {branch.isProtected ? "Unprotect" : "Protect"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(branch.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
