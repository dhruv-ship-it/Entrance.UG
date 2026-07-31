import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellRing, BookOpen, CreditCard, FileBarChart2, GraduationCap, Megaphone, Radio } from 'lucide-react';

import { EmptyState } from '../../components/empty-state';
import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import { api } from '../../lib/api';
import { relativeTime } from '../../lib/utils';

type Notification = { id: string; title: string; description: string; type: 'SYSTEM' | 'MOCK' | 'CONTENT' | 'MENTORSHIP' | 'RC' | 'PURCHASE'; actionUrl: string | null; isRead: boolean; createdAt: string; priority: string | null; isSystemNotice: boolean };
type Response = { notifications: Notification[]; unreadCount: number };

const iconFor = (type: Notification['type']) => ({ SYSTEM: { icon: Megaphone, color: 'bg-moss-100 text-moss-800' }, MOCK: { icon: FileBarChart2, color: 'bg-coral/15 text-[#b54c3a]' }, CONTENT: { icon: BookOpen, color: 'bg-sky/15 text-[#28718d]' }, MENTORSHIP: { icon: GraduationCap, color: 'bg-amber/15 text-[#9a6810]' }, RC: { icon: Radio, color: 'bg-violet-100 text-violet-700' }, PURCHASE: { icon: CreditCard, color: 'bg-lime/45 text-moss-800' } }[type]);

export const NotificationsPage = () => {
  const client = useQueryClient(); const notifications = useQuery({ queryKey: ['student-notifications'], queryFn: () => api<Response>('/api/v1/students/notifications') });
  const read = useMutation({ mutationFn: (id: string) => api(`/api/v1/students/notifications/${id}/read`, { method: 'POST' }), onSuccess: () => void client.invalidateQueries({ queryKey: ['student-notifications'] }) });
  if (notifications.isLoading) return <div className="space-y-4"><Skeleton className="h-20 w-80" />{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28" />)}</div>;
  if (notifications.isError || !notifications.data) return <EmptyState icon={Bell} title="Notifications are unavailable" description="Please refresh the page. If this continues, contact support." />;
  return <div className="mx-auto max-w-4xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Stay informed</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Notifications</h1><p className="mt-2 text-sm text-stone-500">Important study, mentorship and account updates live here.</p></div>{notifications.data.unreadCount > 0 && <Badge className="bg-lime/50 px-3 py-1.5 text-moss-900">{notifications.data.unreadCount} new updates</Badge>}</div><div className="mt-7 space-y-3">{notifications.data.notifications.length ? notifications.data.notifications.map((item) => { const style = iconFor(item.type); const Icon = style.icon; return <button key={item.id} onClick={() => !item.isRead && !item.isSystemNotice && read.mutate(item.id)} className={`focus-ring flex w-full gap-4 rounded-3xl border p-5 text-left transition hover:-translate-y-px hover:shadow-card ${item.isRead ? 'border-stone-200 bg-white' : 'border-moss-200 bg-moss-50/40'}`}><div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${style.color}`}><Icon size={20} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{item.title}</p>{!item.isRead && <span className="size-2 rounded-full bg-moss-600" />}{item.priority === 'HIGH' && <Badge className="bg-coral/15 text-[#b54c3a]">Important</Badge>}</div><p className="mt-1.5 text-sm leading-6 text-stone-500">{item.description}</p><p className="mt-2 text-xs font-medium text-stone-400">{relativeTime(item.createdAt)}</p></div></button>; }) : <EmptyState icon={BellRing} title="You’re all caught up" description="New notices and updates relevant to your preparation will appear here." />}</div></div>;
};

