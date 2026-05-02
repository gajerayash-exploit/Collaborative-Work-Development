import { useListWorkspaces, useCreateWorkspace, getListWorkspacesQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Plus, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { AppLayout } from "@/components/layout/app-layout";
import { Badge } from "@/components/ui/badge";

const WORKSPACE_EMOJIS = ["🚀", "⚡", "🎯", "🛠️", "💡", "🔥", "🌊", "🎨", "🦊", "🏗️", "🌐", "🧪"];

function getWorkspaceEmoji(name: string) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % WORKSPACE_EMOJIS.length;
  return WORKSPACE_EMOJIS[idx];
}

const ROLE_CONFIG = {
  admin: { label: "Admin", emoji: "👑", class: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  editor: { label: "Editor", emoji: "✏️", class: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  viewer: { label: "Viewer", emoji: "👁️", class: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
};

export default function WorkspacesPage() {
  useAuthSync();
  const { data: workspaces, isLoading } = useListWorkspaces();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <AppLayout>
      <div className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl mx-auto w-full overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              🏠 Workspaces
            </h1>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">Manage your team projects and collaborations.</p>
          </div>
          <CreateWorkspaceDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <Skeleton className="h-10 w-10 rounded-xl mb-3" />
                  <Skeleton className="h-5 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !Array.isArray(workspaces) || workspaces.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 text-center border-2 border-dashed rounded-2xl bg-muted/10 px-4">
            <div className="text-5xl sm:text-6xl mb-4">🌌</div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">No workspaces yet</h3>
            <p className="text-muted-foreground max-w-sm mb-6 text-sm">
              Create a workspace to start collaborating with your team — tasks, chat, files, and secrets all in one place.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create your first workspace
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {workspaces.map((workspace) => {
              const emoji = getWorkspaceEmoji(workspace.name);
              const role = workspace.role as keyof typeof ROLE_CONFIG;
              const roleConfig = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
              return (
                <Card key={workspace.id} className="group hover:border-primary/40 hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-xl sm:text-2xl flex-shrink-0 shadow-sm">
                        {emoji}
                      </div>
                      <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:py-1 rounded-full border ${roleConfig.class}`}>
                        {roleConfig.emoji} {roleConfig.label}
                      </span>
                    </div>
                    <CardTitle className="text-sm sm:text-base line-clamp-1 group-hover:text-primary transition-colors">{workspace.name}</CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] text-xs sm:text-sm">
                      {workspace.description || "No description provided."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto pb-3">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                      <Users className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>{workspace.memberCount} {workspace.memberCount === 1 ? "member" : "members"}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3 border-t">
                    <Link href={`/workspaces/${workspace.id}`} className="w-full">
                      <Button variant="secondary" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors text-sm h-9">
                        Open Workspace →
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}

            {/* Create new card */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-muted-foreground hover:text-primary group"
            >
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-muted/50 group-hover:bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 transition-colors">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span className="text-xs sm:text-sm font-medium">New Workspace</span>
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function CreateWorkspaceDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const createWorkspace = useCreateWorkspace();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createWorkspace.mutate(
      { data: { name, description } },
      {
        onSuccess: (workspace) => {
          queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
          onOpenChange(false);
          setName("");
          setDescription("");
          setLocation(`/workspaces/${workspace.id}`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 text-xs sm:text-sm h-9 sm:h-10 px-3 sm:px-4 flex-shrink-0">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">New</span>
          <span className="hidden sm:inline"> Workspace</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            🏗️ Create Workspace
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Workspace Name</Label>
            <Input
              id="name"
              placeholder="e.g. Engineering Team 🚀"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={createWorkspace.isPending}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="What is this workspace for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={createWorkspace.isPending}
              rows={3}
            />
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createWorkspace.isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createWorkspace.isPending} className="gap-2 w-full sm:w-auto">
              {createWorkspace.isPending ? "Creating..." : "🚀 Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
