CREATE TYPE "public"."applicant_type" AS ENUM('domestic', 'international', 'all');--> statement-breakpoint
CREATE TYPE "public"."application_document_requirement_status" AS ENUM('REQUIRED', 'OPTIONAL', 'NEEDS_REVIEW', 'NOT_ESTABLISHED');--> statement-breakpoint
CREATE TYPE "public"."application_document_status" AS ENUM('REQUIRED', 'OPTIONAL', 'MISSING', 'CONFIRMED', 'NEEDS_REVIEW', 'NOT_ESTABLISHED');--> statement-breakpoint
CREATE TYPE "public"."application_field_category" AS ENUM('identity', 'contact', 'academics', 'program', 'language', 'activities', 'documents', 'writtenResponses');--> statement-breakpoint
CREATE TYPE "public"."application_field_review_state" AS ENUM('NOT_REVIEWED', 'REVIEW_REQUIRED', 'REVIEWED');--> statement-breakpoint
CREATE TYPE "public"."application_field_status" AS ENUM('AUTO_MAPPED', 'USER_ENTERED', 'AI_DRAFT', 'MISSING', 'NEEDS_REVIEW', 'INVALID', 'MAPPED', 'STUDENT_PROVIDED');--> statement-breakpoint
CREATE TYPE "public"."application_field_validation_state" AS ENUM('NOT_VALIDATED', 'VALID', 'INVALID', 'NEEDS_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."application_readiness_state" AS ENUM('DRAFT', 'INCOMPLETE', 'NEEDS_REVIEW', 'READY_FOR_SUBMISSION');--> statement-breakpoint
CREATE TYPE "public"."application_requirement_evidence_status" AS ENUM('VERIFIED', 'UNKNOWN', 'NEEDS_REVIEW', 'STALE', 'CONFLICTING');--> statement-breakpoint
CREATE TYPE "public"."application_status" AS ENUM('Planning', 'In progress', 'Ready to submit', 'Submitted');--> statement-breakpoint
CREATE TYPE "public"."requirement_decision" AS ENUM('satisfied', 'not_satisfied', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('official-website', 'institutional-page', 'official-scholarship', 'government', 'official-document', 'application-portal', 'institution-contact', 'mock', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('verified', 'unverified', 'mock', 'missing-source', 'conflicting', 'stale');--> statement-breakpoint
CREATE TABLE "admission_requirements" (
	"id" text PRIMARY KEY NOT NULL,
	"university_id" text NOT NULL,
	"program_id" text,
	"applicant_type" "applicant_type",
	"requirement_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"is_required" boolean,
	"academic_year" text,
	"verification_status" "verification_status" NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_deadlines" (
	"id" text PRIMARY KEY NOT NULL,
	"university_id" text NOT NULL,
	"program_id" text,
	"application_cycle" text NOT NULL,
	"deadline_type" text NOT NULL,
	"label" text NOT NULL,
	"intake" text NOT NULL,
	"deadline_value" text,
	"academic_year" text,
	"is_illustrative" boolean DEFAULT false NOT NULL,
	"verification_status" "verification_status" NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"application_id" text NOT NULL,
	"document_id" text NOT NULL,
	"label" text NOT NULL,
	"required" boolean NOT NULL,
	"prepared" boolean DEFAULT false NOT NULL,
	"status" "application_document_status" NOT NULL,
	"requirement_status" "application_document_requirement_status" NOT NULL,
	"provenance" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_documents_application_id_document_id_pk" PRIMARY KEY("application_id","document_id")
);
--> statement-breakpoint
CREATE TABLE "application_fields" (
	"application_id" text NOT NULL,
	"field_id" text NOT NULL,
	"category" "application_field_category" NOT NULL,
	"label" text NOT NULL,
	"value" text,
	"status" "application_field_status" NOT NULL,
	"provenance" jsonb,
	"validation_state" "application_field_validation_state" NOT NULL,
	"review_state" "application_field_review_state" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_fields_application_id_field_id_pk" PRIMARY KEY("application_id","field_id"),
	CONSTRAINT "application_fields_no_secrets_check" CHECK ("application_fields"."field_id" !~* '(password|passwd|otp|2fa|token|credential|payment)' and "application_fields"."label" !~* '(password|passwd|otp|2fa|token|credential|payment)')
);
--> statement-breakpoint
CREATE TABLE "application_requirement_mappings" (
	"application_id" text NOT NULL,
	"mapping_id" text NOT NULL,
	"topic" text NOT NULL,
	"label" text NOT NULL,
	"description" text NOT NULL,
	"field_id" text,
	"required" boolean,
	"decision" "requirement_decision" NOT NULL,
	"evidence_status" "application_requirement_evidence_status" NOT NULL,
	"provenance" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_requirement_mappings_application_id_mapping_id_pk" PRIMARY KEY("application_id","mapping_id")
);
--> statement-breakpoint
CREATE TABLE "application_written_answers" (
	"application_id" text NOT NULL,
	"answer_id" text NOT NULL,
	"label" text NOT NULL,
	"prompt" text NOT NULL,
	"value" text NOT NULL,
	"status" "application_field_status" NOT NULL,
	"review_state" "application_field_review_state" NOT NULL,
	"provenance" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_written_answers_application_id_answer_id_pk" PRIMARY KEY("application_id","answer_id")
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"student_profile_id" text NOT NULL,
	"university_id" text NOT NULL,
	"program_id" text,
	"program_name" text NOT NULL,
	"intake" text NOT NULL,
	"status" "application_status" NOT NULL,
	"readiness_state" "application_readiness_state" DEFAULT 'DRAFT' NOT NULL,
	"deadline" text,
	"tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_records" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"university_id" text,
	"program_id" text,
	"topic" text NOT NULL,
	"academic_year" text,
	"evidence_snippet" text NOT NULL,
	"evidence_reference" text,
	"is_required" boolean,
	"verification_status" "verification_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "official_sources" (
	"source_id" text PRIMARY KEY NOT NULL,
	"source_url" text,
	"source_title" text NOT NULL,
	"source_type" "source_type" NOT NULL,
	"academic_year" text,
	"last_verified" timestamp with time zone,
	"evidence_reference" text,
	"verification_status" "verification_status" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" text PRIMARY KEY NOT NULL,
	"university_id" text,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"eligibility" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"amount" jsonb NOT NULL,
	"deadline" text,
	"academic_year" text,
	"verification_status" "verification_status" NOT NULL,
	"source_id" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"country" text NOT NULL,
	"city" text,
	"website" text,
	"verification_status" "verification_status" NOT NULL,
	"source_id" text NOT NULL,
	"profile_data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"university_id" text NOT NULL,
	"department" text NOT NULL,
	"contact_type" text NOT NULL,
	"contact_name" text,
	"email" text,
	"phone" text,
	"url" text,
	"verification_status" "verification_status" NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "university_programs" (
	"id" text PRIMARY KEY NOT NULL,
	"university_id" text NOT NULL,
	"name" text NOT NULL,
	"credential" text,
	"field" text,
	"study_mode" text,
	"duration" text,
	"availability_status" text DEFAULT 'unknown' NOT NULL,
	"metadata" jsonb NOT NULL,
	"verification_status" "verification_status" NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admission_requirements" ADD CONSTRAINT "admission_requirements_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requirements" ADD CONSTRAINT "admission_requirements_program_id_university_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."university_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admission_requirements" ADD CONSTRAINT "admission_requirements_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_deadlines" ADD CONSTRAINT "application_deadlines_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_deadlines" ADD CONSTRAINT "application_deadlines_program_id_university_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."university_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_deadlines" ADD CONSTRAINT "application_deadlines_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_fields" ADD CONSTRAINT "application_fields_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_requirement_mappings" ADD CONSTRAINT "application_requirement_mappings_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_written_answers" ADD CONSTRAINT "application_written_answers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_profile_id_student_profiles_id_fk" FOREIGN KEY ("student_profile_id") REFERENCES "public"."student_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_university_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."university_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_records" ADD CONSTRAINT "evidence_records_program_id_university_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."university_programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_contacts" ADD CONSTRAINT "university_contacts_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_contacts" ADD CONSTRAINT "university_contacts_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_programs" ADD CONSTRAINT "university_programs_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "university_programs" ADD CONSTRAINT "university_programs_source_id_official_sources_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."official_sources"("source_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admission_requirements_university_idx" ON "admission_requirements" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "admission_requirements_program_idx" ON "admission_requirements" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "application_deadlines_university_idx" ON "application_deadlines" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "application_fields_status_idx" ON "application_fields" USING btree ("status");--> statement-breakpoint
CREATE INDEX "application_requirement_mappings_decision_idx" ON "application_requirement_mappings" USING btree ("decision");--> statement-breakpoint
CREATE INDEX "applications_profile_idx" ON "applications" USING btree ("student_profile_id");--> statement-breakpoint
CREATE INDEX "applications_university_idx" ON "applications" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "evidence_records_source_idx" ON "evidence_records" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "evidence_records_university_topic_idx" ON "evidence_records" USING btree ("university_id","topic");--> statement-breakpoint
CREATE INDEX "official_sources_verification_idx" ON "official_sources" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "scholarships_university_idx" ON "scholarships" USING btree ("university_id");--> statement-breakpoint
CREATE UNIQUE INDEX "universities_slug_idx" ON "universities" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "universities_verification_idx" ON "universities" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "university_contacts_university_idx" ON "university_contacts" USING btree ("university_id");--> statement-breakpoint
CREATE INDEX "university_programs_university_idx" ON "university_programs" USING btree ("university_id");