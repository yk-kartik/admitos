import { apiError, apiSuccess, getApiRepositories } from "@/services/api-repositories";
import { assessApplication } from "@/services/admissions-ai";
import { getAuthenticatedIdentity } from "@/lib/auth";
import { createAuthenticatedCopilotService } from "@/services/authenticated-copilot";
import { createMockCopilotService } from "@/services/mock-copilot";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const identity = await getAuthenticatedIdentity(request.headers);
  const { id } = await context.params;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(id)) {
    return apiError("INVALID_APPLICATION_ID", "A valid application id is required.", 400);
  }

  try {
    const repositories = await getApiRepositories();
    if (repositories.dataSource === "DATABASE") {
      if (identity.status === "unavailable") return apiError("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
      if (identity.status === "unauthenticated") return apiError("UNAUTHENTICATED", "Sign in to access this application.", 401);

      const result = await createAuthenticatedCopilotService({
        profileRepository: repositories.profileRepository,
        applicationRepository: repositories.applicationRepository,
        universityRepository: repositories.universityRepository,
        assess: assessApplication,
      }).getAssessment(identity.user.id, id);
      if (result.status === "profile-not-found") return apiError("PROFILE_NOT_FOUND", "No persisted student profile was found for this account.", 404);
      if (result.status === "application-not-found") return apiError("APPLICATION_NOT_FOUND", "Application was not found.", 404);
      if (result.status === "university-not-found") return apiError("UNIVERSITY_NOT_FOUND", "Application university was not found.", 404);
      return apiSuccess({ applicationId: id, assessment: result.assessment }, "DATABASE");
    }
    const result = await createMockCopilotService({
      applicationRepository: repositories.applicationRepository,
      profileRepository: repositories.profileRepository,
      universityRepository: repositories.universityRepository,
      assess: assessApplication,
    }).getAssessment(id);
    if (result.status === "unavailable") {
      return apiError("COPILOT_UNAVAILABLE", "Application preparation data is temporarily unavailable.", 503);
    }
    if (result.status === "not-found") {
      return apiError("COPILOT_NOT_FOUND", "Application preparation data was not found.", 404);
    }
    return apiSuccess({ applicationId: id, assessment: result.assessment }, "MOCK");
  } catch {
    return apiError("COPILOT_UNAVAILABLE", "Application preparation data is temporarily unavailable.", 503);
  }
}
