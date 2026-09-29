import type { ApplicationCopilotAssessment, ApplicationCopilotInput } from "../types/ai.ts";
import type {
  PersistentApplicationRepository,
  StudentProfileRepository,
  UniversityRepository,
} from "../repositories/contracts.ts";

type Dependencies = {
  profileRepository: StudentProfileRepository;
  applicationRepository: PersistentApplicationRepository;
  universityRepository: UniversityRepository;
  assess: (input: ApplicationCopilotInput) => Promise<ApplicationCopilotAssessment>;
};

export function createAuthenticatedCopilotService(dependencies: Dependencies) {
  return {
    async getAssessment(userId: string, requestedApplicationId: string): Promise<
      | { status: "profile-not-found" }
      | { status: "application-not-found" }
      | { status: "university-not-found" }
      | { status: "ready"; assessment: ApplicationCopilotAssessment }
    > {
      const profile = await dependencies.profileRepository.getForUser(userId);
      if (!profile?.id) return { status: "profile-not-found" };

      const applications = await dependencies.applicationRepository.listForProfile(profile.id);
      const application = applications.find((item) => item.id === requestedApplicationId);
      if (!application) return { status: "application-not-found" };

      const university = await dependencies.universityRepository.getBySlug(application.universitySlug);
      if (!university) return { status: "university-not-found" };

      const assessment = await dependencies.assess({ profile, application, university });
      return { status: "ready", assessment };
    },
  };
}