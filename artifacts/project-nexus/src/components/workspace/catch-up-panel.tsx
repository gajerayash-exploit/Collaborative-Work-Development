import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Loader2, Clock, RefreshCw } from "lucide-react";
import { useAuthenticatedFetch } from "@/hooks/use-authenticated-fetch";
import { cn } from "@/lib/utils";

const WINDOWS = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
] as const;

type Window = (typeof WINDOWS)[number];

/** Render the streamed markdown: ## headers, - bullets, **bold** */
function MarkdownLine({ line }: { line: string }) {
  if (line.startsWith("## ")) {
    return (
      <h3 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0 flex items-center gap-1.5">
        {line.slice(3)}
      </h3>
    );
  }
  if (line.startsWith("- ") || line.startsWith("• ")) {
    const content = line.slice(2);
    return (
      <div className="flex items-start gap-1.5 ml-1 mb-0.5">
        <span className="text-muted-foreground mt-1.5 text-[8px] flex-shrink-0">●</span>
        <InlineMarkdown text={content} />
      </div>
    );
  }
  if (!line.trim()) return null;
  return <p className="text-sm text-muted-foreground mb-0.5"><InlineMarkdown text={line} /></p>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
        }
        // Colour @mentions
        const segments = part.split(/(@\w[\w\s]*)/g);
        return (
          <span key={i}>
            {segments.map((seg, j) =>
              seg.startsWith("@") ? (
                <span key={j} className="text-primary font-medium">{seg}</span>
              ) : (
                seg
              ),
            )}
          </span>
        );
      })}
    </span>
  );
}

interface CatchUpPanelProps {
  workspaceId: string;
}

type Status = "idle" | "loading" | "streaming" | "done" | "error";

export function CatchUpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 px-2"
    >
      <Sparkles className="h-3.5 w-3.5 text-violet-500" />
      Catch me up
    </Button>
  );
}

interface CatchUpPanelFullProps extends CatchUpPanelProps {
  onClose: () => void;
}

export function CatchUpPanel({ workspaceId, onClose }: CatchUpPanelFullProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [selectedWindow, setSelectedWindow] = useState<Window>(WINDOWS[2]); // 24h default
  const [text, setText] = useState("");
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const authenticatedFetch = useAuthenticatedFetch();

  const run = useCallback(
    async (win: Window) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      setText("");
      setMessageCount(null);
      setErrorMsg("");
      setStatus("loading");

      try {
        const res = await authenticatedFetch(
          `/api/workspaces/${workspaceId}/ai/catchup?hours=${win.hours}`,
          { signal: abortRef.current.signal },
        );

        if (!res.ok || !res.body) {
          throw new Error("Request failed");
        }

        setStatus("streaming");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const payload = JSON.parse(line.slice(6));
              if (payload.error) {
                setErrorMsg(payload.error);
                setStatus("error");
                return;
              }
              if (typeof payload.messageCount === "number") {
                setMessageCount(payload.messageCount);
              }
              if (payload.content) {
                setText((prev) => prev + payload.content);
              }
              if (payload.done) {
                setStatus("done");
              }
            } catch {}
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setErrorMsg("Something went wrong. Please try again.");
        setStatus("error");
      }
    },
    [workspaceId, authenticatedFetch],
  );

  const handleWindowChange = (win: Window) => {
    setSelectedWindow(win);
    run(win);
  };

  const lines = text.split("\n");
  const isActive = status === "loading" || status === "streaming";

  return (
    <div className="border-b bg-gradient-to-b from-violet-50/60 to-transparent dark:from-violet-950/20 dark:to-transparent">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-foreground">AI Catch-up</span>

        {messageCount !== null && (
          <span className="text-xs text-muted-foreground">
            · {messageCount} message{messageCount !== 1 ? "s" : ""}
          </span>
        )}

        <div className="flex items-center gap-0.5 ml-auto">
          <Clock className="h-3 w-3 text-muted-foreground mr-0.5" />
          {WINDOWS.map((w) => (
            <button
              key={w.label}
              onClick={() => handleWindowChange(w)}
              disabled={isActive}
              className={cn(
                "text-xs px-2 py-0.5 rounded transition-colors",
                selectedWindow.hours === w.hours
                  ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                isActive && "opacity-50 cursor-not-allowed",
              )}
            >
              {w.label}
            </button>
          ))}
          {(status === "done" || status === "error") && (
            <button
              onClick={() => run(selectedWindow)}
              className="ml-1 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-1 p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        {status === "idle" && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-violet-200 dark:border-violet-800 hover:bg-violet-50 dark:hover:bg-violet-900/20"
            onClick={() => run(selectedWindow)}
          >
            <Sparkles className="h-3 w-3 text-violet-500" />
            Summarize last {selectedWindow.label}
          </Button>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-2 py-1">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
            <span className="text-xs text-muted-foreground">Reading messages…</span>
          </div>
        )}

        {(status === "streaming" || status === "done") && (
          <div className="max-h-56 overflow-y-auto pr-1 space-y-0.5">
            {lines.map((line, i) => (
              <MarkdownLine key={i} line={line} />
            ))}
            {status === "streaming" && (
              <span className="inline-block w-1.5 h-3.5 bg-violet-500 rounded-sm animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 py-1">
            <span className="text-xs text-destructive">{errorMsg}</span>
            <button
              onClick={() => run(selectedWindow)}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
