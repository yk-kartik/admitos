import type {
  DecisionEvidence,
  DecisionRequest,
  EvidenceQuery,
  EvidenceTopic,
} from "@/types/ai";
import type { OfficialSource, University } from "@/types/domain";
import type { UniversityRepository } from "@/repositories/contracts";

export const DEFAULT_EVIDENCE_FRESHNESS_DAYS = 365;

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
  topic: EvidenceTopic;
  snippet: string;
  source: OfficialSource;
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
  const add = (topic: EvidenceTopic, snippet: string, source: OfficialSource, isRequired?: boolean) => {
    if (requested.has(topic)) items.push({ topic, snippet, source, isRequired });
  };

  for (const requirement of university.requirements) {
    const text = `${requirement.title} ${requirement.detail}`;
    const snippet = `${requirement.title}: ${requirement.detail} (${requirement.required ? "required" : "optional"})`;
    add("admission_requirement", snippet, requirement.source);
    if (/english|language/i.test(text)) add("english_language_requirement", snippet, requirement.source);
    if (/transcript|document|portfolio|statement|reference|certificate/i.test(text)) {
      add("required_documents", snippet, requirement.source, requirement.required);
    }
    if (/international applicant|international student|international admission/i.test(text)) {
      add("international_applicant_requirement", snippet, requirement.source);
    }
  }

  for (const deadline of university.deadlines) {
    const dateText = deadline.date ?? "No date provided in this record";
    add(
      "application_deadline",
      `${deadline.label} for ${deadline.intake}: ${dateText}`,
      deadline.source,
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
    );
  }

  for (const program of university.programs) {
    add(
      "program_availability",
      `${program.name} (${program.credential}); study mode: ${program.studyMode}; duration: ${program.duration}`,
      program.source,
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

function markConflicts(evidence: DecisionEvidence[]): DecisionEvidence[] {
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
      ? { ...item, verificationStatus: "conflicting" }
      : item,
  );
}

export function createRepositoryEvidenceRetriever(
  repository: UniversityRepository,
  options: EvidenceRetrieverOptions = {},
) {
  const freshnessDays = options.freshnessDays ?? DEFAULT_EVIDENCE_FRESHNESS_DAYS;
  const getNow = options.now ?? (() => new Date());

  return {
    async retrieve<TInput>(request: DecisionRequest<TInput>): Promise<DecisionEvidence[]> {
      const query = request.evidenceQuery;
      if (!query) return [];

      const university = await repository.getBySlug(query.universitySlug);
      if (!university) return [];

      const now = getNow();
      const evidence = sourceEvidenceForUniversity(university, query).map((item) =>
        toDecisionEvidence(item, now, freshnessDays, query.academicYear),
      );
      return markConflicts(evidence);
    },
  };
}