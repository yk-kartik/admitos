import type { ResourceResult } from "@/types/domain";
import type { UniversityRepository } from "@/repositories/contracts";
import { mockUniversityRepository } from "@/repositories/mock";

export function createUniversityService(repository: UniversityRepository) {
  return {
    async list(): Promise<ResourceResult<Awaited<ReturnType<UniversityRepository["list"]>>>> {
      try {
        const data = await repository.list();
        return data.length ? { status: "ready", data } : { status: "empty" };
      } catch {
        return { status: "unavailable", message: "University data is temporarily unavailable." };
      }
    },
    async getBySlug(slug: string) {
      try {
        const data = await repository.getBySlug(slug);
        return data ? { status: "ready" as const, data } : { status: "empty" as const };
      } catch {
        return { status: "unavailable" as const, message: "University data is temporarily unavailable." };
      }
    },
  };
}

export const universityService = createUniversityService(mockUniversityRepository);