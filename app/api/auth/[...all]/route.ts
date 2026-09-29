import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

const handlers = auth ? toNextJsHandler(auth) : null;

function unavailable(): Response {
  return Response.json(
    { error: { code: "AUTH_UNAVAILABLE", message: "Authentication is not configured." } },
    { status: 503 },
  );
}

export const GET = handlers?.GET ?? unavailable;
export const POST = handlers?.POST ?? unavailable;