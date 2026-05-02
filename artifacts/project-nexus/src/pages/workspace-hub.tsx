import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetWorkspace, getGetWorkspaceQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Activity, MessageSquare, Files, Users, Settings, CheckSquare, Search } from "lucide-react";
import { OverviewTab } from "@/components/workspace/overview-tab";
import { ChatTab } from "@/components/workspace/chat-tab";
import { FilesTab } from "@/components/workspace/files-tab";
import { MembersTab } from "@/components/workspace/members-tab";
import { SettingsTab } from "@/components/workspace/settings-tab";
import { TasksTab } from "@/components/workspace/tasks-tab";
import { SearchDialog } from "@/components/workspace/search-dialog";

export default function WorkspaceHubPage({ id }: { id: string }) {
  const { data: workspace, isLoading } = useGetWorkspace(id, {
    query: { enabled: !!id, queryKey: getGetWorkspaceQueryKey(id) },
  });

  const [activeTab, setActiveTab] = useState("overview");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isLoading) {
    return (
      <AppLayout activeWorkspaceId={id}>
        <div className="p-6">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-4 w-1/4 mb-8" />
          <Skeleton className="h-10 w-full mb-6" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!workspace) {
    return (
      <AppLayout activeWorkspaceId={id}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center p-8 bg-card rounded-xl border border-dashed">
            <h2 className="text-xl font-bold mb-2">Workspace not found</h2>
            <p className="text-muted-foreground">The workspace you are looking for does not exist or you don't have access.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isAdmin = workspace.role === "admin";

  return (
    <AppLayout activeWorkspaceId={id}>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="px-6 py-5 border-b bg-card flex-shrink-0 z-10 relative shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">{workspace.name}</h1>
              <p className="text-muted-foreground max-w-2xl">{workspace.description || "No description provided."}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="gap-2 text-muted-foreground hidden sm:flex"
              >
                <Search className="h-3.5 w-3.5" />
                Search
                <kbd className="ml-1 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="sm:hidden"
              >
                <Search className="h-4 w-4" />
              </Button>
              <Badge variant={isAdmin ? "default" : "secondary"} className="capitalize px-3 py-1 shadow-sm">
                {workspace.role}
              </Badge>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-transparent h-auto p-0 w-full justify-start rounded-none space-x-6">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <Activity className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger 
                value="files" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <Files className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger 
                value="members" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <Users className="h-4 w-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger 
                value="tasks" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger 
                  value="settings" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-muted/10 relative">
          <div className="absolute inset-0 bg-grid-slate-900/[0.04] bg-[bottom_1px_center] dark:bg-grid-slate-400/[0.05] pointer-events-none" />
          <div className="p-6 h-full max-w-6xl mx-auto relative z-10">
            {activeTab === "overview" && <OverviewTab workspaceId={id} />}
            {activeTab === "chat" && <ChatTab workspaceId={id} role={workspace.role} />}
            {activeTab === "files" && <FilesTab workspaceId={id} role={workspace.role} />}
            {activeTab === "members" && <MembersTab workspaceId={id} role={workspace.role} />}
            {activeTab === "tasks" && <TasksTab workspaceId={id} role={workspace.role} />}
            {isAdmin && activeTab === "settings" && <SettingsTab workspaceId={id} initialName={workspace.name} initialDescription={workspace.description ?? null} />}
          </div>
        </div>
      </div>

      <SearchDialog
        workspaceId={id}
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigate={(tab) => setActiveTab(tab)}
      />
    </AppLayout>
  );
}
