import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/login-page';
import { ForgotPasswordPage } from './features/auth/forgot-password-page';
import { ProtectedParentRoute, ProtectedStudentRoute } from './features/auth/protected-route';
import { SignupPage } from './features/auth/signup-page';
import { LandingPage, RolePendingPage } from './features/misc-pages';
import { MockExamTypesPage } from './features/student/mock-tests/exam-types-page';
import { AccountPage } from './features/student/account-page';
import { MentorshipAnalysisAttemptsPage, MockAnalysisAttemptsPage } from './features/student/analysis-attempts-page';
import { AnalysisHubPage } from './features/student/analysis-hub-page';
import { ContentAttemptDetailPage, ContentBookmarksPage, ContentPage } from './features/student/content/content-page';
import {
  MentorshipAnalysisPage,
  MentorshipBatchBookmarksPage,
  MentorshipBatchPage,
  MentorshipBatchesPage,
  MentorshipClassesPage,
  MentorshipClosedTasksPage,
  MentorshipClosedTestsPage,
  MentorshipNoticesPage,
  MentorshipPastClassesPage,
  MentorshipProgramsPage,
  MentorshipTasksPage,
  MentorshipTestAttemptAnalysisPage,
  MentorshipTestDetailPage,
  MentorshipTestsPage,
  MentorshipTestAttemptReviewPage,
} from './features/student/mentorship/mentorship-page';
import { DoubtsPage } from './features/student/mentorship/doubts-page';
import { MockCategoriesPage } from './features/student/mock-tests/mock-categories-page';
import { MockAttemptAnalysisPage, MockAttemptReviewPage } from './features/student/mock-tests/mock-analysis-page';
import { MockBookmarksPage } from './features/student/mock-tests/mock-bookmarks-page';
import { MockExamDetailPage } from './features/student/mock-tests/exam-detail-page';
import { MockExamsPage } from './features/student/mock-tests/mock-exams-page';
import { MockSwotPage } from './features/student/mock-tests/mock-swot-page';
import { NotificationsPage } from './features/student/notifications-page';
import { OverviewPage } from './features/student/overview-page';
import { PlansPage } from './features/student/plans-page';
import { ProfilePage } from './features/student/profile-page';
import { RcAttemptDetailPage, RcAttemptReviewPage, RcAttemptsPage, RcPage, RcTestDetailPage, RcTestsPage } from './features/student/rc/rc-page';
import { StudentLayout } from './features/student/student-layout';
import { TestEnginePage } from './features/student/test-engine/test-engine-page';
import { ParentLayout } from './features/parent/parent-layout';
import {
  ParentContentPage,
  ParentDashboardPage,
  ParentBatchAttemptAnalysisPage,
  ParentMentorshipBatchPage,
  ParentMentorshipBatchesPage,
  ParentMentorshipProgramsPage,
  ParentProfilePage,
  ParentStudentHomePage,
} from './features/parent/parent-pages';
import {
  ParentMockAttemptAnalysisPage,
  ParentMockAttemptReviewPage,
  ParentMockBookmarksPage,
  ParentMockCategoriesPage,
  ParentMockExamTypesPage,
  ParentMockSeriesPage,
  ParentMockSwotPage,
} from './features/parent/parent-mock-pages';
import {
  ParentRcAttemptAnalysisPage,
  ParentRcAttemptReviewPage,
  ParentRcAttemptsPage,
  ParentRcDashboardPage,
  ParentRcTestDetailPage,
  ParentRcTestsPage,
} from './features/parent/parent-rc-pages';

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/access/pending" element={<RolePendingPage />} />
    <Route element={<ProtectedStudentRoute />}>
      <Route path="/student/test-engine/:pillar/:attemptId" element={<TestEnginePage />} />
      <Route path="/student" element={<StudentLayout />}>
        <Route path="dashboard" element={<OverviewPage />} />
        <Route path="analysis" element={<AnalysisHubPage />} />
        <Route path="analysis/mock-tests" element={<MockAnalysisAttemptsPage />} />
        <Route path="analysis/mentorship" element={<MentorshipAnalysisAttemptsPage />} />
        <Route path="mock-tests" element={<MockExamTypesPage />} />
        <Route path="mock-tests/bookmarks" element={<MockBookmarksPage />} />
        <Route path="mock-tests/attempts/:attemptId/analysis" element={<MockAttemptAnalysisPage />} />
        <Route path="mock-tests/attempts/:attemptId/swot" element={<MockSwotPage />} />
        <Route path="mock-tests/attempts/:attemptId/review" element={<MockAttemptReviewPage />} />
        <Route path="mock-tests/:examTypeId" element={<MockCategoriesPage />} />
        <Route path="mock-tests/:examTypeId/:mockExamTypeId" element={<MockExamsPage />} />
        <Route path="mock-tests/:examTypeId/:mockExamTypeId/:examId" element={<MockExamDetailPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="content/bookmarks" element={<ContentBookmarksPage />} />
        <Route path="content/attempts/:attemptId" element={<ContentAttemptDetailPage />} />
        <Route path="rc" element={<RcPage />} />
        <Route path="rc/tests" element={<RcTestsPage />} />
        <Route path="rc/tests/:testId" element={<RcTestDetailPage />} />
        <Route path="rc/attempts" element={<RcAttemptsPage />} />
        <Route path="rc/attempts/:attemptId" element={<RcAttemptDetailPage />} />
        <Route path="rc/attempts/:attemptId/review" element={<RcAttemptReviewPage />} />
        <Route path="mentorship" element={<MentorshipProgramsPage />} />
        <Route path="mentorship/:programId" element={<MentorshipBatchesPage />} />
        <Route path="mentorship/batches/:batchId" element={<MentorshipBatchPage />} />
        <Route path="mentorship/batches/:batchId/tasks" element={<MentorshipTasksPage />} />
        <Route path="mentorship/batches/:batchId/tasks/closed" element={<MentorshipClosedTasksPage />} />
        <Route path="mentorship/batches/:batchId/classes" element={<MentorshipClassesPage />} />
        <Route path="mentorship/batches/:batchId/classes/past" element={<MentorshipPastClassesPage />} />
        <Route path="mentorship/batches/:batchId/doubts" element={<DoubtsPage />} />
        <Route path="mentorship/batches/:batchId/tests" element={<MentorshipTestsPage />} />
        <Route path="mentorship/batches/:batchId/tests/closed" element={<MentorshipClosedTestsPage />} />
        <Route path="mentorship/batches/:batchId/tests/attempts/:attemptId/analysis" element={<MentorshipTestAttemptAnalysisPage />} />
        <Route path="mentorship/batches/:batchId/tests/attempts/:attemptId/review" element={<MentorshipTestAttemptReviewPage />} />
        <Route path="mentorship/batches/:batchId/test-bookmarks" element={<MentorshipBatchBookmarksPage />} />
        <Route path="mentorship/batches/:batchId/tests/:testId" element={<MentorshipTestDetailPage />} />
        <Route path="mentorship/batches/:batchId/notices" element={<MentorshipNoticesPage />} />
        <Route path="mentorship/batches/:batchId/analysis" element={<MentorshipAnalysisPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
    </Route>
    <Route element={<ProtectedParentRoute />}>
      <Route path="/parent" element={<ParentLayout />}>
        <Route path="dashboard" element={<ParentDashboardPage />} />
        <Route path="students/:studentId" element={<ParentStudentHomePage />} />
        <Route path="students/:studentId/mock-tests" element={<ParentMockExamTypesPage />} />
        <Route path="students/:studentId/mock-tests/bookmarks" element={<ParentMockBookmarksPage />} />
        <Route path="students/:studentId/mock-tests/:examTypeId" element={<ParentMockCategoriesPage />} />
        <Route path="students/:studentId/mock-tests/:examTypeId/:mockExamTypeId" element={<ParentMockSeriesPage />} />
        <Route path="students/:studentId/mock-tests/attempts/:attemptId" element={<ParentMockAttemptAnalysisPage />} />
        <Route path="students/:studentId/mock-tests/attempts/:attemptId/review" element={<ParentMockAttemptReviewPage />} />
        <Route path="students/:studentId/mock-tests/attempts/:attemptId/swot" element={<ParentMockSwotPage />} />
        <Route path="students/:studentId/content" element={<ParentContentPage />} />
        <Route path="students/:studentId/rc" element={<ParentRcDashboardPage />} />
        <Route path="students/:studentId/rc/tests" element={<ParentRcTestsPage />} />
        <Route path="students/:studentId/rc/tests/:testId" element={<ParentRcTestDetailPage />} />
        <Route path="students/:studentId/rc/attempts" element={<ParentRcAttemptsPage />} />
        <Route path="students/:studentId/rc/attempts/:attemptId" element={<ParentRcAttemptAnalysisPage />} />
        <Route path="students/:studentId/rc/attempts/:attemptId/review" element={<ParentRcAttemptReviewPage />} />
        <Route path="students/:studentId/mentorship" element={<ParentMentorshipProgramsPage />} />
        <Route path="students/:studentId/mentorship/programs/:programId/batches" element={<ParentMentorshipBatchesPage />} />
        <Route path="students/:studentId/mentorship/batches/:batchId" element={<ParentMentorshipBatchPage />} />
        <Route path="students/:studentId/mentorship/batch-attempts/:attemptId" element={<ParentBatchAttemptAnalysisPage />} />
        <Route path="profile" element={<ParentProfilePage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

