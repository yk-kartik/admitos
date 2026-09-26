import type {
  DecisionEvidence,
  DecisionRequest,
  EvidencePack,
  EvidenceQuery,
  EvidenceTopic,
  RetrievedEvidence,
} from "@/types/ai";
import type { ApplicantType, OfficialSource, University } from "@/types/domain";
import type { UniversityRepository } from "@/repositories/contracts";

export const DEFAULT_EVIDENCE_FRESHNESS_DAYS = 365;

const ALL_EVIDENCE_TOPICS: EvidenceTopic[] = [
  "admission_requirement",
  "english_language_requirement",
  "international_applicant_requirement",
  "required_documents",
  "application_deadline",
  "scholarship_eligibility",
  "program_availability",
];

export function identifyEvidenceTopics(question: string): EvidenceTopic[] {
  const normalized = question.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const topics = new Set<EvidenceTopic>();
  const matches = (pattern: RegExp) => pattern.test(normalized);

  if (matches(/\b(english|language|ielts|toefl|pte|duolingo)\b/)) topics.add("english_language_requirement");
  if (matches(/\b(international applicant|international student|international admission|visa)\b/)) {
    topics.add("international_applicant_requirement");
  }
  if (matches(/\b(document|transcript|portfolio|personal statement|reference letter|certificate)\b/)) {
    topics.add("required_documents");
  }
  if (matches(/\b(deadline|due date|closing date|application closes|apply by)\b/)) topics.add("application_deadline");
  if (matches(/\b(scholarship|financial aid|funding|bursary)\b/)) topics.add("scholarship_eligibility");
  if (matches(/\b(program availability|program available|program offered|course offered|courses available)\b/)) {
    topics.add("program_availability");
  }
  if (matches(/\b(admission|entry requirement|eligibility|qualification|academic requirement)\b/)) {
    topics.add("admission_requirement");
  }

  return topics.size ? ALL_EVIDENCE_TOPICS.filter((topic) => topics.has(topic)) : [...ALL_EVIDENCE_TOPICS];
}

function academicYearRange(value: string): { start: number; end: number } | null {
  const range = value.match(/\b((?:19|20)\d{2})\s*[\/-]\s*(\d{2}|(?:19|20)\d{2})\b/);
  if (range) {
    const start = Number(range[1]);
    let end = Number(range[2]);
    if (end < 100) end += Math.floor(start / 100) * 100;
    if (end < start) end += 100;
    return { start, end };
  }

  const year = value.match(/\b((?:19|20)\d{2})\b/)?.[1];
  if (!year) return null;
  const parsedYear = Number(year);
  return { start: parsedYear, end: parsedYear };
}

function academicYearMatches(requested: string | null, source: string | null): boolean {
  if (!requested || !source) return false;
  const requestedRange = academicYearRange(requested);
  const sourceRange = academicYearRange(source);
  if (!requestedRange || !sourceRange || requestedRange.start !== sourceRange.start) return false;
  return requestedRange.end === requestedRange.start || requestedRange.end === sourceRange.end;
}

type SourceEvidence = {
  evidenceId: string;
  topic: EvidenceTopic;
  snippet: string;
  source: OfficialSource;
  programId: string | null;
  applicantType: ApplicantType | "all" | null;
  isRequired?: boolean;
};

type EvidenceRetrieverOptions = {
  freshnessDays?: number;
  now?: () => Date;
};

export function resolveVerificationStatus(
  source: Pick<OfficialSource, "sourceId" | "sourceTitle" | "verificationStatus" | "sourceType" | "sourceUrl" | "lastVerified" | "academicYear" | "evidenceReference">,
  now = new Date(),
  freshnessDays = DEFAULT_EVIDENCE_FRESHNESS_DAYS,
): OfficialSource["verificationStatus"] {
  if (source.verificationStatus !== "verified") return source.verificationStatus;
  let sourceUrlIsValid = false;
  try {
    const sourceUrl = new URL(source.sourceUrl ?? "");
    sourceUrlIsValid = sourceUrl.protocol === "https:" || sourceUrl.protocol === "http:";
  } catch {
    sourceUrlIsValid = false;
  }
  if (
    source.sourceType === "mock" ||
    source.sourceType === "unknown" ||
    !source.sourceId.trim() ||
    !source.sourceTitle.trim() ||
    !sourceUrlIsValid ||
    !source.lastVerified ||
    !source.academicYear ||
    !source.evidenceReference?.trim()
  ) {
    return "unverified";
  }

  const verifiedAt = Date.parse(source.lastVerified);
  const ageInDays = (now.getTime() - verifiedAt) / 86_400_000;
  if (!Number.isFinite(verifiedAt) || ageInDays < 0) return "unverified";
  return ageInDays > freshnessDays ? "stale" : "verified";
}

function sourceEvidenceForUniversity(university: University, query: EvidenceQuery): SourceEvidence[] {
  const items: SourceEvidence[] = [];
  const requested = new Set(query.topics);
  const add = (
    topic: EvidenceTopic,
    snippet: string,
    source: OfficialSource,
    evidenceId: string,
    programId: string | null = null,
    applicantType: ApplicantType | "all" | null = null,
    isRequired?: boolean,
  ) => {
    if (requested.has(topic)) {
      items.push({ evidenceId, topic, snippet, source, programId, applicantType, isRequired });
    }
  };

  for (const requirement of university.requirements) {
    const text = `${requirement.title} ${requirement.detail}`;
    const snippet = `${requirement.title}: ${requirement.detail} (${requirement.required ? "required" : "optional"})`;
    const applicantType = requirement.applicantType ?? (
      /international applicant|international student|international admission/i.test(text) ? "international" : null
    );
    add("admission_requirement", snippet, requirement.source, `requirement:${requirement.id}:admission`, requirement.programId ?? null, applicantType);
    if (/english|language/i.test(text)) {
      add("english_language_requirement", snippet, requirement.source, `requirement:${requirement.id}:english`, requirement.programId ?? null, applicantType);
    }
    if (/transcript|document|portfolio|statement|reference|certificate/i.test(text)) {
      add("required_documents", snippet, requirement.source, `requirement:${requirement.id}:documents`, requirement.programId ?? null, applicantType, requirement.required);
    }
    if (/international applicant|international student|international admission/i.test(text)) {
      add("international_applicant_requirement", snippet, requirement.source, `requirement:${requirement.id}:international`, requirement.programId ?? null, applicantType);
    }
  }

  for (const deadline of university.deadlines) {
    const dateText = deadline.date ?? "No date provided in this record";
    add(
      "application_deadline",
      `${deadline.label} for ${deadline.intake}: ${dateText}`,
      deadline.source,
      `deadline:${deadline.id}`,
    );
  }

  for (const scholarship of university.scholarships) {
    const amount = scholarship.amount.display ?? "Amount not provided in this record";
    const deadline = scholarship.deadline ?? "Deadline not provided in this record";
    const source = scholarship.isMock
      ? { ...scholarship.officialSource, verificationStatus: "mock" as const }
      : scholarship.verificationStatus !== "verified" && scholarship.officialSource.verificationStatus === "verified"
        ? { ...scholarship.officialSource, verificationStatus: scholarship.verificationStatus }
        : scholarship.officialSource;
    add(
      "scholarship_eligibility",
      `${scholarship.name}: ${scholarship.summary} Amount: ${amount}. Deadline: ${deadline}. Eligibility: ${scholarship.eligibilityCriteria.join("; ")}`,
      source,
      `scholarship:${scholarship.id}`,
    );
  }

  for (const program of university.programs) {
    add(
      "program_availability",
      `${program.name} (${program.credential}); study mode: ${program.studyMode}; duration: ${program.duration}`,
      program.source,
      `program:${program.id}`,
      program.id,
    );
  }

  return items;
}

function toDecisionEvidence(
  item: SourceEvidence,
  now: Date,
  freshnessDays: number,
  requestedAcademicYear: string | null,
): DecisionEvidence {
  const source = item.source;
  const sourceYearMatches = academicYearMatches(requestedAcademicYear, source.academicYear);
  const resolvedStatus = resolveVerificationStatus(source, now, freshnessDays);
  const yearNote = !requestedAcademicYear
    ? "Application academic year is unknown."
    : !source.academicYear
      ? "Source academic year is unknown."
      : `Source academic year ${source.academicYear} does not match requested application year ${requestedAcademicYear}.`;
  return {
    topic: item.topic,
    sourceId: source.sourceId,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourceType: source.sourceType,
    academicYear: source.academicYear,
    lastVerified: source.lastVerified,
    evidenceSnippet: item.snippet,
    evidenceReference: source.evidenceReference,
    ...(item.isRequired !== undefined ? { isRequired: item.isRequired } : {}),
    verificationStatus: !sourceYearMatches && resolvedStatus === "verified" ? "unverified" : resolvedStatus,
    sourceNotes: !sourceYearMatches
      ? `${source.notes ?? ""} ${yearNote}`.trim()
      : source.notes,
  };
}

function markConflicts<T extends DecisionEvidence>(evidence: T[]): T[] {
  const snippetsByReference = new Map<string, Set<string>>();
  for (const item of evidence) {
    if (!item.evidenceReference) continue;
    const snippets = snippetsByReference.get(item.evidenceReference) ?? new Set<string>();
    snippets.add(item.evidenceSnippet.trim());
    snippetsByReference.set(item.evidenceReference, snippets);
  }

  const conflictingReferences = new Set(
    [...snippetsByReference]
      .filter(([, snippets]) => snippets.size > 1)
      .map(([reference]) => reference),
  );
  return evidence.map((item) =>
    item.evidenceReference && conflictingReferences.has(item.evidenceReference)
      ? ({ ...item, verificationStatus: "conflicting" } as T)
      : item,
  );
}

function questionTerms(question: string | undefined): Set<string> {
  return new Set(
    (question ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 2),
  );
}

function rankEvidence(evidence: RetrievedEvidence[], query: EvidenceQuery): RetrievedEvidence[] {
  const terms = questionTerms(query.questionText);
  const topicOrder = new Map(query.topics.map((topic, index) => [topic, index]));
  return evidence
    .map((item, index) => {
      const overlap = [...questionTerms(item.evidenceSnippet)].filter((term) => terms.has(term)).length;
      const programMatch = query.programId && item.programId === query.programId ? 1 : 0;
      return { item, index, overlap, programMatch };
    })
    .sort((left, right) =>
      right.overlap - left.overlap ||
      right.programMatch - left.programMatch ||
      (topicOrder.get(left.item.topic) ?? 0) - (topicOrder.get(right.item.topic) ?? 0) ||
      left.index - right.index,
    )
    .map(({ item }) => item);
}

function isInQueryScope(item: SourceEvidence, query: EvidenceQuery): boolean {
  const programMatches = !query.programId || !item.programId || item.programId === query.programId;
  const applicantMatches =
    !query.applicantType ||
    !item.applicantType ||
    item.applicantType === "all" ||
    item.applicantType === query.applicantType;
  return programMatches && applicantMatches;
}

function toRetrievedEvidence(
  item: SourceEvidence,
  university: University,
  query: EvidenceQuery,
  now: Date,
  freshnessDays: number,
): RetrievedEvidence & { applicantType: ApplicantType | "all" | null } {
  const decisionEvidence = toDecisionEvidence(item, now, freshnessDays, query.academicYear);
  const freshnessStatus = decisionEvidence.verificationStatus === "stale"
    ? "stale"
    : decisionEvidence.verificationStatus === "verified"
      ? "current"
      : "unknown";
  return {
    ...decisionEvidence,
    evidenceId: item.evidenceId,
    universitySlug: university.slug,
    universityName: university.name,
    programId: item.programId,
    applicantType: item.applicantType,
    freshnessStatus,
  };
}

function buildEvidencePack(query: EvidenceQuery, evidence: RetrievedEvidence[], candidateCount: number): EvidencePack {
  const missingTopics = query.topics.filter((topic) => !evidence.some((item) => item.topic === topic));
  const scopeNeedsReview = evidence.some((item) =>
    (item.programId !== null && query.programId == null) ||
    (item.applicantType !== null && item.applicantType !== "all" && query.applicantType == null),
  );
  const nonAuthoritative = evidence.some((item) =>
    item.verificationStatus !== "verified" || item.freshnessStatus !== "current",
  );
  const reasons: string[] = [];

  if (candidateCount === 0) reasons.push("No repository evidence was found for the requested topics.");
  if (missingTopics.length) reasons.push(`No evidence was found for: ${missingTopics.join(", ")}.`);
  if (nonAuthoritative) reasons.push("Some retrieved evidence is not verified and current for the requested academic year.");
  if (scopeNeedsReview) reasons.push("Specify the program or applicant type to confirm that scoped evidence applies.");
  if (evidence.some((item) => item.verificationStatus === "conflicting")) {
    reasons.push("Conflicting claims require human review.");
  }

  const status = candidateCount === 0
    ? "UNKNOWN"
    : nonAuthoritative || scopeNeedsReview
      ? "NEEDS_HUMAN_REVIEW"
      : missingTopics.length
        ? "UNKNOWN"
        : "READY";

  return {
    query: { ...query, topics: [...query.topics] },
    status,
    authoritative: status === "READY",
    evidence,
    reasons,
  };
}

export function createRepositoryEvidenceRetriever(
  repository: UniversityRepository,
  options: EvidenceRetrieverOptions = {},
) {
  const freshnessDays = options.freshnessDays ?? DEFAULT_EVIDENCE_FRESHNESS_DAYS;
  const getNow = options.now ?? (() => new Date());

  const retrievePack = async (query: EvidenceQuery): Promise<EvidencePack> => {
    const university = await repository.getBySlug(query.universitySlug);
    if (!university) {
      return buildEvidencePack(query, [], 0);
    }

    const candidates = sourceEvidenceForUniversity(university, query).filter((item) => isInQueryScope(item, query));
    const now = getNow();
    const evidence = rankEvidence(
      markConflicts(candidates.map((item) => toRetrievedEvidence(item, university, query, now, freshnessDays))),
      query,
    );
    return buildEvidencePack(query, evidence, candidates.length);
  };

  return {
    async retrieve<TInput>(request: DecisionRequest<TInput>): Promise<DecisionEvidence[]> {
      const query = request.evidenceQuery;
      if (!query) return [];
      return (await retrievePack(query)).evidence;
    },
    retrievePack,
  };
}