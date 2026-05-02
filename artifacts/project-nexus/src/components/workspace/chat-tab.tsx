import { useState, useRef, useEffect, useCallback } from "react";
import { useListMessages, useSendMessage, useToggleReaction, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { useGetUserProfile } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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
          title={e}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

export function ChatTab({ workspaceId }: { workspaceId: string }) {
  const [content, setContent] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
  const { user } = useUser();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: profile } = useGetUserProfile();

  const currentUserId = profile?.id ?? "";

  const { data: messages, isLoading } = useListMessages(workspaceId, undefined, {
    query: {
      queryKey: getListMessagesQueryKey(workspaceId),
      refetchInterval: 5000,
    },
  });

  const sendMessage = useSendMessage();
  const toggleReaction = useToggleReaction();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(workspaceId) });
  }, [queryClient, workspaceId]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMessage.mutate(
      { workspaceId, data: { content } },
      { onSuccess: () => { setContent(""); invalidate(); } }
    );
  };

  const handleReaction = (messageId: string, emoji: string) => {
    toggleReaction.mutate(
      { workspaceId, messageId, data: { emoji } },
      { onSuccess: invalidate }
    );
    setPickerMsgId(null);
  };

  // Close emoji picker when clicking outside
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
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-4 opacity-20" />
            <p>No messages yet.</p>
            <p className="text-sm">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-1 pb-2">
            {messages.map((msg, i) => {
              const isMe = msg.senderId === currentUserId;
              const prevMsg = messages[i - 1];
              const isGrouped =
                prevMsg &&
                prevMsg.senderId === msg.senderId &&
                new Date(msg.createdAt).getTime() -
                  new Date(prevMsg.createdAt).getTime() <
                  5 * 60 * 1000;

              return (
                <div
                  key={msg.id}
                  className={`group flex gap-3 ${isMe ? "flex-row-reverse" : ""} ${isGrouped ? "mt-0.5" : "mt-4"}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => { setHoveredMsgId(null); }}
                >
                  {/* Avatar — only show on first of group */}
                  <div className="w-8 flex-shrink-0 flex items-end">
                    {!isGrouped && (
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={msg.senderAvatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {msg.senderName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>

                  <div
                    className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[75%] relative`}
                  >
                    {!isGrouped && (
                      <div className={`flex items-baseline gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-xs font-medium">{msg.senderName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}

                    <div className="relative">
                      {/* Emoji picker trigger — appears on hover */}
                      {(hoveredMsgId === msg.id || pickerMsgId === msg.id) && (
                        <div
                          data-emoji-picker
                          className={`absolute ${isMe ? "right-full mr-2" : "left-full ml-2"} top-1/2 -translate-y-1/2 z-10`}
                        >
                          {pickerMsgId === msg.id ? (
                            <EmojiPicker onPick={(e) => handleReaction(msg.id, e)} />
                          ) : (
                            <button
                              onClick={() => setPickerMsgId(msg.id)}
                              className="text-base opacity-0 group-hover:opacity-100 hover:scale-110 transition-all bg-card border rounded-full w-7 h-7 flex items-center justify-center shadow-sm"
                              title="React"
                            >
                              😊
                            </button>
                          )}
                        </div>
                      )}

                      <div
                        className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                            : "bg-muted text-foreground rounded-tl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {/* Reactions */}
                    {msg.reactions && msg.reactions.length > 0 && (
                      <ReactionBar
                        reactions={msg.reactions}
                        currentUserId={currentUserId}
                        onToggle={(emoji) => handleReaction(msg.id, emoji)}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t bg-card">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            className="pr-12 rounded-full border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-primary/50"
            disabled={sendMessage.isPending}
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-1 top-1 bottom-1 h-auto w-8 rounded-full"
            disabled={!content.trim() || sendMessage.isPending}
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
