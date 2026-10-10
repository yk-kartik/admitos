import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GalaxyIntro } from "@/components/galaxy-intro/galaxy-intro";
import { hasSeenIntro } from "@/components/galaxy-intro/intro-persistence";
import { LandingPage } from "@/components/landing-page";
import { getAuthenticatedIdentity } from "@/lib/auth";

export default async function HomePage() {
  const requestHeaders = await headers();
  const identity = await getAuthenticatedIdentity(requestHeaders);

  if (identity.status === "authenticated") {
    redirect("/dashboard");
  }

  // The intro is additive and plays once per browser session; the existing
  // landing page below is rendered unchanged either way.
  const showIntro = !hasSeenIntro(requestHeaders.get("cookie"));

  return (
    <>
      {showIntro ? <GalaxyIntro /> : null}
      <LandingPage />
    </>
  );
}
