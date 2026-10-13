import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GalaxyIntro } from "@/components/galaxy-intro/galaxy-intro";
import { LandingPage } from "@/components/landing-page";
import { getAuthenticatedIdentity } from "@/lib/auth";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata = publicPageMetadata(
  "/",
  "Plan your university journey",
  "Explore universities, scholarships, pathways, and application preparation with AdmitOS.",
);

export default async function HomePage() {
  const requestHeaders = await headers();
  const identity = await getAuthenticatedIdentity(requestHeaders);

  if (identity.status === "authenticated") {
    redirect("/dashboard");
  }

  // Replay the intro on every fresh page load; the landing page remains unchanged.
  return (
    <>
      <GalaxyIntro />
      <div className="landing-reveal-target">
        <LandingPage />
      </div>
    </>
  );
}
