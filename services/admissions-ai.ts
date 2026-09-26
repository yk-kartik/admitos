import type {
  AdmissionsAIOrchestrator,
  ApplicationCopilotAssessment,
  ApplicationCopilotInput,
  ApplicationDecision,
  ApplicationDocumentDraft,
  DecisionOutcome,
  DecisionRequest,
  DecisionResponse,
  EvidenceRetriever,
  GenerativeModel,
  GenerationRequest,
  GenerationResponse,
  DecisionEngine,
} from "@/types/ai";
import { mockUniversityRepository } from "@/repositories/mock";
import { createRepositoryEvidenceRetriever } from "@/services/evidence-retriever";
import {
  createMockJevDecisionResponse,
  evaluateApplicationReadiness,
  mapVerifiedEvidenceToApplicationDocuments,
  mapProfileToApplicationFields,
  validateApplicationFields,
} from "@/services/application-copilot";

export function createAdmissionsAIOrchestrator(providers: {
  evidenceRetriever: EvidenceRetriever;
  decisionEngine: DecisionEngine;
  generativeModel: GenerativeModel;
}): AdmissionsAIOrchestrator {
  return {
    async evaluate<TInput>(
      request: DecisionRequest<TInput>,
    ): Promise<DecisionResponse<DecisionOutcome>> {
      const evidence = await providers.evidenceRetriever.retrieve(request);
      return providers.decisionEngine.evaluate({ ...request, evidence });
    },
    generate(request: GenerationRequest): Promise<GenerationResponse> {
      return providers.generativeModel.generate(request);
    },
  };
}

export const mockEvidenceRetriever: EvidenceRetriever = {
  ...createRepositoryEvidenceRetriever(mockUniversityRepository),
};

export const mockJevDecisionEngine: DecisionEngine = {
  async evaluate<TInput>(
    request: DecisionRequest<TInput>,
  ): Promise<DecisionResponse<DecisionOutcome>> {
    return createMockJevDecisionResponse(request);
  },
};

export const mockGenerativeModel: GenerativeModel = {
  async generate(_request: GenerationRequest): Promise<GenerationResponse> {
    return {
      text: "Language generation is not connected. No application text was generated; add only information you can verify and review it before use.",
      generatedAt: new Date().toISOString(),
      modelLabel: "MOCK · NOT CONNECTED",
    };
  },
};

const mockOrchestrator = createAdmissionsAIOrchestrator({
  evidenceRetriever: mockEvidenceRetriever,
  decisionEngine: mockJevDecisionEngine,
  generativeModel: mockGenerativeModel,
});

function toApplicationDecision(value: DecisionOutcome): ApplicationDecision {
  switch (value) {
    case "ELIGIBLE":
    case "NOT_ELIGIBLE":
    case "NEEDS_REVIEW":
    case "READY":
    case "NOT_READY":
    case "UNKNOWN":
      return value;
    default:
      return "NEEDS_REVIEW";
  }
}

export async function assessApplication(
  input: ApplicationCopilotInput,
): Promise<ApplicationCopilotAssessment> {
  const fields = mapProfileToApplicationFields(input.profile);
  const intakeYear = input.application.intake.match(/\b\d{4}\b/)?.[0] ?? null;
  const request: DecisionRequest<{ applicationId: string }> = {
    requestId: input.application.id,
    question: {
      id: "application-readiness",
      domain: "application_readiness",
      type: "choice",
      prompt: "Can this application proceed to final human review based on available evidence?",
      choices: ["READY", "NOT_READY", "NEEDS_REVIEW", "UNKNOWN"],
    },
    input: { applicationId: input.application.id },
    evidenceQuery: {
      universitySlug: input.university.slug,
      topics: [
        "admission_requirement",
        "english_language_requirement",
        "required_documents",
        "international_applicant_requirement",
      ],
      academicYear: input.application.source.academicYear ?? intakeYear,
    },
    evidence: [],
    requestedAt: new Date().toISOString(),
  };
  const rawDecision = await mockOrchestrator.evaluate(request);
  const documents: ApplicationDocumentDraft[] = mapVerifiedEvidenceToApplicationDocuments(rawDecision.evidence);
  const applicationDecision = toApplicationDecision(rawDecision.result.decision);
  const decision: DecisionResponse<ApplicationDecision> = {
    ...rawDecision,
    result: { ...rawDecision.result, decision: applicationDecision },
  };
  const validationErrors = validateApplicationFields(fields);
  const readiness = evaluateApplicationReadiness({
    fields,
    documents,
    decision: decision.result.decision,
    evidence: decision.evidence,
    validationErrors,
    humanReviewed: false,
  });

  return { fields, documents, decision, readiness, validationErrors };
}

export async function generateOptionalLanguagePreview(
  request: GenerationRequest,
): Promise<GenerationResponse> {
  return mockOrchestrator.generate(request);
}
