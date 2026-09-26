import type { ResourceResult, StudentProfile } from "@/types/domain";
import type { ProfileRepository } from "@/repositories/contracts";
import { mockProfileRepository } from "@/repositories/mock";
import { calculateProfileCompletion } from "@/utils/profile";

export { calculateProfileCompletion };

export function createProfileService(repository: ProfileRepository) {
  return {
    async getCurrent(): Promise<ResourceResult<StudentProfile>> {
      try {
        return { status: "ready", data: await repository.getCurrent() };
      } catch {
        return { status: "unavailable", message: "Profile data is temporarily unavailable." };
      }
    },
  };
}

export const profileService = createProfileService(mockProfileRepository);