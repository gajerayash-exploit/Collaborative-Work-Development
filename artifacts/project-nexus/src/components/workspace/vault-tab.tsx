import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSecrets,
  useCreateSecret,
  useDeleteSecret,
  useRevealSecret,
  getListSecretsQueryKey,
  getRevealSecretQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  KeyRound, Plus, Eye, EyeOff, Copy, Trash2,
  ShieldCheck, Loader2, Check, RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

function RevealCell({ workspaceId, secretId }: { workspaceId: string; secretId: string; secretKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const { data, isFetching, refetch } = useRevealSecret(workspaceId, secretId, {
    query: {
      queryKey: getRevealSecretQueryKey(workspaceId, secretId),
      enabled: false,
      staleTime: Infinity,
    },
  });
  const value = (data as any)?.value ?? null;

  const handleReveal = async () => {
    if (revealed) { setRevealed(false); return; }
    await refetch();
    setRevealed(true);
  };

  return (
    <div className="flex items-center gap-2 font-mono text-sm">
      {revealed && value !== null ? (
        <>
          <span className="text-xs bg-muted px-2 py-0.5 rounded border select-all break-all max-w-[280px]">
            {value}
          </span>
          <CopyButton value={value} />
        </>
      ) : (
        <span className="text-muted-foreground tracking-[0.25em] text-base select-none">
          ••••••••••••
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 flex-shrink-0"
        onClick={handleReveal}
        disabled={isFetching}
        title={revealed ? "Hide" : "Reveal"}
      >
        {isFetching
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : revealed
          ? <EyeOff className="h-3.5 w-3.5" />
          : <Eye className="h-3.5 w-3.5" />
        }
      </Button>
    </div>
  );
}

function AddSecretDialog({
  workspaceId,
  open,
  onOpenChange,
  onSaved,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const createSecret = useCreateSecret();

  const handleSubmit = () => {
    if (!key.trim() || !value.trim()) return;
    createSecret.mutate(
      { workspaceId, data: { key: key.trim(), value: value.trim() } },
      {
        onSuccess: () => {
          setKey("");
          setValue("");
          onOpenChange(false);
          onSaved();
        },
      }
    );
  };

  const isValidKey = /^[A-Z0-9_]+$/i.test(key.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            Add Secret
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Key Name *</label>
            <Input
              value={key}
              onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
              placeholder="DATABASE_URL"
              className="font-mono"
              spellCheck={false}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only uppercase letters, numbers, and underscores.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Value *</label>
            <div className="relative">
              <Input
                type={showValue ? "text" : "password"}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="Enter secret value..."
                className="font-mono pr-10"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowValue(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Values are encrypted with AES-256-GCM before storage. Only workspace members can reveal them.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!key.trim() || !value.trim() || !isValidKey || createSecret.isPending}
          >
            {createSecret.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Secret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VaultTab({ workspaceId, role }: { workspaceId: string; role: string }) {
  const queryClient = useQueryClient();
  const { data: secrets = [], isLoading } = useListSecrets(workspaceId, {
    query: { queryKey: getListSecretsQueryKey(workspaceId) },
  });
  const deleteSecret = useDeleteSecret();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const canEdit = role !== "viewer";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListSecretsQueryKey(workspaceId) });

  const handleDelete = () => {
    if (!deleteId) return;
    deleteSecret.mutate({ workspaceId, secretId: deleteId }, { onSuccess: () => { invalidate(); setDeleteId(null); } });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Environment Vault
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Encrypted API keys and secrets — values are never exposed in transit.
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Add Secret
          </Button>
        )}
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">AES-256-GCM encrypted at rest</p>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
            {secrets.length} secret{secrets.length !== 1 ? "s" : ""} stored · Viewers cannot reveal values
          </p>
        </div>
      </div>

      {/* Secrets table */}
      {secrets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <KeyRound className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No secrets yet</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Add your first API key or environment variable to get started.
          </p>
          {canEdit && (
            <Button className="mt-4 gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Secret
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[220px]">Key</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-[140px] hidden sm:table-cell">Updated</th>
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody>
              {(secrets as any[]).map((secret, i) => (
                <tr key={secret.id} className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"} hover:bg-muted/30 transition-colors`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs px-2 py-0.5 bg-card">
                        {secret.key}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {canEdit ? (
                      <RevealCell workspaceId={workspaceId} secretId={secret.id} secretKey={secret.key} />
                    ) : (
                      <span className="text-muted-foreground tracking-[0.25em] text-base select-none">••••••••••••</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="h-3 w-3" />
                      {formatDistanceToNow(new Date(secret.updatedAt), { addSuffix: true })}
                    </div>
                  </td>
                  {canEdit && (
                    <td className="px-2 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(secret.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddSecretDialog
        workspaceId={workspaceId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={invalidate}
      />

      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this secret?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the encrypted value. Any service using this key will stop working.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
