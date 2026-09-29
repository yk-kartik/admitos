import assert from "node:assert/strict";
import test from "node:test";
import { emptyStudentProfile } from "../data/profile.ts";
import { createProfileAccessService } from "./profile-access.ts";
import { calculateProfileCompletion, getIncompleteProfileSections } from "../utils/profile.ts";

function createProfileRepository(initialProfiles = new Map()) {
  const profiles = new Map(initialProfiles);
  return {
    profiles,
    async getCurrent() {
      throw new Error("An authenticated user is required.");
    },
    async getForUser(userId) {
      return profiles.get(userId) ?? null;
    },
    async upsertForUser(userId, profile) {
      const existing = profiles.get(userId);
      const saved = { ...profile, id: existing?.id ?? `profile-${userId}` };
      profiles.set(userId, saved);
      return saved;
    },
  };
}

test("profile access returns only the profile owned by the requested user", async () => {
  const repository = createProfileRepository(new Map([
    ["user-a", { ...emptyStudentProfile, id: "profile-a", fullName: "A Student" }],
    ["user-b", { ...emptyStudentProfile, id: "profile-b", fullName: "B Student" }],
  ]));
  const service = createProfileAccessService(repository);

  assert.equal((await service.get("user-a", "a@example.edu")).fullName, "A Student");
  assert.equal((await service.get("user-b", "b@example.edu")).fullName, "B Student");
  assert.equal((await service.get("user-c", "c@example.edu")).id, null);
});

test("client-supplied ownership and profile identifiers cannot override session identity", async () => {
  const repository = createProfileRepository(new Map([
    ["user-a", { ...emptyStudentProfile, id: "profile-a", fullName: "A Student" }],
    ["user-b", { ...emptyStudentProfile, id: "profile-b", fullName: "B Student" }],
  ]));
  const service = createProfileAccessService(repository);

  const result = await service.update("user-a", "a@example.edu", {
    id: "profile-b",
    profileId: "profile-b",
    userId: "user-b",
    fullName: "Updated A Student",
  });

  assert.equal(result.status, "valid");
  assert.equal(result.profile.id, "profile-a");
  assert.equal(result.profile.email, "a@example.edu");
  assert.equal(repository.profiles.get("user-a").fullName, "Updated A Student");
  assert.equal(repository.profiles.get("user-b").fullName, "B Student");
});

test("profile updates reject invalid values without changing persisted data", async () => {
  const repository = createProfileRepository();
  const service = createProfileAccessService(repository);

  const result = await service.update("user-a", "a@example.edu", { cgpa: -1, citizenships: "not a list" });

  assert.deepEqual(result, { status: "invalid", fields: ["citizenships", "cgpa"] });
  assert.equal(repository.profiles.has("user-a"), false);
});

test("school-year records are validated and persisted as structured academic data", async () => {
  const repository = createProfileRepository();
  const service = createProfileAccessService(repository);
  const result = await service.update("user-a", "a@example.edu", {
    schoolYears: [{
      classLevel: "Class 12",
      institution: "North School",
      academicYear: "2025-2026",
      marks: 92,
      totalMarks: 100,
      subjects: [{ subject: "Math", result: "A", scale: "A-F", academicYear: "2025-2026" }],
    }],
  });

  assert.equal(result.status, "valid");
  assert.equal(repository.profiles.get("user-a").schoolYears[0].subjects[0].subject, "Math");
  const invalid = await service.update("user-a", "a@example.edu", { schoolYears: [{ classLevel: "Class 9", subjects: [] }] });
  assert.deepEqual(invalid, { status: "invalid", fields: ["schoolYears"] });
});

test("profile completion is deterministic and based on completed sections", () => {
  const empty = { ...emptyStudentProfile };
  const partial = { ...empty, fullName: "A Student", dateOfBirth: "2007-01-01" };

  assert.equal(calculateProfileCompletion(empty), 0);
  assert.equal(calculateProfileCompletion(partial), 8);
  assert.equal(calculateProfileCompletion(partial), calculateProfileCompletion(partial));
  assert.deepEqual(getIncompleteProfileSections(empty).slice(0, 2), ["Personal details", "Citizenship"]);
});