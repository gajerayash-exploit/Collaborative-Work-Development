import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useListWorkspaces } from "@workspace/api-client-react";
import { LogOut, ChevronDown, User, Check, UserCircle, LayoutGrid, Menu, Sun, Moon } from "lucide-react";
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
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-sidebar-border/80 p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/40 px-3 py-3 font-normal shadow-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
              <div className="flex items-center gap-2.5 truncate">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-gradient-to-br from-primary/25 to-primary/10 text-base shadow-sm">
                  {activeWorkspace ? getWorkspaceEmoji(activeWorkspace.name) : <LayoutGrid className="h-4 w-4 text-primary" />}
                </div>
                <div className="min-w-0 text-left">
                  <p className="truncate text-sm font-semibold leading-tight">{activeWorkspace ? activeWorkspace.name : "Select Workspace"}</p>
                  {activeWorkspace && <p className="text-[10px] capitalize text-muted-foreground">{activeWorkspace.role}</p>}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 rounded-2xl border border-border/70 p-2 shadow-xl">
            <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-muted-foreground"><LayoutGrid className="h-3.5 w-3.5" /> Your Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-48 pr-1">
              {isLoading ? (
                <div className="p-2 space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : workspaces?.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No workspaces yet</div>
              ) : (
                Array.isArray(workspaces) && workspaces.map((w) => (
                  <DropdownMenuItem key={w.id} onSelect={() => nav(`/workspaces/${w.id}`)} className="justify-between gap-2 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2 truncate"><span className="flex-shrink-0 text-base">{getWorkspaceEmoji(w.name)}</span><span className="truncate text-sm font-medium">{w.name}</span></div>
                    {w.id === activeWorkspaceId && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => nav("/workspaces")} className="gap-2 rounded-xl px-3 py-2.5"><LayoutGrid className="h-4 w-4" /> View all workspaces</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex-1 overflow-auto py-3">
        <nav className="space-y-1 px-2">{!activeWorkspaceId && <Link href="/workspaces" onClick={onClose}><Button variant="ghost" className="h-10 w-full justify-start gap-2.5 rounded-xl bg-sidebar-accent/70 text-sidebar-accent-foreground shadow-sm"><LayoutGrid className="h-4 w-4" /> All Workspaces</Button></Link>}</nav>
      </div>
      <div className="space-y-3 border-t border-sidebar-border/80 p-3">
        <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><span className="text-xs font-medium text-muted-foreground">Notifications</span><NotificationBell /></div><ThemeToggleButton /></div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-start rounded-2xl border border-sidebar-border/60 px-3 py-3 font-normal shadow-sm hover:bg-sidebar-accent">
              <Avatar className="mr-2.5 h-9 w-9 flex-shrink-0 border-2 border-border"><AvatarImage src={user?.imageUrl} /><AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">{user?.firstName?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback></Avatar>
              <div className="flex min-w-0 flex-1 flex-col items-start text-left truncate"><span className="w-full truncate text-sm font-semibold leading-tight">{user?.fullName || "User"}</span><span className="w-full truncate text-[10px] text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</span></div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-2xl border border-border/70 p-2 shadow-xl">
            <DropdownMenuLabel className="flex items-center gap-2 px-2 py-2"><UserCircle className="h-4 w-4" /> My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => nav("/profile")} className="gap-2 rounded-xl px-3 py-2.5"><UserCircle className="h-4 w-4" /> My Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })} className="gap-2 rounded-xl px-3 py-2.5 text-destructive focus:text-destructive"><LogOut className="h-4 w-4" /> Log out</DropdownMenuItem>
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
      <aside className="hidden md:flex w-64 border-r flex-col flex-shrink-0"><SidebarContent activeWorkspaceId={activeWorkspaceId} /></aside>
      <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
        <div className="md:hidden flex items-center justify-between px-3 py-2.5 border-b bg-background flex-shrink-0 z-20">
          <div className="flex items-center gap-2 min-w-0">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 rounded-full border border-border/70 bg-background/80 shadow-sm"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-80 bg-sidebar [&>button]:top-4 [&>button]:right-4 [&>button]:rounded-full [&>button]:border [&>button]:border-border/60 [&>button]:bg-background/80 [&>button]:shadow-sm"><div className="h-1.5 bg-gradient-to-r from-primary via-primary/60 to-transparent" /><SidebarContent activeWorkspaceId={activeWorkspaceId} onClose={() => setMobileOpen(false)} /></SheetContent>
            </Sheet>
            <span className="font-semibold text-sm truncate">{activeWorkspace ? activeWorkspace.name : "Project Nexus"}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThemeToggleButton /><NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Avatar className="h-7 w-7 border border-border"><AvatarImage src={user?.imageUrl} /><AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{user?.firstName?.charAt(0) || "U"}</AvatarFallback></Avatar></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-2xl border border-border/70 p-2 shadow-xl"><DropdownMenuLabel className="flex items-center gap-2 px-2 py-2 text-xs font-medium text-muted-foreground truncate"><UserCircle className="h-4 w-4" /> {user?.fullName || "User"}</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setLocation("/profile")} className="gap-2 rounded-xl px-3 py-2.5"><UserCircle className="h-4 w-4" /> My Profile</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => signOut({ redirectUrl: "/" })} className="gap-2 rounded-xl px-3 py-2.5 text-destructive focus:text-destructive"><LogOut className="h-4 w-4" /> Log out</DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
