import { useState, useEffect, useCallback } from "react";
import { Bell, Check, MessageCircle, FileUp, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  if (type === "message") return <MessageCircle className="h-4 w-4 text-blue-500 flex-shrink-0" />;
  if (type === "file_uploaded") return <FileUp className="h-4 w-4 text-green-500 flex-shrink-0" />;
  if (type === "member_joined") return <UserPlus className="h-4 w-4 text-purple-500 flex-shrink-0" />;
  return <Bell className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
    } catch {
      // silently fail
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
    setLocation(`/workspaces/${n.workspaceId}`);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white border-0 min-w-[16px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={markAllRead}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Mark all read</>}
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex items-start gap-3 px-3 py-3 cursor-pointer focus:bg-accent ${!n.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                onSelect={() => handleNotificationClick(n)}
              >
                <div className="mt-0.5">
                  <NotificationIcon type={n.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-tight">{n.title}</p>
                    {!n.isRead && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
