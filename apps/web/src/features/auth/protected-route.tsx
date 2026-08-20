import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './auth-context';
import { Skeleton } from '../../components/ui/skeleton';

export const ProtectedStudentRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Skeleton className="size-12 rounded-2xl" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'STUDENT') return <Navigate to="/access/pending" replace />;
  return <Outlet />;
};

export const ProtectedParentRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Skeleton className="size-12 rounded-2xl" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'PARENT') return <Navigate to="/access/pending" replace />;
  return <Outlet />;
};

export const ProtectedMentorRoute = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Skeleton className="size-12 rounded-2xl" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (user.role !== 'MENTOR') return <Navigate to="/access/pending" replace />;
  return <Outlet />;
};
