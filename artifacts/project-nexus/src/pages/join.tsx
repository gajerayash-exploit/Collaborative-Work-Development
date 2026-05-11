import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthSync } from "@/hooks/use-auth-sync";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { AppLayout } from "@/components/layout/app-layout";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function JoinPage({ inviteCode }: { inviteCode: string }) {
  useAuthSync();
  const authenticatedFetch = useAuthenticatedFetch();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<
    "loading" | "success" | "already" | "error"
  >("loading");
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!inviteCode) return;
    authenticatedFetch(`/api/join/${inviteCode}`, { method: "GET" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Invalid invite link");
        }
        return res.json();
      })
      .then((data) => {
        setWorkspaceId(data.workspaceId);
        setStatus(data.alreadyMember ? "already" : "success");
      })
      .catch((err) => {
        setErrorMsg(err.message);
        setStatus("error");
      });
  }, [inviteCode, authenticatedFetch]);

  return (
    <AppLayout>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <h2 className="text-xl font-semibold">Joining workspace...</h2>
              <p className="text-muted-foreground text-sm">
                Please wait while we process your invite.
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-semibold">You've joined!</h2>
              <p className="text-muted-foreground text-sm">
                You've been added as a viewer. An admin can upgrade your role at
                any time.
              </p>
              <Button onClick={() => setLocation(`/workspaces/${workspaceId}`)}>
                Open Workspace
              </Button>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="h-12 w-12 text-blue-500 mx-auto" />
              <h2 className="text-xl font-semibold">Already a member</h2>
              <p className="text-muted-foreground text-sm">
                You're already in this workspace.
              </p>
              <Button onClick={() => setLocation(`/workspaces/${workspaceId}`)}>
                Open Workspace
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <h2 className="text-xl font-semibold">Invite not found</h2>
              <p className="text-muted-foreground text-sm">
                {errorMsg || "This invite link is invalid or has been revoked."}
              </p>
              <Button
                variant="outline"
                onClick={() => setLocation("/workspaces")}
              >
                Go to Workspaces
              </Button>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
