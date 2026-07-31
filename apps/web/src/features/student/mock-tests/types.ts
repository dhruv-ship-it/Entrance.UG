export type ExamType = { id: string; name: string; description: string };
export type MockExamType = { id: string; name: string; description: string };

export type MockAttemptSummary = {
  id: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';
  submittedAt: string | null;
  marksScored: number;
  accuracy: number;
};

export type MockExamSummary = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passingMarks: number | null;
  isFree: boolean;
  difficulty: string;
  sectionCount: number;
  totalQuestions: number;
  averageScore: number;
  totalAttempts: number;
  attempt: MockAttemptSummary | null;
  canAttempt: boolean;
  isAttempted: boolean;
};

export type MockExamDetail = MockExamSummary & {
  instructions: string;
  canGoBackBetweenSections: boolean;
  examType: { id: string; name: string };
  mockExamType: { id: string; name: string };
  sections: {
    id: string;
    name: string;
    sectionType: string;
    questionCount: number;
    durationMinutes: number | null;
    totalMarks: number;
  }[];
};
