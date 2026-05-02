import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, MessageSquare, File, CheckSquare, Users,
  Loader2, LayoutDashboard, Lock, BarChart2, ArrowRight,
} from "lucide-react";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { cn } from "@/lib/utils";

interface SearchMember { id: string; name: string; email: string; avatarUrl?: string | null; role: string; }
interface SearchResult {
  messages: Array<{ id: string; content: string; senderName: string; createdAt: string }>;
  files: Array<{ id: string; name: string; mimeType: string; uploaderName: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; createdAt: string }>;
  members: SearchMember[];
}

type FlatItem =
  | { kind: "action"; id: string; label: string; icon: React.ReactNode; tab: string }
  | { kind: "message"; id: string; content: string; senderName: string; createdAt: string }
  | { kind: "file"; id: string; name: string; uploaderName: string; createdAt: string }
  | { kind: "task"; id: string; title: string; status: string; priority: string }
  | { kind: "member"; id: string; name: string; email: string; avatarUrl?: string | null; role: string };

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const STATUS_LABELS: Record<string, string> = { todo: "To Do", in_progress: "In Progress", done: "Done" };
const PRIORITY_COLORS: Record<string, string> = { high: "destructive", medium: "secondary", low: "outline" };

const QUICK_ACTIONS: Array<{ id: string; label: string; icon: React.ReactNode; tab: string }> = [
  { id: "qa-overview", label: "Go to Overview", icon: <LayoutDashboard className="h-4 w-4" />, tab: "overview" },
  { id: "qa-chat", label: "Go to Chat", icon: <MessageSquare className="h-4 w-4" />, tab: "chat" },
  { id: "qa-tasks", label: "Go to Tasks", icon: <CheckSquare className="h-4 w-4" />, tab: "tasks" },
  { id: "qa-files", label: "Go to Files", icon: <File className="h-4 w-4" />, tab: "files" },
  { id: "qa-members", label: "Go to Members", icon: <Users className="h-4 w-4" />, tab: "members" },
  { id: "qa-vault", label: "Go to Env Vault", icon: <Lock className="h-4 w-4" />, tab: "vault" },
  { id: "qa-analytics", label: "Go to Analytics", icon: <BarChart2 className="h-4 w-4" />, tab: "analytics" },
];

export function SearchDialog({
  workspaceId,
  open,
  onOpenChange,
  onNavigate,
}: {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate?: (tab: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const debouncedQuery = useDebounce(query, 300);
  const authenticatedFetch = useAuthenticatedFetch();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, [workspaceId, authenticatedFetch]);

  useEffect(() => { search(debouncedQuery); }, [debouncedQuery, search]);
  useEffect(() => { if (!open) { setQuery(""); setResults(null); setActiveIndex(0); } }, [open]);
  useEffect(() => { setActiveIndex(0); }, [debouncedQuery, results]);

  // Build flat navigable item list
  const flatItems: FlatItem[] = query.trim()
    ? [
        ...(results?.tasks.map(t => ({ kind: "task" as const, ...t })) ?? []),
        ...(results?.members.map(m => ({ kind: "member" as const, ...m, avatarUrl: m.avatarUrl })) ?? []),
        ...(results?.files.map(f => ({ kind: "file" as const, ...f })) ?? []),
        ...(results?.messages.map(m => ({ kind: "message" as const, ...m })) ?? []),
      ]
    : QUICK_ACTIONS.map(a => ({ kind: "action" as const, ...a }));

  const handleSelect = useCallback((item: FlatItem) => {
    if (item.kind === "action") { onNavigate?.(item.tab); onOpenChange(false); return; }
    if (item.kind === "task") { onNavigate?.("tasks"); onOpenChange(false); return; }
    if (item.kind === "member") { onNavigate?.("members"); onOpenChange(false); return; }
    if (item.kind === "file") { onNavigate?.("files"); onOpenChange(false); return; }
    if (item.kind === "message") { onNavigate?.("chat"); onOpenChange(false); return; }
  }, [onNavigate, onOpenChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatItems[activeIndex]) handleSelect(flatItems[activeIndex]);
    }
  }, [flatItems, activeIndex, handleSelect]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const totalResults = results
    ? results.messages.length + results.files.length + results.tasks.length + results.members.length
    : 0;

  // Group labels and their section starting indices
  const sections: Array<{ label: string; icon: React.ReactNode; items: FlatItem[]; startIndex: number }> = [];
  if (query.trim() && results) {
    let idx = 0;
    if (results.tasks.length > 0) {
      sections.push({ label: "Tasks", icon: <CheckSquare className="h-3 w-3" />, items: results.tasks.map(t => ({ kind: "task" as const, ...t })), startIndex: idx });
      idx += results.tasks.length;
    }
    if (results.members.length > 0) {
      sections.push({ label: "Members", icon: <Users className="h-3 w-3" />, items: results.members.map(m => ({ kind: "member" as const, ...m, avatarUrl: m.avatarUrl })), startIndex: idx });
      idx += results.members.length;
    }
    if (results.files.length > 0) {
      sections.push({ label: "Files", icon: <File className="h-3 w-3" />, items: results.files.map(f => ({ kind: "file" as const, ...f })), startIndex: idx });
      idx += results.files.length;
    }
    if (results.messages.length > 0) {
      sections.push({ label: "Messages", icon: <MessageSquare className="h-3 w-3" />, items: results.messages.map(m => ({ kind: "message" as const, ...m })), startIndex: idx });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-xl shadow-2xl">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b">
          {loading
            ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
            : <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          }
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search or jump to..."
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
            Esc
          </kbd>
        </div>

        {/* Body */}
        <div ref={listRef} className="max-h-[480px] overflow-y-auto">

          {/* Empty state — quick actions */}
          {!query && (
            <div>
              <div className="px-4 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Jump to</span>
              </div>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={action.id}
                  data-index={i}
                  className={cn(
                    "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-b last:border-b-0",
                    activeIndex === i ? "bg-primary/8 text-foreground" : "hover:bg-muted/50"
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => handleSelect({ kind: "action", ...action })}
                >
                  <span className="text-muted-foreground">{action.icon}</span>
                  <span className="text-sm font-medium flex-1">{action.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {query && !loading && results && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Search className="h-8 w-8 mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No results for "<span className="text-foreground">{query}</span>"</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords or browse using the quick actions above</p>
            </div>
          )}

          {/* Search results by section */}
          {sections.map(section => (
            <div key={section.label}>
              <div className="px-4 py-2 border-b bg-muted/30 sticky top-0">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  {section.icon} {section.label}
                </span>
              </div>
              {section.items.map((item, localI) => {
                const globalIdx = section.startIndex + localI;
                const isActive = activeIndex === globalIdx;
                return (
                  <button
                    key={item.id}
                    data-index={globalIdx}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors border-b last:border-b-0",
                      isActive ? "bg-primary/8" : "hover:bg-muted/50"
                    )}
                    onMouseEnter={() => setActiveIndex(globalIdx)}
                    onClick={() => handleSelect(item)}
                  >
                    {item.kind === "task" && (
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className={cn("text-sm font-medium flex-1 truncate", item.status === "done" && "line-through text-muted-foreground")}>
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant={(PRIORITY_COLORS[item.priority] ?? "secondary") as any} className="text-xs capitalize">
                            {item.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{STATUS_LABELS[item.status] ?? item.status}</span>
                        </div>
                      </div>
                    )}
                    {item.kind === "member" && (
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 flex-shrink-0">
                          <AvatarImage src={item.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs">{item.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{item.role}</Badge>
                      </div>
                    )}
                    {item.kind === "file" && (
                      <div className="flex items-center gap-3">
                        <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">by {item.uploaderName} · {timeAgo(item.createdAt)}</p>
                        </div>
                      </div>
                    )}
                    {item.kind === "message" && (
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground mb-0.5">{item.senderName} · {timeAgo(item.createdAt)}</p>
                          <p className="text-sm truncate">{item.content}</p>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-4">
          {query ? (
            <span className="text-xs text-muted-foreground">
              {loading ? "Searching…" : `${totalResults} result${totalResults !== 1 ? "s" : ""}`}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Quick navigation</span>
          )}
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="bg-muted border rounded px-1">↵</kbd> select</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
