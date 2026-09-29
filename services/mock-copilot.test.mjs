import assert from "node:assert/strict";
import test from "node:test";
import { createMockCopilotService } from "./mock-copilot.ts";

test("mock copilot remains available with explicitly mock profile and repository data", async () => {
  const profile = { id: "mock-profile", fullName: null, isMock: true };
  const application = { id: "mock-application", universitySlug: "mock-university" };
  const university = { slug: "mock-university" };
  let assessmentInput;
  const service = createMockCopilotService({
    applicationRepository: { async list() { return [application]; } },
    profileRepository: { async getCurrent() { return profile; } },
    universityRepository: {
      async list() { return [university]; },
      async getBySlug() { return university; },
    },
    async assess(input) {
      assessmentInput = input;
      return { marker: "local mock assessment" };
    },
  });

  const result = await service.getAssessment("mock-application");

  assert.deepEqual(result, { status: "ready", assessment: { marker: "local mock assessment" } });
  assert.equal(assessmentInput.profile, profile);
  assert.equal(assessmentInput.application, application);
  assert.equal(assessmentInput.university, university);
});

test("mock copilot returns unavailable rather than fabricating assessment data", async () => {
  const service = createMockCopilotService({
    applicationRepository: { async list() { throw new Error("offline"); } },
    profileRepository: { async getCurrent() { return null; } },
    universityRepository: { async list() { return []; }, async getBySlug() { return null; } },
    async assess() { throw new Error("must not assess without repository data"); },
  });

  assert.deepEqual(await service.getAssessment("mock-application"), { status: "unavailable" });
});