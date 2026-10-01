import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { AppDatabase } from "@/db/client";
import type {
  ApplicationCreateInput,
  ApplicationUpdateInput,
  EvidenceRepository,
  OfficialSourceRepository,
  PersistentApplicationRepository,
  ProgramRepository,
  RequirementRepository,
  ScholarshipRepository,
  StudentProfileRepository,
  UniversityContactRepository,
  UniversityRepository,
} from "@/repositories/contracts";
import {
  mapAdmissionRequirementRow,
  mapApplicationDeadlineRow,
  mapApplicationDocumentRow,
  mapApplicationFieldRow,
  mapApplicationRow,
  mapApplicationRequirementMappingRow,
  mapApplicationWrittenAnswerRow,
  mapEvidenceRecordRow,
  mapOfficialSourceRow,
  mapScholarshipRow,
  mapStudentProfileRow,
  mapUniversityContactRow,
  mapUniversityProgramRow,
  mapUniversityRow,
  toApplicationDocumentInsert,
  toApplicationFieldInsert,
  toApplicationInsert,
  toApplicationRequirementMappingInsert,
  toApplicationWrittenAnswerInsert,
} from "@/db/mappers";
import {
  admissionRequirements,
  applicationDeadlines,
  applicationDocuments,
  applicationFields,
  applicationRequirementMappings,
  applicationWrittenAnswers,
  applications,
  evidenceRecords,
  officialSources,
  scholarships,
  studentProfiles,
  universityContacts,
  universityPrograms,
  universities,
} from "@/db/schema";
import type { ApplicationCopilotDraftState } from "@/types/ai";
import type { Application, OfficialSource, StudentProfile, University } from "@/types/domain";

function indexSources(rows: (typeof officialSources.$inferSelect)[]): Map<string, OfficialSource> {
  return new Map(rows.map((row) => [row.sourceId, mapOfficialSourceRow(row)]));
}

function requireSource(sources: Map<string, OfficialSource>, sourceId: string | null): OfficialSource {
  const source = sourceId ? sources.get(sourceId) : undefined;
  if (!source) throw new Error("A persisted claim references a missing source record.");
  return source;
}

export function createPostgresRepositories(database: AppDatabase): {
  universityRepository: UniversityRepository;
  programRepository: ProgramRepository;
  requirementRepository: RequirementRepository;
  scholarshipRepository: ScholarshipRepository;
  sourceRepository: OfficialSourceRepository;
  evidenceRepository: EvidenceRepository;
  contactRepository: UniversityContactRepository;
  profileRepository: StudentProfileRepository;
  applicationRepository: PersistentApplicationRepository;
} {
  async function mapUniversity(row: typeof universities.$inferSelect): Promise<University> {
    const [sourceRows, programRows, requirementRows, deadlineRows, scholarshipRows, contactRows] = await Promise.all([
      database.select().from(officialSources),
      database.select().from(universityPrograms).where(eq(universityPrograms.universityId, row.id)),
      database.select().from(admissionRequirements).where(eq(admissionRequirements.universityId, row.id)),
      database.select().from(applicationDeadlines).where(eq(applicationDeadlines.universityId, row.id)),
      database.select().from(scholarships).where(eq(scholarships.universityId, row.id)),
      database.select().from(universityContacts).where(eq(universityContacts.universityId, row.id)),
    ]);
    const sources = indexSources(sourceRows);
    return mapUniversityRow(row, {
      source: requireSource(sources, row.sourceId),
      programs: programRows.map((program) => mapUniversityProgramRow(program, requireSource(sources, program.sourceId))),
      requirements: requirementRows.map((requirement) => mapAdmissionRequirementRow(requirement, requireSource(sources, requirement.sourceId))),
      deadlines: deadlineRows.map((deadline) => mapApplicationDeadlineRow(deadline, requireSource(sources, deadline.sourceId))),
      scholarships: scholarshipRows.map((scholarship) => mapScholarshipRow(scholarship, requireSource(sources, scholarship.sourceId))),
      contacts: contactRows.map((contact) => mapUniversityContactRow(contact, requireSource(sources, contact.sourceId))),
    });
  }

  const universityRepository: UniversityRepository = {
    async list() {
      const rows = await database.select().from(universities).orderBy(universities.name);
      return Promise.all(rows.map(mapUniversity));
    },
    async getBySlug(slug) {
      const [row] = await database.select().from(universities).where(eq(universities.slug, slug)).limit(1);
      return row ? mapUniversity(row) : null;
    },
  };

  const programRepository: ProgramRepository = {
    async listByUniversityId(universityId) {
      const [rows, sourceRows] = await Promise.all([
        database.select().from(universityPrograms).where(eq(universityPrograms.universityId, universityId)),
        database.select().from(officialSources),
      ]);
      const sources = indexSources(sourceRows);
      return rows.map((row) => mapUniversityProgramRow(row, requireSource(sources, row.sourceId)));
    },
    async findById(id) {
      const [[row], sourceRows] = await Promise.all([
        database.select().from(universityPrograms).where(eq(universityPrograms.id, id)).limit(1),
        database.select().from(officialSources),
      ]);
      return row ? mapUniversityProgramRow(row, requireSource(indexSources(sourceRows), row.sourceId)) : null;
    },
  };

  const requirementRepository: RequirementRepository = {
    async listByUniversityId(universityId) {
      const [rows, sourceRows] = await Promise.all([
        database.select().from(admissionRequirements).where(eq(admissionRequirements.universityId, universityId)),
        database.select().from(officialSources),
      ]);
      const sources = indexSources(sourceRows);
      return rows.map((row) => mapAdmissionRequirementRow(row, requireSource(sources, row.sourceId)));
    },
  };

  const scholarshipRepository: ScholarshipRepository = {
    async list() {
      const [rows, sourceRows] = await Promise.all([
        database.select().from(scholarships).orderBy(scholarships.name),
        database.select().from(officialSources),
      ]);
      const sources = indexSources(sourceRows);
      return rows.map((row) => mapScholarshipRow(row, requireSource(sources, row.sourceId)));
    },
  };

  const sourceRepository: OfficialSourceRepository = {
    async findById(sourceId) {
      const [row] = await database.select().from(officialSources).where(eq(officialSources.sourceId, sourceId)).limit(1);
      return row ? mapOfficialSourceRow(row) : null;
    },
  };

  const evidenceRepository: EvidenceRepository = {
    async listByUniversityId(universityId) {
      const [rows, sourceRows] = await Promise.all([
        database.select().from(evidenceRecords).where(eq(evidenceRecords.universityId, universityId)),
        database.select().from(officialSources),
      ]);
      const sources = indexSources(sourceRows);
      return rows.map((row) => mapEvidenceRecordRow(row, requireSource(sources, row.sourceId)));
    },
  };

  const contactRepository: UniversityContactRepository = {
    async listByUniversityId(universityId) {
      const [rows, sourceRows] = await Promise.all([
        database.select().from(universityContacts).where(eq(universityContacts.universityId, universityId)),
        database.select().from(officialSources),
      ]);
      const sources = indexSources(sourceRows);
      return rows.map((row) => mapUniversityContactRow(row, requireSource(sources, row.sourceId)));
    },
  };

  const profileRepository: StudentProfileRepository = {
    async getCurrent() {
      throw new Error("An authenticated user is required to access a student profile.");
    },
    async getForUser(userId) {
      const [row] = await database.select().from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
      return row ? mapStudentProfileRow(row) : null;
    },
    async upsertForUser(userId: string, profile: StudentProfile) {
      const [existing] = await database.select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId))
        .limit(1);
      const id = existing?.id ?? randomUUID();
      const [row] = await database.insert(studentProfiles)
        .values({ id, userId, profileData: { ...profile, id } })
        .onConflictDoUpdate({
          target: studentProfiles.userId,
          set: { profileData: { ...profile, id }, updatedAt: new Date() },
        })
        .returning();
      return mapStudentProfileRow(row);
    },
  };

  async function mapApplication(row: typeof applications.$inferSelect): Promise<Application> {
    const [[university], [source]] = await Promise.all([
      database.select().from(universities).where(eq(universities.id, row.universityId)).limit(1),
      database.select().from(officialSources).where(eq(officialSources.sourceId, row.sourceId)).limit(1),
    ]);
    if (!university || !source) throw new Error("A persisted application has missing university or provenance data.");
    return mapApplicationRow(row, { university: await mapUniversity(university), source: mapOfficialSourceRow(source) });
  }

  const applicationRepository: PersistentApplicationRepository = {
    async list() {
      const rows = await database.select().from(applications).orderBy(applications.createdAt);
      return Promise.all(rows.map(mapApplication));
    },
    async listForProfile(profileId) {
      const rows = await database.select().from(applications).where(eq(applications.studentProfileId, profileId)).orderBy(applications.createdAt);
      return Promise.all(rows.map(mapApplication));
    },
    async findById(id) {
      const [row] = await database.select().from(applications).where(eq(applications.id, id)).limit(1);
      return row ? mapApplication(row) : null;
    },
    async create(input: ApplicationCreateInput) {
      const [row] = await database.insert(applications).values(toApplicationInsert(input)).returning();
      return mapApplication(row);
    },
    async updateForProfile(profileId: string, applicationId: string, input: ApplicationUpdateInput) {
      const [row] = await database.update(applications)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(applications.id, applicationId), eq(applications.studentProfileId, profileId)))
        .returning();
      return row ? mapApplication(row) : null;
    },
    async getCopilotDraft(profileId: string, applicationId: string) {
      const [application] = await database.select({ readinessState: applications.readinessState })
        .from(applications)
        .where(and(eq(applications.id, applicationId), eq(applications.studentProfileId, profileId)))
        .limit(1);
      if (!application) return null;

      const [fieldRows, documentRows, requirementRows, writtenAnswerRows] = await Promise.all([
        database.select().from(applicationFields).where(eq(applicationFields.applicationId, applicationId)),
        database.select().from(applicationDocuments).where(eq(applicationDocuments.applicationId, applicationId)),
        database.select().from(applicationRequirementMappings).where(eq(applicationRequirementMappings.applicationId, applicationId)),
        database.select().from(applicationWrittenAnswers).where(eq(applicationWrittenAnswers.applicationId, applicationId)),
      ]);

      return {
        fields: fieldRows.map(mapApplicationFieldRow),
        documents: documentRows.map(mapApplicationDocumentRow),
        requirements: requirementRows.map(mapApplicationRequirementMappingRow),
        writtenAnswers: writtenAnswerRows.map(mapApplicationWrittenAnswerRow),
        readinessState: application.readinessState,
        humanReviewed: false,
      } satisfies ApplicationCopilotDraftState;
    },
    async saveCopilotDraft(profileId: string, applicationId: string, state: ApplicationCopilotDraftState) {
      return database.transaction(async (transaction) => {
        const [application] = await transaction.select().from(applications)
          .where(and(eq(applications.id, applicationId), eq(applications.studentProfileId, profileId)))
          .limit(1);
        if (!application) return false;

        await Promise.all([
          transaction.delete(applicationFields).where(eq(applicationFields.applicationId, applicationId)),
          transaction.delete(applicationDocuments).where(eq(applicationDocuments.applicationId, applicationId)),
          transaction.delete(applicationRequirementMappings).where(eq(applicationRequirementMappings.applicationId, applicationId)),
          transaction.delete(applicationWrittenAnswers).where(eq(applicationWrittenAnswers.applicationId, applicationId)),
        ]);
        if (state.fields.length) await transaction.insert(applicationFields).values(state.fields.map((field) => toApplicationFieldInsert(applicationId, field)));
        if (state.documents.length) {
          await transaction.insert(applicationDocuments).values(state.documents.map((document) =>
            toApplicationDocumentInsert(applicationId, document, document.requirementStatus ?? "NOT_ESTABLISHED"),
          ));
        }
        if (state.requirements.length) await transaction.insert(applicationRequirementMappings).values(state.requirements.map((requirement) => toApplicationRequirementMappingInsert(applicationId, requirement)));
        if (state.writtenAnswers.length) {
          await transaction.insert(applicationWrittenAnswers).values(state.writtenAnswers.map((answer) =>
            toApplicationWrittenAnswerInsert(applicationId, answer),
          ));
        }
        await transaction.update(applications)
          .set({ readinessState: state.readinessState, updatedAt: new Date() })
          .where(and(eq(applications.id, applicationId), eq(applications.studentProfileId, profileId)));
        return true;
      });
    },
  };

  return {
    universityRepository,
    programRepository,
    requirementRepository,
    scholarshipRepository,
    sourceRepository,
    evidenceRepository,
    contactRepository,
    profileRepository,
    applicationRepository,
  };
}
