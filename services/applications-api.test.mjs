import assert from "node:assert/strict";
import test from "node:test";
import { emptyStudentProfile } from "../data/profile.ts";
import { createApplicationApiHandlers } from "./applications-api.ts";

function source(id) {
  return {
    sourceId: id,
    sourceType: "official",
    title: "University source",
    url: "https://example.edu",
    verificationStatus: "verified",
    lastVerified: "2026-09-01",
  };
}

function setup(identity) {
  const profiles = new Map([
    ["user-a", { ...emptyStudentProfile, id: "profile-a" }],
    ["user-b", { ...emptyStudentProfile, id: "profile-b" }],
  ]);
  const applications = new Map([
    ["application-a", { id: "application-a", profileId: "profile-a", universitySlug: "university-a", status: "Planning", deadline: null, tasks: [{ label: "Transcript", complete: false }], progress: 0 }],
    ["application-b", { id: "application-b", profileId: "profile-b", universitySlug: "university-b" }],
  ]);
  const calls = { created: null, updated: null };
  const applicationRepository = {
    async list() { throw new Error("Global application listing is forbidden"); },
    async listForProfile(profileId) {
      return [...applications.values()].filter((application) => application.profileId === profileId);
    },
    async findById() { throw new Error("Global application lookup is forbidden"); },
    async create(input) {
      calls.created = input;
      return input.application;
    },
    async updateForProfile(profileId, applicationId, input) {
      const application = applications.get(applicationId);
      if (!application || application.profileId !== profileId) return null;
      calls.updated = { profileId, applicationId, input };
      const updated = { ...application, ...input };
      if (input.tasks) updated.progress = Math.round((input.tasks.filter((task) => task.complete).length / input.tasks.length) * 100);
      applications.set(applicationId, updated);
      return updated;
    },
    async saveCopilotDraft() { throw new Error("Not supported"); },
  };
  const profileRepository = {
    async getCurrent() { throw new Error("Not supported"); },
    async getForUser(userId) { return profiles.get(userId) ?? null; },
    async upsertForUser() { throw new Error("Not supported"); },
  };
  const universityRepository = {
    async list() { return []; },
    async getBySlug(slug) {
      return {
        id: `university-id-${slug}`,
        slug,
        name: "University",
        programs: [],
        source: source(`source-${slug}`),
      };
    },
  };
  const handlers = createApplicationApiHandlers({
    async authenticate() { return identity; },
    async getRepositories() {
      return {
        dataSource: "DATABASE",
        applicationRepository,
        profileRepository,
        universityRepository,
      };
    },
  });
  return { handlers, calls };
}

function authenticated(user) {
  return {
    status: "authenticated",
    user: { id: user, email: `${user}@example.edu`, name: user },
  };
}

test("authenticated application listing is scoped to the session user's profile", async () => {
  const { handlers } = setup(authenticated("user-a"));
  const response = await handlers.GET(new Request("https://app.invalid/api/applications"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.dataSource, "DATABASE");
  assert.deepEqual(body.data.map((application) => application.id), ["application-a"]);
});

test("unauthenticated application listing is rejected", async () => {
  const { handlers } = setup({ status: "unauthenticated" });
  const response = await handlers.GET(new Request("https://app.invalid/api/applications"));
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("application creation derives profile ownership from the session", async () => {
  const { handlers, calls } = setup(authenticated("user-a"));
  const response = await handlers.POST(new Request("https://app.invalid/api/applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      universitySlug: "university-a",
      program: "BSc Example",
      intake: "Fall 2027",
      userId: "user-b",
      profileId: "profile-b",
    }),
  }));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls.created.profileId, "profile-a");
  assert.equal(calls.created.application.profileId, "profile-a");
  assert.notEqual(calls.created.application.id, "profile-b");
  assert.equal(body.data.profileId, "profile-a");
});

test("a user cannot receive another profile's applications", async () => {
  const { handlers } = setup(authenticated("user-a"));
  const response = await handlers.GET(new Request("https://app.invalid/api/applications"));
  const body = await response.json();

  assert.equal(body.data.some((application) => application.id === "application-b"), false);
});

test("authenticated users can update their own application state", async () => {
  const { handlers, calls } = setup(authenticated("user-a"));
  const response = await handlers.PATCH(new Request("https://app.invalid/api/applications/application-a", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "In progress", deadline: "2027-01-15", tasks: [{ label: "Transcript", complete: true }] }),
  }), "application-a");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(calls.updated.profileId, "profile-a");
  assert.equal(body.data.status, "In progress");
  assert.equal(body.data.deadline, "2027-01-15");
  assert.equal(body.data.progress, 100);
});

test("cross-user application updates are rejected", async () => {
  const { handlers, calls } = setup(authenticated("user-a"));
  const response = await handlers.PATCH(new Request("https://app.invalid/api/applications/application-b", {
    method: "PATCH",
    body: JSON.stringify({ status: "Submitted" }),
  }), "application-b");
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "APPLICATION_NOT_FOUND");
  assert.equal(calls.updated, null);
});

test("invalid application update fields are rejected", async () => {
  const { handlers, calls } = setup(authenticated("user-a"));
  const response = await handlers.PATCH(new Request("https://app.invalid/api/applications/application-a", {
    method: "PATCH",
    body: JSON.stringify({ progress: 100, profileId: "profile-b" }),
  }), "application-a");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_APPLICATION_UPDATE");
  assert.equal(calls.updated, null);
});

test("invalid application deadlines are rejected", async () => {
  const { handlers, calls } = setup(authenticated("user-a"));
  const response = await handlers.PATCH(new Request("https://app.invalid/api/applications/application-a", {
    method: "PATCH",
    body: JSON.stringify({ deadline: "2027-02-31" }),
  }), "application-a");
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_APPLICATION_UPDATE");
  assert.equal(calls.updated, null);
});

test("unauthenticated application updates are rejected", async () => {
  const { handlers } = setup({ status: "unauthenticated" });
  const response = await handlers.PATCH(new Request("https://app.invalid/api/applications/application-a", {
    method: "PATCH",
    body: JSON.stringify({ status: "Submitted" }),
  }), "application-a");

  assert.equal(response.status, 401);
});
