import { useState } from 'react';
import { Bell, ChevronDown, CircleUserRound, GraduationCap, LayoutDashboard, LogOut, Menu, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { Avatar } from '../../components/ui/avatar';
import { cn } from '../../lib/utils';
import { useAuth } from '../auth/auth-context';

const navigation = [
  { to: '/parent/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/parent/profile', label: 'My profile', icon: CircleUserRound },
];

export const ParentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  if (!user) return null;

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <aside className="flex h-full w-[272px] flex-col overflow-hidden border-r border-moss-900/20 bg-moss-900 px-4 py-5 text-moss-100">
      <Link to="/parent/dashboard" className="flex items-center gap-3 px-3 py-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-lime text-moss-900"><GraduationCap size={22} strokeWidth={2.3} /></span>
        <span>
          <span className="block text-base font-bold text-white">Entrance UG</span>
          <span className="text-[10px] font-semibold uppercase tracking-[.18em] text-moss-200">Parent portal</span>
        </span>
      </Link>

      <nav className="mt-9 space-y-1">
        {navigation.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} onClick={() => setIsOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition', isActive ? 'bg-white/12 text-white shadow-sm' : 'text-moss-100/75 hover:bg-white/8 hover:text-white')}>
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
        <UsersRound size={19} className="text-lime" />
        <p className="mt-3 text-sm font-semibold text-white">Linked students</p>
        <p className="mt-1 text-xs leading-5 text-moss-100/65">Progress appears only for students who have added this parent account.</p>
      </div>

      <div className="mt-auto border-t border-white/10 pt-4">
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
              <p className="hidden text-xs font-semibold text-stone-400 sm:block">Parent workspace</p>
              <p className="text-sm font-semibold text-ink sm:hidden">Entrance UG</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-stone-600 shadow-card"><Bell size={18} /></span>
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
        </header>
        <main className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-9"><Outlet /></main>
      </div>
    </div>
  );
};
