import type { DashboardData, ResourceResult } from "@/types/domain";
import type { DashboardRepository } from "@/repositories/contracts";
import { mockDashboardRepository } from "@/repositories/mock";

export function createDashboardService(repository: DashboardRepository) {
  return {
    async getOverview(): Promise<ResourceResult<DashboardData>> {
      try {
        return { status: "ready", data: await repository.getOverview() };
      } catch {
        return { status: "unavailable", message: "Dashboard data is temporarily unavailable." };
      }
    },
  };
}

export const dashboardService = createDashboardService(mockDashboardRepository);