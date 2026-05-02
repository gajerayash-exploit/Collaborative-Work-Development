import { SignIn, SignUp } from "@clerk/react";

interface AuthPageProps {
  type: "sign-in" | "sign-up";
  basePath: string;
}

export default function AuthPage({ type, basePath }: AuthPageProps) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-muted/30 px-4">
      {type === "sign-in" ? (
        <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
      ) : (
        <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
      )}
    </div>
  );
}
