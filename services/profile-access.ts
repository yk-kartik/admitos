import { emptyStudentProfile } from "../data/profile.ts";
import type { SchoolYearRecord, StudentProfile } from "../types/domain.ts";
import type { StudentProfileRepository } from "../repositories/contracts.ts";

const textFields = [
  "fullName",
  "preferredName",
  "dateOfBirth",
  "phone",
  "address",
  "countryOfResidence",
  "currentLocation",
  "intendedStudyLevel",
  "intendedIntake",
  "academicBackground",
  "currentUniversity",
  "degreeProgram",
  "currentAcademicYear",
  "currentSemester",
] as const;

const listFields = [
  "citizenships",
  "targetCountries",
  "targetUniversities",
  "targetPrograms",
  "intendedStudyAreas",
] as const;

function isSchoolYearRecords(value: unknown): value is SchoolYearRecord[] {
  return Array.isArray(value) && value.length <= 3 && value.every((year: unknown) => {
    if (!year || typeof year !== "object" || Array.isArray(year)) return false;
    const entry = year as Record<string, unknown>;
    if (!["Class 10", "Class 11", "Class 12"].includes(String(entry.classLevel)) ||
      (entry.institution != null && (typeof entry.institution !== "string" || entry.institution.length > 200)) ||
      (entry.academicYear != null && (typeof entry.academicYear !== "string" || entry.academicYear.length > 50)) ||
      (entry.marks != null && (typeof entry.marks !== "number" || !Number.isFinite(entry.marks) || entry.marks < 0)) ||
      (entry.totalMarks != null && (typeof entry.totalMarks !== "number" || !Number.isFinite(entry.totalMarks) || entry.totalMarks <= 0)) ||
      !Array.isArray(entry.subjects) || entry.subjects.length > 80) return false;
    return entry.subjects.every((subject: unknown) => {
      if (!subject || typeof subject !== "object" || Array.isArray(subject)) return false;
      const grade = subject as Record<string, unknown>;
      return typeof grade.subject === "string" && grade.subject.length <= 100 &&
        typeof grade.result === "string" && grade.result.length <= 100 &&
        (grade.scale == null || typeof grade.scale === "string" && grade.scale.length <= 100) &&
        (grade.academicYear == null || typeof grade.academicYear === "string" && grade.academicYear.length <= 50);
    });
  });
}

export type ProfileUpdateResult =
  | { status: "valid"; profile: StudentProfile }
  | { status: "invalid"; fields: string[] };

export function validateProfileUpdate(
  input: unknown,
  current: StudentProfile,
  accountEmail: string,
): ProfileUpdateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { status: "invalid", fields: ["profile"] };
  }

  const values = input as Record<string, unknown>;
  const profile: StudentProfile = {
    ...current,
    id: current.id,
    email: accountEmail,
    isMock: false,
  };
  const invalidFields: string[] = [];

  for (const field of textFields) {
    if (!(field in values)) continue;
    const value = values[field];
    if (value !== null && (typeof value !== "string" || value.length > 500)) {
      invalidFields.push(field);
      continue;
    }
    profile[field] = typeof value === "string" ? value.trim() || null : null;
  }

  for (const field of listFields) {
    if (!(field in values)) continue;
    const value = values[field];
    if (!Array.isArray(value) || value.length > 40 || value.some((item) => typeof item !== "string" || item.length > 100)) {
      invalidFields.push(field);
      continue;
    }
    profile[field] = [...new Set(value.map((item) => (item as string).trim()).filter(Boolean))];
  }

  for (const field of ["cgpa", "cgpaScale", "percentage"] as const) {
    if (!(field in values)) continue;
    const value = values[field];
    const max = field === "percentage" ? 100 : 1000;
    if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > max)) {
      invalidFields.push(field);
      continue;
    }
    profile[field] = value as number | null;
  }

  if ("grades" in values) {
    const grades = values.grades;
    if (!Array.isArray(grades) || grades.length > 80 || grades.some((grade) =>
      !grade || typeof grade !== "object" || Array.isArray(grade) ||
      typeof grade.subject !== "string" || grade.subject.length > 100 ||
      typeof grade.result !== "string" || grade.result.length > 100 ||
      (grade.scale != null && (typeof grade.scale !== "string" || grade.scale.length > 100)) ||
      (grade.academicYear != null && (typeof grade.academicYear !== "string" || grade.academicYear.length > 50))
    )) {
      invalidFields.push("grades");
    } else {
      profile.grades = grades.map((grade) => ({
        subject: grade.subject.trim(),
        result: grade.result.trim(),
        scale: grade.scale?.trim() || null,
        academicYear: grade.academicYear?.trim() || null,
      })).filter((grade) => grade.subject && grade.result);
    }
  }

  if ("schoolYears" in values) {
    const schoolYears = values.schoolYears;
    if (!isSchoolYearRecords(schoolYears)) {
      invalidFields.push("schoolYears");
    } else {
      profile.schoolYears = schoolYears.map((year) => ({
        classLevel: year.classLevel,
        institution: year.institution?.trim() || null,
        academicYear: year.academicYear?.trim() || null,
        marks: year.marks ?? null,
        totalMarks: year.totalMarks ?? null,
        subjects: year.subjects.map((subject) => ({
          subject: subject.subject.trim(),
          result: subject.result.trim(),
          scale: subject.scale?.trim() || null,
          academicYear: subject.academicYear?.trim() || null,
        })).filter((subject) => subject.subject && subject.result),
      }));
    }
  }

  for (const field of ["testScores", "englishQualifications"] as const) {
    if (!(field in values)) continue;
    const entries = values[field];
    const primaryField = field === "testScores" ? "testName" : "qualification";
    if (!Array.isArray(entries) || entries.length > 40 || entries.some((entry) =>
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      typeof entry[primaryField] !== "string" || entry[primaryField].length > 100 ||
      (entry.score != null && (typeof entry.score !== "string" || entry.score.length > 100)) ||
      (entry.date != null && (typeof entry.date !== "string" || entry.date.length > 50))
    )) {
      invalidFields.push(field);
    } else if (field === "testScores") {
      profile.testScores = entries.map((entry) => ({
        testName: entry.testName.trim(),
        score: entry.score?.trim() ?? "",
        date: entry.date?.trim() || null,
        source: null,
      })).filter((entry) => entry.testName && entry.score);
    } else {
      profile.englishQualifications = entries.map((entry) => ({
        qualification: entry.qualification.trim(),
        score: entry.score?.trim() || null,
        date: entry.date?.trim() || null,
        source: null,
      })).filter((entry) => entry.qualification);
    }
  }

  for (const field of [
    "extracurricularActivities",
    "research",
    "leadership",
    "achievements",
    "competitions",
    "volunteering",
    "workExperience",
  ] as const) {
    if (!(field in values)) continue;
    const entries = values[field];
    if (!Array.isArray(entries) || entries.length > 80 || entries.some((entry) =>
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      typeof entry.name !== "string" || entry.name.length > 150 ||
      ["role", "description", "dates"].some((key) => entry[key] != null && (typeof entry[key] !== "string" || entry[key].length > 1000))
    )) {
      invalidFields.push(field);
    } else {
      profile[field] = entries.map((entry) => ({
        name: entry.name.trim(),
        role: entry.role?.trim() || null,
        description: entry.description?.trim() || null,
        dates: entry.dates?.trim() || null,
      })).filter((entry) => entry.name);
    }
  }

  if ("projects" in values) {
    const entries = values.projects;
    if (!Array.isArray(entries) || entries.length > 80 || entries.some((entry) =>
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      typeof entry.name !== "string" || entry.name.length > 150 ||
      ["description", "url", "dates"].some((key) => entry[key] != null && (typeof entry[key] !== "string" || entry[key].length > 1000))
    )) {
      invalidFields.push("projects");
    } else {
      profile.projects = entries.map((entry) => ({
        name: entry.name.trim(),
        description: entry.description?.trim() || null,
        url: entry.url?.trim() || null,
        dates: entry.dates?.trim() || null,
      })).filter((entry) => entry.name);
    }
  }

  if ("languages" in values) {
    const entries = values.languages;
    if (!Array.isArray(entries) || entries.length > 40 || entries.some((entry) =>
      !entry || typeof entry !== "object" || Array.isArray(entry) ||
      typeof entry.name !== "string" || entry.name.length > 100 ||
      (entry.proficiency != null && (typeof entry.proficiency !== "string" || entry.proficiency.length > 100))
    )) {
      invalidFields.push("languages");
    } else {
      profile.languages = entries.map((entry) => ({ name: entry.name.trim(), proficiency: entry.proficiency?.trim() || null })).filter((entry) => entry.name);
    }
  }

  if ("financialConstraints" in values) {
    const constraints = values.financialConstraints;
    if (constraints === null) {
      profile.financialConstraints = null;
    } else if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
      invalidFields.push("financialConstraints");
    } else {
      const value = constraints as Record<string, unknown>;
      if ((value.currency != null && typeof value.currency !== "string") ||
        (value.annualBudget != null && (typeof value.annualBudget !== "number" || !Number.isFinite(value.annualBudget) || value.annualBudget < 0)) ||
        (value.needsFinancialAid != null && typeof value.needsFinancialAid !== "boolean") ||
        (value.notes != null && (typeof value.notes !== "string" || value.notes.length > 1000))) {
        invalidFields.push("financialConstraints");
      } else {
        profile.financialConstraints = {
          currency: typeof value.currency === "string" ? value.currency.trim() || null : null,
          annualBudget: value.annualBudget as number | null,
          needsFinancialAid: value.needsFinancialAid as boolean | null,
          notes: typeof value.notes === "string" ? value.notes.trim() || null : null,
        };
      }
    }
  }

  return invalidFields.length
    ? { status: "invalid", fields: [...new Set(invalidFields)] }
    : { status: "valid", profile };
}

export function createProfileAccessService(repository: StudentProfileRepository) {
  return {
    async get(userId: string, accountEmail: string): Promise<StudentProfile> {
      const profile = await repository.getForUser(userId);
      return profile ?? {
        ...emptyStudentProfile,
        email: accountEmail,
        citizenships: [],
        grades: [],
        testScores: [],
        englishQualifications: [],
        extracurricularActivities: [],
        projects: [],
        research: [],
        leadership: [],
        targetCountries: [],
        targetUniversities: [],
        intendedStudyAreas: [],
        languages: [],
      };
    },
    async update(userId: string, accountEmail: string, input: unknown): Promise<ProfileUpdateResult> {
      const current = await this.get(userId, accountEmail);
      const result = validateProfileUpdate(input, current, accountEmail);
      if (result.status === "invalid") return result;
      const profile = await repository.upsertForUser(userId, result.profile);
      return { status: "valid", profile };
    },
  };
}