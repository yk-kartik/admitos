import { getDatabase } from "@/db/client";
import { mockApplicationRepository, mockProfileRepository, mockScholarshipRepository, mockUniversityRepository } from "@/repositories/mock";
import { createPostgresRepositories } from "@/repositories/postgres";
import type { ApiDataSource, ApiSuccess } from "@/types/api";

export async function getApiRepositories() {
  const database = getDatabase();
  if (!database) {
    return {
      dataSource: "MOCK" as const satisfies ApiDataSource,
      universityRepository: mockUniversityRepository,
      scholarshipRepository: mockScholarshipRepository,
      profileRepository: mockProfileRepository,
      applicationRepository: mockApplicationRepository,
    };
  }

  const repositories = createPostgresRepositories(database);
  return {
    dataSource: "DATABASE" as const satisfies ApiDataSource,
    ...repositories,
  };
}

export function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function apiSuccess<T>(
  data: T,
  dataSource: ApiDataSource,
  resourceStatus?: ApiSuccess<T>["resourceStatus"],
): Response {
  const payload: ApiSuccess<T> = {
    data,
    dataSource,
    ...(resourceStatus ? { resourceStatus } : {}),
  };
  return Response.json(payload);
}
