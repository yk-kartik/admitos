import { randomUUID } from "node:crypto";
import type { Application } from "../types/domain.ts";
import type {
  PersistentApplicationRepository,
  StudentProfileRepository,
  UniversityRepository,
} from "../repositories/contracts.ts";

type Dependencies = {
  profileRepository: StudentProfileRepository;
  applicationRepository: PersistentApplicationRepository;
  universityRepository: UniversityRepository;
};

function readCreateRequest(input: unknown): {
  universitySlug: string;
  program: string;
  intake: string;
  programId?: string;
} | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const values = input as Record<string, unknown>;
  const universitySlug = values.universitySlug;
  const program = values.program;
  const intake = values.intake;
  const programId = values.programId;
  if (
    typeof universitySlug !== "string" ||
    !/^[a-z0-9][a-z0-9-]{0,127}$/.test(universitySlug) ||
    typeof program !== "string" ||
    !program.trim() ||
    program.length > 300 ||
    typeof intake !== "string" ||
    !intake.trim() ||
    intake.length > 100 ||
    (programId !== undefined && (typeof programId !== "string" || programId.length > 128))
  ) return null;
  return {
    universitySlug,
    program: program.trim(),
    intake: intake.trim(),
    ...(programId ? { programId } : {}),
  };
}

export function createAuthenticatedApplicationService(dependencies: Dependencies) {
  return {
    async list(userId: string) {
      const profile = await dependencies.profileRepository.getForUser(userId);
      if (!profile?.id) return { status: "profile-not-found" as const };
      const applications = await dependencies.applicationRepository.listForProfile(profile.id);
      return {
        status: applications.length ? "ready" as const : "empty" as const,
        applications,
      };
    },

    async create(userId: string, input: unknown) {
      const request = readCreateRequest(input);
      if (!request) return { status: "invalid" as const };

      const profile = await dependencies.profileRepository.getForUser(userId);
      if (!profile?.id) return { status: "profile-not-found" as const };

      const university = await dependencies.universityRepository.getBySlug(request.universitySlug);
      if (!university) return { status: "university-not-found" as const };

      const program = request.programId
        ? university.programs.find((candidate) => candidate.id === request.programId)
        : undefined;
      if (request.programId && !program) return { status: "program-not-found" as const };

      const application: Application = {
        id: randomUUID(),
        profileId: profile.id,
        universitySlug: university.slug,
        universityName: university.name,
        program: request.program,
        intake: request.intake,
        status: "Planning",
        readinessState: "DRAFT",
        progress: 0,
        deadline: null,
        tasks: [],
        source: university.source,
      };
      const created = await dependencies.applicationRepository.create({
        application,
        profileId: profile.id,
        universityId: university.id,
        programId: program?.id ?? null,
      });
      return { status: "created" as const, application: created };
    },
  };
}
