"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/ui/page-heading";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

function safeReturnPath(requested: string): string {
  if (!requested?.startsWith("/") || requested.startsWith("//")) return "/profile";
  const destination = new URL(requested, "https://admitos.invalid");
  return destination.origin === "https://admitos.invalid"
    ? `${destination.pathname}${destination.search}${destination.hash}`
    : "/profile";
}

function responseMessage(error: { message?: string; statusText?: string } | null | undefined): string {
  return error?.message || error?.statusText || "Authentication is unavailable. Check your connection and try again.";
}

export function SignInWorkspace({
  initialMode,
  returnTo,
}: {
  initialMode: AuthMode;
  returnTo: string;
}) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const callbackURL = safeReturnPath(returnTo);
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const session = authClient.useSession();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const result = mode === "sign-in"
        ? await authClient.signIn.email({ email, password, callbackURL })
        : await authClient.signUp.email({ name: name.trim(), email, password, callbackURL });
      if (result.error) {
        setMessage(responseMessage(result.error));
        return;
      }
      router.replace(callbackURL);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication is unavailable. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    await authClient.signOut();
    await session.refetch();
  }

  return (
    <div className="workspace-page sign-in-workspace">
      <PageHeading
        eyebrow="ACCOUNT ACCESS"
        title={mode === "sign-in" ? "Sign in" : "Create your account"}
        description="Use your AdmitOS account to access your private student profile."
      />
      <section className="section-card auth-panel">
        {session.data?.user ? (
          <div className="auth-signed-in" role="status">
            <h2>You are signed in</h2>
            <p>{session.data.user.email}</p>
            <Link className="auth-primary-action" href={callbackURL}>Continue</Link>
            <button className="auth-secondary-action" type="button" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <>
            <div className="auth-mode-switch" role="tablist" aria-label="Account action">
              <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setMessage(null); }}>Sign in</button>
              <button type="button" role="tab" aria-selected={mode === "sign-up"} onClick={() => { setMode("sign-up"); setMessage(null); }}>Create account</button>
            </div>
            <form className="auth-form" onSubmit={submit}>
              {mode === "sign-up" && (
                <label>
                  Name
                  <input autoComplete="name" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} />
                </label>
              )}
              <label>
                Email
                <input autoComplete="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label>
                Password
                <input autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              {message && <p className="auth-error" role="alert">{message}</p>}
              <button className="auth-primary-action" type="submit" disabled={pending}>
                {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}