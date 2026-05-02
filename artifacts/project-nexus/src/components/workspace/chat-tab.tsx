import { useState, useRef, useEffect, useCallback } from "react";
import {
  useListMessages,
  useSendMessage,
  useToggleReaction,
  useListPinnedMessages,
  usePinMessage,
  useUnpinMessage,
  useListWorkspaceMembers,
  getListMessagesQueryKey,
  getListPinnedMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetUserProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageSquare, Pin, PinOff, ChevronDown, ChevronUp, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MentionInput } from "./mention-input";
import { MentionText } from "./mention-text";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "😮", "👀"];

function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
}: {
  reactions: { emoji: string; count: number; userIds: string[] }[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
}) {
  if (reactions.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {reactions.map((r) => {
        const mine = r.userIds.includes(currentUserId);
        return (
          <button
            key={r.emoji}
            onClick={() => onToggle(r.emoji)}
            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-all ${
              mine
                ? "bg-primary/10 border-primary/40 text-primary font-medium"
                : "bg-muted border-border text-foreground hover:border-primary/30 hover:bg-primary/5"
            }`}
          >
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function EmojiPicker({ onPick }: { onPick: (emoji: string) => void }) {
  return (
    <div className="absolute z-20 flex gap-0.5 bg-card border rounded-full px-2 py-1 shadow-lg -top-9 left-0">
      {QUICK_EMOJIS.map((e) => (
        <button
          key={e}
          onClick={() => onPick(e)}
          className="text-base hover:scale-125 transition-transform leading-none p-0.5"
        >
          {e}
        </button>
      ))}
    </div>
  );
}

function PinnedBanner({
  workspaceId,
  canPin,
  onUnpin,
}: {
  workspaceId: string;
  canPin: boolean;
  onUnpin: (messageId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: pinned = [] } = useListPinnedMessages(workspaceId, {
    query: { queryKey: getListPinnedMessagesQueryKey(workspaceId), refetchInterval: 10000 },
  });

  if (pinned.length === 0) return null;

  const latest = pinned[pinned.length - 1];

  return (
    <div className="border-b bg-amber-50/60 dark:bg-amber-950/20">
      <button
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <Pin className="h-3.5 w-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex-shrink-0">
          {pinned.length} pinned {pinned.length === 1 ? "message" : "messages"}
        </span>
        <span className="text-xs text-muted-foreground truncate flex-1 ml-1">
          {!expanded && `"${latest.content.replace(/@\[([^\]|]+)\|[^\]]+\]/g, "@$1")}"`}
        </span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
          {pinned.map((p) => (
            <div key={p.id} className="flex items-start gap-2 p-2 rounded-lg bg-background/60 border text-sm group">
              <Avatar className="h-6 w-6 flex-shrink-0 mt-0.5">
                <AvatarImage src={p.senderAvatarUrl ?? undefined} />
                <AvatarFallback className="text-[10px]">{p.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-xs text-muted-foreground">{p.senderName}</span>
                <p className="text-sm leading-snug mt-0.5 break-words">
                  <MentionText content={p.content} />
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Pinned by {p.pinnedByName} · {formatDistanceToNow(new Date(p.pinnedAt), { addSuffix: true })}
                </p>
              </div>
              {canPin && (
                <button
                  onClick={() => onUnpin(p.messageId)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded flex-shrink-0"
                  title="Unpin"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ChatTab({ workspaceId, role }: { workspaceId: string; role: string }) {
  const [content, setContent] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: profile } = useGetUserProfile();
  const { data: members = [] } = useListWorkspaceMembers(workspaceId);

  const currentUserId = profile?.id ?? "";
  const canPin = role !== "viewer";

  const { data: messages, isLoading } = useListMessages(workspaceId, undefined, {
    query: { queryKey: getListMessagesQueryKey(workspaceId), refetchInterval: 5000 },
  });

  const sendMessage = useSendMessage();
  const toggleReaction = useToggleReaction();
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  const invalidateMessages = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(workspaceId) });
  }, [queryClient, workspaceId]);

  const invalidatePinned = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListPinnedMessagesQueryKey(workspaceId) });
    invalidateMessages();
  }, [queryClient, workspaceId, invalidateMessages]);

  const handleSend = () => {
    if (!content.trim()) return;
    sendMessage.mutate(
      { workspaceId, data: { content: content.trim() } },
      { onSuccess: () => { setContent(""); invalidateMessages(); } }
    );
  };

  const handleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate({ workspaceId, messageId, data: { emoji } }, { onSuccess: invalidateMessages });
    setPickerMsgId(null);
  };

  const handlePin = (messageId: string) => {
    pinMessage.mutate({ workspaceId, messageId }, { onSuccess: invalidatePinned });
    setHoveredMsgId(null);
  };

  const handleUnpin = (messageId: string) => {
    unpinMessage.mutate({ workspaceId, messageId }, { onSuccess: invalidatePinned });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerMsgId && !(e.target as Element).closest("[data-emoji-picker]")) {
        setPickerMsgId(null);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [pickerMsgId]);

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-14rem)] bg-card border rounded-xl overflow-hidden shadow-sm">
      <PinnedBanner workspaceId={workspaceId} canPin={canPin} onUnpin={handleUnpin} />

      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
            <p>No messages yet.</p>
            <p className="text-sm">Be the first to say hello! Type <kbd className="text-xs border rounded px-1">@</kbd> to mention someone.</p>
          </div>
        ) : (
          <div className="space-y-1 pb-2">
            {messages.map((msg, i) => {
              const isMe = msg.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const isGrouped =
                prevMsg &&
                prevMsg.senderId === msg.senderId &&
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60 * 1000;

              // Check if current user is mentioned
              const mentionsMePattern = new RegExp(`@\\[[^\\]|]+\\|${currentUserId}\\]`);
              const mentionsMe = currentUserId && mentionsMePattern.test(msg.content);

              return (
                <div
                  key={msg.id}
                  className={`group flex gap-3 ${isMe ? "flex-row-reverse" : ""} ${isGrouped ? "mt-0.5" : "mt-4"} ${mentionsMe ? "px-2 -mx-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/10" : ""}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                >
                  <div className="w-8 flex-shrink-0 flex items-end">
                    {!isGrouped && (
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={msg.senderAvatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%] relative`}>
                    {!isGrouped && (
                      <div className={`flex items-baseline gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-medium">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                        {msg.isPinned && <Pin className="h-3 w-3 text-amber-500" />}
                      </div>
                    )}

                    <div className="relative">
                      {(hoveredMsgId === msg.id || pickerMsgId === msg.id) && (
                        <div
                          data-emoji-picker
                          className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2 z-10 flex items-center gap-1`}
                        >
                          {pickerMsgId === msg.id ? (
                            <EmojiPicker onPick={(e) => handleReaction(msg.id, e)} />
                          ) : (
                            <>
                              <button
                                onClick={() => setPickerMsgId(msg.id)}
                                className="text-base opacity-0 group-hover:opacity-100 hover:scale-110 transition-all bg-card border rounded-full w-7 h-7 flex items-center justify-center shadow-sm"
                                title="React"
                              >
                                😊
                              </button>
                              {canPin && (
                                <button
                                  onClick={() => msg.isPinned ? handleUnpin(msg.id) : handlePin(msg.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-all bg-card border rounded-full w-7 h-7 flex items-center justify-center shadow-sm hover:border-amber-400"
                                  title={msg.isPinned ? "Unpin" : "Pin message"}
                                >
                                  {msg.isPinned ? (
                                    <PinOff className="h-3.5 w-3.5 text-amber-500" />
                                  ) : (
                                    <Pin className="h-3.5 w-3.5 text-muted-foreground" />
                                  )}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div
                        className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                          msg.isPinned
                            ? isMe
                              ? "bg-primary text-primary-foreground rounded-tr-sm ring-1 ring-amber-400/50"
                              : "bg-muted text-foreground rounded-tl-sm ring-1 ring-amber-400/50"
                            : isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        }`}
                      >
                        <MentionText content={msg.content} currentUserId={currentUserId} isMe={isMe} />
                      </div>
                    </div>

                    <ReactionBar
                      reactions={msg.reactions}
                      currentUserId={currentUserId}
                      onToggle={(emoji) => handleReaction(msg.id, emoji)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t bg-card">
        <div className="flex gap-2 relative items-center">
          <MentionInput
            value={content}
            onChange={setContent}
            onSubmit={handleSend}
            members={members}
            disabled={sendMessage.isPending}
            placeholder="Type a message… use @ to mention"
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="h-9 w-9 rounded-full flex-shrink-0"
            disabled={!content.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
