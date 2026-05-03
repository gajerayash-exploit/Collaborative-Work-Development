import { useState, useEffect, useCallback } from "react";
import { Bell, Check, MessageCircle, FileUp, UserPlus, Loader2, AtSign, Pin, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  workspaceId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "mention") return <AtSign className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  if (type === "message") return <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  if (type === "file_uploaded") return <FileUp className="h-4 w-4 text-green-500 flex-shrink-0" />;
  if (type === "member_joined") return <UserPlus className="h-4 w-4 text-purple-500 flex-shrink-0" />;
  if (type === "pin") return <Pin className="h-4 w-4 text-amber-500 flex-shrink-0" />;
  if (type === "task") return <CheckSquare className="h-4 w-4 text-indigo-500 flex-shrink-0" />;
  return <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

type FeedTab = "all" | "mentions";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>("all");
  const [, setLocation] = useLocation();

  const allUnread = notifications.filter((n) => !n.isRead).length;
  const mentionUnread = notifications.filter((n) => !n.isRead && n.type === "mention").length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
    } catch {
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT", credentials: "include" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllRead = async () => {
    setIsLoading(true);
    await fetch("/api/notifications/read-all", { method: "PUT", credentials: "include" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setIsLoading(false);
  };

  const handleNotificationClick = (n: Notification) => {
    markRead(n.id);
    setOpen(false);
    setLocation(`/workspaces/${n.workspaceId}?tab=chat`);
  };

  const filtered = activeTab === "mentions" ? notifications.filter((n) => n.type === "mention") : notifications;
  const filteredUnread = activeTab === "mentions" ? mentionUnread : allUnread;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {allUnread > 0 && <Badge className="absolute -top-1 -right-1 h-4 w-4 min-w-[16px] p-0 flex items-center justify-center border-0 bg-red-500 text-[10px] font-bold text-white">{allUnread > 9 ? "9+" : allUnread}</Badge>}
          {allUnread === 0 && mentionUnread > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-background bg-amber-500" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <span className="text-sm font-semibold">Notifications</span>
          {filteredUnread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={markAllRead} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Mark all read</>}
            </Button>
          )}
        </div>
        <div className="flex gap-1 px-4 pb-2">
          <button onClick={() => setActiveTab("all")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}>
            <Bell className="h-3 w-3" /> All
            {allUnread > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${activeTab === "all" ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}>{allUnread}</span>}
          </button>
          <button onClick={() => setActiveTab("mentions")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === "mentions" ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"}`}>
            <AtSign className="h-3 w-3" /> Mentions
            {mentionUnread > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${activeTab === "mentions" ? "bg-white/20 text-white" : "bg-amber-500 text-white"}`}>{mentionUnread}</span>}
          </button>
        </div>
        <DropdownMenuSeparator className="my-0" />
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            {activeTab === "mentions" ? <><AtSign className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" /><p className="text-sm font-medium text-muted-foreground">No mentions yet</p><p className="mt-1 text-xs text-muted-foreground/60">You'll be notified when someone @mentions you</p></> : <><Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" /><p className="text-sm text-muted-foreground">No notifications yet</p></>}
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="py-1">
              {filtered.map((n) => (
                <DropdownMenuItem key={`${n.id}-${n.createdAt}`} className={`flex cursor-pointer items-start gap-3 rounded-none px-4 py-3 focus:bg-accent ${!n.isRead ? (n.type === "mention" ? "bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30" : "bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30") : "hover:bg-muted"}`} onSelect={() => handleNotificationClick(n)}>
                  <div className="mt-0.5"><NotificationIcon type={n.type} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{n.title}</p>
                      {!n.isRead && <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${n.type === "mention" ? "bg-amber-500" : "bg-blue-500"}`} />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground/50">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
