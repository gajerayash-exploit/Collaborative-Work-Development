import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useAuth } from "@clerk/react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";

// Setup
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(221.2 83.2% 53.3%)",
    colorForeground: "hsl(222.2 47.4% 11.2%)",
    colorMutedForeground: "hsl(215.4 16.3% 46.9%)",
    colorDanger: "hsl(0 84.2% 60.2%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(0 0% 100%)",
    colorInputForeground: "hsl(222.2 47.4% 11.2%)",
    colorNeutral: "hsl(214.3 31.8% 91.4%)",
    fontFamily: "Inter, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButtonText: "font-medium text-foreground",
    formFieldLabel: "font-medium text-foreground",
    footerActionLink: "text-primary font-medium hover:text-primary/90",
    footerActionText: "text-muted-foreground text-sm",
    dividerText: "text-muted-foreground text-xs",
    identityPreviewEditButton: "text-primary hover:text-primary/90",
    formFieldSuccessText: "text-green-600",
    alertText: "text-destructive",
    logoBox: "flex justify-center mb-4",
    logoImage: "h-8",
    socialButtonsBlockButton: "border border-input bg-background hover:bg-muted text-foreground",
    formButtonPrimary: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
    formFieldInput: "border-input bg-background text-foreground placeholder:text-muted-foreground",
    footerAction: "justify-center",
    dividerLine: "bg-border",
    alert: "border-destructive bg-destructive/10 text-destructive",
    otpCodeFieldInput: "border-input bg-background text-foreground",
    formFieldRow: "gap-2",
    main: "gap-6",
  },
};

// Pages (to be implemented in following steps)
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth";
import WorkspacesPage from "@/pages/workspaces";
import WorkspaceHubPage from "@/pages/workspace-hub";
import JoinPage from "@/pages/join";
import ProfilePage from "@/pages/profile";

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/workspaces" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function WorkspacesRoute() {
  return (
    <>
      <Show when="signed-in">
        <WorkspacesPage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function WorkspaceHubRoute(props: { params: { id: string } }) {
  return (
    <>
      <Show when="signed-in">
        <WorkspaceHubPage id={props.params.id} />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function JoinRoute(props: { params: { code: string } }) {
  return (
    <>
      <Show when="signed-in">
        <JoinPage inviteCode={props.params.code} />
      </Show>
      <Show when="signed-out">
        <Redirect to={`/sign-in?redirect_url=${encodeURIComponent(`/join/${props.params.code}`)}`} />
      </Show>
    </>
  );
}

function ProfileRoute() {
  return (
    <>
      <Show when="signed-in">
        <ProfilePage />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => { setAuthTokenGetter(null); };
  }, [getToken]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkTokenSync />
        <ClerkQueryClientCacheInvalidator />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?">
            <AuthPage type="sign-in" basePath={basePath} />
          </Route>
          <Route path="/sign-up/*?">
            <AuthPage type="sign-up" basePath={basePath} />
          </Route>
          <Route path="/workspaces" component={WorkspacesRoute} />
          <Route path="/workspaces/:id" component={WorkspaceHubRoute} />
          <Route path="/join/:code" component={JoinRoute} />
          <Route path="/profile" component={ProfileRoute} />
          <Route component={NotFound} />
        </Switch>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}
