import type { ApplicationCopilotAssessment, ApplicationCopilotInput } from "../types/ai.ts";
import type { ApplicationRepository, ProfileRepository, UniversityRepository } from "../repositories/contracts.ts";

type Dependencies = {
  applicationRepository: ApplicationRepository;
  profileRepository: ProfileRepository;
  universityRepository: UniversityRepository;
  assess: (input: ApplicationCopilotInput) => Promise<ApplicationCopilotAssessment>;
};

export function createMockCopilotService(dependencies: Dependencies) {
  return {
    async getAssessment(applicationId: string): Promise<
      | { status: "unavailable" }
      | { status: "not-found" }
      | { status: "ready"; assessment: ApplicationCopilotAssessment }
    > {
      try {
        const [applications, profile, universities] = await Promise.all([
          dependencies.applicationRepository.list(),
          dependencies.profileRepository.getCurrent(),
          dependencies.universityRepository.list(),
        ]);
        const application = applications.find((item) => item.id === applicationId);
        if (!application) return { status: "not-found" };
        const university = universities.find((item) => item.slug === application.universitySlug);
        if (!university) return { status: "not-found" };
        const assessment = await dependencies.assess({ profile, application, university });
        return { status: "ready", assessment };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}