import assert from "node:assert/strict";
import test from "node:test";
import { emptyStudentProfile } from "../data/profile.ts";
import { createAuthenticatedCopilotService } from "./authenticated-copilot.ts";

function setup() {
  const profileA = { ...emptyStudentProfile, id: "profile-a", fullName: "Student A" };
  const profileB = { ...emptyStudentProfile, id: "profile-b", fullName: "Student B" };
  const applicationA = { id: "application-a", profileId: "profile-a", universitySlug: "university-a" };
  const applicationB = { id: "application-b", profileId: "profile-b", universitySlug: "university-b" };
  const calls = { profiles: [], profileApplications: [], globalApplicationLookup: false, assessmentInput: null };
  const service = createAuthenticatedCopilotService({
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
      async saveCopilotDraft() { throw new Error("Not supported"); },
    },
    universityRepository: {
      async list() { return []; },
      async getBySlug(slug) { return { slug }; },
    },
    async assess(input) {
      calls.assessmentInput = input;
      return { marker: "assessment" };
    },
  });
  return { service, calls, profileA, applicationA };
}

test("authenticated copilot uses the session user's persisted profile and owned application", async () => {
  const { service, calls, profileA, applicationA } = setup();
  const result = await service.getAssessment("user-a", "application-a");

  assert.equal(result.status, "ready");
  assert.deepEqual(calls.profiles, ["user-a"]);
  assert.deepEqual(calls.profileApplications, ["profile-a"]);
  assert.equal(calls.assessmentInput.profile, profileA);
  assert.equal(calls.assessmentInput.application, applicationA);
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