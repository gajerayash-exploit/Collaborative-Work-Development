import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetWorkspace, getGetWorkspaceQueryKey } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Activity, MessageSquare, Files, Users, Settings, CheckSquare,
  Search, KeyRound, BarChart2, Network, GitBranch, Zap, Box,
} from "lucide-react";
import { OverviewTab } from "@/components/workspace/overview-tab";
import { ChatTab } from "@/components/workspace/chat-tab";
import { FilesTab } from "@/components/workspace/files-tab";
import { MembersTab } from "@/components/workspace/members-tab";
import { SettingsTab } from "@/components/workspace/settings-tab";
import { TasksTab } from "@/components/workspace/tasks-tab";
import { VaultTab } from "@/components/workspace/vault-tab";
import { BurndownTab } from "@/components/workspace/burndown-tab";
import { SRSTab } from "@/components/workspace/srs-tab";
import { SearchDialog } from "@/components/workspace/search-dialog";
import { BranchesTab } from "@/components/workspace/branches-tab";
import { SyncTab } from "@/components/workspace/sync-tab";
import { HuddleWidget } from "@/components/workspace/huddle-widget";
import { SandboxTab } from "@/components/workspace/sandbox-tab";
import { PresenceBar } from "@/components/workspace/presence-bar";
import { useWorkspaceSocket, type PresenceUser } from "@/hooks/use-workspace-socket";
import type { RtcSignal } from "@/hooks/use-huddle-rtc";

const TAB_CLASS = "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-2 pb-3 font-medium text-muted-foreground data-[state=active]:text-foreground hover:text-foreground transition-colors flex-shrink-0";

export default function WorkspaceHubPage({ id }: { id: string }) {
  const { data: workspace, isLoading } = useGetWorkspace(id, {
    query: { enabled: !!id, queryKey: getGetWorkspaceQueryKey(id) },
  });

  const search = useSearch();
  const initialTab = new URLSearchParams(search).get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchOpen, setSearchOpen] = useState(false);
  const [srsIssueCount, setSrsIssueCount] = useState(0);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // Stable ref so HuddleWidget can register its RTC signal handler without
  // forcing a re-render cycle here when it does so
  const rtcHandlerRef = useRef<((msg: RtcSignal) => void) | null>(null);
  const registerRtcHandler = useCallback(
    (fn: (msg: RtcSignal) => void) => { rtcHandlerRef.current = fn; },
    [],
  );

  const { typingUsers, sendTyping, sendMessage, myDbUserId } = useWorkspaceSocket({
    workspaceId: id,
    onPresence: setPresenceUsers,
    onRtcSignal: (msg) => rtcHandlerRef.current?.(msg),
    enabled: !!workspace,
  });

  useEffect(() => {
    const tab = new URLSearchParams(search).get("tab");
    if (tab) setActiveTab(tab);
  }, [search]);

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
        <div className="p-4 md:p-6">
          <Skeleton className="h-8 w-1/3 mb-3" />
          <Skeleton className="h-4 w-1/4 mb-6" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!workspace) {
    return (
      <AppLayout activeWorkspaceId={id}>
        <div className="flex items-center justify-center h-full p-4">
          <div className="text-center p-6 bg-card rounded-xl border border-dashed">
            <h2 className="text-lg font-bold mb-2">Workspace not found</h2>
            <p className="text-muted-foreground text-sm">The workspace you are looking for does not exist or you don't have access.</p>
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
        <header className="px-3 md:px-6 py-3 md:py-5 border-b bg-card flex-shrink-0 z-10 relative shadow-sm">
          {/* Title row */}
          <div className="flex justify-between items-center mb-3 md:mb-4 gap-2">
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight text-foreground truncate">{workspace.name}</h1>
              {workspace.description && (
                <p className="text-muted-foreground text-xs md:text-sm truncate hidden sm:block mt-0.5">{workspace.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <PresenceBar users={presenceUsers} />
              <HuddleWidget
                workspaceId={id}
                sendMessage={sendMessage}
                myDbUserId={myDbUserId}
                registerRtcHandler={registerRtcHandler}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="gap-1.5 text-muted-foreground hidden sm:flex h-8 px-2.5"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Search</span>
                <kbd className="pointer-events-none hidden lg:inline-flex h-4 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground">
                  ⌘K
                </kbd>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSearchOpen(true)}
                className="sm:hidden h-8 w-8"
              >
                <Search className="h-3.5 w-3.5" />
              </Button>
              <Badge variant={isAdmin ? "default" : "secondary"} className="capitalize px-2 py-0.5 text-xs">
                {workspace.role}
              </Badge>
            </div>
          </div>

          {/* Tabs - scrollable on mobile */}
          <div className="overflow-x-auto -mx-3 md:-mx-6 px-3 md:px-6 scrollbar-none">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-transparent h-auto p-0 justify-start rounded-none gap-4 md:gap-6 w-max min-w-full">
                <TabsTrigger value="overview" className={TAB_CLASS}>
                  <Activity className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Overview</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className={TAB_CLASS}>
                  <MessageSquare className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="tasks" className={TAB_CLASS}>
                  <CheckSquare className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Tasks</span>
                </TabsTrigger>
                <TabsTrigger value="files" className={TAB_CLASS}>
                  <Files className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Files</span>
                </TabsTrigger>
                <TabsTrigger value="branches" className={TAB_CLASS}>
                  <GitBranch className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Branches</span>
                </TabsTrigger>
                <TabsTrigger value="sync" className={TAB_CLASS}>
                  <Zap className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Sync</span>
                </TabsTrigger>
                <TabsTrigger value="sandboxes" className={TAB_CLASS}>
                  <Box className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Sandbox</span>
                </TabsTrigger>
                <TabsTrigger value="members" className={TAB_CLASS}>
                  <Users className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Members</span>
                </TabsTrigger>
                <TabsTrigger value="vault" className={TAB_CLASS}>
                  <KeyRound className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Vault</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className={TAB_CLASS}>
                  <BarChart2 className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="srs" className={TAB_CLASS}>
                  <Network className="h-4 w-4 md:mr-1.5 shrink-0" />
                  <span className="hidden sm:inline text-sm">SRS</span>
                  {srsIssueCount > 0 && (
                    <Badge variant="destructive" className="ml-1.5 h-4 min-w-4 px-1 text-[9px] font-black leading-none">
                      {srsIssueCount > 9 ? "9+" : srsIssueCount}
                    </Badge>
                  )}
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="settings" className={`${TAB_CLASS} ml-auto`}>
                    <Settings className="h-4 w-4 md:mr-1.5 shrink-0" />
                    <span className="hidden sm:inline text-sm">Settings</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Content Area */}
        {activeTab === "srs" ? (
          <div className="flex-1 overflow-hidden">
            <SRSTab workspaceId={id} role={workspace.role} onAuditCount={setSrsIssueCount} />
          </div>
        ) : activeTab === "chat" ? (
          <div className="flex-1 overflow-hidden p-3 md:p-5">
            <ChatTab workspaceId={id} role={workspace.role} wsTypingUsers={typingUsers} onTyping={sendTyping} />
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-muted/10">
            <div className="p-3 md:p-6 min-h-full max-w-6xl mx-auto">
              {activeTab === "overview" && <OverviewTab workspaceId={id} />}
              {activeTab === "files" && <FilesTab workspaceId={id} role={workspace.role} />}
              {activeTab === "members" && <MembersTab workspaceId={id} role={workspace.role} />}
              {activeTab === "tasks" && <TasksTab workspaceId={id} role={workspace.role} />}
              {activeTab === "vault" && <VaultTab workspaceId={id} role={workspace.role} />}
              {activeTab === "analytics" && <BurndownTab workspaceId={id} />}
              {activeTab === "branches" && <BranchesTab workspaceId={id} role={workspace.role} />}
              {activeTab === "sync" && <SyncTab workspaceId={id} />}
              {activeTab === "sandboxes" && <SandboxTab workspaceId={id} role={workspace.role} />}
              {isAdmin && activeTab === "settings" && <SettingsTab workspaceId={id} initialName={workspace.name} initialDescription={workspace.description ?? null} />}
            </div>
          </div>
        )}
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
