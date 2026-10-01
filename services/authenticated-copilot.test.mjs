import assert from "node:assert/strict";
import test from "node:test";
import { emptyStudentProfile } from "../data/profile.ts";
import { createAuthenticatedCopilotService } from "./authenticated-copilot.ts";
import { createCopilotApiHandlers } from "./copilot-api.ts";

function setup(identity = { status: "authenticated", user: { id: "user-a", email: "user-a@example.edu", name: "user-a" } }, persistedDraft = null) {
  let storedDraft = persistedDraft;
  const profileA = { ...emptyStudentProfile, id: "profile-a", fullName: "Student A" };
  const profileB = { ...emptyStudentProfile, id: "profile-b", fullName: "Student B" };
  const applicationA = { id: "application-a", profileId: "profile-a", universitySlug: "university-a" };
  const applicationB = { id: "application-b", profileId: "profile-b", universitySlug: "university-b" };
  const calls = { profiles: [], profileApplications: [], universitySlugs: [], draftLookups: [], savedDraft: null, globalApplicationLookup: false, assessmentInput: null };
  const dependencies = {
    profileRepository: {
      async getCurrent() { throw new Error("Not supported"); },
      async getForUser(userId) {
        calls.profiles.push(userId);
        return userId === "user-a" ? profileA : userId === "user-b" ? profileB : null;
      },
      async upsertForUser() { throw new Error("Not supported"); },
    },
    applicationRepository: {
      async list() { throw new Error("Global application listing is forbidden here"); },
      async listForProfile(profileId) {
        calls.profileApplications.push(profileId);
        return profileId === "profile-a" ? [applicationA] : profileId === "profile-b" ? [applicationB] : [];
      },
      async findById() { calls.globalApplicationLookup = true; return applicationB; },
      async create() { throw new Error("Not supported"); },
      async getCopilotDraft(profileId, applicationId) {
        calls.draftLookups.push({ profileId, applicationId });
        return profileId === "profile-a" && applicationId === "application-a" ? storedDraft : null;
      },
      async saveCopilotDraft(profileId, applicationId, state) {
        if (profileId !== "profile-a" || applicationId !== "application-a") return false;
        calls.savedDraft = { profileId, applicationId, state };
        storedDraft = state;
        return true;
      },
    },
    universityRepository: {
      async list() { return []; },
      async getBySlug(slug) { calls.universitySlugs.push(slug); return { slug }; },
    },
    async assess(input) {
      calls.assessmentInput = input;
      return {
        marker: "assessment",
        fields: [],
        documents: [],
        requirements: [],
        writtenAnswers: [],
        readiness: { status: "NOT_READY", state: "DRAFT", reasons: [], unresolvedItems: [], humanReviewRequired: true },
      };
    },
  };
  const service = createAuthenticatedCopilotService(dependencies);
  const handlers = createCopilotApiHandlers({
    authenticate: async () => identity,
    getRepositories: async () => ({ dataSource: "DATABASE", ...dependencies }),
    assess: dependencies.assess,
  });
  return { service, handlers, calls, profileA, applicationA };
}

test("authenticated copilot uses the session user's persisted profile and owned application", async () => {
  const { service, calls, profileA, applicationA } = setup();
  const result = await service.getAssessment("user-a", "application-a");

  assert.equal(result.status, "ready");
  assert.deepEqual(calls.profiles, ["user-a"]);
  assert.deepEqual(calls.profileApplications, ["profile-a"]);
  assert.equal(calls.assessmentInput.profile, profileA);
  assert.equal(calls.assessmentInput.application, applicationA);
  assert.equal(result.input.profile, profileA);
  assert.equal(result.input.application, applicationA);
  assert.deepEqual(calls.universitySlugs, ["university-a"]);
  assert.deepEqual(calls.draftLookups, [{ profileId: "profile-a", applicationId: "application-a" }]);
  assert.equal(calls.globalApplicationLookup, false);
});

test("an application id owned by another profile is indistinguishable from missing", async () => {
  const { service, calls } = setup();
  const result = await service.getAssessment("user-a", "application-b");

  assert.deepEqual(result, { status: "application-not-found" });
  assert.equal(calls.assessmentInput, null);
  assert.equal(calls.globalApplicationLookup, false);
});

test("copilot does not fall back when the authenticated user has no persisted profile", async () => {
  const { service, calls } = setup();
  const result = await service.getAssessment("user-c", "application-a");

  assert.deepEqual(result, { status: "profile-not-found" });
  assert.deepEqual(calls.profileApplications, []);
  assert.equal(calls.assessmentInput, null);
});

test("authenticated copilot hydrates a persisted written answer and readiness state", async () => {
  const persistedDraft = {
    fields: [],
    documents: [],
    requirements: [],
    writtenAnswers: [{ id: "answer-1", label: "Written answer", category: "writtenResponses", prompt: "Describe your goals", value: "Saved answer", status: "USER_ENTERED", reviewState: "REVIEWED", reviewLabel: "AI DRAFT — REVIEW REQUIRED", provenance: [] }],
    readinessState: "NEEDS_REVIEW",
    humanReviewed: false,
  };
  const { service } = setup(undefined, persistedDraft);
  const result = await service.getAssessment("user-a", "application-a");

  assert.equal(result.status, "ready");
  assert.equal(result.assessment.writtenAnswers[0].value, "Saved answer");
  assert.equal(result.assessment.writtenAnswers[0].reviewState, "REVIEWED");
  assert.equal(result.assessment.readiness.state, "NEEDS_REVIEW");
});

test("authenticated users can save an owned copilot draft", async () => {
  const { service, calls } = setup();
  const draft = { fields: [], documents: [], requirements: [], writtenAnswers: [], readinessState: "DRAFT", humanReviewed: false };
  const result = await service.saveDraft("user-a", "application-a", draft);

  assert.deepEqual(result, { status: "saved" });
  assert.equal(calls.savedDraft.profileId, "profile-a");
  assert.equal(calls.savedDraft.applicationId, "application-a");
});

test("saved copilot written answer and readiness survive a later assessment load", async () => {
  const { service } = setup();
  const draft = {
    fields: [],
    documents: [],
    requirements: [],
    writtenAnswers: [{ id: "answer-1", label: "Written answer", category: "writtenResponses", prompt: "Describe your goals", value: "Round-trip answer", status: "USER_ENTERED", reviewState: "REVIEWED", reviewLabel: "REVIEWED", provenance: [] }],
    readinessState: "NEEDS_REVIEW",
    humanReviewed: false,
  };
  await service.saveDraft("user-a", "application-a", draft);
  const loaded = await service.getAssessment("user-a", "application-a");

  assert.equal(loaded.status, "ready");
  assert.equal(loaded.assessment.writtenAnswers[0].value, "Round-trip answer");
  assert.equal(loaded.assessment.writtenAnswers[0].reviewState, "REVIEWED");
  assert.equal(loaded.assessment.readiness.state, "NEEDS_REVIEW");
});

test("cross-user copilot draft saves are rejected", async () => {
  const { service, calls } = setup();
  const draft = { fields: [], documents: [], requirements: [], writtenAnswers: [], readinessState: "DRAFT", humanReviewed: false };
  const result = await service.saveDraft("user-a", "application-b", draft);

  assert.deepEqual(result, { status: "application-not-found" });
  assert.equal(calls.savedDraft, null);
});

test("unauthenticated copilot API requests are rejected", async () => {
  const { handlers } = setup({ status: "unauthenticated" });
  const response = await handlers.GET(new Request("https://app.invalid/api/applications/application-a"), "application-a");
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("copilot API treats missing and cross-user applications as not found", async () => {
  const { handlers } = setup();
  const missing = await handlers.GET(new Request("https://app.invalid/api/applications/missing"), "missing");
  const crossUser = await handlers.GET(new Request("https://app.invalid/api/applications/application-b"), "application-b");

  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, "APPLICATION_NOT_FOUND");
  assert.equal(crossUser.status, 404);
  assert.equal((await crossUser.json()).error.code, "APPLICATION_NOT_FOUND");
});

test("copilot API returns the owned application input and assessment", async () => {
  const { handlers } = setup();
  const response = await handlers.GET(new Request("https://app.invalid/api/applications/application-a"), "application-a");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.dataSource, "DATABASE");
  assert.equal(body.data.applicationId, "application-a");
  assert.equal(body.data.input.application.id, "application-a");
  assert.equal(body.data.assessment.marker, "assessment");
});

test("unauthenticated copilot draft saves are rejected", async () => {
  const { handlers } = setup({ status: "unauthenticated" });
  const response = await handlers.PUT(new Request("https://app.invalid/api/applications/application-a", {
    method: "PUT",
    body: JSON.stringify({ fields: [], documents: [], requirements: [], writtenAnswers: [], readinessState: "DRAFT", humanReviewed: false }),
  }), "application-a");

  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, "UNAUTHENTICATED");
});

test("cross-user copilot draft API saves are rejected", async () => {
  const { handlers, calls } = setup();
  const response = await handlers.PUT(new Request("https://app.invalid/api/applications/application-b", {
    method: "PUT",
    body: JSON.stringify({ fields: [], documents: [], requirements: [], writtenAnswers: [], readinessState: "DRAFT", humanReviewed: false }),
  }), "application-b");

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, "APPLICATION_NOT_FOUND");
  assert.equal(calls.savedDraft, null);
});