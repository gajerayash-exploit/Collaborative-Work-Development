import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, MessageSquare, File, CheckSquare, Loader2 } from "lucide-react";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";

interface SearchResult {
  messages: Array<{ id: string; content: string; senderName: string; createdAt: string }>;
  files: Array<{ id: string; name: string; mimeType: string; uploaderName: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; createdAt: string }>;
}

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
  const debouncedQuery = useDebounce(query, 350);
  const authenticatedFetch = useAuthenticatedFetch();

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/workspaces/${workspaceId}/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId, authenticatedFetch]);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  useEffect(() => {
    if (!open) { setQuery(""); setResults(null); }
  }, [open]);

  const totalResults = results
    ? results.messages.length + results.files.length + results.tasks.length
    : 0;

  const STATUS_LABELS: Record<string, string> = {
    todo: "To Do", in_progress: "In Progress", done: "Done"
  };
  const PRIORITY_COLORS: Record<string, string> = {
    high: "destructive", medium: "secondary", low: "outline"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          {loading ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
          ) : (
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <Input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search messages, files, tasks..."
            className="border-none shadow-none focus-visible:ring-0 p-0 h-8 text-base"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[480px] overflow-y-auto">
          {!query && (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Search className="h-10 w-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Search this workspace</p>
              <p className="text-xs mt-1">Find messages, files, and tasks</p>
            </div>
          )}

          {query && !loading && results && totalResults === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium">No results for "<span className="text-foreground">{query}</span>"</p>
              <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
            </div>
          )}

          {results && results.messages.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" /> Messages
                </span>
              </div>
              {results.messages.map(m => (
                <button
                  key={m.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  onClick={() => { onNavigate?.("chat"); onOpenChange(false); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium mb-0.5">{m.senderName}</p>
                      <p className="text-sm text-muted-foreground truncate">{m.content}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(m.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && results.files.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <File className="h-3 w-3" /> Files
                </span>
              </div>
              {results.files.map(f => (
                <button
                  key={f.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  onClick={() => { onNavigate?.("files"); onOpenChange(false); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{f.name}</p>
                        <p className="text-xs text-muted-foreground">Uploaded by {f.uploaderName}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(f.createdAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {results && results.tasks.length > 0 && (
            <div>
              <div className="px-4 py-2 border-b bg-muted/30">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="h-3 w-3" /> Tasks
                </span>
              </div>
              {results.tasks.map(t => (
                <button
                  key={t.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                  onClick={() => { onNavigate?.("tasks"); onOpenChange(false); }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                        {t.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant={(PRIORITY_COLORS[t.priority] ?? "secondary") as any} className="text-xs capitalize">
                        {t.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{STATUS_LABELS[t.status] ?? t.status}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {query && (
          <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {loading ? "Searching..." : `${totalResults} result${totalResults !== 1 ? "s" : ""} found`}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">Click a result to navigate</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
