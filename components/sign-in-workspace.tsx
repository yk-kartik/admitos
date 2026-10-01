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

type AuthError = {
  code?: string;
  message?: string;
  statusText?: string;
};

function responseMessage(error: AuthError | null | undefined): string {
  return error?.message || error?.statusText || "Authentication is unavailable. Check your connection and try again.";
}

function verificationErrorMessage(error: AuthError | null | undefined): string {
  if (error?.code === "OTP_EXPIRED" || error?.message?.toLowerCase().includes("expired")) {
    return "That code has expired. Request a new code to continue.";
  }
  if (error?.code === "INVALID_OTP" || error?.message?.toLowerCase().includes("invalid")) {
    return "That code is not valid. Check the email and try again.";
  }
  if (error?.code === "TOO_MANY_ATTEMPTS") {
    return "Too many attempts. Request a new code before trying again.";
  }
  return responseMessage(error);
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
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [verificationPending, setVerificationPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
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
      if (mode === "sign-up") {
        setVerificationEmail(email.trim());
        setVerificationMessage("We sent a 6-digit code to your email address.");
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

  async function verifyOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verificationEmail) return;
    setVerificationPending(true);
    setVerificationMessage(null);
    setVerificationSuccess(false);
    try {
      const result = await authClient.emailOtp.verifyEmail({
        email: verificationEmail,
        otp: otp.trim(),
      });
      if (result.error) {
        setVerificationMessage(verificationErrorMessage(result.error));
        return;
      }
      setVerificationSuccess(true);
      setVerificationMessage("Email verified. Opening your profile…");
      await session.refetch();
      router.replace(callbackURL);
      router.refresh();
    } catch (error) {
      setVerificationMessage(
        verificationErrorMessage(error instanceof Error ? { message: error.message } : null),
      );
    } finally {
      setVerificationPending(false);
    }
  }

  async function resendOTP() {
    if (!verificationEmail) return;
    setResendPending(true);
    setVerificationMessage(null);
    setVerificationSuccess(false);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: verificationEmail,
        type: "email-verification",
      });
      setVerificationMessage(result.error
        ? verificationErrorMessage(result.error)
        : "A new verification code is on its way.");
    } catch (error) {
      setVerificationMessage(
        verificationErrorMessage(error instanceof Error ? { message: error.message } : null),
      );
    } finally {
      setResendPending(false);
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
        {verificationEmail ? (
          <div className="auth-signed-in">
            <h2>Verify your email</h2>
            <p>Enter the 6-digit code sent to {verificationEmail}. It expires in 5 minutes.</p>
            <form className="auth-form" onSubmit={verifyOTP}>
              <label>
                Verification code
                <input
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  minLength={6}
                  pattern="[0-9]{6}"
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </label>
              {verificationMessage && (
                <p className={verificationSuccess ? "auth-success" : "auth-error"} role="status">
                  {verificationMessage}
                </p>
              )}
              <button className="auth-primary-action" type="submit" disabled={verificationPending || verificationSuccess}>
                {verificationPending ? "Verifying…" : "Verify email"}
              </button>
            </form>
            <button className="auth-secondary-action" type="button" onClick={resendOTP} disabled={resendPending || verificationSuccess}>
              {resendPending ? "Sending…" : "Resend code"}
            </button>
          </div>
        ) : session.data?.user ? (
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