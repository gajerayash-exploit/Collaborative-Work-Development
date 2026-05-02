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
import { UserPlus, MoreHorizontal, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
      }
    });
  };

  const handleRemove = (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    removeMember.mutate({ workspaceId, memberId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListWorkspaceMembersQueryKey(workspaceId) });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Workspace Members</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage team access and roles.</p>
        </div>
        {isAdmin && <InviteMemberDialog workspaceId={workspaceId} />}
      </div>

      {isAdmin && (
        <div className="border rounded-lg bg-card p-4 shadow-sm">
          <InviteLinkSection workspaceId={workspaceId} />
        </div>
      )}

      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
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
             <div className="p-8 text-center text-muted-foreground">No members found.</div>
          ) : (
            members?.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={member.user.avatarUrl || undefined} />
                    <AvatarFallback>{member.user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium">{member.user.name}</span>
                    <span className="text-xs text-muted-foreground">{member.user.email} &middot; Joined {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {isAdmin ? (
                    <Select 
                      value={member.role} 
                      onValueChange={(val: "admin" | "editor" | "viewer") => handleRoleChange(member.id, val)}
                      disabled={updateRole.isPending}
                    >
                      <SelectTrigger className="w-[110px] h-9 border-none bg-muted/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="text-sm px-3 py-1 bg-muted rounded-md capitalize">{member.role}</div>
                  )}

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleRemove(member.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove Member
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
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
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Invite a new member to collaborate in this workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
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
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(val: "editor" | "viewer") => setRole(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor - Can upload files and chat</SelectItem>
                <SelectItem value="viewer">Viewer - Can only view files and read chat</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!email || inviteMember.isPending}>
              {inviteMember.isPending ? "Inviting..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
