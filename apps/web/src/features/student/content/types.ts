export type LearningContent = {
  id: string; title: string; description: string; contentType: 'YOUTUBE' | 'PDF' | 'DOCUMENT' | 'WEBSITE';
  contentUrl: string | null; thumbnailUrl: string | null; sequenceNumber: number; isFree: boolean;
  estimatedDurationMinutes: number | null; hasAccess: boolean; completed: boolean; completedAt: string | null;
};
export type ContentTest = {
  id: string; name: string; description: string; durationMinutes: number; totalMarks: number; difficulty: string;
  isFree: boolean; hasAccess: boolean; canAttempt: boolean; sectionCount: number; totalQuestions: number;
  attempt: { id: string; status: string; submittedAt: string | null; marksScored: number; accuracy: number } | null;
};
export type ContentSubtopic = { id: string; name: string; description: string; contents: LearningContent[]; totalContentCount: number; completedContentCount: number };
export type ContentTopic = { id: string; name: string; description: string; subtopics: ContentSubtopic[]; totalContentCount: number; completedContentCount: number; estimatedDurationMinutes: number; tests: ContentTest[] };
export type ContentSubject = { id: string; name: string; description: string; topics: ContentTopic[]; totalContentCount: number; completedContentCount: number };
export type ContentTreeResponse = { hasPaidAccess: boolean; subjects: ContentSubject[] };
export type ContentAttempt = { id: string; status: string; startedAt: string; submittedAt: string | null; timeTakenSeconds: number; totalMarks: number; marksScored: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number; accuracy: number; createdAt: string; test: { id: string; name: string; durationMinutes: number; totalMarks: number; topic: string; subject: string }; sections: { id: string; name: string; totalMarks: number; marksScored: number; accuracy: number; timeTakenSeconds: number; correctAnswers: number; incorrectAnswers: number; unattemptedAnswers: number }[] };
