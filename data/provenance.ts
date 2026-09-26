import type { OfficialSource } from "@/types/domain";

export function mockSource(
  id: string,
  sourceTitle: string,
  academicYear = "2027/28 (illustrative)",
  notes = "Illustrative AdmitOS mock data. This is not an official institutional source.",
): OfficialSource {
  return {
    id,
    sourceTitle,
    sourceType: "mock",
    sourceUrl: null,
    lastVerified: null,
    academicYear,
    verificationStatus: "mock",
    notes,
  };
}

export function missingSource(
  id: string,
  sourceTitle: string,
  sourceType: OfficialSource["sourceType"],
  academicYear: string | null = null,
): OfficialSource {
  return {
    id,
    sourceTitle,
    sourceType,
    sourceUrl: null,
    lastVerified: null,
    academicYear,
    verificationStatus: "missing-source",
    notes: "No source URL has been provided for this record.",
  };
}