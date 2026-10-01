import { ApplicationCopilotWorkspace } from "@/components/application-copilot";
import { AuthenticatedApplicationCopilot } from "@/components/application-copilot";
import { mockApplicationRepository, mockProfileRepository, mockUniversityRepository } from "@/repositories/mock";
import { getApiRepositories } from "@/services/api-repositories";
import { assessApplication } from "@/services/admissions-ai";
import type { ApplicationCopilotInput } from "@/types/ai";

export default async function ApplicationCopilotPage({
  searchParams,
}: {
  searchParams: Promise<{ application?: string }>;
}) {
  const [{ application: selectedApplicationId }, repositories] = await Promise.all([searchParams, getApiRepositories()]);

  if (repositories.dataSource === "DATABASE") {
    return <AuthenticatedApplicationCopilot key={selectedApplicationId ?? "empty"} applicationId={selectedApplicationId} />;
  }

  const [profile, applications, universities] = await Promise.all([
    mockProfileRepository.getCurrent(),
    mockApplicationRepository.list(),
    mockUniversityRepository.list(),
  ]);

  const cases: { input: ApplicationCopilotInput; assessment: Awaited<ReturnType<typeof assessApplication>> }[] = [];
  for (const application of applications) {
    const university = universities.find((item) => item.slug === application.universitySlug);
    if (!university) continue;
    const input: ApplicationCopilotInput = {
      profile,
      application,
      university,
    };
    cases.push({ input, assessment: await assessApplication(input) });
  }

  return (
    <ApplicationCopilotWorkspace
      cases={cases}
      selectedApplicationId={selectedApplicationId}
    />
  );
}
