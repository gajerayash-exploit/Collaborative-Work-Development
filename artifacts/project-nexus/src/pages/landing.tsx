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
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-3 border-b bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary flex items-center justify-center shadow-sm flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-base sm:text-xl font-bold tracking-tight whitespace-nowrap">Project Nexus</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 sm:px-3 py-1.5 whitespace-nowrap">
            Log in
          </Link>
          <Link href="/sign-up">
            <Button size="sm" className="shadow-sm text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">
              Get started →
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-4 pt-16 sm:pt-24 pb-16 sm:pb-20">
          <div className="max-w-4xl mx-auto w-full">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border bg-muted/50 text-xs sm:text-sm font-medium text-muted-foreground mb-6 sm:mb-8">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              Built for student engineers & indie teams
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4 sm:mb-6 text-foreground leading-[1.05]">
              The command center{" "}
              <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-600 bg-clip-text text-transparent">
                for your team
              </span>
              .
            </h1>

            <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 leading-relaxed">
              Chat, Kanban boards, file sharing, secrets vault — everything your team needs, in one workspace. No setup. No subscriptions.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xs sm:max-w-none mx-auto">
              <Link href="/sign-up" className="w-full sm:w-auto">
                <Button size="lg" className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base shadow-lg gap-2 w-full">
                  🚀 Start for free
                </Button>
              </Link>
              <Link href="/sign-in" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-11 sm:h-12 px-6 sm:px-8 text-sm sm:text-base gap-2 w-full">
                  → Open your workspaces
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="mt-12 sm:mt-16 w-full max-w-5xl mx-auto px-0 sm:px-4">
            <div className="rounded-xl sm:rounded-2xl border bg-card shadow-2xl overflow-hidden">
              {/* Mock app bar */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b bg-muted/50">
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-400" />
                <div className="flex-1 mx-2 sm:mx-4 h-5 sm:h-6 rounded-md bg-background/80 border text-[9px] sm:text-[10px] flex items-center px-2 sm:px-3 text-muted-foreground truncate">
                  app.projectnexus.dev/workspaces/my-team
                </div>
              </div>
              {/* Mock workspace UI */}
              <div className="flex h-48 sm:h-72">
                {/* Sidebar mock - hidden on very small screens */}
                <div className="hidden xs:flex w-32 sm:w-44 border-r bg-muted/30 p-2 sm:p-3 flex-col gap-2 flex-shrink-0">
                  <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-primary flex items-center justify-center text-[8px] sm:text-[10px] text-primary-foreground font-bold flex-shrink-0">MT</div>
                    <span className="text-[10px] sm:text-xs font-semibold truncate">My Team</span>
                  </div>
                  {["💬 Chat","📋 Tasks","📁 Files","🔐 Vault"].map(item => (
                    <div key={item} className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded text-[9px] sm:text-xs text-muted-foreground">{item}</div>
                  ))}
                </div>
                {/* Main mock */}
                <div className="flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-hidden">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
                    <div className="h-2 w-16 sm:w-24 rounded bg-foreground/20" />
                  </div>
                  {["Deploy the new API endpoint 🔥", "Fix auth redirect bug 🐛", "Write integration tests ✅", "Update README docs 📝"].map((msg, i) => (
                    <div key={i} className="flex items-start gap-1.5 sm:gap-2">
                      <div className={`h-4 w-4 sm:h-5 sm:w-5 rounded-full flex-shrink-0 ${["bg-blue-400","bg-green-400","bg-purple-400","bg-orange-400"][i]}`} />
                      <div className={`flex-1 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-xs ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60"}`}>
                        {msg}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating badges — desktop only */}
            <div className="mt-4 flex items-center justify-center gap-3 sm:hidden">
              <div className="flex items-center gap-2 bg-card border rounded-xl shadow px-3 py-2">
                <span className="text-base">⚡</span>
                <p className="text-xs font-semibold">Real-time sync</p>
              </div>
              <div className="flex items-center gap-2 bg-card border rounded-xl shadow px-3 py-2">
                <span className="text-base">🔐</span>
                <p className="text-xs font-semibold">AES-256-GCM</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/20 py-10 sm:py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            {STATS.map(s => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl mb-1">{s.emoji}</div>
                <div className="text-3xl sm:text-4xl font-black tracking-tight">{s.value}</div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="text-xs sm:text-sm font-medium text-primary mb-2 sm:mb-3 tracking-wider uppercase">Everything included</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 sm:mb-4">Built for teams that ship 🚢</h2>
            <p className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto">
              Every feature you need to collaborate, track progress, and keep secrets safe — all in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className={`rounded-xl sm:rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-5 sm:p-6 hover:shadow-lg transition-all duration-300 bg-card`}
              >
                <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{f.emoji}</div>
                <h3 className="text-sm sm:text-base font-bold mb-1 sm:mb-2">{f.title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center rounded-2xl sm:rounded-3xl border bg-muted/30 p-8 sm:p-16">
            <div className="text-4xl sm:text-5xl mb-4 sm:mb-6">🎯</div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3 sm:mb-4">
              Ready to build something great?
            </h2>
            <p className="text-muted-foreground text-sm sm:text-lg mb-6 sm:mb-8">
              Create your first workspace in seconds. No credit card, no setup.
            </p>
            <Link href="/sign-up">
              <Button size="lg" className="h-11 sm:h-12 px-8 sm:px-10 text-sm sm:text-base shadow-lg gap-2 w-full sm:w-auto">
                🚀 Create your workspace
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 sm:h-6 sm:w-6 rounded bg-primary flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-sm font-semibold">Project Nexus</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground text-center">&copy; {new Date().getFullYear()} Project Nexus. Built with ❤️ for creators.</p>
        </div>
      </footer>
    </div>
  );
}
