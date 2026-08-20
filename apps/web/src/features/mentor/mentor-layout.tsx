import { Bell, ChevronDown, GraduationCap, LogOut } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { useAuth } from '../auth/auth-context';

export const MentorLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-5 lg:px-8">
          <Link to="/mentor/programs" className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-lime text-moss-950"><GraduationCap size={22} /></span>
            <div><p className="text-lg font-black">Entrance UG</p><p className="text-[11px] font-bold uppercase tracking-[.22em] text-moss-700">Mentor Portal</p></div>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="size-11 p-0"><Bell size={18} /></Button>
            <div className="flex items-center gap-2 rounded-2xl bg-moss-50 px-3 py-2">
              <Avatar name={user?.name ?? 'Mentor'} src={user?.profileImage} className="size-9 rounded-xl" />
              <span className="hidden text-sm font-semibold sm:inline">{user?.name}</span>
              <ChevronDown size={15} className="text-stone-400" />
            </div>
            <Button variant="ghost" className="size-11 p-0" onClick={async () => { await logout(); navigate('/login'); }}><LogOut size={18} /></Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-5 py-8 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};
