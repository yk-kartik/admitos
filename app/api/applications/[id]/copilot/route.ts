import { getAuthenticatedIdentity } from "@/lib/auth";
import { getApiRepositories } from "@/services/api-repositories";
import { assessApplication } from "@/services/admissions-ai";
import { createCopilotApiHandlers } from "@/services/copilot-api";

const handlers = createCopilotApiHandlers({
  authenticate: getAuthenticatedIdentity,
  getRepositories: getApiRepositories,
  assess: assessApplication,
});

export function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return context.params.then(({ id }) => handlers.GET(request, id));
}

export function PUT(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return context.params.then(({ id }) => handlers.PUT(request, id));
}
