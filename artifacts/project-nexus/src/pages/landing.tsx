import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    emoji: "⚡",
    title: "Real-time Chat",
    desc: "Threaded conversations, reactions, and live typing indicators keep your team in sync.",
    gradient: "from-yellow-400/20 to-orange-400/10",
    border: "border-yellow-400/20",
  },
  {
    emoji: "📋",
    title: "Kanban Tasks",
    desc: "Drag-and-drop boards with priority flags, assignees, and due dates — zero overhead.",
    gradient: "from-blue-400/20 to-cyan-400/10",
    border: "border-blue-400/20",
  },
  {
    emoji: "📁",
    title: "Shared Files",
    desc: "Upload and share any file type. Every asset lives inside the workspace, always accessible.",
    gradient: "from-emerald-400/20 to-teal-400/10",
    border: "border-emerald-400/20",
  },
  {
    emoji: "🔐",
    title: "Secrets Vault",
    desc: "Store API keys with AES-256-GCM encryption. Only teammates can reveal values.",
    gradient: "from-purple-400/20 to-pink-400/10",
    border: "border-purple-400/20",
  },
  {
    emoji: "👥",
    title: "Role-based Access",
    desc: "Admins, editors, and viewers — granular permissions for every team setup.",
    gradient: "from-rose-400/20 to-red-400/10",
    border: "border-rose-400/20",
  },
  {
    emoji: "🔔",
    title: "Smart Notifications",
    desc: "Get pinged only when it matters. Mark read, dismiss, and stay focused.",
    gradient: "from-indigo-400/20 to-violet-400/10",
    border: "border-indigo-400/20",
  },
];

const STATS = [
  { value: "∞", label: "Workspaces", emoji: "🏠" },
  { value: "256", label: "bit encryption", emoji: "🔒" },
  { value: "0", label: "config files", emoji: "✨" },
  { value: "100%", label: "free to start", emoji: "🚀" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-primary-foreground" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">Project Nexus</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
            Log in
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="shadow-sm">
              Get started free →
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 overflow-hidden">
          {/* Background glow orbs */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border bg-muted/50 text-sm font-medium text-muted-foreground mb-8 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Built for student engineers & indie teams
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-foreground leading-[1.05]">
              The command center{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
                for your team
              </span>
              .
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Chat 💬, Kanban boards 📋, file sharing 📁, secrets vault 🔐 — everything your team needs, in one workspace. No setup. No subscriptions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-8 text-base shadow-lg gap-2">
                  🚀 Start for free
                </Button>
              </Link>
              <Link href="/sign-in">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base gap-2">
                  → Open your workspaces
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="relative z-10 mt-16 w-full max-w-5xl mx-auto">
            <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
              {/* Mock app bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/50">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                <div className="h-3 w-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-4 h-6 rounded-md bg-background/80 border text-[10px] flex items-center px-3 text-muted-foreground">
                  app.projectnexus.dev/workspaces/my-team
                </div>
              </div>
              {/* Mock workspace UI */}
              <div className="flex h-64 sm:h-80">
                {/* Sidebar mock */}
                <div className="w-44 border-r bg-muted/30 p-3 flex flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="h-6 w-6 rounded bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">MT</div>
                    <span className="text-xs font-semibold truncate">My Team</span>
                  </div>
                  {["💬 Chat","📋 Tasks","📁 Files","🔐 Vault","👥 Members"].map(item => (
                    <div key={item} className="px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted/50">{item}</div>
                  ))}
                </div>
                {/* Main mock */}
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
                    <div>
                      <div className="h-2.5 w-24 rounded bg-foreground/20" />
                    </div>
                  </div>
                  {["Deploy the new API endpoint 🔥", "Fix auth redirect bug 🐛", "Write integration tests ✅", "Update README docs 📝"].map((msg, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className={`h-5 w-5 rounded-full flex-shrink-0 ${["bg-blue-400","bg-green-400","bg-purple-400","bg-orange-400"][i]}`} />
                      <div className={`flex-1 rounded-lg px-3 py-1.5 text-xs ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                        {msg}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 hidden lg:flex items-center gap-2 bg-card border rounded-xl shadow-lg px-4 py-2.5">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-xs font-semibold">Real-time sync</p>
                <p className="text-[10px] text-muted-foreground">Live across all members</p>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 hidden lg:flex items-center gap-2 bg-card border rounded-xl shadow-lg px-4 py-2.5">
              <span className="text-xl">🔐</span>
              <div>
                <p className="text-xs font-semibold">AES-256-GCM</p>
                <p className="text-[10px] text-muted-foreground">Encrypted secrets vault</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/20 py-12">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-3xl mb-1">{s.emoji}</div>
                <div className="text-4xl font-black tracking-tight">{s.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-sm font-medium text-primary mb-3 tracking-wider uppercase">Everything included</div>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4">Built for teams that ship 🚢</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Every feature you need to collaborate, track progress, and keep secrets safe — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`relative group rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-card overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/5 -translate-y-8 translate-x-8 pointer-events-none" />
                <div className="text-4xl mb-4">{f.emoji}</div>
                <h3 className="text-base font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-3xl mx-auto text-center rounded-3xl border bg-gradient-to-br from-primary/5 via-background to-purple-500/5 p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/5 pointer-events-none" />
            <div className="relative z-10">
              <div className="text-5xl mb-6">🎯</div>
              <h2 className="text-4xl font-extrabold tracking-tight mb-4">
                Ready to build something great?
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                Create your first workspace in seconds. No credit card, no setup.
              </p>
              <Link href="/sign-up">
                <Button size="lg" className="h-12 px-10 text-base shadow-lg gap-2">
                  🚀 Create your workspace
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-primary-foreground" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Project Nexus</span>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Project Nexus. Built with ❤️ for creators.</p>
        </div>
      </footer>
    </div>
  );
}
