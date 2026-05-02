import { useState, useEffect } from "react";
import { useUpdateWorkspace, useDeleteWorkspace, getGetWorkspaceQueryKey, getListWorkspacesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Check } from "lucide-react";

export function SettingsTab({ workspaceId, initialName, initialDescription }: { workspaceId: string, initialName: string, initialDescription: string | null }) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || "");
  const [isSaved, setIsSaved] = useState(false);

  const updateWorkspace = useUpdateWorkspace();
  const deleteWorkspace = useDeleteWorkspace();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    setName(initialName);
    setDescription(initialDescription || "");
  }, [initialName, initialDescription]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateWorkspace.mutate(
      { workspaceId, data: { name, description } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getGetWorkspaceQueryKey(workspaceId), updated);
          queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
          setIsSaved(true);
          setTimeout(() => setIsSaved(false), 2500);
        }
      }
    );
  };

  const handleDelete = () => {
    if (!confirm("Are you absolutely sure? This action cannot be undone and will permanently delete the workspace and all its data.")) return;

    deleteWorkspace.mutate(
      { workspaceId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListWorkspacesQueryKey() });
          setLocation("/workspaces");
        }
      }
    );
  };

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">⚙️ Workspace Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage workspace details and configuration.</p>
      </div>

      {/* General Info */}
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm">📝</span>
              General Information
            </CardTitle>
            <CardDescription>Update the workspace name and description.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={updateWorkspace.isPending}
                className="max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-desc">Description</Label>
              <Textarea
                id="workspace-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={updateWorkspace.isPending}
                placeholder="Describe what this workspace is for..."
                className="resize-none"
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/20 border-t px-6 py-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              {isSaved ? (
                <>
                  <span className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Check className="h-3 w-3 text-emerald-600" />
                  </span>
                  <span className="text-emerald-600 font-medium">Saved successfully!</span>
                </>
              ) : "Remember to save your changes."}
            </p>
            <Button
              type="submit"
              disabled={!name.trim() || updateWorkspace.isPending || (name === initialName && description === (initialDescription || ""))}
              className="gap-2"
            >
              {updateWorkspace.isPending
                ? "Saving..."
                : <><Save className="h-4 w-4" /> Save Changes</>
              }
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <span className="h-7 w-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-sm">☢️</span>
            Danger Zone
          </CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 mb-4">
            <div className="flex gap-3">
              <div className="text-2xl">⚠️</div>
              <div>
                <p className="text-sm font-semibold text-destructive mb-1">Permanently delete workspace</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will permanently delete all files, messages, tasks, secrets, and member associations. <strong>This data cannot be recovered.</strong>
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteWorkspace.isPending}
            className="gap-2"
          >
            {deleteWorkspace.isPending
              ? "Deleting..."
              : <>🗑️ Delete Workspace</>
            }
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
