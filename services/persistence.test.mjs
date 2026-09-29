import assert from "node:assert/strict";
import test from "node:test";
import { readDatabaseUrl, resolvePersistenceMode } from "../db/config.ts";
import {
  mapAdmissionRequirementRow,
  mapEvidenceRecordRow,
  mapOfficialSourceRow,
  mapScholarshipRow,
  mapUniversityProgramRow,
  mapUniversityRow,
  toApplicationDocumentInsert,
  toApplicationFieldInsert,
  toApplicationInsert,
  toApplicationRequirementMappingInsert,
  toOfficialSourceInsert,
  toStudentProfileInsert,
  toUniversityInsert,
} from "../db/mappers.ts";
import { mockSource } from "../data/provenance.ts";
import { emptyStudentProfile } from "../data/profile.ts";
import { universities } from "../data/universities.ts";

const now = new Date("2026-09-29T12:00:00.000Z");

function sourceRow(overrides = {}) {
  return {
    sourceId: "source-1",
    sourceUrl: null,
    sourceTitle: "Mock source record",
    sourceType: "mock",
    academicYear: null,
    lastVerified: null,
    evidenceReference: null,
    verificationStatus: "mock",
    notes: "Illustrative fixture only.",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("missing DATABASE_URL selects mock mode and does not require credentials", () => {
  assert.equal(readDatabaseUrl({}), null);
  assert.equal(readDatabaseUrl({ DATABASE_URL: "   " }), null);
  assert.equal(resolvePersistenceMode(undefined), "MOCK");
  assert.equal(readDatabaseUrl({ DATABASE_URL: "postgres://localhost/admitos" }), "postgres://localhost/admitos");
  assert.equal(resolvePersistenceMode("postgres://localhost/admitos"), "DATABASE");
});

test("source mapping preserves provenance, timestamps, and non-authoritative status", () => {
  const source = mapOfficialSourceRow(sourceRow());
  const persisted = toOfficialSourceInsert(source);

  assert.equal(source.verificationStatus, "mock");
  assert.equal(source.sourceUrl, null);
  assert.equal(source.lastVerified, null);
  assert.equal(persisted.sourceId, "source-1");
  assert.equal(persisted.verificationStatus, "mock");
  assert.equal(persisted.lastVerified, null);
});

test("university mapping preserves unknown location and existing sourced metadata", () => {
  const mock = universities[0];
  const source = mockSource("university-source", "Mock university profile");
  const row = {
    id: mock.id,
    slug: mock.slug,
    name: mock.name,
    country: null,
    city: null,
    website: null,
    verificationStatus: "mock",
    sourceId: source.sourceId,
    profileData: {
      destinationRegion: mock.destinationRegion,
      overview: mock.overview,
      studentCount: mock.studentCount,
      studyAreas: mock.studyAreas,
      officialSources: mock.officialSources,
      institutionType: mock.institutionType,
    },
    createdAt: now,
    updatedAt: now,
  };
  const mapped = mapUniversityRow(row, {
    source,
    programs: [],
    requirements: [],
    deadlines: [],
    scholarships: [],
    contacts: [],
  });
  const insert = toUniversityInsert({ ...mock, city: null, source });

  assert.equal(mapped.city, null);
  assert.equal(mapped.country, null);
  assert.equal(mapped.overview.value, mock.overview.value);
  assert.equal(mapped.source.verificationStatus, "mock");
  assert.equal(insert.city, null);
  assert.equal(insert.sourceId, source.sourceId);
});

test("program mapping preserves unknown discipline and availability without defaults", () => {
  const source = mapOfficialSourceRow(sourceRow());
  const program = mapUniversityProgramRow({
    id: "program-1",
    universityId: "university-1",
    name: "Environmental Studies",
    credential: null,
    field: null,
    studyMode: null,
    duration: null,
    availabilityStatus: "unknown",
    metadata: { annualTuition: null, language: null },
    verificationStatus: "mock",
    sourceId: source.sourceId,
    createdAt: now,
    updatedAt: now,
  }, source);

  assert.equal(program.field, null);
  assert.equal(program.credential, null);
  assert.equal(program.availabilityStatus, "unknown");
  assert.equal(program.source.verificationStatus, "mock");
});

test("unknown admission requiredness remains null rather than optional", () => {
  const source = mapOfficialSourceRow(sourceRow());
  const requirement = mapAdmissionRequirementRow({
    id: "entry-1",
    universityId: "university-1",
    programId: null,
    applicantType: null,
    requirementType: "admission_requirement",
    title: "Academic record",
    description: "Requirement status not established.",
    isRequired: null,
    academicYear: null,
    verificationStatus: "mock",
    sourceId: source.sourceId,
    createdAt: now,
    updatedAt: now,
  }, source);

  assert.equal(requirement.required, null);
  assert.equal(requirement.source.verificationStatus, "mock");
});

test("conflicting persisted claim status overrides a verified source status", () => {
  const source = mapOfficialSourceRow(sourceRow({
    sourceType: "official-website",
    sourceUrl: "https://university.example/requirements",
    academicYear: "2027/28",
    lastVerified: now,
    evidenceReference: "claim-1",
    verificationStatus: "verified",
  }));
  const requirement = mapAdmissionRequirementRow({
    id: "entry-conflict",
    universityId: "university-1",
    programId: null,
    applicantType: null,
    requirementType: "admission_requirement",
    title: "Academic record",
    description: "Conflicting claim.",
    isRequired: true,
    academicYear: "2027/28",
    verificationStatus: "conflicting",
    sourceId: source.sourceId,
    createdAt: now,
    updatedAt: now,
  }, source);

  assert.equal(requirement.source.verificationStatus, "conflicting");
});

test("evidence mapping never upgrades a mock source", () => {
  const source = mapOfficialSourceRow(sourceRow());
  const evidence = mapEvidenceRecordRow({
    id: "evidence-1",
    sourceId: source.sourceId,
    universityId: "university-1",
    programId: null,
    topic: "admission_requirement",
    academicYear: "2027/28",
    evidenceSnippet: "Illustrative requirement only.",
    evidenceReference: "mock-ref",
    isRequired: true,
    verificationStatus: "verified",
    notes: null,
    createdAt: now,
    updatedAt: now,
  }, source);

  assert.equal(evidence.verificationStatus, "mock");
  assert.equal(evidence.sourceUrl, null);
  assert.equal(evidence.evidenceReference, "mock-ref");
});

test("scholarship mapping retains the more restrictive source verification", () => {
  const source = mapOfficialSourceRow(sourceRow({ verificationStatus: "unverified" }));
  const scholarship = mapScholarshipRow({
    id: "grant-1",
    universityId: null,
    name: "Illustrative grant",
    summary: "Mock summary",
    eligibility: [],
    amount: { currency: null, minimum: null, maximum: null, display: null },
    deadline: null,
    academicYear: null,
    verificationStatus: "verified",
    sourceId: source.sourceId,
    metadata: {
      provider: "Illustrative provider",
      country: null,
      eligibleStudyLevels: [],
      eligibleNationalities: [],
      requiredDocuments: [],
      focusAreas: [],
      isMock: false,
    },
    createdAt: now,
    updatedAt: now,
  }, source);

  assert.equal(scholarship.verificationStatus, "unverified");
  assert.equal(scholarship.officialSource.verificationStatus, "unverified");
});

test("profile persistence requires an explicit stable id", () => {
  assert.throws(() => toStudentProfileInsert(emptyStudentProfile), /profile id is required/i);
  const record = toStudentProfileInsert(emptyStudentProfile, "profile-1", "user-1");
  assert.equal(record.id, "profile-1");
  assert.equal(record.userId, "user-1");
  assert.equal(record.profileData.id, "profile-1");
});

test("application mapping persists profile/university references and readiness without credentials", () => {
  const application = {
    id: "application-1",
    universitySlug: "north-harbor-university",
    universityName: "North Harbor University",
    program: "Environmental Science",
    intake: "Fall 2027",
    status: "In progress",
    readinessState: "NEEDS_REVIEW",
    progress: 0,
    deadline: null,
    tasks: [],
    source: mockSource("application-source", "Local application draft"),
  };
  const persisted = toApplicationInsert({
    application,
    profileId: "profile-1",
    universityId: "university-1",
    programId: "program-1",
  });

  assert.equal(persisted.studentProfileId, "profile-1");
  assert.equal(persisted.universityId, "university-1");
  assert.equal(persisted.readinessState, "NEEDS_REVIEW");
  assert.equal("password" in persisted, false);
  assert.equal("credentials" in persisted, false);
});

test("application field state and provenance are preserved and credential fields rejected", () => {
  const field = {
    id: "email",
    label: "Email",
    category: "contact",
    required: true,
    value: "student@example.edu",
    status: "USER_ENTERED",
    mappedFrom: "Student draft",
    provenance: {
      sourceId: "user-input",
      sourceUrl: null,
      sourceTitle: "Student-entered draft",
      sourceType: "user-entered",
      academicYear: null,
      lastVerified: null,
      evidenceReference: "field:email",
      notes: null,
    },
    validationState: "VALID",
    reviewState: "NOT_REVIEWED",
  };
  const persisted = toApplicationFieldInsert("application-1", field);

  assert.equal(persisted.status, "USER_ENTERED");
  assert.equal(persisted.provenance.evidenceReference, "field:email");
  assert.throws(() => toApplicationFieldInsert("application-1", { ...field, id: "portalPassword" }), /cannot be persisted/i);
});

test("application requirement mapping persistence retains category and evidence status", () => {
  const row = toApplicationRequirementMappingInsert("application-1", {
    id: "requirement-1",
    topic: "admission_requirement",
    label: "Academic record",
    description: "Verified requirement text",
    fieldId: "academicQualifications",
    category: "academics",
    required: true,
    decision: "unknown",
    evidenceStatus: "VERIFIED",
    provenance: {
      sourceId: "source-1",
      sourceUrl: "https://university.example/admissions",
      sourceTitle: "Official admissions page",
      sourceType: "official-website",
      academicYear: "2027/28",
      lastVerified: "2026-09-29T12:00:00.000Z",
      evidenceReference: "academic:required",
      notes: null,
    },
  });

  assert.equal(row.category, "academics");
  assert.equal(row.evidenceStatus, "VERIFIED");
  assert.equal(row.provenance.evidenceReference, "academic:required");
});

test("document persistence cannot promote an unresolved requirement to REQUIRED", () => {
  const document = {
    id: "transcript",
    label: "Transcript",
    required: true,
    prepared: false,
    status: "NEEDS_REVIEW",
    requirementStatus: "NEEDS_REVIEW",
    provenance: { sourceId: "source-1", sourceUrl: null, sourceTitle: "Mock source record", sourceType: "mock", academicYear: null, lastVerified: null, evidenceReference: "doc-ref", notes: null },
  };
  const persisted = toApplicationDocumentInsert("application-1", document, "NEEDS_REVIEW");

  assert.equal(persisted.required, false);
  assert.equal(persisted.requirementStatus, "NEEDS_REVIEW");
  assert.equal(persisted.status, "NEEDS_REVIEW");
  assert.equal(persisted.provenance.evidenceReference, "doc-ref");
});
