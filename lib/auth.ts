import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { getDatabase } from "@/db/client";
import { resolveAuthOrigin } from "@/lib/auth-origin";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@/db/schema";

const database = getDatabase();
const secret = process.env.BETTER_AUTH_SECRET;
const origin = resolveAuthOrigin(process.env);
const resendApiKey = process.env.RESEND_API_KEY;

export const auth = database && secret && origin.baseURL
  ? betterAuth({
      database: drizzleAdapter(database, {
        provider: "pg",
        schema: {
          user: authUsers,
          session: authSessions,
          account: authAccounts,
          verification: authVerifications,
        },
      }),
      secret,
      baseURL: origin.baseURL,
      trustedOrigins: origin.trustedOrigins,
      emailAndPassword: { enabled: true },
      emailVerification: {
        enabled: true,
        sendOnSignUp: true,
        autoSignIn: false,
        autoSignInAfterVerification: true,
      },
      plugins: [
        emailOTP({
          sendVerificationOTP: async ({ email, otp, type }) => {
            if (type !== "email-verification" || !resendApiKey) return;
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendApiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Admitos <onboarding@resend.dev>",
                to: [email],
                subject: "Verify your Admitos email",
                text: `Your Admitos verification code is ${otp}. It expires in 5 minutes.`,
              }),
            });
            if (!response.ok) {
              throw new Error(`Resend email delivery failed with status ${response.status}`);
            }
          },
          otpLength: 6,
          expiresIn: 300,
          overrideDefaultEmailVerification: true,
          rateLimit: { window: 60, max: 3 },
        }),
      ],
    })
  : null;

export type AuthenticatedIdentity = {
  id: string;
  email: string;
  name: string;
};

export async function getAuthenticatedIdentity(headers: Headers): Promise<
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: AuthenticatedIdentity }
> {
  if (!auth) return { status: "unavailable" };
  let session;
  try {
    session = await auth.api.getSession({ headers });
  } catch {
    return { status: "unavailable" };
  }
  if (!session) return { status: "unauthenticated" };
  return {
    status: "authenticated",
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}