import assert from "node:assert/strict";
import test from "node:test";
import { emptyStudentProfile } from "../data/profile.ts";
import { createProfileApiHandlers } from "./profile-api.ts";

function setup(identity) {
  const profiles = new Map([
    ["user-a", { ...emptyStudentProfile, id: "profile-a", fullName: "Student A" }],
    ["user-b", { ...emptyStudentProfile, id: "profile-b", fullName: "Student B" }],
  ]);
  let repositoryLookups = 0;
  const profileRepository = {
    async getCurrent() { throw new Error("Request requires an authenticated user."); },
    async getForUser(userId) { return profiles.get(userId) ?? null; },
    async upsertForUser(userId, profile) {
      const saved = { ...profile, id: profiles.get(userId)?.id ?? `profile-${userId}` };
      profiles.set(userId, saved);
      return saved;
    },
  };
  const handlers = createProfileApiHandlers({
    async authenticate() { return identity; },
    async getRepositories() {
      repositoryLookups += 1;
      return { dataSource: "DATABASE", profileRepository };
    },
  });
  return { handlers, profiles, getRepositoryLookups: () => repositoryLookups };
}

function authenticated(user) {
  return { status: "authenticated", user: { id: user, email: `${user}@example.edu`, name: user } };
}

test("profile GET returns only the authenticated user's profile", async () => {
  const { handlers } = setup(authenticated("user-a"));
  const response = await handlers.GET(new Request("https://app.invalid/api/profile"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "profile-a");
  assert.equal(body.data.fullName, "Student A");
  assert.equal(body.dataSource, "DATABASE");
});

test("unauthenticated GET and PUT are denied before profile storage is reached", async () => {
  const { handlers, getRepositoryLookups } = setup({ status: "unauthenticated" });
  const getResponse = await handlers.GET(new Request("https://app.invalid/api/profile"));
  const putResponse = await handlers.PUT(new Request("https://app.invalid/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ fullName: "Attacker" }),
  }));

  assert.equal(getResponse.status, 401);
  assert.equal(putResponse.status, 401);
  assert.equal(getRepositoryLookups(), 0);
});

test("unavailable authentication fails closed before profile storage is reached", async () => {
  const { handlers, getRepositoryLookups } = setup({ status: "unavailable" });
  const response = await handlers.GET(new Request("https://app.invalid/api/profile"));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, "AUTH_UNAVAILABLE");
  assert.equal(getRepositoryLookups(), 0);
});

test("a new account receives a genuinely empty profile response", async () => {
  const { handlers } = setup(authenticated("user-c"));
  const response = await handlers.GET(new Request("https://app.invalid/api/profile"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.resourceStatus, "empty");
  assert.equal(body.data.id, null);
  assert.equal(body.data.fullName, null);
  assert.deepEqual(body.data.citizenships, []);
});

test("profile PUT ignores attacker-supplied ownership and account fields", async () => {
  const { handlers, profiles } = setup(authenticated("user-a"));
  const response = await handlers.PUT(new Request("https://app.invalid/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      fullName: "Updated Student A",
      userId: "user-b",
      profileId: "profile-b",
      id: "profile-b",
      email: "attacker@example.edu",
      unrecognizedAdminField: true,
    }),
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.id, "profile-a");
  assert.equal(body.data.email, "user-a@example.edu");
  assert.equal(body.data.fullName, "Updated Student A");
  assert.equal("unrecognizedAdminField" in body.data, false);
  assert.equal(profiles.get("user-b").fullName, "Student B");
});

test("profile PUT rejects malformed nested school-year data", async () => {
  const { handlers, profiles } = setup(authenticated("user-a"));
  const response = await handlers.PUT(new Request("https://app.invalid/api/profile", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ schoolYears: [{ classLevel: "Class 9", subjects: [] }] }),
  }));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body.error.fields, ["schoolYears"]);
  assert.equal(profiles.get("user-a").schoolYears.length, 0);
});