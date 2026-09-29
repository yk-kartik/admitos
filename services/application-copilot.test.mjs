import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  createMockJevDecisionResponse,
  evaluateMockJevEvidence,
  evaluateApplicationJevDecision,
  evaluateApplicationReadiness,
  collectApplicationAnswerFacts,
  createApplicationWrittenAnswerDraft,
  validateApplicationFieldDrafts,
  mapEvidencePackToApplicationRequirements,
  mapVerifiedEvidenceToApplicationDocuments,
  mapProfileToApplicationFields,
} from "./application-copilot.ts";
import { createRepositoryEvidenceRetriever, identifyEvidenceTopics } from "./evidence-retriever.ts";
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
    name: "Test University",
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

function readiness({ fields = completeFields(), documents: docs = documents(), requirements = [], writtenAnswers = [], evidencePack, decision = "READY", evidence = [verifiedEvidence()], humanReviewed = true, now = fixedDecisionTime } = {}) {
  return evaluateApplicationReadiness({
    fields,
    documents: docs,
    requirements,
    writtenAnswers,
    decision,
    evidence,
    evidencePack,
    validationErrors: [],
    humanReviewed,
  }, now);
}

function evidencePackFor(evidence, topics = [...new Set(evidence.map((item) => item.topic))]) {
  return {
    query: { universitySlug: "test-university", topics, academicYear: "Fall 2027" },
    status: "READY",
    authoritative: true,
    evidence,
    reasons: [],
  };
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

test("exact profile values map to categorized fields with profile provenance", () => {
  const profile = {
    ...emptyProfile(),
    fullName: "Jordan Lee",
    dateOfBirth: "2007-04-12",
    email: "jordan@example.edu",
    phone: "+1 555 0100",
    address: "12 Lake Road",
    currentUniversity: "North Secondary School",
  };
  const fields = mapProfileToApplicationFields(profile);
  const dateOfBirth = fields.find((field) => field.id === "dateOfBirth");

  assert.equal(dateOfBirth.value, "2007-04-12");
  assert.equal(dateOfBirth.status, "AUTO_MAPPED");
  assert.equal(dateOfBirth.category, "identity");
  assert.equal(dateOfBirth.provenance.sourceType, "student-profile");
  assert.equal(fields.find((field) => field.id === "email").value, "jordan@example.edu");
  assert.equal(fields.find((field) => field.id === "email").category, "contact");
});

test("field validation state marks invalid user-entered values", () => {
  const fields = completeFields().map((field) => field.id === "email"
    ? { ...field, value: "not-an-email", status: "USER_ENTERED" }
    : field);
  const email = validateApplicationFieldDrafts(fields).find((field) => field.id === "email");

  assert.equal(email.status, "INVALID");
  assert.equal(email.validationState, "INVALID");
  assert.equal(email.reviewState, "REVIEW_REQUIRED");
});

test("multiple citizenship values are ambiguous and never selected automatically", () => {
  const fields = mapProfileToApplicationFields({ ...emptyProfile(), citizenships: ["Canada", "Ghana"] });
  const citizenship = fields.find((field) => field.id === "citizenship");

  assert.equal(citizenship.value, null);
  assert.equal(citizenship.status, "NEEDS_REVIEW");
  assert.equal(citizenship.reviewState, "REVIEW_REQUIRED");
});

test("conflicting academic results remain unresolved", () => {
  const fields = mapProfileToApplicationFields({
    ...emptyProfile(),
    grades: [
      { subject: "Mathematics", result: "A", scale: "A-F", academicYear: "2025" },
      { subject: "Mathematics", result: "B", scale: "A-F", academicYear: "2025" },
    ],
  });
  const academics = fields.find((field) => field.id === "academicQualifications");

  assert.equal(academics.value, null);
  assert.equal(academics.status, "NEEDS_REVIEW");
  assert.match(academics.reviewReason, /Conflicting results/);
});

test("verified requirements map to a target field without claiming satisfaction", () => {
  const evidence = { ...verifiedEvidence("academic-record", "Academic record: minimum qualification required"), isRequired: true };
  const [requirement] = mapEvidencePackToApplicationRequirements(evidencePackFor([evidence]), fixedDecisionTime);

  assert.equal(requirement.evidenceStatus, "VERIFIED");
  assert.equal(requirement.required, true);
  assert.equal(requirement.fieldId, "academicQualifications");
  assert.equal(requirement.decision, "unknown");
  assert.equal(requirement.provenance.sourceId, evidence.sourceId);
  assert.equal(requirement.provenance.evidenceReference, "academic-record");
});

test("mock requirements are not authoritative or marked required", () => {
  const mock = { ...verifiedEvidence("mock-claim"), sourceType: "mock", sourceUrl: null, lastVerified: null, verificationStatus: "mock", isRequired: true };
  const [requirement] = mapEvidencePackToApplicationRequirements(evidencePackFor([mock]), fixedDecisionTime);

  assert.equal(requirement.evidenceStatus, "NEEDS_REVIEW");
  assert.equal(requirement.required, null);
  assert.equal(requirement.decision, "unknown");
});

test("stale and conflicting requirements retain distinct review states", () => {
  const stale = { ...verifiedEvidence("stale-claim"), lastVerified: "2024-09-25", isRequired: true };
  const conflicting = { ...verifiedEvidence("conflicting-claim"), verificationStatus: "conflicting", isRequired: true };

  assert.equal(mapEvidencePackToApplicationRequirements(evidencePackFor([stale]), fixedDecisionTime)[0].evidenceStatus, "STALE");
  assert.equal(mapEvidencePackToApplicationRequirements(evidencePackFor([conflicting]), fixedDecisionTime)[0].evidenceStatus, "CONFLICTING");
});

test("missing requirement evidence is represented as UNKNOWN", () => {
  const pack = evidencePackFor([], ["admission_requirement", "required_documents"]);
  pack.status = "UNKNOWN";
  pack.authoritative = false;
  const requirements = mapEvidencePackToApplicationRequirements(pack, fixedDecisionTime);

  assert.deepEqual(requirements.map((item) => item.evidenceStatus), ["UNKNOWN", "UNKNOWN"]);
  assert.ok(requirements.every((item) => item.provenance === null && item.decision === "unknown"));
});

test("verified required documents begin MISSING and preserve complete source provenance", () => {
  const evidence = {
    ...verifiedEvidence("required-transcript", "Official transcript: Submit the record"),
    topic: "required_documents",
    isRequired: true,
  };
  const [document] = mapVerifiedEvidenceToApplicationDocuments([evidence], fixedDecisionTime);

  assert.equal(document.status, "MISSING");
  assert.equal(document.requirementStatus, "REQUIRED");
  assert.equal(document.required, true);
  assert.equal(document.provenance.sourceUrl, evidence.sourceUrl);
  assert.equal(document.provenance.academicYear, evidence.academicYear);
  assert.equal(document.provenance.lastVerified, evidence.lastVerified);
});

test("unavailable document evidence stays NOT_ESTABLISHED and blocks readiness", () => {
  const [document] = mapVerifiedEvidenceToApplicationDocuments([], fixedDecisionTime);

  assert.equal(document.status, "NOT_ESTABLISHED");
  assert.equal(document.requirementStatus, "NOT_ESTABLISHED");
  assert.equal(document.required, false);
  assert.equal(readiness({ documents: [document] }).state, "NEEDS_REVIEW");
});

test("unresolved required documents block readiness", () => {
  const result = readiness({ documents: documents(false) });

  assert.equal(result.status, "NOT_READY");
  assert.equal(result.state, "INCOMPLETE");
});

test("DRAFT and READY_FOR_SUBMISSION readiness states are deterministic", () => {
  const draft = evaluateApplicationReadiness({
    fields: [], documents: [], decision: "UNKNOWN", evidence: [], validationErrors: [], humanReviewed: false,
  }, fixedDecisionTime);
  const evidence = [verifiedEvidence()];
  const evidencePack = evidencePackFor(evidence);
  const requirements = [{
    id: "academic-record",
    topic: "admission_requirement",
    label: "Academic record",
    description: "Verified academic requirement",
    fieldId: "academicQualifications",
    category: "academics",
    required: true,
    decision: "satisfied",
    evidenceStatus: "VERIFIED",
    provenance: null,
  }];
  const ready = readiness({ evidence, evidencePack, requirements });
  const notReviewed = readiness({ evidence, evidencePack, requirements, humanReviewed: false });

  assert.equal(draft.state, "DRAFT");
  assert.equal(ready.state, "READY_FOR_SUBMISSION");
  assert.equal(notReviewed.state, "NEEDS_REVIEW");
});

test("unsatisfied or stale required requirement mappings cannot be ready", () => {
  const base = {
    id: "academic-record",
    topic: "admission_requirement",
    label: "Academic record",
    description: "Requirement comparison",
    fieldId: "academicQualifications",
    category: "academics",
    required: true,
    decision: "not_satisfied",
    evidenceStatus: "VERIFIED",
    provenance: null,
  };
  const unsatisfied = readiness({ requirements: [base] });
  const stale = readiness({ requirements: [{ ...base, decision: "satisfied", evidenceStatus: "STALE" }] });

  assert.equal(unsatisfied.state, "INCOMPLETE");
  assert.equal(stale.state, "NEEDS_REVIEW");
});

test("requirement satisfaction remaining unknown prevents final readiness", () => {
  const evidence = { ...verifiedEvidence("academic-record"), isRequired: true };
  const requirements = mapEvidencePackToApplicationRequirements(evidencePackFor([evidence]), fixedDecisionTime);
  const result = readiness({ requirements });

  assert.equal(result.status, "REVIEW_REQUIRED");
  assert.equal(result.state, "NEEDS_REVIEW");
  assert.ok(result.reasons.some((reason) => reason.includes("satisfaction is unknown")));
});

test("written answer draft uses only profile facts and explicit student notes", () => {
  const facts = collectApplicationAnswerFacts({ ...emptyProfile(), fullName: "Jordan Lee" }, "I volunteer at the city library.");
  const generatedText = facts.map((fact) => fact.value).join(" ");
  const draft = createApplicationWrittenAnswerDraft({
    prompt: "Draft an activity response",
    facts,
    generatedText,
  });

  assert.equal(draft.value, "Jordan Lee I volunteer at the city library.");
  assert.equal(draft.status, "AI_DRAFT");
  assert.equal(draft.reviewState, "REVIEW_REQUIRED");
  assert.equal(draft.provenance[0].sourceType, "student-profile");
  assert.equal(draft.provenance[1].sourceType, "user-entered");
});

test("written answer generation guard rejects invented facts", () => {
  const facts = collectApplicationAnswerFacts(emptyProfile(), "I tutor students at the community center.");
  const draft = createApplicationWrittenAnswerDraft({
    prompt: "Describe an activity",
    facts,
    generatedText: "I tutor students at the community center and won a national award.",
  });

  assert.equal(draft, null);
});

test("every generated written answer carries the review-required marker", () => {
  const facts = collectApplicationAnswerFacts(emptyProfile(), "I organize a weekly study group.");
  const draft = createApplicationWrittenAnswerDraft({
    prompt: "Describe an activity",
    facts,
    generatedText: facts.map((fact) => fact.value).join(" "),
  });

  assert.equal(draft.reviewLabel, "AI DRAFT — REVIEW REQUIRED");
  assert.equal(readiness({ writtenAnswers: [draft] }).state, "NEEDS_REVIEW");
});

test("JEV application decision applies deterministic completeness before evidence", () => {
  const missingFields = mapProfileToApplicationFields(emptyProfile());
  const incomplete = evaluateApplicationJevDecision({
    fields: missingFields,
    documents: [],
    evidence: [verifiedEvidence()],
  }, fixedDecisionTime);
  const completeButUnmatched = evaluateApplicationJevDecision({
    fields: completeFields(),
    documents: documents(true),
    evidence: [verifiedEvidence()],
    evidencePack: evidencePackFor([verifiedEvidence()]),
  }, fixedDecisionTime);

  assert.equal(incomplete.decision, "NOT_READY");
  assert.equal(completeButUnmatched.decision, "NEEDS_REVIEW");
});

test("portal preparation contract exposes no submission operation", async () => {
  const types = await readFile(new URL("../types/ai.ts", import.meta.url), "utf8");
  const admissions = await readFile(new URL("./admissions-ai.ts", import.meta.url), "utf8");
  const portalContract = types.match(/export interface ApplicationPortalAdapter \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(portalContract, /prepareDraft/);
  assert.doesNotMatch(portalContract, /\bsubmit\s*\(/);
  assert.doesNotMatch(admissions, /\.submit\s*\(/);
});

test("document checklist preserves provenance without promoting unverified claims", () => {
  const documents = mapVerifiedEvidenceToApplicationDocuments([
    { ...verifiedEvidence("required-transcript", "Academic transcript: Submit official records"), topic: "required_documents", isRequired: true },
    { ...verifiedEvidence("optional-portfolio", "Portfolio: Optional supporting material"), topic: "required_documents", isRequired: false },
    { ...verifiedEvidence("mock-document", "Passport: Provide identification"), topic: "required_documents", isRequired: true, verificationStatus: "mock", sourceType: "mock", sourceUrl: null, lastVerified: null, academicYear: null, evidenceReference: null },
    { ...verifiedEvidence("stale-document", "Reference letter: Submit a letter"), topic: "required_documents", isRequired: true, lastVerified: "2024-09-25" },
    { ...verifiedEvidence("admission-claim", "Academic records are required"), topic: "admission_requirement", isRequired: true },
  ], fixedDecisionTime);

  assert.deepEqual(documents.map(({ id, label, required, status, requirementStatus }) => ({
    id, label, required, status, requirementStatus,
  })), [
    { id: "official-requirement-1-required-transcript", label: "Academic transcript", required: true, status: "MISSING", requirementStatus: "REQUIRED" },
    { id: "official-requirement-1-optional-portfolio", label: "Portfolio", required: false, status: "OPTIONAL", requirementStatus: "OPTIONAL" },
    { id: "official-requirement-1-2", label: "Passport", required: false, status: "NEEDS_REVIEW", requirementStatus: "NEEDS_REVIEW" },
    { id: "official-requirement-1-stale-document", label: "Reference letter", required: false, status: "NEEDS_REVIEW", requirementStatus: "NEEDS_REVIEW" },
  ]);
  assert.equal(documents[0].provenance.sourceTitle, "Official admissions requirements");
  assert.equal(documents[0].provenance.evidenceReference, "required-transcript");
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

test("evidence packs preserve source provenance and mark matching verified evidence authoritative", async () => {
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(universityRecord()), {
    now: () => fixedDecisionTime,
  });
  const pack = await retriever.retrievePack(evidenceRequest().evidenceQuery);

  assert.equal(pack.status, "READY");
  assert.equal(pack.authoritative, true);
  assert.deepEqual(pack.reasons, []);
  assert.deepEqual(pack.evidence[0], {
    topic: "admission_requirement",
    sourceId: "source-admission-requirement",
    sourceUrl: "https://university.invalid/admissions",
    sourceTitle: "Official admissions requirements",
    sourceType: "institutional-page",
    academicYear: "2027/28",
    lastVerified: "2026-09-25",
    evidenceSnippet: "Academic records: Official secondary-school records are required. (required)",
    evidenceReference: "requirement:academic-record",
    isRequired: true,
    verificationStatus: "verified",
    sourceNotes: "Fixture used only in deterministic tests.",
    evidenceId: "requirement:academic-record:admission",
    universitySlug: "test-university",
    universityName: "Test University",
    programId: null,
    applicantType: null,
    freshnessStatus: "current",
  });
});

test("evidence packs require current-year evidence and flag stale or mismatched sources", async () => {
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
  const stalePack = await retriever.retrievePack(evidenceRequest().evidenceQuery);
  const currentUniversity = universityRecord([{
    id: "academic-record",
    title: "Academic records",
    detail: "Official secondary-school records are required.",
    required: true,
    source: sourceRecord(),
  }]);
  const currentRetriever = createRepositoryEvidenceRetriever(repositoryFor(currentUniversity), {
    now: () => fixedDecisionTime,
  });
  const wrongYearQuery = evidenceRequest().evidenceQuery;
  wrongYearQuery.academicYear = "Fall 2028";
  const wrongYearPack = await currentRetriever.retrievePack(wrongYearQuery);

  assert.equal(stalePack.status, "NEEDS_HUMAN_REVIEW");
  assert.equal(stalePack.authoritative, false);
  assert.equal(stalePack.evidence[0].freshnessStatus, "stale");
  assert.equal(wrongYearPack.status, "NEEDS_HUMAN_REVIEW");
  assert.equal(wrongYearPack.evidence[0].verificationStatus, "unverified");
  assert.equal(wrongYearPack.evidence[0].freshnessStatus, "unknown");
});

test("evidence packs filter explicit scope and review unresolved scoped evidence", async () => {
  const university = universityRecord([{
    id: "international-program-requirement",
    title: "Academic records",
    detail: "Official secondary-school records are required.",
    required: true,
    programId: "environmental-science-bsc",
    applicantType: "international",
    source: sourceRecord(),
  }]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const query = evidenceRequest().evidenceQuery;
  const unresolvedPack = await retriever.retrievePack(query);
  const matchingPack = await retriever.retrievePack({
    ...query,
    programId: "environmental-science-bsc",
    applicantType: "international",
  });
  const excludedPack = await retriever.retrievePack({
    ...query,
    programId: "another-program",
    applicantType: "international",
  });

  assert.equal(unresolvedPack.status, "NEEDS_HUMAN_REVIEW");
  assert.equal(unresolvedPack.evidence[0].applicantType, "international");
  assert.equal(matchingPack.status, "READY");
  assert.equal(matchingPack.evidence[0].programId, "environmental-science-bsc");
  assert.equal(excludedPack.status, "UNKNOWN");
  assert.deepEqual(excludedPack.evidence, []);
});

test("international-only requirement text is not returned as domestic evidence", async () => {
  const university = universityRecord([{
    id: "international-admission",
    title: "International applicant requirement",
    detail: "International applicants must provide a study permit.",
    required: true,
    source: sourceRecord(),
  }]);
  const retriever = createRepositoryEvidenceRetriever(repositoryFor(university), {
    now: () => fixedDecisionTime,
  });
  const query = { ...evidenceRequest().evidenceQuery, applicantType: "domestic" };
  const pack = await retriever.retrievePack(query);

  assert.equal(pack.status, "UNKNOWN");
  assert.deepEqual(pack.evidence, []);
});

test("question topics are inferred locally and ambiguous questions request broad evidence", () => {
  assert.deepEqual(identifyEvidenceTopics("What is the IELTS score and application deadline?"), [
    "english_language_requirement",
    "application_deadline",
  ]);
  assert.deepEqual(identifyEvidenceTopics("Can I get a scholarship as an international applicant?"), [
    "international_applicant_requirement",
    "scholarship_eligibility",
  ]);
  assert.deepEqual(identifyEvidenceTopics("Can I apply?"), [
    "admission_requirement",
    "english_language_requirement",
    "international_applicant_requirement",
    "required_documents",
    "application_deadline",
    "scholarship_eligibility",
    "program_availability",
  ]);
});
