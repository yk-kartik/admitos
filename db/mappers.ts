import type {
  AdmissionRequirement,
  Application,
  ApplicationDeadline,
  OfficialSource,
  Scholarship,
  StudentProfile,
  University,
  UniversityContact,
  UniversityProgram,
} from "@/types/domain";
import type {
  ApplicationDocumentDraft,
  ApplicationDocumentRequirementStatus,
  ApplicationFieldDraft,
  ApplicationRequirementDraft,
  ApplicationWrittenAnswerDraft,
  DecisionEvidence,
} from "@/types/ai";
import {
  applicationDocuments,
  applicationFields,
  applicationRequirementMappings,
  applicationWrittenAnswers,
  applications,
  admissionRequirements,
  applicationDeadlines,
  evidenceRecords,
  officialSources,
  scholarships,
  studentProfiles,
  universityContacts,
  universityPrograms,
  universities,
} from "./schema.ts";

export type OfficialSourceRow = typeof officialSources.$inferSelect;
export type UniversityRow = typeof universities.$inferSelect;
export type UniversityProgramRow = typeof universityPrograms.$inferSelect;
export type AdmissionRequirementRow = typeof admissionRequirements.$inferSelect;
export type ApplicationDeadlineRow = typeof applicationDeadlines.$inferSelect;
export type ScholarshipRow = typeof scholarships.$inferSelect;
export type UniversityContactRow = typeof universityContacts.$inferSelect;
export type EvidenceRecordRow = typeof evidenceRecords.$inferSelect;
export type StudentProfileRow = typeof studentProfiles.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type ApplicationFieldRow = typeof applicationFields.$inferSelect;
export type ApplicationDocumentRow = typeof applicationDocuments.$inferSelect;
export type ApplicationRequirementMappingRow = typeof applicationRequirementMappings.$inferSelect;
export type ApplicationWrittenAnswerRow = typeof applicationWrittenAnswers.$inferSelect;

function iso(value: Date | null): string | null {
  return value?.toISOString() ?? null;
}

function date(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw new Error("A persisted timestamp is invalid.");
  return parsed;
}

function restrictiveSource(source: OfficialSource, claimStatus: OfficialSource["verificationStatus"]): OfficialSource {
  return source.verificationStatus === "verified"
    ? { ...source, verificationStatus: claimStatus }
    : source;
}

export function mapOfficialSourceRow(row: OfficialSourceRow): OfficialSource {
  return {
    sourceId: row.sourceId,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    sourceType: row.sourceType,
    academicYear: row.academicYear,
    lastVerified: iso(row.lastVerified),
    evidenceReference: row.evidenceReference,
    verificationStatus: row.verificationStatus,
    notes: row.notes,
  };
}

export function toOfficialSourceInsert(source: OfficialSource): typeof officialSources.$inferInsert {
  return {
    sourceId: source.sourceId,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourceType: source.sourceType,
    academicYear: source.academicYear,
    lastVerified: date(source.lastVerified),
    evidenceReference: source.evidenceReference,
    verificationStatus: source.verificationStatus,
    notes: source.notes,
  };
}

export function mapUniversityRow(
  row: UniversityRow,
  related: {
    source: OfficialSource;
    programs: UniversityProgram[];
    requirements: AdmissionRequirement[];
    deadlines: ApplicationDeadline[];
    scholarships: Scholarship[];
    contacts: UniversityContact[];
  },
): University {
  return {
    ...row.profileData,
    id: row.id,
    slug: row.slug,
    name: row.name,
    country: row.country,
    city: row.city,
    programs: related.programs,
    requirements: related.requirements,
    deadlines: related.deadlines,
    scholarships: related.scholarships,
    contacts: related.contacts,
    source: restrictiveSource(related.source, row.verificationStatus),
  };
}

export function toUniversityInsert(university: University): typeof universities.$inferInsert {
  return {
    id: university.id,
    slug: university.slug,
    name: university.name,
    country: university.country,
    city: university.city,
    website: university.source.sourceUrl,
    verificationStatus: university.source.verificationStatus,
    sourceId: university.source.sourceId,
    profileData: {
      destinationRegion: university.destinationRegion,
      overview: university.overview,
      studentCount: university.studentCount,
      studyAreas: university.studyAreas,
      officialSources: university.officialSources,
      institutionType: university.institutionType,
    },
  };
}

export function mapUniversityProgramRow(row: UniversityProgramRow, source: OfficialSource): UniversityProgram {
  return {
    id: row.id,
    name: row.name,
    field: row.field,
    availabilityStatus: row.availabilityStatus,
    credential: row.credential,
    studyMode: row.studyMode,
    duration: row.duration,
    annualTuition: row.metadata.annualTuition,
    language: row.metadata.language,
    source: restrictiveSource(source, row.verificationStatus),
  };
}

export function toUniversityProgramInsert(universityId: string, program: UniversityProgram): typeof universityPrograms.$inferInsert {
  return {
    id: program.id,
    universityId,
    name: program.name,
    credential: program.credential,
    field: program.field ?? null,
    studyMode: program.studyMode,
    duration: program.duration,
    availabilityStatus: program.availabilityStatus ?? "unknown",
    metadata: { annualTuition: program.annualTuition, language: program.language },
    verificationStatus: program.source.verificationStatus,
    sourceId: program.source.sourceId,
  };
}

export function mapAdmissionRequirementRow(row: AdmissionRequirementRow, source: OfficialSource): AdmissionRequirement {
  return {
    id: row.id,
    programId: row.programId,
    title: row.title,
    detail: row.description,
    required: row.isRequired,
    ...(row.programId ? { programId: row.programId } : {}),
    ...(row.applicantType ? { applicantType: row.applicantType } : {}),
    source: restrictiveSource(source, row.verificationStatus),
  };
}

export function toAdmissionRequirementInsert(universityId: string, requirement: AdmissionRequirement, academicYear: string | null = requirement.source.academicYear): typeof admissionRequirements.$inferInsert {
  return {
    id: requirement.id,
    universityId,
    programId: requirement.programId ?? null,
    applicantType: requirement.applicantType ?? null,
    requirementType: "admission_requirement",
    title: requirement.title,
    description: requirement.detail,
    isRequired: requirement.required,
    academicYear,
    verificationStatus: requirement.source.verificationStatus,
    sourceId: requirement.source.sourceId,
  };
}

export function mapApplicationDeadlineRow(row: ApplicationDeadlineRow, source: OfficialSource): ApplicationDeadline {
  return {
    id: row.id,
    label: row.label,
    date: row.deadlineValue,
    intake: row.intake,
    academicYear: row.academicYear,
    isIllustrative: row.isIllustrative,
    source: restrictiveSource(source, row.verificationStatus),
  };
}

export function toApplicationDeadlineInsert(universityId: string, deadline: ApplicationDeadline, programId: string | null = deadline.programId ?? null): typeof applicationDeadlines.$inferInsert {
  return {
    id: deadline.id,
    universityId,
    programId,
    applicationCycle: deadline.academicYear ?? deadline.intake,
    deadlineType: deadline.label,
    label: deadline.label,
    intake: deadline.intake,
    deadlineValue: deadline.date,
    academicYear: deadline.academicYear,
    isIllustrative: deadline.isIllustrative,
    verificationStatus: deadline.source.verificationStatus,
    sourceId: deadline.source.sourceId,
  };
}

export function mapScholarshipRow(row: ScholarshipRow, source: OfficialSource): Scholarship {
  const effectiveSource = restrictiveSource(source, row.verificationStatus);
  const verificationStatus = effectiveSource.verificationStatus;
  return {
    id: row.id,
    name: row.name,
    provider: row.metadata.provider,
    country: row.metadata.country,
    summary: row.summary,
    eligibleStudyLevels: row.metadata.eligibleStudyLevels,
    eligibleNationalities: row.metadata.eligibleNationalities,
    amount: row.amount,
    deadline: row.deadline,
    academicYear: row.academicYear,
    eligibilityCriteria: row.eligibility,
    requiredDocuments: row.metadata.requiredDocuments,
    focusAreas: row.metadata.focusAreas,
    officialSource: effectiveSource,
    sources: [effectiveSource],
    verificationStatus,
    lastVerified: effectiveSource.lastVerified,
    isMock: row.metadata.isMock || verificationStatus === "mock",
  };
}

export function toScholarshipInsert(scholarship: Scholarship, universityId: string | null = null): typeof scholarships.$inferInsert {
  return {
    id: scholarship.id,
    universityId,
    name: scholarship.name,
    summary: scholarship.summary,
    eligibility: scholarship.eligibilityCriteria,
    amount: scholarship.amount,
    deadline: scholarship.deadline,
    academicYear: scholarship.academicYear,
    verificationStatus: scholarship.isMock ? "mock" : scholarship.verificationStatus,
    sourceId: scholarship.officialSource.sourceId,
    metadata: {
      provider: scholarship.provider,
      country: scholarship.country,
      eligibleStudyLevels: scholarship.eligibleStudyLevels,
      eligibleNationalities: scholarship.eligibleNationalities,
      requiredDocuments: scholarship.requiredDocuments,
      focusAreas: scholarship.focusAreas,
      isMock: scholarship.isMock,
    },
  };
}

export function mapUniversityContactRow(row: UniversityContactRow, source: OfficialSource): UniversityContact {
  return {
    id: row.id,
    department: row.department,
    contactName: row.contactName,
    email: row.email,
    phone: row.phone,
    contactUrl: row.url,
    source: restrictiveSource(source, row.verificationStatus),
  };
}

export function toUniversityContactInsert(universityId: string, contact: UniversityContact): typeof universityContacts.$inferInsert {
  return {
    id: contact.id,
    universityId,
    department: contact.department,
    contactType: contact.department,
    contactName: contact.contactName,
    email: contact.email,
    phone: contact.phone,
    url: contact.contactUrl,
    verificationStatus: contact.source.verificationStatus,
    sourceId: contact.source.sourceId,
  };
}

export function mapEvidenceRecordRow(row: EvidenceRecordRow, source: OfficialSource): DecisionEvidence & {
  evidenceId: string;
  programId: string | null;
} {
  const verificationStatus = source.verificationStatus === "verified"
    ? row.verificationStatus
    : source.verificationStatus;
  return {
    evidenceId: row.id,
    programId: row.programId,
    topic: row.topic as DecisionEvidence["topic"],
    sourceId: source.sourceId,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourceType: source.sourceType,
    academicYear: row.academicYear ?? source.academicYear,
    lastVerified: source.lastVerified,
    evidenceSnippet: row.evidenceSnippet,
    evidenceReference: row.evidenceReference ?? source.evidenceReference,
    isRequired: row.isRequired,
    verificationStatus,
    sourceNotes: row.notes ?? source.notes,
  };
}

export function toEvidenceRecordInsert(input: {
  id: string;
  universityId: string;
  programId: string | null;
  evidence: DecisionEvidence;
}): typeof evidenceRecords.$inferInsert {
  return {
    id: input.id,
    sourceId: input.evidence.sourceId,
    universityId: input.universityId,
    programId: input.programId,
    topic: input.evidence.topic,
    academicYear: input.evidence.academicYear,
    evidenceSnippet: input.evidence.evidenceSnippet,
    evidenceReference: input.evidence.evidenceReference,
    isRequired: input.evidence.isRequired ?? null,
    verificationStatus: input.evidence.verificationStatus,
    notes: input.evidence.sourceNotes,
  };
}

export function mapStudentProfileRow(row: StudentProfileRow): StudentProfile {
  return { ...row.profileData, id: row.id };
}

export function toStudentProfileInsert(profile: StudentProfile, id = profile.id, userId?: string): typeof studentProfiles.$inferInsert {
  if (!id?.trim()) throw new Error("A profile id is required for persistence.");
  if (!userId?.trim()) throw new Error("An authenticated user id is required for profile persistence.");
  return { id, userId, profileData: { ...profile, id } };
}

export function mapApplicationRow(
  row: ApplicationRow,
  related: { university: University; source: OfficialSource },
): Application {
  return {
    id: row.id,
    profileId: row.studentProfileId,
    universitySlug: related.university.slug,
    universityName: related.university.name,
    program: row.programName,
    intake: row.intake,
    status: row.status,
    readinessState: row.readinessState,
    progress: row.tasks.length
      ? Math.round((row.tasks.filter((task) => task.complete).length / row.tasks.length) * 100)
      : 0,
    deadline: row.deadline,
    tasks: row.tasks,
    source: related.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toApplicationInsert(input: {
  application: Application;
  profileId: string;
  universityId: string;
  programId: string | null;
}): typeof applications.$inferInsert {
  return {
    id: input.application.id,
    studentProfileId: input.profileId,
    universityId: input.universityId,
    programId: input.programId,
    programName: input.application.program,
    intake: input.application.intake,
    status: input.application.status,
    readinessState: input.application.readinessState ?? "DRAFT",
    deadline: input.application.deadline,
    tasks: input.application.tasks,
    sourceId: input.application.source.sourceId,
  };
}

const forbiddenFieldMetadata = /(password|passwd|otp|2fa|token|credential|payment)/i;

export function toApplicationFieldInsert(applicationId: string, field: ApplicationFieldDraft): typeof applicationFields.$inferInsert {
  if (forbiddenFieldMetadata.test(field.id) || forbiddenFieldMetadata.test(field.label)) {
    throw new Error("Secret or credential fields cannot be persisted.");
  }
  return {
    applicationId,
    fieldId: field.id,
    category: field.category,
    label: field.label,
    value: field.value,
    status: field.status,
    provenance: field.provenance,
    validationState: field.validationState,
    reviewState: field.reviewState,
  };
}

export function toApplicationDocumentInsert(
  applicationId: string,
  document: ApplicationDocumentDraft,
  trustedRequirementStatus: ApplicationDocumentRequirementStatus,
): typeof applicationDocuments.$inferInsert {
  const required = trustedRequirementStatus === "REQUIRED";
  const status = document.prepared
    ? "CONFIRMED"
    : trustedRequirementStatus === "REQUIRED"
      ? "MISSING"
      : trustedRequirementStatus === "OPTIONAL"
        ? "OPTIONAL"
        : trustedRequirementStatus;
  return {
    applicationId,
    documentId: document.id,
    label: document.label,
    required,
    prepared: document.prepared,
    status: status as ApplicationDocumentDraft["status"],
    requirementStatus: trustedRequirementStatus,
    provenance: document.provenance,
  };
}

export function toApplicationRequirementMappingInsert(applicationId: string, requirement: ApplicationRequirementDraft): typeof applicationRequirementMappings.$inferInsert {
  if (forbiddenFieldMetadata.test(requirement.fieldId ?? "") || forbiddenFieldMetadata.test(requirement.label)) {
    throw new Error("Secret or credential fields cannot be persisted.");
  }
  return {
    applicationId,
    mappingId: requirement.id,
    topic: requirement.topic,
    label: requirement.label,
    description: requirement.description,
    fieldId: requirement.fieldId,
    category: requirement.category,
    required: requirement.required,
    decision: requirement.decision,
    evidenceStatus: requirement.evidenceStatus,
    provenance: requirement.provenance,
  };
}

export function toApplicationWrittenAnswerInsert(applicationId: string, answer: {
  id: string;
  label: string;
  prompt: string;
  value: string;
  status: "AI_DRAFT" | "USER_ENTERED";
  reviewState: "REVIEW_REQUIRED" | "REVIEWED";
  provenance: Record<string, unknown>[];
}): typeof applicationWrittenAnswers.$inferInsert {
  if (forbiddenFieldMetadata.test(answer.label) || forbiddenFieldMetadata.test(answer.prompt)) {
    throw new Error("Secret or credential fields cannot be persisted.");
  }
  return {
    applicationId,
    answerId: answer.id,
    label: answer.label,
    prompt: answer.prompt,
    value: answer.value,
    status: answer.status,
    reviewState: answer.reviewState,
    provenance: answer.provenance,
  };
}

export function mapApplicationFieldRow(row: ApplicationFieldRow): ApplicationFieldDraft {
  return {
    id: row.fieldId,
    label: row.label,
    category: row.category,
    required: false,
    value: row.value,
    status: row.status,
    mappedFrom: null,
    provenance: row.provenance as ApplicationFieldDraft["provenance"],
    validationState: row.validationState,
    reviewState: row.reviewState,
    reviewReason: null,
  };
}

export function mapApplicationDocumentRow(row: ApplicationDocumentRow): ApplicationDocumentDraft {
  return {
    id: row.documentId,
    label: row.label,
    required: row.required,
    prepared: row.prepared,
    status: row.status,
    requirementStatus: row.requirementStatus,
    provenance: row.provenance as ApplicationDocumentDraft["provenance"],
    reviewReason: null,
  };
}

export function mapApplicationRequirementMappingRow(row: ApplicationRequirementMappingRow): ApplicationRequirementDraft {
  return {
    id: row.mappingId,
    topic: row.topic as ApplicationRequirementDraft["topic"],
    label: row.label,
    description: row.description,
    fieldId: row.fieldId,
    category: row.category,
    required: row.required,
    decision: row.decision,
    evidenceStatus: row.evidenceStatus,
    provenance: row.provenance,
  };
}

export function mapApplicationWrittenAnswerRow(row: ApplicationWrittenAnswerRow): ApplicationWrittenAnswerDraft {
  return {
    id: row.answerId,
    label: row.label,
    category: "writtenResponses",
    prompt: row.prompt,
    value: row.value,
    status: row.status as ApplicationWrittenAnswerDraft["status"],
    reviewState: row.reviewState as ApplicationWrittenAnswerDraft["reviewState"],
    reviewLabel: "AI DRAFT — REVIEW REQUIRED",
    provenance: (row.provenance ?? []) as ApplicationWrittenAnswerDraft["provenance"],
  };
}
