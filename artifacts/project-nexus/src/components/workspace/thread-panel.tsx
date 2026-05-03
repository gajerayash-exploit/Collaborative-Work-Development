import { useState, useRef, useEffect } from "react";
import {
  useListReplies,
  useSendReply,
  getListRepliesQueryKey,
  getListMessagesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, MessageSquare, Loader2, CornerDownRight, Send } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { MentionText } from "./mention-text";
import { MentionInput, toRawFormat } from "./mention-input";

interface Member {
  userId: string;
  user?: { name: string; avatarUrl?: string | null } | null;
}

interface ParentMessage {
  id: string;
  content: string;
  senderName: string;
  senderAvatarUrl?: string | null;
  createdAt: string;
  replyCount: number;
}

interface ThreadPanelProps {
  workspaceId: string;
  message: ParentMessage;
  currentUserId: string;
  members: Member[];
  onClose: () => void;
}

export function ThreadPanel({ workspaceId, message, currentUserId, members, onClose }: ThreadPanelProps) {
  const [replyContent, setReplyContent] = useState("");
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: replies = [], isLoading } = useListReplies(workspaceId, message.id, {
    query: {
      queryKey: getListRepliesQueryKey(workspaceId, message.id),
      refetchInterval: 5000,
    },
  });

  const sendReply = useSendReply();

  const handleSend = () => {
    if (!replyContent.trim()) return;
    const rawContent = toRawFormat(replyContent.trim(), members);
    sendReply.mutate(
      { workspaceId, messageId: message.id, data: { content: rawContent } },
      {
        onSuccess: () => {
          setReplyContent("");
          queryClient.invalidateQueries({ queryKey: getListRepliesQueryKey(workspaceId, message.id) });
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(workspaceId) });
        },
      }
    );
  };

  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [replies]);

  return (
    <div className="flex flex-col w-[24rem] border-l bg-card h-full flex-shrink-0 animate-in slide-in-from-right duration-200 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0 bg-muted/20">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Thread</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Original message */}
      <div className="px-4 py-4 border-b bg-muted/20 flex-shrink-0">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 border flex-shrink-0 ring-2 ring-background">
            <AvatarImage src={message.senderAvatarUrl ?? undefined} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {message.senderName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-sm font-semibold">{message.senderName}</span>
              <span className="text-[10px] text-muted-foreground">
                {format(new Date(message.createdAt), "MMM d, h:mm a")}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground break-words">
              <MentionText content={message.content} currentUserId={currentUserId} />
            </p>
            {replies.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {replies.length} {replies.length === 1 ? "reply" : "replies"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <CornerDownRight className="h-8 w-8 opacity-20 mb-3" />
            <p className="text-sm font-medium">No replies yet</p>
            <p className="text-xs mt-1 opacity-70">Be the first to reply in this thread</p>
          </div>
        ) : (
          <div className="space-y-4">
            {replies.map((reply) => {
              const isMe = reply.senderId === currentUserId;
              return (
                <div key={reply.id} className={`flex gap-3 group ${isMe ? "justify-end" : ""}`}>
                  {!isMe && (
                    <Avatar className="h-5 w-5 border flex-shrink-0 mt-0.5 ring-2 ring-background">
                      <AvatarImage src={reply.senderAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {reply.senderName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`flex-1 min-w-0 max-w-[85%] ${isMe ? "order-1" : ""}`}>
                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? "justify-end" : ""}`}>
                      <span className={`text-xs font-semibold ${isMe ? "text-primary" : ""}`}>
                        {isMe ? "You" : reply.senderName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed break-words shadow-sm ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}>
                      <MentionText content={reply.content} currentUserId={currentUserId} />
                    </div>
                  </div>
                  {isMe && (
                    <Avatar className="h-5 w-5 border flex-shrink-0 mt-0.5 ring-2 ring-background">
                      <AvatarImage src={reply.senderAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {reply.senderName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Reply input */}
      <div className="p-3 border-t bg-card flex-shrink-0">
        <p className="text-xs text-muted-foreground mb-2 px-1">
          Reply in thread
        </p>
        <div className="flex gap-2 items-center">
          <MentionInput
            value={replyContent}
            onChange={setReplyContent}
            onSubmit={handleSend}
            members={members}
            disabled={sendReply.isPending}
            placeholder="Reply… use @ to mention"
          />
          <Button
            onClick={handleSend}
            size="icon"
            className="h-11 w-11 rounded-full flex-shrink-0 shadow-sm"
            disabled={!replyContent.trim() || sendReply.isPending}
          >
            {sendReply.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
