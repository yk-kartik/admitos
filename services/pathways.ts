import type { Pathway, ResourceResult } from "@/types/domain";
import type { PathwayRepository } from "@/repositories/contracts";
import { mockPathwayRepository } from "@/repositories/mock";

export function createPathwayService(repository: PathwayRepository) {
  return {
    async list(): Promise<ResourceResult<Pathway[]>> {
      try {
        const data = await repository.list();
        return data.length ? { status: "ready", data } : { status: "empty" };
      } catch {
        return { status: "unavailable", message: "Pathway data is temporarily unavailable." };
      }
    },
  };
}

export const pathwayService = createPathwayService(mockPathwayRepository);