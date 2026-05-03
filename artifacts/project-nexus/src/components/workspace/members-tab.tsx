import { useState } from "react";
import {
  useListWorkspaceMembers,
  useInviteMember,
  useUpdateMemberRole,
  useRemoveMember,
  getListWorkspaceMembersQueryKey,
  WorkspaceRole
} from "@workspace/api-client-react";
import { InviteLinkSection } from "./invite-link-section";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Mail, MoreHorizontal, Send, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ROLE_CONFIG = {
  admin: { emoji: "👑", label: "Admin", class: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  editor: { emoji: "✏️", label: "Editor", class: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800" },
  viewer: { emoji: "👁️", label: "Viewer", class: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700" },
};

export function MembersTab({ workspaceId, role }: { workspaceId: string, role: WorkspaceRole }) {
  const isAdmin = role === "admin";
  const { data: members, isLoading } = useListWorkspaceMembers(workspaceId, {
    query: { queryKey: getListWorkspaceMembersQueryKey(workspaceId) }
  });

  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const queryClient = useQueryClient();

  const handleRoleChange = (memberId: string, newRole: "admin" | "editor" | "viewer") => {
    updateRole.mutate({ workspaceId, memberId, data: { role: newRole } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) })
    });
  };

  const handleRemove = (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    removeMember.mutate({ workspaceId, memberId }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) })
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">👥 Team Members</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage access and roles for your workspace.</p>
        </div>
        {isAdmin && <InviteMemberDialog workspaceId={workspaceId} />}
      </div>

      {isAdmin && (
        <div className="border rounded-xl bg-card p-4 shadow-sm">
          <InviteLinkSection workspaceId={workspaceId} />
        </div>
      )}

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="divide-y">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
                <Skeleton className="h-9 w-24" />
              </div>
            ))
          ) : members?.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-muted-foreground">No members found.</p>
            </div>
          ) : (
            members?.map((member) => {
              const rc = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG] ?? ROLE_CONFIG.viewer;
              return (
                <div key={member.id} className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-border">
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback className="font-bold bg-gradient-to-br from-primary/20 to-primary/5 text-primary">
                        {member.user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{member.user.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {member.user.email} · Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isAdmin ? (
                      <Select
                        value={member.role}
                        onValueChange={(val: "admin" | "editor" | "viewer") => handleRoleChange(member.id, val)}
                        disabled={updateRole.isPending}
                      >
                        <SelectTrigger className="w-[120px] h-8 border-none bg-muted/50 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-2">
                              <RoleMemberIcon role="admin" />
                              Admin
                            </span>
                          </SelectItem>
                          <SelectItem value="editor">
                            <span className="flex items-center gap-2">
                              <RoleMemberIcon role="editor" />
                              Editor
                            </span>
                          </SelectItem>
                          <SelectItem value="viewer">
                            <span className="flex items-center gap-2">
                              <RoleMemberIcon role="viewer" />
                              Viewer
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}

                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive gap-2" onSelect={() => handleRemove(member.id)}>
                            <Trash2 className="h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function RoleMemberIcon({ role }: { role: "admin" | "editor" | "viewer" }) {
  if (role === "admin") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" fill="none">
        <path d="M4.5 7.5 7.8 10 12 5.8l4.2 4.2 3.3-2.5V17H4.5V7.5Z" fill="#f59e0b" />
        <path d="M6 16.2h12" stroke="#c2410c" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M7.5 8.7h9" stroke="#fed7aa" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }

  if (role === "editor") {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" fill="none">
        <path d="M4.8 15.8 15.7 4.9l3.4 3.4L8.2 18.4H4.8v-2.6Z" fill="#7c3aed" />
        <path d="M15.2 5.4 17 3.6l3.4 3.4-1.8 1.8" fill="#a78bfa" />
        <path d="M7.2 10.2h4.5" stroke="#ddd6fe" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden="true" fill="none">
      <path d="M5 12c1.3-2.6 3.6-4.4 7-4.4s5.7 1.8 7 4.4c-1.3 2.6-3.6 4.4-7 4.4S6.3 14.6 5 12Z" fill="#2563eb" />
      <circle cx="12" cy="12" r="1.3" fill="#ffffff" />
      <path d="M8 8.7h3.6" stroke="#bfdbfe" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function InviteMemberDialog({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const inviteMember = useInviteMember();
  const queryClient = useQueryClient();

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    inviteMember.mutate({ workspaceId, data: { email, role } }, {
      onSuccess: () => {
        setOpen(false);
        setEmail("");
        setRole("editor");
        queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Invite Member
          </DialogTitle>
          <DialogDescription>
            Invite a teammate to collaborate in this workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              Role
            </Label>
            <Select value={role} onValueChange={(val: "editor" | "viewer") => setRole(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor — can upload files and chat</SelectItem>
                <SelectItem value="viewer">Viewer — read-only access</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!email || inviteMember.isPending} className="gap-2">
              <Send className="h-4 w-4" />
              {inviteMember.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
