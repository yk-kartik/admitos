import type { ResourceResult, Scholarship } from "@/types/domain";
import type { ScholarshipRepository } from "@/repositories/contracts";
import { mockScholarshipRepository } from "@/repositories/mock";

export function createScholarshipService(repository: ScholarshipRepository) {
  return {
    async list(): Promise<ResourceResult<Scholarship[]>> {
      try {
        const data = await repository.list();
        return data.length ? { status: "ready", data } : { status: "empty" };
      } catch {
        return { status: "unavailable", message: "Scholarship data is temporarily unavailable." };
      }
    },
  };
}

export const scholarshipService = createScholarshipService(mockScholarshipRepository);