import { useState } from 'react';
import { Bell, BookOpenCheck, BookOpenText, ChevronDown, CircleUserRound, ClipboardList, CreditCard, GraduationCap, LayoutDashboard, LogOut, Menu, ScrollText, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { api } from '../../lib/api';
import { cn, relativeTime } from '../../lib/utils';
import { useAuth } from '../auth/auth-context';

type Notification = { id: string; title: string; description: string; type: string; isRead: boolean; createdAt: string; isDashboardNotification: boolean };
type NotificationResponse = { notifications: Notification[]; unreadCount: number };

const navigation = [
  { to: '/student/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/student/mock-tests', label: 'Mock tests', icon: ClipboardList },
  { to: '/student/content', label: 'Learning content', icon: BookOpenText },
  { to: '/student/rc', label: 'RC practice', icon: ScrollText },
  { to: '/student/mentorship', label: 'Mentorship', icon: UsersRound },
  { to: '/student/plans', label: 'Plans', icon: CreditCard },
  { to: '/student/profile', label: 'My profile', icon: CircleUserRound },
  { to: '/student/account', label: 'Account hub', icon: ShieldCheck },
];

export const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useQuery({ queryKey: ['student-notifications'], queryFn: () => api<NotificationResponse>('/api/v1/students/notifications') });

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (!user) return null;

  const sidebar = (
    <aside className="flex h-full w-[272px] flex-col overflow-hidden border-r border-moss-900/20 bg-moss-900 px-4 py-5 text-moss-100">
      <div className="flex items-center justify-between">
        <Link to="/student/dashboard" className="flex items-center gap-3 px-3 py-2">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lime text-moss-900"><GraduationCap size={22} strokeWidth={2.3} /></span>
          <span>
            <span className="block text-base font-bold text-white">Entrance UG</span>
            <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-moss-200">Student portal</span>
          </span>
        </Link>
      </div>

      <nav className="mt-9 space-y-1">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/student/mock-tests' || to === '/student/content'} onClick={() => setIsOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition', isActive ? 'bg-white/12 text-white shadow-sm' : 'text-moss-100/75 hover:bg-white/8 hover:text-white')}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 px-3">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[.18em] text-moss-200/70">Your preparation</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <BookOpenCheck size={19} className="text-lime" />
          <p className="mt-3 text-sm font-semibold text-white">Build your rhythm</p>
          <p className="mt-1 text-xs leading-5 text-moss-100/65">Mocks, content and mentoring will appear here as you unlock them.</p>
        </div>
      </div>

      <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
        <Link to="/student/notifications" onClick={() => setIsOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-moss-100/80 transition hover:bg-white/8 hover:text-white">
          <span className="flex items-center gap-3"><Bell size={18} /><span>Notifications</span></span>
          {(notifications.data?.unreadCount ?? 0) > 0 && <Badge className="bg-lime px-2 text-moss-900">{notifications.data?.unreadCount}</Badge>}
        </Link>
        <button onClick={() => void signOut()} className="focus-ring flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-moss-100/80 transition hover:bg-white/8 hover:text-white">
          <LogOut size={18} /><span>Sign out</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-canvas lg:flex">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-20 lg:block">{sidebar}</div>
      <div className="fixed inset-0 z-50 bg-moss-900/35 backdrop-blur-sm transition lg:hidden" hidden={!isOpen} onClick={() => setIsOpen(false)}>
        <div className="h-full w-[272px]" onClick={(event) => event.stopPropagation()}>{sidebar}</div>
      </div>

      <div className="min-w-0 flex-1 lg:pl-[272px]">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-stone-200/80 bg-canvas/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <button className="focus-ring grid size-10 place-items-center rounded-xl bg-white text-moss-800 shadow-card lg:hidden" onClick={() => setIsOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
            <div>
              <p className="hidden text-xs font-semibold text-stone-400 sm:block">Student workspace</p>
              <p className="text-sm font-semibold text-ink sm:hidden">Entrance UG</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <details className="relative">
              <summary className="focus-ring grid size-10 cursor-pointer place-items-center rounded-xl bg-white text-stone-600 shadow-card marker:content-none" aria-label="Open notifications">
                <Bell size={18} />
                {(notifications.data?.unreadCount ?? 0) > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-coral ring-2 ring-white" />}
              </summary>
              <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2.5rem))] overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-float">
                <div className="flex items-center justify-between px-5 py-4">
                  <p className="font-semibold">Notifications</p>
                  {(notifications.data?.unreadCount ?? 0) > 0 && <Badge>{notifications.data?.unreadCount} new</Badge>}
                </div>
                <div className="max-h-80 overflow-y-auto border-t">
                  {notifications.data?.notifications.length ? notifications.data.notifications.slice(0, 5).map((item) => (
                    <div key={item.id} className="border-b border-stone-100 px-5 py-4 last:border-0">
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{item.description}</p>
                      <p className="mt-1.5 text-[11px] font-medium text-moss-700">{relativeTime(item.createdAt)}</p>
                    </div>
                  )) : <p className="px-5 py-8 text-center text-sm text-stone-500">You're all caught up.</p>}
                </div>
                <Link to="/student/notifications" className="block bg-moss-50 px-5 py-3 text-center text-sm font-semibold text-moss-800 hover:bg-moss-100">View all notifications</Link>
              </div>
            </details>

            <details className="relative">
              <summary className="focus-ring flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 hover:bg-white">
                <Avatar name={user.name} src={user.profileImage} className="size-9 rounded-xl" />
                <ChevronDown size={15} className="hidden text-stone-400 sm:block" />
              </summary>
              <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-float">
                <div className="border-b border-stone-100 px-3 py-2.5">
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="truncate text-xs text-stone-500">@{user.username}</p>
                </div>
                <Link to="/student/profile" className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-moss-50 hover:text-moss-800"><CircleUserRound size={16} />Profile settings</Link>
                <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-stone-600 hover:bg-moss-50 hover:text-moss-800" onClick={() => void signOut()}><LogOut size={16} />Sign out</button>
              </div>
            </details>
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9"><Outlet /></main>
      </div>
    </div>
  );
};
