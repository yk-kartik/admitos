import { SignInWorkspace } from "@/components/sign-in-workspace";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata = noIndexMetadata(
  "Sign in",
  "Sign in to your private AdmitOS admissions workspace.",
);

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  return (
    <SignInWorkspace
      initialMode={params.mode === "sign-up" ? "sign-up" : "sign-in"}
      returnTo={params.returnTo ?? "/profile"}
    />
  );
}