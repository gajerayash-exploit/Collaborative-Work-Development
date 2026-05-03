import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PresenceUser } from "@/hooks/use-workspace-socket";

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const MAX_VISIBLE = 5;

export function PresenceBar({ users }: { users: PresenceUser[] }) {
  if (users.length === 0) return null;

  const visible = users.slice(0, MAX_VISIBLE);
  const overflow = users.length - MAX_VISIBLE;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center">
        <div className="flex -space-x-2">
          {visible.map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className="h-7 w-7 border-2 border-background ring-1 ring-emerald-500/60 cursor-default">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-muted">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-background" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {user.name ?? "Unknown"} — online
              </TooltipContent>
            </Tooltip>
          ))}

          {overflow > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-7 w-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground cursor-default ring-1 ring-border z-10">
                  +{overflow}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {overflow} more online
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
