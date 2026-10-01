import type {
  ApplicationRepository,
  PersistentApplicationRepository,
  StudentProfileRepository,
  UniversityRepository,
} from "../repositories/contracts.ts";
import { createAuthenticatedApplicationService } from "./authenticated-applications.ts";

function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function apiSuccess<T>(data: T, dataSource: "MOCK" | "DATABASE", resourceStatus?: string): Response {
  return Response.json({ data, dataSource, ...(resourceStatus ? { resourceStatus } : {}) });
}

type Dependencies = {
  authenticate: (headers: Headers) => Promise<{
    status: "unavailable";
  } | {
    status: "unauthenticated";
  } | {
    status: "authenticated";
    user: { id: string; email: string; name: string };
  }>;
  getRepositories: () => Promise<
    | { dataSource: "MOCK"; applicationRepository: ApplicationRepository }
    | {
        dataSource: "DATABASE";
        applicationRepository: PersistentApplicationRepository;
        profileRepository: StudentProfileRepository;
        universityRepository: UniversityRepository;
      }
  >;
};

export function createApplicationApiHandlers({ authenticate, getRepositories }: Dependencies) {
  return {
    async GET(request: Request): Promise<Response> {
      try {
        const repositories = await getRepositories();
        if (repositories.dataSource === "MOCK") {
          try {
            const data = await repositories.applicationRepository.list();
            return apiSuccess(data, "MOCK", data.length ? "ready" : "empty");
          } catch {
            return apiError("APPLICATIONS_UNAVAILABLE", "Application data is temporarily unavailable.", 503);
          }
        }

        const identity = await authenticate(request.headers);
        if (identity.status === "unavailable") return apiError("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
        if (identity.status === "unauthenticated") return apiError("UNAUTHENTICATED", "Sign in to access applications.", 401);

        const result = await createAuthenticatedApplicationService(repositories).list(identity.user.id);
        if (result.status === "profile-not-found") return apiError("PROFILE_NOT_FOUND", "No persisted student profile was found for this account.", 404);
        return apiSuccess(result.status === "ready" ? result.applications : [], "DATABASE", result.status);
      } catch {
        return apiError("APPLICATIONS_UNAVAILABLE", "Application data is temporarily unavailable.", 503);
      }
    },

    async POST(request: Request): Promise<Response> {
      try {
        const repositories = await getRepositories();
        if (repositories.dataSource === "MOCK") {
          return apiError("APPLICATION_CREATION_UNAVAILABLE", "Application creation requires a configured database.", 501);
        }

        const identity = await authenticate(request.headers);
        if (identity.status === "unavailable") return apiError("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
        if (identity.status === "unauthenticated") return apiError("UNAUTHENTICATED", "Sign in to create an application.", 401);

        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return apiError("INVALID_APPLICATION", "A valid JSON application payload is required.", 400);
        }
        const result = await createAuthenticatedApplicationService(repositories).create(identity.user.id, input);
        if (result.status === "invalid") return apiError("INVALID_APPLICATION", "University, program, and intake are required.", 400);
        if (result.status === "profile-not-found") return apiError("PROFILE_NOT_FOUND", "Create a student profile before creating an application.", 404);
        if (result.status === "university-not-found") return apiError("UNIVERSITY_NOT_FOUND", "The selected university was not found.", 404);
        if (result.status === "program-not-found") return apiError("PROGRAM_NOT_FOUND", "The selected program was not found for this university.", 404);
        return apiSuccess(result.application, "DATABASE", "ready");
      } catch {
        return apiError("APPLICATIONS_UNAVAILABLE", "Application data is temporarily unavailable.", 503);
      }
    },

    async PATCH(request: Request, applicationId: string): Promise<Response> {
      try {
        const repositories = await getRepositories();
        if (repositories.dataSource === "MOCK") {
          return apiError("APPLICATION_UPDATE_UNAVAILABLE", "Application updates require a configured database.", 501);
        }

        const identity = await authenticate(request.headers);
        if (identity.status === "unavailable") return apiError("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
        if (identity.status === "unauthenticated") return apiError("UNAUTHENTICATED", "Sign in to update applications.", 401);
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(applicationId)) return apiError("INVALID_APPLICATION_ID", "A valid application id is required.", 400);

        let input: unknown;
        try {
          input = await request.json();
        } catch {
          return apiError("INVALID_APPLICATION", "A valid JSON application payload is required.", 400);
        }
        const result = await createAuthenticatedApplicationService(repositories).update(identity.user.id, applicationId, input);
        if (result.status === "profile-not-found") return apiError("PROFILE_NOT_FOUND", "No persisted student profile was found for this account.", 404);
        if (result.status === "application-not-found") return apiError("APPLICATION_NOT_FOUND", "Application was not found.", 404);
        if (result.status === "invalid") return apiError("INVALID_APPLICATION_UPDATE", "Only status, deadline, and existing checklist completion can be updated.", 400);
        return apiSuccess(result.application, "DATABASE", "ready");
      } catch {
        return apiError("APPLICATIONS_UNAVAILABLE", "Application data is temporarily unavailable.", 503);
      }
    },
  };
}
