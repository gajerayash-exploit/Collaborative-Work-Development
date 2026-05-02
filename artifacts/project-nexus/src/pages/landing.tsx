import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Project Nexus Logo" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight">Project Nexus</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Log in
          </Link>
          <Link href="/sign-up" className="text-sm font-medium text-primary-foreground bg-primary px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-foreground">
          The command center for student teams.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mb-10">
          Build projects together in shared workspaces. Fast, dense, and built for engineers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/sign-up">
            <Button size="lg" className="h-12 px-8 text-base">
              Get Started
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="outline" size="lg" className="h-12 px-8 text-base">
              Go to Workspaces
            </Button>
          </Link>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t">
        <p>&copy; {new Date().getFullYear()} Project Nexus. Built for creators.</p>
      </footer>
    </div>
  );
}
