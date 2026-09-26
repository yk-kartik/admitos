import type {
  AdmissionsQuestionRequest,
  AdmissionsQuestionResponse,
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
import { createRepositoryEvidenceRetriever, identifyEvidenceTopics } from "@/services/evidence-retriever";
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
  async function evaluateRequest<TInput>(
    request: DecisionRequest<TInput>,
  ): Promise<DecisionResponse<DecisionOutcome>> {
    const evidencePack = request.evidenceQuery
      ? await providers.evidenceRetriever.retrievePack(request.evidenceQuery)
      : request.evidencePack;
    const evidence = evidencePack?.evidence ?? await providers.evidenceRetriever.retrieve(request);
    const response = await providers.decisionEngine.evaluate({ ...request, evidence, evidencePack });

    if (!evidencePack) return { ...response, evidence };
    if (evidencePack.status === "READY" && evidencePack.authoritative) {
      return { ...response, evidence, evidencePack };
    }

    const reason = evidencePack.reasons.join(" ") || "Current verified evidence is unavailable.";
    const decision = evidencePack.status === "UNKNOWN" ? "UNKNOWN" : "NEEDS_REVIEW";
    return {
      ...response,
      status: "NEEDS_HUMAN_REVIEW",
      result: {
        ...response.result,
        decision,
        confidence: {
          score: 0,
          level: "low",
          rationale: "The evidence pack is not authoritative for this question.",
        },
        probability: null,
        reasons: [reason],
        missingInformation: ["Current verified evidence for the requested question and academic year"],
      },
      reviewReasons: [reason],
      evidence,
      evidencePack,
    };
  }

  return {
    evaluate: evaluateRequest,
    generate(request: GenerationRequest): Promise<GenerationResponse> {
      return providers.generativeModel.generate(request);
    },
    async answerQuestion(request: AdmissionsQuestionRequest): Promise<AdmissionsQuestionResponse> {
      const query = {
        universitySlug: request.universitySlug,
        topics: request.topic ? [request.topic] : identifyEvidenceTopics(request.question),
        academicYear: request.academicYear,
        questionText: request.question,
        programId: request.programId,
        applicantType: request.applicantType,
      };
      const decision = await evaluateRequest({
        requestId: crypto.randomUUID(),
        question: {
          id: "admissions-question",
          domain: "requirement_classification",
          type: "choice",
          prompt: request.question,
          choices: ["satisfied", "not_satisfied", "unknown"],
        },
        input: { question: request.question },
        evidenceQuery: query,
        evidence: [],
        requestedAt: new Date().toISOString(),
      });
      const evidencePack = decision.evidencePack!;
      const answer = evidencePack.authoritative
        ? evidencePack.evidence.map((item) => item.evidenceSnippet).join("\n")
        : evidencePack.status === "UNKNOWN"
          ? "This information is not established by the available evidence for the requested academic year."
          : "The available evidence is not verified and current for the requested academic year, so human review is required.";

      let explanation: string | null = null;
      if (request.explainWithLanguage && evidencePack.authoritative) {
        const generation = await providers.generativeModel.generate({
          task: "natural_language_explanation",
          prompt: "Explain only the supplied evidence. Do not infer eligibility, add facts, or change any dates, amounts, or requirements.",
          context: {
            question: request.question,
            academicYear: request.academicYear,
            evidence: evidencePack.evidence,
            status: evidencePack.status,
          },
        });
        explanation = generation.text;
      }

      return { question: request.question, answer, decision, evidencePack, explanation };
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
