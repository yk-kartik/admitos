import type { EvidenceRepository, StudentProfileRepository, UniversityRepository } from "../repositories/contracts.ts";
import { createAdmissionsAIOrchestrator, mockJevDecisionEngine } from "./admissions-ai.ts";
import { createRepositoryEvidenceRetriever, identifyEvidenceTopics } from "./evidence-retriever.ts";
import type { AdmissionsQuestionRequest, GenerativeModel } from "../types/ai.ts";
import { readJsonBody } from "./request-validation.ts";
import { GeminiConfigurationError, GeminiProviderError, GeminiTimeoutError } from "./gemini-provider.ts";

const MAX_QUESTION_LENGTH = 2_000;
const MAX_BODY_BYTES = 16 * 1024;

type Identity =
  | { status: "unavailable" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: { id: string; email: string; name: string } };

type Repositories = {
  dataSource: "DATABASE";
  profileRepository: StudentProfileRepository;
  universityRepository: UniversityRepository;
  evidenceRepository?: EvidenceRepository;
};

type Dependencies = {
  authenticate: (headers: Headers) => Promise<Identity>;
  getRepositories: () => Promise<Repositories | { dataSource: "MOCK" }>;
  generativeModel: GenerativeModel;
};

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

function isEducationQuestion(question: string): boolean {
  return /\b(admission|apply|application|college|course|degree|deadline|eligib|enrol|enroll|entry|grade|higher education|ielts|program|qualification|record|required|requirement|scholarship|study|student|transcript|tuition|university|visa)\b/i.test(question);
}

function validRequest(value: unknown): AdmissionsQuestionRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.question !== "string") return null;
  const question = body.question.trim();
  if (!question || question.length > MAX_QUESTION_LENGTH) return null;
  const optionalString = (key: string) => body[key] === undefined || body[key] === null || typeof body[key] === "string";
  if (!optionalString("universitySlug") || !optionalString("academicYear") || !optionalString("programId")) return null;
  return {
    question,
    universitySlug: typeof body.universitySlug === "string" ? body.universitySlug.trim() : "",
    academicYear: typeof body.academicYear === "string" ? body.academicYear.trim() || null : null,
    programId: typeof body.programId === "string" ? body.programId.trim() || null : null,
    applicantType: null,
    explainWithLanguage: true,
  };
}

export function createAdvisorApiHandlers({ authenticate, getRepositories, generativeModel }: Dependencies) {
  return {
    async POST(request: Request): Promise<Response> {
      const identity = await authenticate(request.headers);
      if (identity.status === "unavailable") return errorResponse("AUTH_UNAVAILABLE", "Persistent authentication is not configured.", 503);
      if (identity.status === "unauthenticated") return errorResponse("UNAUTHENTICATED", "Sign in to use the AI advisor.", 401);

      const body = await readJsonBody(request, MAX_BODY_BYTES);
      if (body.status === "too-large") return errorResponse("PAYLOAD_TOO_LARGE", "The advisor request is too large.", 413);
      if (body.status === "invalid") return errorResponse("INVALID_REQUEST", "A valid JSON advisor request is required.", 400);
      const input = validRequest(body.value);
      if (!input) return errorResponse("INVALID_REQUEST", "Enter a question of 2,000 characters or fewer.", 400);
      if (!isEducationQuestion(input.question)) {
        return Response.json({
          data: {
            answer: "I can help with education and admissions questions, such as programs, eligibility, deadlines, scholarships, and application preparation.",
            citations: [],
            limited: true,
          },
        });
      }

      try {
        const repositories = await getRepositories();
        if (repositories.dataSource !== "DATABASE") return errorResponse("ADVISOR_UNAVAILABLE", "The advisor requires connected, authorized admissions data.", 503);
        const profile = await repositories.profileRepository.getForUser(identity.user.id);
        if (!profile) return errorResponse("PROFILE_NOT_FOUND", "Create a student profile before using the advisor.", 404);

        const universities = input.universitySlug
          ? [await repositories.universityRepository.getBySlug(input.universitySlug)]
          : await repositories.universityRepository.list();
        const questionTerms = new Set(input.question.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term.length > 2));
        const university = universities
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .sort((left, right) => {
            const score = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter((term) => questionTerms.has(term)).length;
            return score(right.name) - score(left.name);
          })[0] ?? null;
        if (!university) {
          return Response.json({
            data: {
              answer: "I need a specific university or program from your AdmitOS data to provide a verified answer. No factual answer is established without that evidence.",
              citations: [],
              limited: true,
            },
          });
        }

        const orchestrator = createAdmissionsAIOrchestrator({
          evidenceRetriever: createRepositoryEvidenceRetriever(repositories.universityRepository, {
            evidenceRepository: repositories.evidenceRepository,
          }),
          decisionEngine: mockJevDecisionEngine,
          generativeModel,
        });
        const result = await orchestrator.answerQuestion({
          ...input,
          universitySlug: university.slug,
          topic: identifyEvidenceTopics(input.question)[0],
          explainWithLanguage: false,
        });
        const citations = result.evidencePack.evidence.map((item) => ({
          sourceTitle: item.sourceTitle,
          sourceUrl: item.sourceUrl,
          evidenceReference: item.evidenceReference,
        }));
        if (!result.evidencePack.authoritative) {
          return Response.json({
            data: {
              answer: result.answer,
              citations,
              limited: true,
              decision: result.decision.result.decision,
            },
          });
        }
        const explanation = await generativeModel.generate({
          task: "natural_language_explanation",
          prompt: input.question,
          context: {
            evidence: result.evidencePack.evidence,
            decision: result.decision.result.decision,
          },
        });
        return Response.json({
          data: {
            answer: explanation.text,
            citations,
            limited: false,
            decision: result.decision.result.decision,
          },
        });
      } catch (error) {
        if (error instanceof GeminiConfigurationError) return errorResponse("GEMINI_NOT_CONFIGURED", "The AI advisor is not configured. Add GEMINI_API_KEY on the server.", 503);
        if (error instanceof GeminiTimeoutError) return errorResponse("GEMINI_TIMEOUT", "The AI advisor took too long to respond. Try again.", 504);
        if (error instanceof GeminiProviderError) return errorResponse("GEMINI_UNAVAILABLE", "The AI advisor is temporarily unavailable. Try again.", 502);
        return errorResponse("ADVISOR_UNAVAILABLE", "The advisor could not complete this request.", 503);
      }
    },
  };
}
