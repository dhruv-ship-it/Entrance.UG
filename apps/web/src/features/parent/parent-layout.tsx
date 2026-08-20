import { Bell, ChevronDown, GraduationCap, LogOut, ShieldCheck } from 'lucide-react';
import { Link, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { relativeTime } from '../../lib/utils';
import { useAuth } from '../auth/auth-context';

type Notification = { id: string; title: string; description: string; type: string; isRead: boolean; createdAt: string; isDashboardNotification: boolean };
type NotificationResponse = { notifications: Notification[]; unreadCount: number };

export const ParentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { studentId } = useParams();
  const notifications = useQuery({
    queryKey: ['parent-child-notifications', studentId],
    queryFn: () => api<NotificationResponse>(`/api/v1/parents/students/${studentId}/notifications`),
    enabled: Boolean(studentId),
  });

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-canvas/90 px-5 backdrop-blur-xl sm:px-8">
        <div className="mx-auto flex h-[76px] max-w-[1500px] items-center justify-between gap-4">
          <Link to="/parent/dashboard" className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lime text-moss-900 shadow-card"><GraduationCap size={22} strokeWidth={2.3} /></span>
            <span>
              <span className="block text-base font-bold text-moss-950">Entrance UG</span>
              <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-moss-700">Parent portal</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <details className="relative">
              <summary className="focus-ring relative grid size-10 cursor-pointer place-items-center rounded-xl bg-white text-stone-600 shadow-card marker:content-none" aria-label="Open child notifications">
                <Bell size={18} />
                {Boolean(studentId && (notifications.data?.unreadCount ?? 0) > 0) && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-coral ring-2 ring-white" />}
              </summary>
              <div className="absolute right-0 mt-3 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-float">
                <div className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="font-semibold">Student notifications</p>
                    <p className="text-xs text-stone-500">{studentId ? 'Current child workspace' : 'Open a student to view notifications'}</p>
                  </div>
                  {studentId && (notifications.data?.unreadCount ?? 0) > 0 && <Badge>{notifications.data?.unreadCount} new</Badge>}
                </div>
                <div className="max-h-80 overflow-y-auto border-t">
                  {!studentId ? <p className="px-5 py-8 text-center text-sm text-stone-500">Choose a linked student first.</p> : notifications.data?.notifications.length ? notifications.data.notifications.slice(0, 7).map((item) => (
                    <div key={item.id} className="border-b border-stone-100 px-5 py-4 last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{item.title}</p>
                        {!item.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-coral" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{item.description}</p>
                      <p className="mt-1.5 text-[11px] font-medium text-moss-700">{relativeTime(item.createdAt)}</p>
                    </div>
                  )) : <p className="px-5 py-8 text-center text-sm text-stone-500">No notifications for this student.</p>}
                </div>
              </div>
            </details>

            <details className="relative">
              <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 hover:bg-white">
                <Avatar name={user.name} className="size-9 rounded-xl" />
                <ChevronDown size={15} className="hidden text-stone-400 sm:block" />
              </summary>
              <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-float">
                <div className="border-b border-stone-100 px-3 py-2.5">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-stone-500">@{user.username}</p>
                </div>
                <Link to="/parent/profile" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-moss-50 hover:text-moss-800"><ShieldCheck size={16} />Profile settings</Link>
                <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-moss-50 hover:text-moss-800" onClick={() => void signOut()}><LogOut size={16} />Sign out</button>
              </div>
            </details>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9"><Outlet /></main>
    </div>
  );
};
