import { getApiRepositories, apiError, apiSuccess } from "@/services/api-repositories";
import { createApplicationService } from "@/services/applications";

export async function GET(): Promise<Response> {
  try {
    const repositories = await getApiRepositories();
    if (repositories.dataSource === "DATABASE") {
      return apiError("IDENTITY_CONTEXT_REQUIRED", "Application access requires an authenticated student context.", 401);
    }
    const result = await createApplicationService(repositories.applicationRepository).list();
    if (result.status === "unavailable") return apiError("APPLICATIONS_UNAVAILABLE", result.message, 503);
    const data = result.status === "ready" ? result.data : [];
    return apiSuccess(data, repositories.dataSource, result.status);
  } catch {
    return apiError("APPLICATIONS_UNAVAILABLE", "Application data is temporarily unavailable.", 503);
  }
}
