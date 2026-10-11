// Server-safe module (no "use client"): it is imported by both the server
// component app/page.tsx and the client component galaxy-intro.tsx. Nothing here
// touches window/document at import time, so importing it on the server is safe.
//
// The only thing persisted is a non-sensitive, session-scoped flag meaning
// "this browser session has already shown the intro". It carries no user data and
// uses its own cookie name, so it cannot collide with or modify authentication
// cookies.

export const INTRO_COOKIE_NAME = "admitos_intro";

const INTRO_COOKIE_PATTERN = new RegExp(`(?:^|;\\s*)${INTRO_COOKIE_NAME}=1(?:;|$)`);

export function hasSeenIntro(cookieHeader: string | null | undefined): boolean {
  return INTRO_COOKIE_PATTERN.test(cookieHeader ?? "");
}

/**
 * Browser-only. Records that the intro has been shown/skipped/finished.
 * Session cookie (no Max-Age/Expires), same-site, Secure on https. Failure to write
 * (cookies blocked) is harmless: the intro may simply play again on the next visit.
 */
export function markIntroSeen(): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${INTRO_COOKIE_NAME}=1; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Cookies unavailable.
  }
}
