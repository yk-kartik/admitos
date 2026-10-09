import type {
  ApplicationRepository,
  PersistentApplicationRepository,
  EvidenceRepository,
  ProfileRepository,
  StudentProfileRepository,
  UniversityRepository,
} from "../repositories/contracts.ts";
import type { ApplicationCopilotAssessment, ApplicationCopilotInput } from "../types/ai.ts";
import { createAuthenticatedCopilotService } from "./authenticated-copilot.ts";
import { createMockCopilotService } from "./mock-copilot.ts";

function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function apiSuccess<T>(data: T, dataSource: "MOCK" | "DATABASE"): Response {
  return Response.json({ data, dataSource });
}

type Identity =
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: { id: string; email: string; name: string } };

type Dependencies = {
  authenticate: (headers: Headers) => Promise<Identity>;
  getRepositories: () => Promise<
    | { dataSource: "MOCK"; applicationRepository: ApplicationRepository; profileRepository: ProfileRepository; universityRepository: UniversityRepository }
    | { dataSource: "DATABASE"; applicationRepository: PersistentApplicationRepository; profileRepository: StudentProfileRepository; universityRepository: UniversityRepository; evidenceRepository: EvidenceRepository }
  >;
  assess: (input: ApplicationCopilotInput, evidenceRepository?: EvidenceRepository) => Promise<ApplicationCopilotAssessment>;
};

export function createCopilotApiHandlers({ authenticate, getRepositories, assess }: Dependencies) {
  return {
    async GET(request: Request, applicationId: string): Promise<Response> {
      const identity = await authenticate(request.headers);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(applicationId)) {
        return apiError("INVALID_APPLICATION_ID", "A valid application id is required.", 400);
      }

      try {
        const repositories = await getRepositories();
        if (repositories.dataSource === "DATABASE") {
          if (identity.status === "unavailable") return apiError("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
          if (identity.status === "unauthenticated") return apiError("UNAUTHENTICATED", "Sign in to access this application.", 401);

          const result = await createAuthenticatedCopilotService({
            profileRepository: repositories.profileRepository,
            applicationRepository: repositories.applicationRepository,
            universityRepository: repositories.universityRepository,
            evidenceRepository: repositories.evidenceRepository,
            assess,
          }).getAssessment(identity.user.id, applicationId);
          if (result.status === "profile-not-found") return apiError("PROFILE_NOT_FOUND", "No persisted student profile was found for this account.", 404);
          if (result.status === "application-not-found") return apiError("APPLICATION_NOT_FOUND", "Application was not found.", 404);
          if (result.status === "university-not-found") return apiError("UNIVERSITY_NOT_FOUND", "Application university was not found.", 404);
          return apiSuccess({ applicationId, input: result.input, assessment: result.assessment }, "DATABASE");
        }

        const result = await createMockCopilotService({
          applicationRepository: repositories.applicationRepository,
          profileRepository: repositories.profileRepository,
          universityRepository: repositories.universityRepository,
          assess,
        }).getAssessment(applicationId);
        if (result.status === "unavailable") return apiError("COPILOT_UNAVAILABLE", "Application preparation data is temporarily unavailable.", 503);
        if (result.status === "not-found") return apiError("COPILOT_NOT_FOUND", "Application preparation data was not found.", 404);
        return apiSuccess({ applicationId, assessment: result.assessment }, "MOCK");
      } catch {
        return apiError("COPILOT_UNAVAILABLE", "Application preparation data is temporarily unavailable.", 503);
      }
    },

    async PUT(request: Request, applicationId: string): Promise<Response> {
      const identity = await authenticate(request.headers);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(applicationId)) {
        return apiError("INVALID_APPLICATION_ID", "A valid application id is required.", 400);
      }
      if (identity.status === "unavailable") return apiError("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
      if (identity.status === "unauthenticated") return apiError("UNAUTHENTICATED", "Sign in to save this application draft.", 401);

      try {
        const repositories = await getRepositories();
        if (repositories.dataSource === "MOCK") return apiError("COPILOT_SAVE_UNAVAILABLE", "Copilot draft persistence requires a configured database.", 501);
        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return apiError("INVALID_COPILOT_DRAFT", "A valid JSON draft payload is required.", 400);
        }
        const result = await createAuthenticatedCopilotService({
          profileRepository: repositories.profileRepository,
          applicationRepository: repositories.applicationRepository,
          universityRepository: repositories.universityRepository,
          assess,
        }).saveDraft(identity.user.id, applicationId, input);
        if (result.status === "profile-not-found" || result.status === "application-not-found") return apiError("APPLICATION_NOT_FOUND", "Application was not found.", 404);
        if (result.status === "invalid") return apiError("INVALID_COPILOT_DRAFT", "The copilot draft payload is invalid.", 400);
        return apiSuccess({ applicationId }, "DATABASE");
      } catch {
        return apiError("COPILOT_SAVE_UNAVAILABLE", "Copilot draft could not be saved.", 503);
      }
    },
  };
}
