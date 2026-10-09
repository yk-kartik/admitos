import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getAuthenticatedIdentity } from "@/lib/auth";

export default async function HomePage() {
  const identity = await getAuthenticatedIdentity(await headers());

  if (identity.status === "authenticated") {
    redirect("/dashboard");
  }

  return <LandingPage />;
}
