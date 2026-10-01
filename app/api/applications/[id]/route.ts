import { getAuthenticatedIdentity } from "@/lib/auth";
import { getApiRepositories } from "@/services/api-repositories";
import { createApplicationApiHandlers } from "@/services/applications-api";

const handlers = createApplicationApiHandlers({
  authenticate: getAuthenticatedIdentity,
  getRepositories: getApiRepositories,
});

export function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  return context.params.then(({ id }) => handlers.PATCH(request, id));
}
