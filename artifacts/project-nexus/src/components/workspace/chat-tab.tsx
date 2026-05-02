import { useState, useRef, useEffect } from "react";
import { useListMessages, useSendMessage, getListMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function ChatTab({ workspaceId }: { workspaceId: string }) {
  const [content, setContent] = useState("");
  const { user } = useUser();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useListMessages(workspaceId, undefined, {
    query: {
      queryKey: getListMessagesQueryKey(workspaceId),
      refetchInterval: 5000,
    },
  });

  const sendMessage = useSendMessage();

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    sendMessage.mutate(
      { workspaceId, data: { content } },
      {
        onSuccess: () => {
          setContent("");
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(workspaceId) });
        },
      }
    );
  };

  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
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
            <MessageSquareIcon className="h-10 w-10 mb-4 opacity-20" />
            <p>No messages yet.</p>
            <p className="text-sm">Be the first to say hello!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.slice().reverse().map((msg) => {
              const isMe = msg.senderId === user?.id;
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 border flex-shrink-0">
                    <AvatarImage src={msg.senderAvatarUrl || undefined} />
                    <AvatarFallback>{msg.senderName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[80%]`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-xs font-medium">{msg.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted text-foreground rounded-tl-sm"}`}>
                      {msg.content}
                    </div>
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
            {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
