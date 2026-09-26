import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateMockJevEvidence,
  evaluateApplicationReadiness,
  mapProfileToApplicationFields,
} from "./application-copilot.ts";

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
    sourceId: "official-requirement-1",
    sourceUrl: "https://example.edu/admissions",
    sourceTitle: "Official admissions requirements",
    sourceType: "official-website",
    academicYear: "2027/28",
    lastVerified: "2026-09-26",
    evidenceSnippet: snippet,
    evidenceReference: reference,
    verificationStatus: "verified",
  };
}

function documents(prepared = true) {
  return [{ id: "transcript", label: "Academic transcript", required: true, prepared }];
}

function readiness({ fields = completeFields(), documents: docs = documents(), decision = "READY", evidence = [verifiedEvidence()], humanReviewed = true }) {
  return evaluateApplicationReadiness({
    fields,
    documents: docs,
    decision,
    evidence,
    validationErrors: [],
    humanReviewed,
  });
}

test("complete fields, requirements, verified evidence, and review can reach ready", () => {
  assert.equal(evaluateMockJevEvidence("application_readiness", [verifiedEvidence()]).decision, "READY");
  assert.equal(readiness({}).status, "READY_FOR_SUBMISSION");
});

test("a missing required profile field blocks readiness", () => {
  const fields = mapProfileToApplicationFields(emptyProfile());
  assert.equal(readiness({ fields }).status, "NOT_READY");
});

test("missing evidence keeps the decision unknown and requires review", () => {
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
