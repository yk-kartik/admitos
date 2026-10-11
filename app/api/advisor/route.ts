import { getAuthenticatedIdentity } from "@/lib/auth";
import { getApiRepositories } from "@/services/api-repositories";
import { createAdvisorApiHandlers } from "@/services/advisor-api";
import { createGeminiGenerativeModel } from "@/services/gemini-provider";

const handlers = createAdvisorApiHandlers({
  authenticate: getAuthenticatedIdentity,
  getRepositories: getApiRepositories,
  generativeModel: createGeminiGenerativeModel(),
});

export function POST(request: Request): Promise<Response> {
  return handlers.POST(request);
}
