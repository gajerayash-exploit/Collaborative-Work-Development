import { useState, useEffect } from "react";
import { useUpdateWorkspace, useDeleteWorkspace, getGetWorkspaceQueryKey, getListWorkspacesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Trash2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
          setTimeout(() => setIsSaved(false), 2000);
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
        <h2 className="text-xl font-bold">Workspace Settings</h2>
        <p className="text-muted-foreground text-sm mt-1">Manage workspace details and configuration.</p>
      </div>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>General Information</CardTitle>
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
              />
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 border-t px-6 py-4 flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {isSaved ? "Saved successfully." : "Remember to save your changes."}
            </p>
            <Button type="submit" disabled={!name.trim() || updateWorkspace.isPending || (name === initialName && description === (initialDescription || ""))}>
              {updateWorkspace.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
            </Button>
          </CardFooter>
        </Card>
      </form>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Destructive actions that cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4 bg-destructive/5 border-destructive/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning</AlertTitle>
            <AlertDescription>
              Deleting this workspace will permanently remove all files, messages, and member associations. This data cannot be recovered.
            </AlertDescription>
          </Alert>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteWorkspace.isPending}>
            {deleteWorkspace.isPending ? "Deleting..." : <><Trash2 className="h-4 w-4 mr-2" /> Delete Workspace</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
