import { getApiRepositories, apiError, apiSuccess } from "@/services/api-repositories";
import { createProfileService } from "@/services/profile";

export async function GET(): Promise<Response> {
  try {
    const repositories = await getApiRepositories();
    if (repositories.dataSource === "DATABASE") {
      return apiError("IDENTITY_CONTEXT_REQUIRED", "Profile access requires an authenticated student context.", 401);
    }
    const result = await createProfileService(repositories.profileRepository).getCurrent();
    if (result.status === "unavailable") return apiError("PROFILE_UNAVAILABLE", result.message, 503);
    if (result.status !== "ready") return apiError("PROFILE_UNAVAILABLE", "Profile data is unavailable.", 503);
    return apiSuccess(result.data, repositories.dataSource, result.status);
  } catch {
    return apiError("PROFILE_UNAVAILABLE", "Profile data is temporarily unavailable.", 503);
  }
}
