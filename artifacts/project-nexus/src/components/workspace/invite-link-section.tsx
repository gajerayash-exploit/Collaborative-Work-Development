import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link2, Copy, RefreshCw, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InviteLinkSectionProps {
  workspaceId: string;
}

export function InviteLinkSection({ workspaceId }: InviteLinkSectionProps) {
  const [inviteCode, setInviteCode] = useState<string | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/invite-code`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setInviteCode(data.inviteCode ?? null);
      })
      .catch(() => setInviteCode(null));
  }, [workspaceId]);

  const inviteUrl = inviteCode
    ? `${window.location.origin}${import.meta.env.BASE_URL}join/${inviteCode}`
    : null;

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite-code`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      setInviteCode(data.inviteCode);
      toast({ title: "Invite link created", description: "Share it with anyone you want to invite." });
    } catch {
      toast({ title: "Error", description: "Could not generate invite link.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Revoke this invite link? Anyone with the old link won't be able to join.")) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite-code`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to revoke");
      setInviteCode(null);
      toast({ title: "Invite link revoked" });
    } catch {
      toast({ title: "Error", description: "Could not revoke invite link.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied!", description: "Invite link copied to clipboard." });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Invite Link</span>
      </div>

      {inviteCode === undefined ? (
        <div className="h-9 bg-muted animate-pulse rounded-md" />
      ) : inviteUrl ? (
        <div className="flex gap-2">
          <Input value={inviteUrl} readOnly className="font-mono text-xs text-muted-foreground" />
          <Button variant="outline" size="icon" onClick={handleCopy} disabled={isLoading}>
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={handleGenerate} disabled={isLoading} title="Regenerate link">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleRevoke} disabled={isLoading} title="Revoke link" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground flex-1">No invite link active. Generate one to let anyone join.</p>
          <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isLoading}>
            {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Generate Link
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Anyone with this link can join as a viewer. You can revoke it at any time.</p>
    </div>
  );
}
