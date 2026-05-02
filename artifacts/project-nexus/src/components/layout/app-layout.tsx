import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListWorkspaces } from "@workspace/api-client-react";
import { LayoutDashboard, LogOut, ChevronDown, User, Check } from "lucide-react";
import { NotificationBell } from "./notification-bell";
import { useClerk, useUser } from "@clerk/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface AppLayoutProps {
  children: ReactNode;
  activeWorkspaceId?: string;
}

export function AppLayout({ children, activeWorkspaceId }: AppLayoutProps) {
  const { data: workspaces, isLoading } = useListWorkspaces();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId);

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-sidebar flex flex-col flex-shrink-0">
        {/* Workspace Switcher */}
        <div className="p-4 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between px-2 py-1.5 h-auto font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                <div className="flex items-center gap-2 truncate">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {activeWorkspace ? (
                      <span className="text-xs font-bold text-primary">{activeWorkspace.name.substring(0, 2).toUpperCase()}</span>
                    ) : (
                      <LayoutDashboard className="h-3 w-3 text-primary" />
                    )}
                  </div>
                  <span className="truncate text-sm font-medium">
                    {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <ScrollArea className="h-48">
                {isLoading ? (
                  <div className="p-2 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : workspaces?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No workspaces
                  </div>
                ) : (
                  workspaces?.map((w) => (
                    <DropdownMenuItem
                      key={w.id}
                      onSelect={() => setLocation(`/workspaces/${w.id}`)}
                      className="justify-between"
                    >
                      <span className="truncate">{w.name}</span>
                      {w.id === activeWorkspaceId && <Check className="h-4 w-4 ml-2" />}
                    </DropdownMenuItem>
                  ))
                )}
              </ScrollArea>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setLocation("/workspaces")}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                View all workspaces
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation - could be contextual based on activeWorkspaceId later */}
        <div className="flex-1 overflow-auto py-4">
          <nav className="space-y-1 px-2">
            {!activeWorkspaceId ? (
              <Link href="/workspaces">
                <Button variant="ghost" className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  All Workspaces
                </Button>
              </Link>
            ) : null}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground font-medium">Notifications</span>
            <NotificationBell />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start px-2 py-1.5 h-auto font-normal hover:bg-sidebar-accent">
                <Avatar className="h-8 w-8 mr-2 border">
                  <AvatarImage src={user?.imageUrl} />
                  <AvatarFallback>{user?.firstName?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left truncate flex-1">
                  <span className="text-sm font-medium truncate w-full">{user?.fullName || "User"}</span>
                  <span className="text-xs text-muted-foreground truncate w-full">{user?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })}>
                <LogOut className="h-4 w-4 mr-2 text-destructive" />
                <span className="text-destructive">Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
