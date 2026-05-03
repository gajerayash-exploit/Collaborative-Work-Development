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
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true" fill="currentColor">
        <path d="M12.0001 4.79998C10.7901 4.79998 9.80009 5.79 9.80009 7C9.80009 7.28 9.85009 7.54 9.95009 7.78L6.60009 10.89L4.52009 8.81L3.00009 10.33L4.74009 16.5H19.2601L21.0001 10.33L19.4801 8.81L17.4001 10.89L14.0501 7.78C14.1501 7.54 14.2001 7.28 14.2001 7C14.2001 5.79 13.2101 4.79998 12.0001 4.79998ZM12.0001 5.79998C12.6601 5.79998 13.2001 6.33998 13.2001 7C13.2001 7.66 12.6601 8.2 12.0001 8.2C11.3401 8.2 10.8001 7.66 10.8001 7C10.8001 6.33998 11.3401 5.79998 12.0001 5.79998ZM7.17009 12.05L9.99009 14.87L12.0001 11.95L14.0101 14.87L16.8301 12.05L17.8801 15.5H6.12009L7.17009 12.05ZM5.00009 17.5H19.0001V19.5H5.00009V17.5Z" />
      </svg>
    );
  }

  if (role === "editor") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
        <path d="M4 16.5 15.5 5l4.5 4.5L8.5 21H4v-4.5z" fill="#ec4899" />
        <path d="M4 16.5 15.5 5v11.5L8.5 21H4v-4.5z" fill="#db2777" />
        <path d="M15.5 5L20 9.5l-2 2L13.5 7l2-2z" fill="#9d174d" />
        <path d="M5.5 18.5H8" stroke="#fce7f3" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" aria-hidden="true">
      <path d="M12 5c4.5 0 8 3.1 8 7s-3.5 7-8 7-8-3.1-8-7 3.5-7 8-7z" fill="#38bdf8" />
      <path d="M7.5 7.5A7.5 7.5 0 0 1 16.5 16.5" fill="#0ea5e9" opacity="0.85" />
      <path d="M12 7.5c2.5 0 4.5 2 4.5 4.5S14.5 16.5 12 16.5 7.5 14.5 7.5 12 9.5 7.5 12 7.5z" fill="#e0f2fe" opacity="0.95" />
      <circle cx="12" cy="12" r="1.4" fill="#0369a1" />
      <path d="M6 18l2.2-2.2M15.8 18L18 15.8" stroke="#075985" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
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
