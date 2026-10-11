import assert from "node:assert/strict";
import test from "node:test";
import { createAdvisorApiHandlers } from "./advisor-api.ts";
import { GeminiConfigurationError, GeminiProviderError, GeminiTimeoutError } from "./gemini-provider.ts";

const source = {
  sourceId: "official-admissions",
  sourceTitle: "Official admissions page",
  sourceType: "institutional-page",
  sourceUrl: "https://example.edu/admissions",
  academicYear: "2027/28",
  lastVerified: "2026-09-01",
  evidenceReference: "requirements:academic-record",
  verificationStatus: "verified",
  notes: null,
};

const university = {
  slug: "example-university",
  name: "Example University",
  requirements: [{ id: "academic-record", title: "Academic record", detail: "A transcript is required.", required: true, source }],
  deadlines: [],
  scholarships: [],
  programs: [],
};

function handler({ authenticate = async () => ({ status: "authenticated", user: { id: "user-1" } }), generate = async () => ({ text: "Based only on the supplied evidence.", generatedAt: "", modelLabel: "test" }) } = {}) {
  return createAdvisorApiHandlers({
    authenticate,
    getRepositories: async () => ({
      dataSource: "DATABASE",
      profileRepository: { async getForUser() { return { id: "profile-1" }; } },
      universityRepository: {
        async list() { return [university]; },
        async getBySlug(slug) { return slug === university.slug ? university : null; },
      },
    }),
    generativeModel: { generate },
  });
}

async function post(value, options) {
  return handler(options).POST(new Request("http://localhost/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof value === "string" ? value : JSON.stringify(value),
  }));
}

test("advisor returns an evidence-bound Gemini explanation", async () => {
  const response = await post({ question: "What academic record is required?", universitySlug: university.slug, academicYear: "2027/28" });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.answer, "Based only on the supplied evidence.");
  assert.equal(body.data.limited, false);
  assert.equal(body.data.citations[0].evidenceReference, source.evidenceReference);
});

test("advisor rejects unauthenticated and malformed requests", async () => {
  const unauthenticated = await post({ question: "What is the deadline?" }, { authenticate: async () => ({ status: "unauthenticated" }) });
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error.code, "UNAUTHENTICATED");

  const malformed = await post("{not-json");
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, "INVALID_REQUEST");
});

test("advisor redirects off-topic questions without calling Gemini", async () => {
  let called = false;
  const response = await post({ question: "Tell me a joke" }, {
    generate: async () => { called = true; return { text: "unexpected", generatedAt: "", modelLabel: "test" }; },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.limited, true);
  assert.equal(called, false);
});

test("missing evidence is disclosed instead of being sent as a factual answer", async () => {
  const response = await handler({
    generate: async () => { throw new Error("must not call provider"); },
  }).POST(new Request("http://localhost/api/advisor", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question: "What is the scholarship deadline?", universitySlug: university.slug }),
  }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.limited, true);
  assert.match(body.data.answer, /not established|not verified/i);
});

for (const [name, error, status, code] of [
  ["configuration", new GeminiConfigurationError(), 503, "GEMINI_NOT_CONFIGURED"],
  ["provider", new GeminiProviderError(), 502, "GEMINI_UNAVAILABLE"],
  ["timeout", new GeminiTimeoutError(), 504, "GEMINI_TIMEOUT"],
]) {
  test(`advisor maps Gemini ${name} errors safely`, async () => {
    const response = await post({ question: "What academic record is required?", universitySlug: university.slug, academicYear: "2027/28" }, {
      generate: async () => { throw error; },
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  });
}
