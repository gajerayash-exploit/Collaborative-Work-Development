import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListWorkspaces } from "@workspace/api-client-react";
import { LogOut, ChevronDown, User, Check, UserCircle, LayoutGrid, Menu, X, Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function ThemeToggleButton() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

const WORKSPACE_EMOJIS = ["🚀", "⚡", "🎯", "🛠️", "💡", "🔥", "🌊", "🎨", "🦊", "🏗️", "🌐", "🧪"];
function getWorkspaceEmoji(name: string) {
  const idx = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % WORKSPACE_EMOJIS.length;
  return WORKSPACE_EMOJIS[idx];
}

interface AppLayoutProps {
  children: ReactNode;
  activeWorkspaceId?: string;
}

function SidebarContent({ activeWorkspaceId, onClose }: { activeWorkspaceId?: string; onClose?: () => void }) {
  const { data: workspaces, isLoading } = useListWorkspaces();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const activeWorkspace = workspaces?.find(w => w.id === activeWorkspaceId);

  const nav = (path: string) => {
    setLocation(path);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Workspace Switcher */}
      <div className="p-3 border-b border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between px-2 py-2 h-auto font-normal hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-xl"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 text-base shadow-sm">
                  {activeWorkspace
                    ? getWorkspaceEmoji(activeWorkspace.name)
                    : <LayoutGrid className="h-4 w-4 text-primary" />
                  }
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-semibold truncate leading-tight">
                    {activeWorkspace ? activeWorkspace.name : "Select Workspace"}
                  </p>
                  {activeWorkspace && (
                    <p className="text-[10px] text-muted-foreground capitalize">{activeWorkspace.role}</p>
                  )}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-60 flex-shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
              🏠 Your Workspaces
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-48">
              {isLoading ? (
                <div className="p-2 space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : workspaces?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  🌌 No workspaces yet
                </div>
              ) : (
                Array.isArray(workspaces) && workspaces.map((w) => (
                  <DropdownMenuItem
                    key={w.id}
                    onSelect={() => nav(`/workspaces/${w.id}`)}
                    className="justify-between gap-2 py-2"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base flex-shrink-0">{getWorkspaceEmoji(w.name)}</span>
                      <span className="truncate text-sm">{w.name}</span>
                    </div>
                    {w.id === activeWorkspaceId && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => nav("/workspaces")} className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              View all workspaces
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-3">
        <nav className="space-y-0.5 px-2">
          {!activeWorkspaceId && (
            <Link href="/workspaces" onClick={onClose}>
              <Button variant="ghost" className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground rounded-lg gap-2.5 h-9">
                <LayoutGrid className="h-4 w-4" />
                All Workspaces
              </Button>
            </Link>
          )}
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">🔔 Notifications</span>
            <NotificationBell />
          </div>
          <ThemeToggleButton />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start px-2 py-2 h-auto font-normal hover:bg-sidebar-accent rounded-xl">
              <Avatar className="h-8 w-8 mr-2.5 border-2 border-border flex-shrink-0">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-bold text-xs">
                  {user?.firstName?.charAt(0) || <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left truncate flex-1 min-w-0">
                <span className="text-sm font-semibold truncate w-full leading-tight">{user?.fullName || "User"}</span>
                <span className="text-[10px] text-muted-foreground truncate w-full">{user?.primaryEmailAddress?.emailAddress}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>👤 My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => nav("/profile")} className="gap-2">
              <UserCircle className="h-4 w-4" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AppLayout({ children, activeWorkspaceId }: AppLayoutProps) {
  const { data: workspaces } = useListWorkspaces();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeWorkspace = Array.isArray(workspaces) ? workspaces.find(w => w.id === activeWorkspaceId) : undefined;

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r flex-col flex-shrink-0">
        <SidebarContent activeWorkspaceId={activeWorkspaceId} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        {/* Mobile Top Bar */}
        <div className="md:hidden flex items-center justify-between px-3 py-2.5 border-b bg-background flex-shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72">
                <SidebarContent activeWorkspaceId={activeWorkspaceId} onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-sm truncate">
              {activeWorkspace ? activeWorkspace.name : "Project Nexus"}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggleButton />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Avatar className="h-7 w-7 border border-border">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                      {user?.firstName?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-xs font-medium text-muted-foreground truncate">
                  {user?.fullName || "User"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setLocation("/profile")} className="gap-2">
                  <UserCircle className="h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
