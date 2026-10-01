import type { ApplicationCopilotAssessment, ApplicationCopilotDraftState, ApplicationCopilotInput } from "../types/ai.ts";
import { hydrateApplicationCopilotAssessment } from "./application-copilot.ts";
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

function readDraftState(input: unknown): ApplicationCopilotDraftState | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const values = input as Record<string, unknown>;
  const keys = ["fields", "documents", "requirements", "writtenAnswers", "readinessState", "humanReviewed"];
  if (Object.keys(values).some((key) => !keys.includes(key)) || keys.some((key) => !(key in values))) return null;
  if (!Array.isArray(values.fields) || !Array.isArray(values.documents) || !Array.isArray(values.requirements) || !Array.isArray(values.writtenAnswers)) return null;
  if (values.readinessState !== "DRAFT" && values.readinessState !== "INCOMPLETE" && values.readinessState !== "NEEDS_REVIEW" && values.readinessState !== "READY_FOR_SUBMISSION") return null;
  if (typeof values.humanReviewed !== "boolean") return null;
  return {
    fields: values.fields as ApplicationCopilotDraftState["fields"],
    documents: values.documents as ApplicationCopilotDraftState["documents"],
    requirements: values.requirements as ApplicationCopilotDraftState["requirements"],
    writtenAnswers: values.writtenAnswers as ApplicationCopilotDraftState["writtenAnswers"],
    readinessState: values.readinessState,
    humanReviewed: values.humanReviewed,
  };
}

export function createAuthenticatedCopilotService(dependencies: Dependencies) {
  return {
    async getAssessment(userId: string, requestedApplicationId: string): Promise<
      | { status: "profile-not-found" }
      | { status: "application-not-found" }
      | { status: "university-not-found" }
      | { status: "ready"; input: ApplicationCopilotInput; assessment: ApplicationCopilotAssessment }
    > {
      const profile = await dependencies.profileRepository.getForUser(userId);
      if (!profile?.id) return { status: "profile-not-found" };

      const applications = await dependencies.applicationRepository.listForProfile(profile.id);
      const application = applications.find((item) => item.id === requestedApplicationId);
      if (!application) return { status: "application-not-found" };

      const university = await dependencies.universityRepository.getBySlug(application.universitySlug);
      if (!university) return { status: "university-not-found" };

      const input = { profile, application, university };
      const assessment = await dependencies.assess(input);
      const draft = await dependencies.applicationRepository.getCopilotDraft(profile.id, requestedApplicationId);
      return { status: "ready", input, assessment: hydrateApplicationCopilotAssessment(assessment, draft) };
    },

    async saveDraft(userId: string, requestedApplicationId: string, input: unknown) {
      const profile = await dependencies.profileRepository.getForUser(userId);
      if (!profile?.id) return { status: "profile-not-found" as const };
      const applications = await dependencies.applicationRepository.listForProfile(profile.id);
      if (!applications.some((application) => application.id === requestedApplicationId)) return { status: "application-not-found" as const };
      const draft = readDraftState(input);
      if (!draft) return { status: "invalid" as const };
      const saved = await dependencies.applicationRepository.saveCopilotDraft(profile.id, requestedApplicationId, draft);
      return saved ? { status: "saved" as const } : { status: "application-not-found" as const };
    },
  };
}