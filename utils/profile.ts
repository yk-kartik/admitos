import type { StudentProfile } from "@/types/domain";

export function toEditableProfilePayload(profile: StudentProfile) {
  const financial = profile.financialConstraints;
  const hasFinancialValues = Boolean(
    financial && (
      financial.currency?.trim() ||
      financial.annualBudget !== null ||
      financial.needsFinancialAid !== null ||
      financial.notes?.trim()
    ),
  );

  return {
    fullName: profile.fullName,
    preferredName: profile.preferredName,
    dateOfBirth: profile.dateOfBirth,
    phone: profile.phone,
    address: profile.address,
    countryOfResidence: profile.countryOfResidence,
    citizenships: profile.citizenships,
    currentLocation: profile.currentLocation,
    intendedStudyLevel: profile.intendedStudyLevel,
    intendedIntake: profile.intendedIntake,
    academicBackground: profile.academicBackground,
    currentUniversity: profile.currentUniversity,
    degreeProgram: profile.degreeProgram,
    currentAcademicYear: profile.currentAcademicYear,
    currentSemester: profile.currentSemester,
    cgpa: profile.cgpa,
    cgpaScale: profile.cgpaScale,
    percentage: profile.percentage,
    grades: profile.grades,
    schoolYears: profile.schoolYears,
    testScores: profile.testScores,
    englishQualifications: profile.englishQualifications,
    extracurricularActivities: profile.extracurricularActivities,
    projects: profile.projects,
    research: profile.research,
    leadership: profile.leadership,
    achievements: profile.achievements,
    competitions: profile.competitions,
    volunteering: profile.volunteering,
    workExperience: profile.workExperience,
    financialConstraints: hasFinancialValues ? financial : null,
    targetCountries: profile.targetCountries,
    targetUniversities: profile.targetUniversities,
    targetPrograms: profile.targetPrograms,
    intendedStudyAreas: profile.intendedStudyAreas,
    languages: profile.languages,
  } satisfies Partial<Omit<StudentProfile, "id" | "email" | "isMock" | "documents">>;
}

export function getIncompleteProfileSections(profile: StudentProfile): string[] {
  const sections: [string, boolean][] = [
    ["Personal details", Boolean(profile.fullName?.trim() && profile.dateOfBirth?.trim())],
    ["Citizenship", profile.citizenships.some((item) => item.trim().length > 0)],
    ["Location", Boolean(profile.countryOfResidence?.trim() || profile.currentLocation?.trim())],
    ["Academic background", Boolean(profile.academicBackground?.trim() || profile.schoolYears?.some((year) => year.institution || year.subjects.length || year.marks !== null))],
    ["Current education", Boolean(profile.currentUniversity?.trim() || profile.degreeProgram?.trim())],
    ["Current results", Boolean(profile.currentAcademicYear?.trim() || profile.currentSemester?.trim() || profile.cgpa !== null && profile.cgpa !== undefined || profile.percentage !== null && profile.percentage !== undefined)],
    ["Grades", profile.grades.length > 0],
    ["Tests and languages", profile.testScores.length > 0 || profile.englishQualifications.length > 0 || profile.languages.length > 0],
    ["Activities and projects", profile.extracurricularActivities.length > 0 || profile.projects.length > 0 || (profile.achievements?.length ?? 0) > 0 || (profile.competitions?.length ?? 0) > 0 || (profile.volunteering?.length ?? 0) > 0 || (profile.workExperience?.length ?? 0) > 0],
    ["Research and leadership", profile.research.length > 0 || profile.leadership.length > 0],
    ["Study targets", profile.targetCountries.length > 0 || profile.targetUniversities.length > 0 || (profile.targetPrograms?.length ?? 0) > 0],
    ["Study areas", profile.intendedStudyAreas.length > 0],
    ["Financial constraints", profile.financialConstraints !== null && (profile.financialConstraints.annualBudget !== null || profile.financialConstraints.needsFinancialAid !== null)],
  ];
  return sections.filter(([, complete]) => !complete).map(([label]) => label);
}

export function calculateProfileCompletion(profile: StudentProfile): number {
  const incomplete = getIncompleteProfileSections(profile).length;
  const sectionCount = 13;
  return Math.round(((sectionCount - incomplete) / sectionCount) * 100);
}