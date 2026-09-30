"use client";

import { LogIn, LogOut, UserRound, UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type AccountNavigationProps = {
  activePath: string;
  onNavigate?: () => void;
  variant: "sidebar" | "topbar";
};

function returnPath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? path : "/profile";
}

export function AccountNavigation({ activePath, onNavigate, variant }: AccountNavigationProps) {
  const session = authClient.useSession();
  const router = useRouter();
  const destination = encodeURIComponent(returnPath(activePath));
  const signInHref = `/sign-in?returnTo=${destination}`;
  const signUpHref = `/sign-in?mode=sign-up&returnTo=${destination}`;

  if (session.isPending) {
    return <div className={`account-navigation account-navigation-${variant}`} aria-label="Checking account status" />;
  }

  if (!session.data?.user) {
    return (
      <div className={`account-navigation account-navigation-${variant}`}>
        <Link className="account-sign-in" href={signInHref} onClick={onNavigate} aria-label="Sign in" title="Sign in">
          <LogIn size={16} aria-hidden="true" />
          <span>Sign in</span>
        </Link>
        <Link className="account-create" href={signUpHref} onClick={onNavigate} aria-label="Create account" title="Create account">
          <UserRoundPlus size={16} aria-hidden="true" />
          <span>Create account</span>
        </Link>
      </div>
    );
  }

  const user = session.data.user;
  return (
    <div className={`account-navigation account-navigation-${variant}`}>
      <Link className="account-current-user" href="/profile" onClick={onNavigate}>
        <UserRound size={16} aria-hidden="true" />
        <span>{user.name || user.email}</span>
      </Link>
      <button
        className="account-sign-out"
        type="button"
        aria-label="Sign out"
        title="Sign out"
        onClick={async () => {
          await authClient.signOut();
          router.replace("/");
          router.refresh();
        }}
      >
        <LogOut size={15} aria-hidden="true" />
        <span>Sign out</span>
      </button>
    </div>
  );
}