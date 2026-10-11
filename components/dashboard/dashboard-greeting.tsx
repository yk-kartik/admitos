"use client";

import { LogIn, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { StatePanel } from "@/components/ui/state-panel";
import { authClient } from "@/lib/auth-client";
import styles from "./dashboard.module.css";

const returnTo = encodeURIComponent("/dashboard");

/**
 * Returns a first name only when the session genuinely provides one.
 * A value that looks like an email address is treated as "no name".
 */
function firstNameFrom(name: string | null | undefined): string | null {
  const candidate = name?.trim().split(/\s+/)[0];
  return candidate && !candidate.includes("@") ? candidate : null;
}

export function DashboardGreeting() {
  const session = authClient.useSession();
  const user = session.data?.user;
  const pending = session.isPending;
  const accountUnavailable = !pending && !user && Boolean(session.error);
  const signedOut = !pending && !user && !session.error;

  const firstName = firstNameFrom(user?.name);
  const title = user
    ? firstName
      ? `Welcome back, ${firstName}`
      : "Welcome back"
    : "Welcome to AdmitOS";

  return (
    <>
      <header className={styles.header} aria-busy={pending}>
        <span className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          Dashboard
        </span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lede}>
          Your admissions workspace, in one place.
        </p>
        {pending && (
          <p className={styles.checking} role="status">
            Checking your account…
          </p>
        )}
      </header>

      {signedOut && (
        <section
          className={styles.signIn}
          aria-labelledby="dashboard-sign-in-title"
        >
          <span className={styles.signInIcon} aria-hidden="true">
            <LogIn size={20} strokeWidth={1.8} />
          </span>
          <div className={styles.signInCopy}>
            <h2 id="dashboard-sign-in-title">Sign in to get started</h2>
            <p>
              Your student profile and applications are private to your
              account. Sign in or create an account to use them.
            </p>
          </div>
          <div className={styles.signInActions}>
            <Link
              className={styles.primaryAction}
              href={`/sign-in?returnTo=${returnTo}`}
            >
              <LogIn size={16} aria-hidden="true" />
              Sign in
            </Link>
            <Link
              className={styles.secondaryAction}
              href={`/sign-in?mode=sign-up&returnTo=${returnTo}`}
            >
              <UserRoundPlus size={16} aria-hidden="true" />
              Create account
            </Link>
          </div>
        </section>
      )}

      {accountUnavailable && (
        <StatePanel
          className={styles.state}
          state={{
            status: "unavailable",
            message:
              "We couldn't check your account status right now. You can still explore, but some features may ask you to sign in.",
          }}
        />
      )}
    </>
  );
}
