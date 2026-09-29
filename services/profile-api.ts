import type { ProfileRepository, StudentProfileRepository } from "../repositories/contracts.ts";
import { createProfileAccessService } from "./profile-access.ts";

type IdentityResult =
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: { id: string; email: string; name: string } };

type ApiRepositories =
  | { dataSource: "DATABASE"; profileRepository: StudentProfileRepository }
  | { dataSource: "MOCK"; profileRepository: ProfileRepository };

type Dependencies = {
  authenticate: (headers: Headers) => Promise<IdentityResult>;
  getRepositories: () => Promise<ApiRepositories>;
};

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function successResponse(data: unknown, dataSource: "DATABASE", resourceStatus?: "ready" | "empty"): Response {
  return Response.json({ data, dataSource, ...(resourceStatus ? { resourceStatus } : {}) });
}

export function createProfileApiHandlers(dependencies: Dependencies) {
  return {
    async GET(request: Request): Promise<Response> {
      const identity = await dependencies.authenticate(request.headers);
      if (identity.status === "unavailable") return errorResponse("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
      if (identity.status === "unauthenticated") return errorResponse("UNAUTHENTICATED", "Sign in to access your profile.", 401);

      try {
        const repositories = await dependencies.getRepositories();
        if (repositories.dataSource !== "DATABASE") return errorResponse("PROFILE_UNAVAILABLE", "Persistent profile storage is not configured.", 503);
        const profile = await createProfileAccessService(repositories.profileRepository).get(identity.user.id, identity.user.email);
        return successResponse(profile, repositories.dataSource, profile.id ? "ready" : "empty");
      } catch {
        return errorResponse("PROFILE_UNAVAILABLE", "Profile data is temporarily unavailable.", 503);
      }
    },

    async PUT(request: Request): Promise<Response> {
      const identity = await dependencies.authenticate(request.headers);
      if (identity.status === "unavailable") return errorResponse("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
      if (identity.status === "unauthenticated") return errorResponse("UNAUTHENTICATED", "Sign in to update your profile.", 401);

      let input: unknown;
      try {
        input = await request.json();
      } catch {
        return errorResponse("INVALID_PROFILE", "The profile update must be valid JSON.", 400);
      }

      try {
        const repositories = await dependencies.getRepositories();
        if (repositories.dataSource !== "DATABASE") return errorResponse("PROFILE_UNAVAILABLE", "Persistent profile storage is not configured.", 503);
        const result = await createProfileAccessService(repositories.profileRepository).update(identity.user.id, identity.user.email, input);
        if (result.status === "invalid") {
          return Response.json({ error: { code: "INVALID_PROFILE", message: "Review the highlighted profile fields.", fields: result.fields } }, { status: 400 });
        }
        return successResponse(result.profile, repositories.dataSource, "ready");
      } catch {
        return errorResponse("PROFILE_UNAVAILABLE", "Profile data could not be saved.", 503);
      }
    },
  };
}