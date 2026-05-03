import { useState } from "react";
import { useGetHuddle, useJoinHuddle, useLeaveHuddle, getGetHuddleQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Mic, MicOff, PhoneOff, Users, Headphones, AlertCircle } from "lucide-react";
import { useHuddleRtc, type RtcSignal } from "@/hooks/use-huddle-rtc";
import { cn } from "@/lib/utils";

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

interface HuddleWidgetProps {
  workspaceId: string;
  sendMessage: (msg: object) => void;
  myDbUserId: string | null;
  registerRtcHandler: (fn: (msg: RtcSignal) => void) => void;
}

export function HuddleWidget({
  workspaceId,
  sendMessage,
  myDbUserId,
  registerRtcHandler,
}: HuddleWidgetProps) {
  const [open, setOpen] = useState(false);

  const { data: huddle, refetch } = useGetHuddle(workspaceId, {
    query: { queryKey: getGetHuddleQueryKey(workspaceId), refetchInterval: 5000 },
  });

  const joinHuddle = useJoinHuddle();
  const leaveHuddle = useLeaveHuddle();

  const isInHuddle = huddle?.participants.some((p) => p.id === huddle.currentUserId) ?? false;
  const participantCount = huddle?.participants.length ?? 0;

  const { muted, toggleMute, audioError, hasAudio, speaking } = useHuddleRtc({
    isInHuddle,
    myDbUserId,
    sendMessage,
    registerSignalHandler: registerRtcHandler,
  });

  const handleJoin = () => {
    joinHuddle.mutate({ workspaceId }, { onSuccess: () => refetch() });
  };

  const handleLeave = () => {
    leaveHuddle.mutate({ workspaceId }, { onSuccess: () => refetch() });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isInHuddle ? "default" : "outline"}
          size="sm"
          className={cn(
            "gap-1.5 h-8 px-2.5 text-xs transition-all",
            isInHuddle
              ? "bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-emerald-500/20 shadow-lg"
              : huddle?.active
              ? "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              : "",
          )}
        >
          {isInHuddle ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
              </span>
              {muted ? <MicOff className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">In Huddle</span>
              {participantCount > 1 && (
                <span className="hidden sm:inline text-white/70">· {participantCount}</span>
              )}
            </>
          ) : huddle?.active ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              <span className="hidden sm:inline">Join Huddle</span>
              <span className="hidden sm:inline text-muted-foreground">· {participantCount}</span>
            </>
          ) : (
            <>
              <Headphones className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Huddle</span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0 overflow-hidden" sideOffset={8}>
        {/* Header */}
        <div
          className={cn(
            "px-4 py-3 border-b",
            isInHuddle ? "bg-emerald-600/10 border-emerald-500/20" : "bg-muted/30",
          )}
        >
          <div className="flex items-center gap-2">
            {isInHuddle ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-sm font-semibold text-emerald-400">Live Huddle</span>
                {hasAudio && !muted && (
                  <span className="ml-1 text-xs text-emerald-500/70">· mic on</span>
                )}
              </>
            ) : (
              <>
                <Headphones className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Workspace Huddle</span>
              </>
            )}
            {participantCount > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {participantCount} {participantCount === 1 ? "person" : "people"}
              </span>
            )}
          </div>
          {audioError && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-500 bg-amber-500/10 rounded-md px-2 py-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>{audioError}</span>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="p-4">
          {participantCount === 0 ? (
            <div className="text-center py-4">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No one is in the huddle yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Be the first to jump in!</p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {huddle?.participants.map((p) => {
                const isMe = p.id === huddle.currentUserId;
                const isSpeaking = speaking[p.id] ?? false;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-2.5 p-2 rounded-lg transition-colors",
                      isMe
                        ? "bg-emerald-500/10 border border-emerald-500/20"
                        : "hover:bg-accent/50",
                    )}
                  >
                    {/* Avatar with speaking ring */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={cn(
                          "rounded-full transition-all duration-150",
                          isSpeaking
                            ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-background"
                            : "",
                        )}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={p.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      {/* Live green dot */}
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-background" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {p.name ?? p.email}
                        {isMe && (
                          <span className="text-xs text-muted-foreground ml-1.5">(you)</span>
                        )}
                      </p>
                      {isMe && isSpeaking && !muted && (
                        <p className="text-[10px] text-emerald-500 leading-none mt-0.5">
                          speaking…
                        </p>
                      )}
                    </div>

                    {/* Per-user mute button (only for self) */}
                    {isMe && (
                      <button
                        onClick={toggleMute}
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center transition-colors",
                          muted
                            ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
                        )}
                        title={muted ? "Unmute" : "Mute"}
                      >
                        {muted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          {isInHuddle ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 gap-1.5 h-8 text-xs",
                  muted ? "border-red-500/40 text-red-400 hover:bg-red-500/10" : "",
                )}
                onClick={toggleMute}
              >
                {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {muted ? "Unmute" : "Mute"}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1 gap-1.5 h-8 text-xs"
                onClick={handleLeave}
                disabled={leaveHuddle.isPending}
              >
                <PhoneOff className="h-3.5 w-3.5" />
                Leave
              </Button>
            </div>
          ) : (
            <Button
              className="w-full gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleJoin}
              disabled={joinHuddle.isPending}
            >
              <Headphones className="h-3.5 w-3.5" />
              {joinHuddle.isPending
                ? "Joining…"
                : huddle?.active
                ? "Join the Huddle"
                : "Start a Huddle"}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
