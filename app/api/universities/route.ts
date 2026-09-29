import { getApiRepositories, apiError, apiSuccess } from "@/services/api-repositories";
import { createUniversityService } from "@/services/universities";

export async function GET(): Promise<Response> {
  try {
    const repositories = await getApiRepositories();
    const result = await createUniversityService(repositories.universityRepository).list();
    if (result.status === "unavailable") return apiError("UNIVERSITIES_UNAVAILABLE", result.message, 503);
    const data = result.status === "ready" ? result.data : [];
    return apiSuccess(data, repositories.dataSource, result.status);
  } catch {
    return apiError("UNIVERSITIES_UNAVAILABLE", "University data is temporarily unavailable.", 503);
  }
}
