import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";

function Badge({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="inline-flex items-center rounded-sm overflow-hidden text-[11px] font-medium mr-1.5 mb-1.5 select-none">
      <span className="bg-[#555] text-white px-2 py-0.5">{label}</span>
      <span style={{ background: color }} className="text-white px-2 py-0.5">{value}</span>
    </span>
  );
}

function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-2xl sm:text-3xl font-bold text-foreground border-b border-border pb-3 mb-4">{children}</h1>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-foreground border-b border-border pb-2 mt-8 mb-4">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-foreground mt-6 mb-2">{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1.5 py-0.5 rounded text-[12px] font-mono text-foreground border border-border">{children}</code>;
}
function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted border border-border rounded-lg p-4 text-[12px] font-mono overflow-x-auto mb-4 text-foreground">
      {children}
    </pre>
  );
}
function Li({ children }: { children: React.ReactNode }) {
  return <li className="text-sm text-muted-foreground mb-1 flex gap-2"><span className="text-primary mt-0.5 flex-shrink-0">▸</span><span>{children}</span></li>;
}

const FEATURE_ICONS = {
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  tasks: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  files: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  vault: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  members: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
};

const TECH_STACK = [
  { name: "React 18", desc: "UI framework", color: "#61dafb" },
  { name: "TypeScript", desc: "Type safety", color: "#3178c6" },
  { name: "Vite", desc: "Build tool", color: "#646cff" },
  { name: "Express", desc: "API server", color: "#68a063" },
  { name: "PostgreSQL", desc: "Database", color: "#336791" },
  { name: "Drizzle ORM", desc: "Query builder", color: "#c5f74f" },
  { name: "Clerk", desc: "Auth", color: "#6c47ff" },
  { name: "Tailwind CSS", desc: "Styling", color: "#38bdf8" },
  { name: "Recharts", desc: "Analytics charts", color: "#ff6b6b" },
  { name: "dnd-kit", desc: "Drag & drop", color: "#f59e0b" },
];

const FEATURES_LIST = [
  { icon: "chat",      title: "Real-time Chat",       desc: "Threaded workspace messaging with live activity feed and read tracking." },
  { icon: "tasks",     title: "Kanban Task Board",    desc: "Drag-and-drop board with priority flags, assignees, due dates, and list/board views." },
  { icon: "files",     title: "File Sharing",         desc: "Upload any file type. Preview, download, and manage within your workspace." },
  { icon: "vault",     title: "Secrets Vault",        desc: "AES-256-GCM encrypted env variable storage. Only workspace members can reveal values." },
  { icon: "analytics", title: "Burn-down Analytics",  desc: "Velocity charts, completion rate, priority breakdown, and team leaderboard." },
  { icon: "members",   title: "Role-based Access",    desc: "Admin, editor, and viewer roles with invite links and granular permissions." },
];

export function ReadmeButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 sm:px-3 py-1.5 whitespace-nowrap"
      >
        <FileText className="h-4 w-4" />
        README
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-full h-[90vh] p-0 flex flex-col gap-0">
          <DialogTitle className="sr-only">Project Nexus — README</DialogTitle>

          {/* GitHub-style header bar */}
          <div className="flex items-center gap-3 px-5 py-3 border-b bg-muted/40 flex-shrink-0 rounded-t-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>README.md</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 sm:px-10 py-8 max-w-2xl mx-auto">

              {/* Title + logo */}
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="h-9 w-9">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                    <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
                  </svg>
                </div>
                <H1>Project Nexus</H1>
                <P>The unified command center for student engineers and indie teams. Chat, tasks, files, secrets, and analytics — all in one workspace.</P>

                {/* Badges */}
                <div className="flex flex-wrap justify-center mt-1">
                  <Badge label="version" value="1.0.0" color="#22c55e" />
                  <Badge label="license" value="MIT" color="#6366f1" />
                  <Badge label="built with" value="React + Vite" color="#3b82f6" />
                  <Badge label="auth" value="Clerk" color="#6c47ff" />
                  <Badge label="db" value="PostgreSQL" color="#336791" />
                  <Badge label="status" value="active" color="#f59e0b" />
                </div>
              </div>

              <H2>Features</H2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {FEATURES_LIST.map(f => (
                  <div key={f.title} className="flex gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="text-primary flex-shrink-0 mt-0.5">
                      {FEATURE_ICONS[f.icon as keyof typeof FEATURE_ICONS]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{f.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <H2>Tech Stack</H2>
              <div className="flex flex-wrap gap-2 mb-6">
                {TECH_STACK.map(t => (
                  <div key={t.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-card text-xs font-medium">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    <span className="text-foreground">{t.name}</span>
                    <span className="text-muted-foreground">— {t.desc}</span>
                  </div>
                ))}
              </div>

              <H2>Architecture</H2>
              <CodeBlock>{`artifacts/
├── project-nexus/     # React + Vite frontend (this app)
├── api-server/        # Express REST API
lib/
├── api-spec/          # OpenAPI contract + codegen
├── api-client-react/  # React Query hooks (generated)
├── db/                # Drizzle ORM schema + migrations`}</CodeBlock>

              <H2>Getting Started</H2>
              <H3>Prerequisites</H3>
              <ul className="space-y-0.5 mb-4">
                <Li><Code>Node.js 18+</Code> and <Code>pnpm 9+</Code></Li>
                <Li>A <Code>PostgreSQL</Code> database (Replit provides one automatically)</Li>
                <Li>A <Code>Clerk</Code> account for authentication</Li>
              </ul>

              <H3>Environment Variables</H3>
              <CodeBlock>{`VITE_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-here`}</CodeBlock>

              <H3>Run Locally</H3>
              <CodeBlock>{`pnpm install
pnpm --filter @workspace/db run migrate
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/project-nexus run dev`}</CodeBlock>

              <H2>Key Concepts</H2>
              <ul className="space-y-1 mb-6">
                <Li><strong>Workspaces</strong> are isolated team environments. Each has its own members, tasks, files, messages, and secrets.</Li>
                <Li><strong>Roles</strong> — <Code>admin</Code>, <Code>editor</Code>, <Code>viewer</Code> — control what each member can do.</Li>
                <Li><strong>Invite links</strong> allow external users to join a workspace directly via a unique token.</Li>
                <Li><strong>Vault secrets</strong> are encrypted server-side and never sent to the client in plaintext — only revealed on explicit request.</Li>
                <Li><strong>Burn-down analytics</strong> are computed from task history using daily snapshots stored in the database.</Li>
              </ul>

              <H2>API</H2>
              <P>The REST API is contract-first. The OpenAPI spec lives in <Code>lib/api-spec/openapi.yaml</Code>. Run codegen to regenerate hooks:</P>
              <CodeBlock>{`pnpm --filter @workspace/api-spec run codegen`}</CodeBlock>

              <H2>License</H2>
              <P>MIT © {new Date().getFullYear()} Project Nexus. Built with ❤️ for creators.</P>

              {/* Footer rule */}
              <div className="border-t border-border mt-6 pt-4 flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-primary flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="h-3 w-3">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                    <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
                  </svg>
                </div>
                <span className="text-xs text-muted-foreground font-medium">Project Nexus</span>
              </div>

            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
