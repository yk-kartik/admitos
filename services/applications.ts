import type { Application, ResourceResult } from "@/types/domain";
import type { ApplicationRepository } from "@/repositories/contracts";
import { mockApplicationRepository } from "@/repositories/mock";

export function createApplicationService(repository: ApplicationRepository) {
  return {
    async list(): Promise<ResourceResult<Application[]>> {
      try {
        const data = await repository.list();
        return data.length ? { status: "ready", data } : { status: "empty" };
      } catch {
        return { status: "unavailable", message: "Application data is temporarily unavailable." };
      }
    },
  };
}

export const applicationService = createApplicationService(mockApplicationRepository);