import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './features/auth/login-page';
import { ProtectedStudentRoute } from './features/auth/protected-route';
import { SignupPage } from './features/auth/signup-page';
import { LandingPage, RolePendingPage } from './features/misc-pages';
import { MockExamTypesPage } from './features/student/mock-tests/exam-types-page';
import { ContentPage } from './features/student/content/content-page';
import { MockCategoriesPage } from './features/student/mock-tests/mock-categories-page';
import { MockExamDetailPage } from './features/student/mock-tests/exam-detail-page';
import { MockExamsPage } from './features/student/mock-tests/mock-exams-page';
import { NotificationsPage } from './features/student/notifications-page';
import { OverviewPage } from './features/student/overview-page';
import { ProfilePage } from './features/student/profile-page';
import { StudentLayout } from './features/student/student-layout';

export const App = () => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    <Route path="/access/pending" element={<RolePendingPage />} />
    <Route element={<ProtectedStudentRoute />}>
      <Route path="/student" element={<StudentLayout />}>
        <Route path="dashboard" element={<OverviewPage />} />
        <Route path="mock-tests" element={<MockExamTypesPage />} />
        <Route path="mock-tests/:examTypeId" element={<MockCategoriesPage />} />
        <Route path="mock-tests/:examTypeId/:mockExamTypeId" element={<MockExamsPage />} />
        <Route path="mock-tests/:examTypeId/:mockExamTypeId/:examId" element={<MockExamDetailPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

