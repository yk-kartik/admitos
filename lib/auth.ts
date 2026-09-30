import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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