import assert from "node:assert/strict";
import test from "node:test";
import {
  createMockJevDecisionResponse,
  evaluateMockJevEvidence,
  evaluateApplicationReadiness,
  mapVerifiedEvidenceToApplicationDocuments,
  mapProfileToApplicationFields,
} from "./application-copilot.ts";
import { createRepositoryEvidenceRetriever } from "./evidence-retriever.ts";
import { universities } from "../data/universities.ts";

function emptyProfile() {
  return {
    id: null,
    fullName: null,
    preferredName: null,
    citizenships: [],
    currentLocation: null,
    intendedStudyLevel: null,
    intendedIntake: null,
    academicBackground: null,
    currentUniversity: null,
    degreeProgram: null,
    grades: [],
    testScores: [],
    englishQualifications: [],
    extracurricularActivities: [],
    projects: [],
    research: [],
    leadership: [],
    financialConstraints: null,
    targetCountries: [],
    targetUniversities: [],
    intendedStudyAreas: [],
    languages: [],
    isMock: false,
  };
}

function completeFields() {
  return mapProfileToApplicationFields(emptyProfile()).map((field) => ({
    ...field,
    value: field.id === "email" ? "student@example.edu" : field.id === "graduationYear" ? "2027" : "Student-provided value",
    status: "STUDENT_PROVIDED",
    mappedFrom: "Student draft",
  }));
}

function verifiedEvidence(reference = "admission-requirement", snippet = "Verified requirement text") {
  return {
    topic: "admission_requirement",
    sourceId: "official-requirement-1",
    sourceUrl: "https://university.invalid/admissions",
    sourceTitle: "Official admissions requirements",
    sourceType: "official-website",
    academicYear: "2027/28",
    lastVerified: "2026-09-26",
    evidenceSnippet: snippet,
    evidenceReference: reference,
    verificationStatus: "verified",
    sourceNotes: null,
  };
}

const fixedDecisionTime = new Date("2026-09-26T12:00:00.000Z");

function sourceRecord(overrides = {}) {
  return {
    sourceId: "source-admission-requirement",
    sourceTitle: "Official admissions requirements",
    sourceType: "institutional-page",
    sourceUrl: "https://university.invalid/admissions",
    academicYear: "2027/28",
    lastVerified: "2026-09-25",
    evidenceReference: "requirement:academic-record",
    verificationStatus: "verified",
    notes: "Fixture used only in deterministic tests.",
    ...overrides,
  };
}

function universityRecord(requirements = [{
  id: "academic-record",
  title: "Academic records",
  detail: "Official secondary-school records are required.",
  required: true,
  source: sourceRecord(),
}]) {
  return {
    slug: "test-university",
    requirements,
    deadlines: [],
    scholarships: [],
    programs: [],
  };
}

function evidenceRequest(universitySlug = "test-university") {
  return {
    requestId: "test-application",
    question: {
      id: "admission-check",
      domain: "application_readiness",
      type: "choice",
      prompt: "Check source-backed application requirements",
    },
    input: { applicationId: "test-application" },
    evidenceQuery: {
      universitySlug,
      topics: ["admission_requirement"],
      academicYear: "Fall 2027",
    },
    evidence: [],
    requestedAt: fixedDecisionTime.toISOString(),
  };
}

function repositoryFor(university) {
  return {
    async list() { return university ? [university] : []; },
    async getBySlug(slug) { return university?.slug === slug ? university : null; },
  };
}

function documents(prepared = true) {
  return [{ id: "transcript", label: "Academic transcript", required: true, prepared }];
}

function readiness({ fields = completeFields(), documents: docs = documents(), decision = "READY", evidence = [verifiedEvidence()], humanReviewed = true, now = fixedDecisionTime }) {
  return evaluateApplicationReadiness({
    fields,
    documents: docs,
    decision,
    evidence,
    validationErrors: [],
    humanReviewed,
  }, now);
}

test("verified evidence is available to JEV but cannot imply readiness without a matching rule", () => {
  const evaluation = evaluateMockJevEvidence("application_readiness", [verifiedEvidence()], fixedDecisionTime);
  assert.equal(evaluation.decision, "NEEDS_REVIEW");
  assert.ok(evaluation.reason.includes("no deterministic rule"));
  assert.equal(readiness({ decision: evaluation.decision }).status, "REVIEW_REQUIRED");
});

test("a missing required profile field blocks readiness", () => {
  const fields = mapProfileToApplicationFields(emptyProfile());
  assert.equal(readiness({ fields }).status, "NOT_READY");
});

test("Copilot keeps unavailable evidence unknown and requires review", () => {
  assert.equal(evaluateMockJevEvidence("application_readiness", []).decision, "UNKNOWN");
  const result = readiness({ decision: "UNKNOWN", evidence: [] });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.ok(result.reasons.some((reason) => reason.includes("No evidence")));
});

test("conflicting evidence requires review", () => {
  const evidence = [verifiedEvidence("same-claim", "Minimum score is 6"), verifiedEvidence("same-claim", "Minimum score is 7")];
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence).decision, "NEEDS_REVIEW");
  const result = readiness({
    decision: "NEEDS_REVIEW",
    evidence,
  });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.ok(result.reasons.some((reason) => reason.includes("Conflicting evidence")));
});

test("mock provenance cannot be treated as verified evidence", () => {
  const mock = {
    ...verifiedEvidence(),
    sourceUrl: null,
    lastVerified: null,
    sourceType: "mock",
    verificationStatus: "mock",
  };
  assert.equal(evaluateMockJevEvidence("application_readiness", [mock]).decision, "NEEDS_REVIEW");
});

test("profile mapping never fills absent values", () => {
  const mapped = mapProfileToApplicationFields(emptyProfile());
  assert.ok(mapped.every((field) => field.value === null && field.status === "MISSING"));
});

test("only verified retrieved document evidence enters the application checklist", () => {
  const documents = mapVerifiedEvidenceToApplicationDocuments([
    { ...verifiedEvidence("required-transcript", "Academic transcript: Submit official records"), topic: "required_documents", isRequired: true },
    { ...verifiedEvidence("optional-portfolio", "Portfolio: Optional supporting material"), topic: "required_documents", isRequired: false },
    { ...verifiedEvidence("mock-document", "Passport: Provide identification"), topic: "required_documents", isRequired: true, verificationStatus: "mock", sourceType: "mock", sourceUrl: null, lastVerified: null, academicYear: null, evidenceReference: null },
    { ...verifiedEvidence("stale-document", "Reference letter: Submit a letter"), topic: "required_documents", isRequired: true, lastVerified: "2024-09-25" },
    { ...verifiedEvidence("admission-claim", "Academic records are required"), topic: "admission_requirement", isRequired: true },
  ], fixedDecisionTime);

  assert.deepEqual(documents, [
    { id: "official-requirement-1-required-transcript", label: "Academic transcript", required: true, prepared: false },
    { id: "official-requirement-1-optional-portfolio", label: "Portfolio", required: false, prepared: false },
  ]);
});

test("verified repository evidence can be evaluated by the mock JEV", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(universityRecord()), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest());

  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].verificationStatus, "verified");
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
});

test("mock repository evidence is never authoritative", async () => {
  const mockUniversity = universityRecord([{
    id: "academic-record",
    title: "Academic records",
    detail: "Illustrative requirement only.",
    required: true,
    source: sourceRecord({
      sourceType: "mock",
      sourceUrl: null,
      academicYear: null,
      lastVerified: null,
      evidenceReference: null,
      verificationStatus: "mock",
    }),
  }]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(mockUniversity), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest());

  assert.equal(evidence[0].verificationStatus, "mock");
  assert.equal(evidence[0].sourceUrl, null);
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
});

test("unverified repository evidence requires review", async () => {
  const university = universityRecord([{
    id: "academic-record",
    title: "Academic records",
    detail: "Requirement awaits official confirmation.",
    required: true,
    source: sourceRecord({ verificationStatus: "unverified" }),
  }]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest());

  assert.equal(evidence[0].verificationStatus, "unverified");
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
});

test("invalid source URLs cannot support verified evidence", async () => {
  const university = universityRecord([{
    id: "academic-record",
    title: "Academic records",
    detail: "Official secondary-school records are required.",
    required: true,
    source: sourceRecord({ sourceUrl: "javascript:alert(1)" }),
  }]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest());

  assert.equal(evidence[0].verificationStatus, "unverified");
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
});

test("unknown or mismatched application year keeps evidence non-authoritative", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(universityRecord()), {
    now: () => fixedDecisionTime,
  });
  const unknownYearRequest = evidenceRequest();
  unknownYearRequest.evidenceQuery.academicYear = null;
  const unknownYearEvidence = await retriever.retrieve(unknownYearRequest);
  const mismatchedYearRequest = evidenceRequest();
  mismatchedYearRequest.evidenceQuery.academicYear = "Fall 2028";
  const mismatchedYearEvidence = await retriever.retrieve(mismatchedYearRequest);

  assert.equal(unknownYearEvidence[0].verificationStatus, "unverified");
  assert.equal(mismatchedYearEvidence[0].verificationStatus, "unverified");
  assert.equal(mismatchedYearEvidence[0].academicYear, "2027/28");
  assert.equal(evaluateMockJevEvidence("application_readiness", mismatchedYearEvidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
});

test("different academic-year cycles with the same start year do not match", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(universityRecord()), {
    now: () => fixedDecisionTime,
  });
  const request = evidenceRequest();
  request.evidenceQuery.academicYear = "2027/29";
  const evidence = await retriever.retrieve(request);

  assert.equal(evidence[0].verificationStatus, "unverified");
  assert.ok(evidence[0].sourceNotes.includes("does not match"));
});

test("missing repository evidence returns UNKNOWN", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(null), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest("not-in-repository"));

  assert.deepEqual(evidence, []);
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "UNKNOWN");
});

test("conflicting repository claims are marked and require review", async () => {
  const duplicateSource = sourceRecord();
  const university = universityRecord([
    {
      id: "minimum-grade-a",
      title: "Minimum grade",
      detail: "A minimum average of 70 is required.",
      required: true,
      source: duplicateSource,
    },
    {
      id: "minimum-grade-b",
      title: "Minimum grade",
      detail: "A minimum average of 80 is required.",
      required: true,
      source: duplicateSource,
    },
  ]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest());

  assert.ok(evidence.every((item) => item.verificationStatus === "conflicting"));
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
});

test("old verified evidence is marked STALE and cannot support a decision", async () => {
  const university = universityRecord([{
    id: "academic-record",
    title: "Academic records",
    detail: "Official secondary-school records are required.",
    required: true,
    source: sourceRecord({ lastVerified: "2024-09-25" }),
  }]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const evidence = await retriever.retrieve(evidenceRequest());

  assert.equal(evidence[0].verificationStatus, "stale");
  assert.equal(evaluateMockJevEvidence("application_readiness", evidence, fixedDecisionTime).decision, "NEEDS_REVIEW");
  const result = readiness({ decision: "NEEDS_REVIEW", evidence, now: fixedDecisionTime });
  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.ok(result.reasons.some((reason) => reason.includes("stale")));
});

test("decision response retains evidence provenance and timestamp", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(universityRecord()), {
    now: () => fixedDecisionTime,
  });
  const request = evidenceRequest();
  const evidence = await retriever.retrieve(request);
  const response = createMockJevDecisionResponse({ ...request, evidence }, fixedDecisionTime);

  assert.equal(response.evidence[0].sourceId, "source-admission-requirement");
  assert.equal(response.evidence[0].sourceUrl, "https://university.invalid/admissions");
  assert.equal(response.evidence[0].sourceTitle, "Official admissions requirements");
  assert.equal(response.evidence[0].sourceType, "institutional-page");
  assert.equal(response.evidence[0].academicYear, "2027/28");
  assert.equal(response.evidence[0].lastVerified, "2026-09-25");
  assert.equal(response.evidence[0].verificationStatus, "verified");
  assert.equal(response.evidence[0].evidenceReference, "requirement:academic-record");
  assert.equal(response.evidence[0].sourceNotes, "Fixture used only in deterministic tests.");
  assert.equal(response.decisionTimestamp, fixedDecisionTime.toISOString());
});

test("an unknown university produces no invented source or evidence", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(null), {
    now: () => fixedDecisionTime,
  });

  assert.deepEqual(await retriever.retrieve(evidenceRequest("unknown-university")), []);
});

test("university seeds expose mock profiles without fabricated admissions facts", () => {
  assert.equal(universities.length, 3);
  for (const university of universities) {
    assert.equal(university.source.verificationStatus, "mock");
    assert.equal(university.source.sourceUrl, null);
    assert.equal(university.source.academicYear, null);
    assert.equal(university.studentCount.value, null);
    assert.equal(university.requirements.length, 0);
    assert.equal(university.deadlines.length, 0);
    assert.equal(university.scholarships.length, 0);
    assert.ok(university.programs.every((program) => program.source.verificationStatus === "mock"));
    assert.ok(university.contacts.every((contact) =>
      contact.contactName === null && contact.email === null && contact.phone === null && contact.contactUrl === null,
    ));
    assert.ok(university.officialSources.every((source) => source.sourceUrl === null));
  }
});

test("retriever supports all configured admissions evidence topics", async () => {
  const requirements = [
    ["academic", "Academic qualification", "A relevant qualification is required."],
    ["english", "English language", "English test evidence is required."],
    ["documents", "Required documents", "Submit an academic transcript."],
    ["international", "International applicant requirement", "International applicants must provide a study permit."],
  ].map(([id, title, detail]) => ({
    id,
    title,
    detail,
    required: true,
    source: sourceRecord({ sourceId: `source-${id}`, evidenceReference: `claim-${id}` }),
  }));
  const programSource = sourceRecord({ sourceId: "source-program", evidenceReference: "claim-program" });
  const deadlineSource = sourceRecord({ sourceId: "source-deadline", evidenceReference: "claim-deadline" });
  const scholarshipSource = sourceRecord({ sourceId: "source-scholarship", evidenceReference: "claim-scholarship" });
  const university = {
    ...universityRecord(requirements),
    programs: [{
      id: "program-test",
      name: "Environmental Science",
      credential: "BSc",
      studyMode: "On campus",
      duration: "4 years",
      annualTuition: "Not provided",
      language: "Not provided",
      source: programSource,
    }],
    deadlines: [{
      id: "deadline-test",
      label: "Priority application",
      date: "2027-01-15",
      intake: "Fall 2027",
      academicYear: "2027/28",
      isIllustrative: false,
      source: deadlineSource,
    }],
    scholarships: [{
      id: "scholarship-test",
      name: "Need-based aid",
      provider: "Test university",
      country: null,
      summary: "Eligibility conditions are published.",
      eligibleStudyLevels: [],
      eligibleNationalities: [],
      amount: { currency: null, minimum: null, maximum: null, display: null },
      deadline: null,
      academicYear: "2027/28",
      eligibilityCriteria: ["International applicants"],
      requiredDocuments: [],
      focusAreas: [],
      officialSource: scholarshipSource,
      sources: [scholarshipSource],
      verificationStatus: "verified",
      lastVerified: "2026-09-25",
      isMock: false,
    }],
  };
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const request = evidenceRequest();
  request.evidenceQuery.topics = [
    "admission_requirement",
    "english_language_requirement",
    "application_deadline",
    "scholarship_eligibility",
    "program_availability",
    "required_documents",
    "international_applicant_requirement",
  ];
  const evidence = await retriever.retrieve(request);

  assert.deepEqual(new Set(evidence.map((item) => item.topic)), new Set(request.evidenceQuery.topics));
  assert.ok(evidence.every((item) => item.verificationStatus === "verified"));
  assert.equal(evidence.find((item) => item.topic === "required_documents").isRequired, true);

  university.scholarships[0].isMock = true;
  const mockScholarshipEvidence = await createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  }).retrieve(request);
  assert.equal(
    mockScholarshipEvidence.find((item) => item.topic === "scholarship_eligibility").verificationStatus,
    "mock",
  );
});
