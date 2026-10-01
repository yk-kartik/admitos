import { getAuthenticatedIdentity } from "@/lib/auth";
import { getApiRepositories } from "@/services/api-repositories";
import { createApplicationApiHandlers } from "@/services/applications-api";

const applicationApiHandlers = createApplicationApiHandlers({
  authenticate: getAuthenticatedIdentity,
  getRepositories: getApiRepositories,
});

export function GET(request: Request): Promise<Response> {
  return applicationApiHandlers.GET(request);
}

export function POST(request: Request): Promise<Response> {
  return applicationApiHandlers.POST(request);
}
