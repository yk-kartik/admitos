import { getApiRepositories, apiError, apiSuccess } from "@/services/api-repositories";
import { createUniversityService } from "@/services/universities";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return apiError("INVALID_UNIVERSITY_SLUG", "A valid university slug is required.", 400);
  }
  try {
    const repositories = await getApiRepositories();
    const result = await createUniversityService(repositories.universityRepository).getBySlug(slug);
    if (result.status === "unavailable") return apiError("UNIVERSITY_UNAVAILABLE", result.message, 503);
    if (result.status === "empty") return apiError("UNIVERSITY_NOT_FOUND", "University was not found.", 404);
    return apiSuccess(result.data, repositories.dataSource, result.status);
  } catch {
    return apiError("UNIVERSITY_UNAVAILABLE", "University data is temporarily unavailable.", 503);
  }
}
