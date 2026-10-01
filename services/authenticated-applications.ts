import { randomUUID } from "node:crypto";
import type { Application } from "../types/domain.ts";
import type {
  ApplicationUpdateInput,
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

function readUpdateRequest(input: unknown, current: Application): ApplicationUpdateInput | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const values = input as Record<string, unknown>;
  const allowedFields = new Set(["status", "deadline", "tasks"]);
  if (Object.keys(values).some((key) => !allowedFields.has(key)) || Object.keys(values).length === 0) return null;

  const update: ApplicationUpdateInput = {};
  if ("status" in values) {
    if (values.status !== "Planning" && values.status !== "In progress" && values.status !== "Ready to submit" && values.status !== "Submitted") return null;
    update.status = values.status;
  }
  if ("deadline" in values) {
    if (values.deadline !== null && (typeof values.deadline !== "string" || !isValidDeadline(values.deadline))) return null;
    update.deadline = values.deadline as string | null;
  }
  if ("tasks" in values) {
    if (!Array.isArray(values.tasks) || values.tasks.length !== current.tasks.length) return null;
    const tasks = values.tasks as unknown[];
    if (tasks.some((task, index) => {
      if (!task || typeof task !== "object" || Array.isArray(task)) return true;
      const candidate = task as Record<string, unknown>;
      return candidate.label !== current.tasks[index]?.label || typeof candidate.complete !== "boolean" || Object.keys(candidate).some((key) => key !== "label" && key !== "complete");
    })) return null;
    update.tasks = tasks.map((task) => {
      const candidate = task as { label: string; complete: boolean };
      return { label: candidate.label, complete: candidate.complete };
    });
  }
  return update;
}

function isValidDeadline(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
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

    async update(userId: string, applicationId: string, input: unknown) {
      const profile = await dependencies.profileRepository.getForUser(userId);
      if (!profile?.id) return { status: "profile-not-found" as const };

      const applications = await dependencies.applicationRepository.listForProfile(profile.id);
      const current = applications.find((application) => application.id === applicationId);
      if (!current) return { status: "application-not-found" as const };

      const update = readUpdateRequest(input, current);
      if (!update) return { status: "invalid" as const };

      const application = await dependencies.applicationRepository.updateForProfile(profile.id, applicationId, update);
      return application
        ? { status: "updated" as const, application }
        : { status: "application-not-found" as const };
    },
  };
}
