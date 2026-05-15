import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ReadmeButton } from "@/components/readme-modal";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { FadeIn, StaggerContainer, StaggerItem, TextReveal } from "@/components/ui/fade-in";
import { motion } from "framer-motion";

const FEATURES = [
  { title: "Real-time Chat", desc: "Threaded conversations, reactions, and live typing indicators keep your team in sync." },
  { title: "Kanban Tasks", desc: "Drag-and-drop boards with priority flags, assignees, and due dates." },
  { title: "Shared Files", desc: "Upload and share any file type. Every asset lives inside the workspace." },
  { title: "Secrets Vault", desc: "Store API keys with AES-256-GCM encryption. Only teammates can reveal values." },
  { title: "Role-based Access", desc: "Admins, editors, and viewers — granular permissions for every team setup." },
  { title: "Smart Notifications", desc: "Get pinged only when it matters. Mark read, dismiss, and stay focused." },
];

const STATS = [
  { value: "∞", label: "Workspaces" },
  { value: "256", label: "bit encryption" },
  { value: "0", label: "config files" },
  { value: "100%", label: "free to start" },
];

const SECTIONS = [
  {
    kicker: "Slack-inspired flow",
    title: "One platform for planning, shipping, and syncing",
    text: "A premium workspace with chat, tasks, files, vault, and presence — built for teams that want everything in one place.",
    reverse: false,
  },
  {
    kicker: "Glassmorphic UI",
    title: "Warm light sections, deep dark sections, and strong contrast",
    text: "The layout alternates between airy and immersive zones, with glass cards, bold stats, and clean CTA hierarchy.",
    reverse: true,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#07080F] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080F]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5B6EF5] to-[#2ECFB5] shadow-lg shadow-[#5B6EF5]/20">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                <path d="M2 17l10 5 10-5" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">Project Nexus</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ReadmeButton />
            <Link href="/sign-in" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
              Log in
            </Link>
            <Link href="/sign-up">
              <Button className="rounded-full bg-[#5B6EF5] px-4 text-sm font-semibold text-white shadow-lg shadow-[#5B6EF5]/25 hover:bg-[#7B8FF7]">
                Get started →
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main>
        {/* HERO SECTION */}
        <section className="relative overflow-hidden">
          <AnimatedBackground />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 z-10">
            <div className="mx-auto max-w-4xl text-center">
              <FadeIn delay={0.2} direction="down">
                <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/70 backdrop-blur">
                  <span className="h-2 w-2 rounded-full bg-[#2ECFB5] shadow-[0_0_8px_#2ECFB5]" />
                  Built for student engineers & indie teams
                </div>
              </FadeIn>
              
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl">
                <TextReveal text="The command center " className="inline" />
                <FadeIn delay={0.8} direction="none" className="inline-block">
                  <span className="bg-gradient-to-r from-[#5B6EF5] to-[#2ECFB5] bg-clip-text text-transparent">for your team.</span>
                </FadeIn>
              </h1>
              
              <FadeIn delay={1.0} direction="up">
                <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/70 sm:text-xl">
                  Chat, Kanban boards, file sharing, secrets vault — everything your team needs, in one workspace. No setup. No subscriptions.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/sign-up" className="w-full sm:w-auto">
                    <Button className="h-12 w-full rounded-full bg-gradient-to-r from-[#5B6EF5] to-[#2ECFB5] px-8 text-sm font-bold text-white shadow-xl shadow-[#5B6EF5]/25 hover:opacity-95 sm:w-auto transition-all hover:scale-105 active:scale-95">
                      🚀 Start for free
                    </Button>
                  </Link>
                  <Link href="/sign-in" className="w-full sm:w-auto">
                    <Button variant="outline" className="h-12 w-full rounded-full border-white/15 bg-white/5 px-8 text-sm font-semibold text-white hover:bg-white/10 sm:w-auto transition-all hover:scale-105 active:scale-95">
                      → Open your workspaces
                    </Button>
                  </Link>
                </div>
              </FadeIn>
            </div>
            
            <FadeIn delay={1.4} duration={0.8} direction="up">
              <div className="mx-auto mt-14 max-w-6xl rounded-3xl border border-white/10 bg-white/5 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-4 hover:border-white/20 transition-colors">
                <div className="rounded-2xl border border-white/10 bg-[#111425] p-3 sm:p-4">
                  <div className="mb-3 flex items-center gap-2 border-b border-white/10 pb-3 text-xs text-white/50">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                    <div className="ml-2 truncate rounded-md border border-white/10 bg-white/5 px-3 py-1.5">app.projectnexus.dev/workspaces/my-team</div>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-[220px_1fr]">
                    <div className="hidden rounded-2xl border border-white/10 bg-white/5 p-3 lg:block">
                      <div className="mb-3 rounded-xl border border-[#5B6EF5]/20 bg-[#5B6EF5]/10 px-3 py-2 text-sm font-semibold text-white">My Team</div>
                      <div className="space-y-1 text-sm text-white/60">
                        <div className="rounded-lg bg-white/5 px-3 py-2">Chat</div>
                        <div className="rounded-lg px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer">Tasks</div>
                        <div className="rounded-lg px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer">Files</div>
                        <div className="rounded-lg px-3 py-2 hover:bg-white/5 transition-colors cursor-pointer">Vault</div>
                      </div>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4 relative overflow-hidden">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5B6EF5] to-[#A78BFA]" />
                        <div className="h-3 w-28 rounded-full bg-white/15 animate-pulse" />
                      </div>
                      {['Deploy the new API endpoint 🔥', 'Fix auth redirect bug 🐛', 'Write integration tests ✅', 'Update README docs 📝'].map((msg, i) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.6 + (i * 0.1) }}
                          key={msg} 
                          className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${i === 0 ? 'bg-[#5B6EF5] text-white shadow-lg shadow-[#5B6EF5]/20' : 'bg-white/8 text-white/85'}`}
                        >
                          {msg}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </section>
        
        {/* STATS SECTION */}
        <section className="border-y border-white/10 bg-[#0D0F1C] py-12 sm:py-14 relative z-10">
          <StaggerContainer className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6 lg:px-8">
            {STATS.map((stat) => (
              <StaggerItem key={stat.label} className="text-center">
                <div className="text-3xl font-black tracking-tight sm:text-5xl">{stat.value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">{stat.label}</div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
        
        {/* SPLIT SECTIONS */}
        <section className="bg-[#F7F6F2] px-4 py-16 text-[#111425] sm:px-6 sm:py-24 lg:px-8 relative z-10">
          <div className="mx-auto max-w-7xl space-y-12">
            {SECTIONS.map((section) => (
              <FadeIn key={section.title} direction="up" className={`grid gap-6 lg:grid-cols-2 lg:items-center ${section.reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#5A607A]">{section.kicker}</p>
                  <h2 className="text-3xl font-black tracking-tight sm:text-5xl">{section.title}</h2>
                  <p className="max-w-xl text-base leading-7 text-[#5A607A] sm:text-lg">{section.text}</p>
                </div>
                <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-xl shadow-black/5 sm:p-6 transition-all hover:shadow-2xl hover:-translate-y-1 duration-300">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {FEATURES.slice(0, 4).map((feature) => (
                      <div key={feature.title} className="rounded-2xl border border-black/5 bg-[#07080F] p-4 text-white">
                        <div className="text-lg font-bold">{feature.title}</div>
                        <div className="mt-2 text-sm leading-6 text-white/65">{feature.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
        
        {/* FEATURES GRID */}
        <section className="bg-[#07080F] px-4 py-16 sm:px-6 sm:py-24 lg:px-8 relative z-10">
          <div className="mx-auto max-w-7xl">
            <FadeIn direction="up" className="mb-10 text-center">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/45">Everything included</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Built for teams that ship</h2>
            </FadeIn>
            <StaggerContainer className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, index) => (
                <StaggerItem key={feature.title}>
                  <motion.div 
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="h-full rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/20 backdrop-blur-xl hover:border-white/20 hover:bg-white/10 transition-colors"
                  >
                    <div className="mb-4 text-3xl">{['⚡', '📋', '📁', '🔐', '👥', '🔔'][index]}</div>
                    <h3 className="text-lg font-bold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/65">{feature.desc}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
        
        {/* CTA */}
        <section className="bg-[#FAFAF8] px-4 py-16 text-[#111425] sm:px-6 sm:py-24 lg:px-8 relative z-10">
          <FadeIn direction="up" className="mx-auto max-w-4xl rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xl shadow-black/5 sm:p-14 transition-all hover:shadow-2xl">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">Ready to build something great?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#5A607A] sm:text-lg">Create your first workspace in seconds. No credit card, no setup.</p>
            <div className="mt-8">
              <Link href="/sign-up">
                <Button className="h-12 rounded-full bg-[#5B6EF5] px-8 text-sm font-bold text-white shadow-lg shadow-[#5B6EF5]/25 hover:bg-[#7B8FF7] hover:scale-105 active:scale-95 transition-all">🚀 Create your workspace</Button>
              </Link>
            </div>
          </FadeIn>
        </section>
      </main>
      
      <footer className="border-t border-white/10 bg-[#07080F] px-4 py-6 text-white/60 sm:px-6 lg:px-8 relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-2 text-white">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-[#5B6EF5] to-[#2ECFB5]" />
            <span className="text-sm font-semibold">Project Nexus</span>
          </div>
          <p className="text-xs sm:text-sm">&copy; {new Date().getFullYear()} Project Nexus. Built with love for creators.</p>
        </div>
      </footer>
    </div>
  );
}

