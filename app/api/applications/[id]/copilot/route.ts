import { apiError, apiSuccess, getApiRepositories } from "@/services/api-repositories";
import { createApplicationService } from "@/services/applications";
import { assessApplication } from "@/services/admissions-ai";
import { createProfileService } from "@/services/profile";
import { createUniversityService } from "@/services/universities";
import type { ApplicationCopilotInput } from "@/types/ai";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id)) {
    return apiError("INVALID_APPLICATION_ID", "A valid application id is required.", 400);
  }

  try {
    const repositories = await getApiRepositories();
    if (repositories.dataSource === "DATABASE") {
      return apiError("IDENTITY_CONTEXT_REQUIRED", "Copilot state requires an authenticated student context.", 401);
    }
    const [applicationResult, profileResult, universityResult] = await Promise.all([
      createApplicationService(repositories.applicationRepository).list(),
      createProfileService(repositories.profileRepository).getCurrent(),
      createUniversityService(repositories.universityRepository).list(),
    ]);
    if (applicationResult.status === "unavailable" || profileResult.status === "unavailable" || universityResult.status === "unavailable") {
      return apiError("COPILOT_UNAVAILABLE", "Application preparation data is temporarily unavailable.", 503);
    }
    if (applicationResult.status !== "ready" || profileResult.status !== "ready" || universityResult.status !== "ready") {
      return apiError("COPILOT_NOT_FOUND", "Application preparation data was not found.", 404);
    }
    const application = applicationResult.data.find((item) => item.id === id);
    if (!application) return apiError("APPLICATION_NOT_FOUND", "Application was not found.", 404);
    const university = universityResult.data.find((item) => item.slug === application.universitySlug);
    if (!university) return apiError("UNIVERSITY_NOT_FOUND", "Application university was not found.", 404);
    const input: ApplicationCopilotInput = { profile: profileResult.data, application, university };
    const assessment = await assessApplication(input);
    return apiSuccess({ applicationId: id, assessment }, "MOCK");
  } catch {
    return apiError("COPILOT_UNAVAILABLE", "Application preparation data is temporarily unavailable.", 503);
  }
}
