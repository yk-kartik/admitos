import { getApiRepositories, apiError, apiSuccess } from "@/services/api-repositories";
import { createScholarshipService } from "@/services/scholarships";

export async function GET(): Promise<Response> {
  try {
    const repositories = await getApiRepositories();
    const result = await createScholarshipService(repositories.scholarshipRepository).list();
    if (result.status === "unavailable") return apiError("SCHOLARSHIPS_UNAVAILABLE", result.message, 503);
    const data = result.status === "ready" ? result.data : [];
    return apiSuccess(data, repositories.dataSource, result.status);
  } catch {
    return apiError("SCHOLARSHIPS_UNAVAILABLE", "Scholarship data is temporarily unavailable.", 503);
  }
}
