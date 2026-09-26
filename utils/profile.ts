import type { StudentProfile } from "@/types/domain";

export function calculateProfileCompletion(profile: StudentProfile) {
  const sections = [
    Boolean(profile.fullName || profile.preferredName),
    profile.citizenships.length > 0,
    Boolean(profile.intendedStudyLevel || profile.intendedIntake),
    Boolean(profile.academicBackground || profile.currentUniversity || profile.degreeProgram),
    profile.grades.length > 0,
    profile.testScores.length > 0 || profile.englishQualifications.length > 0,
    profile.extracurricularActivities.length > 0 || profile.projects.length > 0,
    profile.research.length > 0 || profile.leadership.length > 0,
    profile.targetCountries.length > 0 || profile.targetUniversities.length > 0,
    profile.intendedStudyAreas.length > 0,
    profile.financialConstraints !== null,
  ];

  return Math.round((sections.filter(Boolean).length / sections.length) * 100);
}