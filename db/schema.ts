import type {
  ApplicationStatus,
  Scholarship,
  University,
  UniversityProgram,
  VerificationStatus,
} from "@/types/domain";
import type {
  ApplicationReadinessState,
  ApplicationDocumentStatus,
  ApplicationFieldCategory,
  ApplicationFieldReviewState,
  ApplicationFieldStatus,
  ApplicationFieldValidationState,
  ApplicationRequirementDraft,
} from "@/types/ai";
import type { StudentProfile } from "@/types/domain";
import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const verificationStatusEnum = pgEnum("verification_status", [
  "verified",
  "unverified",
  "mock",
  "missing-source",
  "conflicting",
  "stale",
]);

export const sourceTypeEnum = pgEnum("source_type", [
  "official-website",
  "institutional-page",
  "official-scholarship",
  "government",
  "official-document",
  "application-portal",
  "institution-contact",
  "mock",
  "unknown",
]);

export const applicantTypeEnum = pgEnum("applicant_type", ["domestic", "international", "all"]);
export const applicationStatusEnum = pgEnum("application_status", ["Planning", "In progress", "Ready to submit", "Submitted"]);
export const applicationReadinessEnum = pgEnum("application_readiness_state", ["DRAFT", "INCOMPLETE", "NEEDS_REVIEW", "READY_FOR_SUBMISSION"]);
export const applicationFieldCategoryEnum = pgEnum("application_field_category", ["identity", "contact", "academics", "program", "language", "activities", "documents", "writtenResponses"]);
export const applicationFieldStatusEnum = pgEnum("application_field_status", ["AUTO_MAPPED", "USER_ENTERED", "AI_DRAFT", "MISSING", "NEEDS_REVIEW", "INVALID", "MAPPED", "STUDENT_PROVIDED"]);
export const applicationFieldValidationEnum = pgEnum("application_field_validation_state", ["NOT_VALIDATED", "VALID", "INVALID", "NEEDS_REVIEW"]);
export const applicationFieldReviewEnum = pgEnum("application_field_review_state", ["NOT_REVIEWED", "REVIEW_REQUIRED", "REVIEWED"]);
export const applicationDocumentStatusEnum = pgEnum("application_document_status", ["REQUIRED", "OPTIONAL", "MISSING", "CONFIRMED", "NEEDS_REVIEW", "NOT_ESTABLISHED"]);
export const applicationDocumentRequirementStatusEnum = pgEnum("application_document_requirement_status", ["REQUIRED", "OPTIONAL", "NEEDS_REVIEW", "NOT_ESTABLISHED"]);
export const requirementDecisionEnum = pgEnum("requirement_decision", ["satisfied", "not_satisfied", "unknown"]);
export const applicationRequirementEvidenceStatusEnum = pgEnum("application_requirement_evidence_status", ["VERIFIED", "UNKNOWN", "NEEDS_REVIEW", "STALE", "CONFLICTING"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const officialSources = pgTable("official_sources", {
  sourceId: text("source_id").primaryKey(),
  sourceUrl: text("source_url"),
  sourceTitle: text("source_title").notNull(),
  sourceType: sourceTypeEnum("source_type").notNull(),
  academicYear: text("academic_year"),
  lastVerified: timestamp("last_verified", { withTimezone: true }),
  evidenceReference: text("evidence_reference"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("official_sources_verification_idx").on(table.verificationStatus),
]);

export const authUsers = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("auth_user_email_idx").on(table.email)]);

export const authSessions = pgTable("auth_session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("auth_session_token_idx").on(table.token),
  index("auth_session_user_idx").on(table.userId),
]);

export const authAccounts = pgTable("auth_account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => authUsers.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("auth_account_provider_account_idx").on(table.providerId, table.accountId),
  index("auth_account_user_idx").on(table.userId),
]);

export const authVerifications = pgTable("auth_verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("auth_verification_identifier_idx").on(table.identifier)]);

export const universities = pgTable("universities", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  country: text("country"),
  city: text("city"),
  website: text("website"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  profileData: jsonb("profile_data").$type<Pick<University, "destinationRegion" | "overview" | "studentCount" | "studyAreas" | "officialSources" | "institutionType">>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  uniqueIndex("universities_slug_idx").on(table.slug),
  index("universities_verification_idx").on(table.verificationStatus),
]);

export const universityPrograms = pgTable("university_programs", {
  id: text("id").primaryKey(),
  universityId: text("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  credential: text("credential"),
  field: text("field"),
  studyMode: text("study_mode"),
  duration: text("duration"),
  availabilityStatus: text("availability_status").notNull().default("unknown"),
  metadata: jsonb("metadata").$type<Pick<UniversityProgram, "annualTuition" | "language">>().notNull(),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("university_programs_university_idx").on(table.universityId)]);

export const admissionRequirements = pgTable("admission_requirements", {
  id: text("id").primaryKey(),
  universityId: text("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  programId: text("program_id").references(() => universityPrograms.id, { onDelete: "set null" }),
  applicantType: applicantTypeEnum("applicant_type"),
  requirementType: text("requirement_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  isRequired: boolean("is_required"),
  academicYear: text("academic_year"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("admission_requirements_university_idx").on(table.universityId),
  index("admission_requirements_program_idx").on(table.programId),
]);

export const applicationDeadlines = pgTable("application_deadlines", {
  id: text("id").primaryKey(),
  universityId: text("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  programId: text("program_id").references(() => universityPrograms.id, { onDelete: "set null" }),
  applicationCycle: text("application_cycle").notNull(),
  deadlineType: text("deadline_type").notNull(),
  label: text("label").notNull(),
  intake: text("intake").notNull(),
  deadlineValue: text("deadline_value"),
  academicYear: text("academic_year"),
  isIllustrative: boolean("is_illustrative").notNull().default(false),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("application_deadlines_university_idx").on(table.universityId)]);

export const scholarships = pgTable("scholarships", {
  id: text("id").primaryKey(),
  universityId: text("university_id").references(() => universities.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  eligibility: jsonb("eligibility").$type<string[]>().notNull().default([]),
  amount: jsonb("amount").$type<{ currency: string | null; minimum: number | null; maximum: number | null; display: string | null }>().notNull(),
  deadline: text("deadline"),
  academicYear: text("academic_year"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  metadata: jsonb("metadata").$type<Pick<Scholarship, "provider" | "country" | "eligibleStudyLevels" | "eligibleNationalities" | "requiredDocuments" | "focusAreas" | "isMock">>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("scholarships_university_idx").on(table.universityId)]);

export const universityContacts = pgTable("university_contacts", {
  id: text("id").primaryKey(),
  universityId: text("university_id").notNull().references(() => universities.id, { onDelete: "cascade" }),
  department: text("department").notNull(),
  contactType: text("contact_type").notNull(),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  url: text("url"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [index("university_contacts_university_idx").on(table.universityId)]);

export const evidenceRecords = pgTable("evidence_records", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  universityId: text("university_id").references(() => universities.id, { onDelete: "cascade" }),
  programId: text("program_id").references(() => universityPrograms.id, { onDelete: "set null" }),
  topic: text("topic").notNull(),
  academicYear: text("academic_year"),
  evidenceSnippet: text("evidence_snippet").notNull(),
  evidenceReference: text("evidence_reference"),
  isRequired: boolean("is_required"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("evidence_records_source_idx").on(table.sourceId),
  index("evidence_records_university_topic_idx").on(table.universityId, table.topic),
]);

export const studentProfiles = pgTable("student_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
  profileData: jsonb("profile_data").$type<StudentProfile>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [uniqueIndex("student_profiles_user_idx").on(table.userId)]);

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  studentProfileId: text("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  universityId: text("university_id").notNull().references(() => universities.id, { onDelete: "restrict" }),
  programId: text("program_id").references(() => universityPrograms.id, { onDelete: "set null" }),
  programName: text("program_name").notNull(),
  intake: text("intake").notNull(),
  status: applicationStatusEnum("status").notNull(),
  readinessState: applicationReadinessEnum("readiness_state").notNull().default("DRAFT"),
  deadline: text("deadline"),
  tasks: jsonb("tasks").$type<{ label: string; complete: boolean }[]>().notNull().default([]),
  sourceId: text("source_id").notNull().references(() => officialSources.sourceId, { onDelete: "restrict" }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  index("applications_profile_idx").on(table.studentProfileId),
  index("applications_university_idx").on(table.universityId),
]);

export const applicationFields = pgTable("application_fields", {
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  fieldId: text("field_id").notNull(),
  category: applicationFieldCategoryEnum("category").notNull(),
  label: text("label").notNull(),
  value: text("value"),
  status: applicationFieldStatusEnum("status").notNull(),
  provenance: jsonb("provenance").$type<Record<string, unknown> | null>(),
  validationState: applicationFieldValidationEnum("validation_state").notNull(),
  reviewState: applicationFieldReviewEnum("review_state").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  primaryKey({ columns: [table.applicationId, table.fieldId] }),
  check("application_fields_no_secrets_check", sql`${table.fieldId} !~* '(password|passwd|otp|2fa|token|credential|payment)' and ${table.label} !~* '(password|passwd|otp|2fa|token|credential|payment)'`),
  index("application_fields_status_idx").on(table.status),
]);

export const applicationDocuments = pgTable("application_documents", {
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(),
  label: text("label").notNull(),
  required: boolean("required").notNull(),
  prepared: boolean("prepared").notNull().default(false),
  status: applicationDocumentStatusEnum("status").notNull(),
  requirementStatus: applicationDocumentRequirementStatusEnum("requirement_status").notNull(),
  provenance: jsonb("provenance").$type<Record<string, unknown> | null>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [primaryKey({ columns: [table.applicationId, table.documentId] })]);

export const applicationRequirementMappings = pgTable("application_requirement_mappings", {
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  mappingId: text("mapping_id").notNull(),
  topic: text("topic").notNull(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  fieldId: text("field_id"),
  category: applicationFieldCategoryEnum("category"),
  required: boolean("required"),
  decision: requirementDecisionEnum("decision").notNull(),
  evidenceStatus: applicationRequirementEvidenceStatusEnum("evidence_status").notNull(),
  provenance: jsonb("provenance").$type<ApplicationRequirementDraft["provenance"]>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [
  primaryKey({ columns: [table.applicationId, table.mappingId] }),
  index("application_requirement_mappings_decision_idx").on(table.decision),
]);

export const applicationWrittenAnswers = pgTable("application_written_answers", {
  applicationId: text("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
  answerId: text("answer_id").notNull(),
  label: text("label").notNull(),
  prompt: text("prompt").notNull(),
  value: text("value").notNull(),
  status: applicationFieldStatusEnum("status").notNull(),
  reviewState: applicationFieldReviewEnum("review_state").notNull(),
  provenance: jsonb("provenance").$type<Record<string, unknown>[]>(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, (table) => [primaryKey({ columns: [table.applicationId, table.answerId] })]);

export type PersistedVerificationStatus = typeof verificationStatusEnum.enumValues[number] & VerificationStatus;
export type PersistedApplicationStatus = typeof applicationStatusEnum.enumValues[number] & ApplicationStatus;
export type PersistedReadinessState = typeof applicationReadinessEnum.enumValues[number] & ApplicationReadinessState;
export type PersistedFieldCategory = typeof applicationFieldCategoryEnum.enumValues[number] & ApplicationFieldCategory;
export type PersistedFieldStatus = typeof applicationFieldStatusEnum.enumValues[number] & ApplicationFieldStatus;
export type PersistedFieldValidationState = typeof applicationFieldValidationEnum.enumValues[number] & ApplicationFieldValidationState;
export type PersistedFieldReviewState = typeof applicationFieldReviewEnum.enumValues[number] & ApplicationFieldReviewState;
export type PersistedDocumentStatus = typeof applicationDocumentStatusEnum.enumValues[number] & ApplicationDocumentStatus;
