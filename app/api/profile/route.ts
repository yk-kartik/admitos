import { getAuthenticatedIdentity } from "@/lib/auth";
import { getApiRepositories } from "@/services/api-repositories";
import { createProfileApiHandlers } from "@/services/profile-api";

const handlers = createProfileApiHandlers({
  authenticate: getAuthenticatedIdentity,
  getRepositories: getApiRepositories,
});

export function GET(request: Request): Promise<Response> {
  return handlers.GET(request);
}

export function PUT(request: Request): Promise<Response> {
  return handlers.PUT(request);
}
