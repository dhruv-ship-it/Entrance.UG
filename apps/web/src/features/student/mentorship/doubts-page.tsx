import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, LockKeyhole, MessageCirclePlus, MessageSquareReply, Pin, Send, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn, formatDateTime } from '../../../lib/utils';

type DoubtStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
type Doubt = {
  id: string;
  title: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: DoubtStatus;
  isSatisfied: boolean;
  isPinned: boolean;
  createdAt: string;
  student: { id: string; name: string; profileImage?: string | null };
  _count: { replies: number };
};

type Reply = {
  id: string;
  replyText: string;
  isPinned: boolean;
  createdAt: string;
  student?: { id: string; name: string; profileImage?: string | null } | null;
  mentor?: { id: string; name: string; profileImage?: string | null } | null;
  admin?: { id: string; name: string; role: 'SUPER_ADMIN' | 'SUB_ADMIN' } | null;
  _count: { childReplies: number };
};

const RoleBadge = ({ name, role }: { name?: string; role: 'STUDENT' | 'MENTOR' | 'SUPER_ADMIN' | 'SUB_ADMIN' }) => {
  const label = role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'SUB_ADMIN' ? 'Sub Admin' : role === 'MENTOR' ? 'Mentor' : 'Student';
  const className = role === 'SUPER_ADMIN'
    ? 'bg-purple-100 text-purple-800'
    : role === 'SUB_ADMIN'
      ? 'bg-indigo-100 text-indigo-800'
      : role === 'MENTOR'
        ? 'bg-moss-100 text-moss-800'
        : 'bg-sky-100 text-sky-800';
  return <Badge className={className}>{name ? `${name} · ${label}` : label}</Badge>;
};

const ReplyAuthor = ({ reply }: { reply: Reply }) => {
  if (reply.admin) return <RoleBadge name={reply.admin.name} role={reply.admin.role} />;
  if (reply.mentor) return <RoleBadge name={reply.mentor.name} role="MENTOR" />;
  return <RoleBadge name={reply.student?.name ?? 'Student'} role="STUDENT" />;
};

const ReplyComposer = ({ onSubmit, pending, disabled, placeholder = 'Write a reply...' }: { onSubmit: (value: string) => void; pending?: boolean; disabled?: boolean; placeholder?: string }) => {
  const [value, setValue] = useState('');
  return (
    <div className="mt-3 flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled}
        className="focus-ring min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm disabled:bg-stone-50 disabled:text-stone-400"
        placeholder={disabled ? 'Closed doubts cannot receive replies' : placeholder}
      />
      <Button
        size="sm"
        disabled={disabled || !value.trim() || pending}
        onClick={() => {
          onSubmit(value);
          setValue('');
        }}
      >
        <Send size={14} /> Send
      </Button>
    </div>
  );
};

const ReplyThread = ({ doubt, canPin, parentReplyId }: { doubt: Doubt; canPin: boolean; parentReplyId?: string | null }) => {
  const client = useQueryClient();
  const [take, setTake] = useState(3);
  const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({});
  const queryKey = ['mentorship-doubt-replies', doubt.id, parentReplyId ?? 'root', take];
  const replies = useQuery({
    queryKey,
    queryFn: () => api<{ replies: Reply[] }>(`/api/v1/mentorship/doubts/${doubt.id}/replies?take=${take}${parentReplyId ? `&parentReplyId=${parentReplyId}` : ''}`),
  });
  const addReply = useMutation({
    mutationFn: ({ replyText, parentId }: { replyText: string; parentId?: string | null }) => api<{ reply: Reply }>(`/api/v1/mentorship/doubts/${doubt.id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ replyText, parentReplyId: parentId ?? null }),
    }),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ['mentorship-doubts'] });
      client.invalidateQueries({ queryKey: ['mentorship-doubt-replies', doubt.id, variables.parentId ?? 'root'] });
    },
  });
  const pinReply = useMutation({
    mutationFn: ({ replyId, isPinned }: { replyId: string; isPinned: boolean }) => api(`/api/v1/mentorship/replies/${replyId}/pinned`, {
      method: 'PATCH',
      body: JSON.stringify({ isPinned }),
    }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mentorship-doubt-replies', doubt.id] }),
  });

  if (replies.isLoading) return <Skeleton className="mt-4 h-24" />;

  return (
    <div className={cn('space-y-3', parentReplyId ? 'mt-3 border-l border-stone-200 pl-4' : 'mt-4')}>
      {replies.data?.replies.map((reply) => (
        <div key={reply.id} className={cn('rounded-2xl border bg-white p-4', reply.isPinned ? 'border-lime/70 shadow-sm' : 'border-stone-200')}>
          <div className="flex flex-wrap items-center gap-2">
            <ReplyAuthor reply={reply} />
            {reply.isPinned && <Badge className="bg-lime/40 text-moss-900"><Pin size={12} /> Pinned</Badge>}
            <span className="text-xs font-medium text-stone-400">{formatDateTime(reply.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-600">{reply.replyText}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {canPin && (
              <button className="text-xs font-bold text-moss-700" onClick={() => pinReply.mutate({ replyId: reply.id, isPinned: !reply.isPinned })}>
                {reply.isPinned ? 'Unpin reply' : 'Pin reply'}
              </button>
            )}
            {reply._count.childReplies > 0 && (
              <button className="text-xs font-bold text-moss-700" onClick={() => setExpandedChildren((state) => ({ ...state, [reply.id]: !state[reply.id] }))}>
                {expandedChildren[reply.id] ? 'Hide replies' : `Show ${reply._count.childReplies} replies`}
              </button>
            )}
          </div>
          <ReplyComposer
            disabled={doubt.status === 'CLOSED'}
            pending={addReply.isPending}
            placeholder="Reply to this message..."
            onSubmit={(replyText) => addReply.mutate({ replyText, parentId: reply.id })}
          />
          {expandedChildren[reply.id] && <ReplyThread doubt={doubt} canPin={canPin} parentReplyId={reply.id} />}
        </div>
      ))}
      {!parentReplyId && !replies.data?.replies.length && <p className="text-sm text-stone-500">No replies yet.</p>}
      {!parentReplyId && doubt._count.replies > take && (
        <button className="text-sm font-bold text-moss-700" onClick={() => setTake((value) => value + 3)}>
          Load more replies
        </button>
      )}
    </div>
  );
};

const DoubtCard = ({ doubt, batchId, isMine }: { doubt: Doubt; batchId: string; isMine: boolean }) => {
  const client = useQueryClient();
  const [openReplies, setOpenReplies] = useState(false);
  const addReply = useMutation({
    mutationFn: (replyText: string) => api(`/api/v1/mentorship/doubts/${doubt.id}/replies`, {
      method: 'POST',
      body: JSON.stringify({ replyText, parentReplyId: null }),
    }),
    onSuccess: () => {
      setOpenReplies(true);
      client.invalidateQueries({ queryKey: ['mentorship-doubts', batchId] });
      client.invalidateQueries({ queryKey: ['mentorship-doubt-replies', doubt.id] });
    },
  });
  const setStatus = useMutation({
    mutationFn: (status: DoubtStatus) => api(`/api/v1/mentorship/doubts/${doubt.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['mentorship-doubts', batchId] }),
  });

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-stone-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={doubt.visibility === 'PUBLIC' ? 'bg-sky-100 text-sky-800' : 'bg-stone-100 text-stone-700'}>
                {doubt.visibility === 'PUBLIC' ? <UsersRound size={12} /> : <LockKeyhole size={12} />} {doubt.visibility}
              </Badge>
              <Badge className={doubt.status === 'CLOSED' ? 'bg-stone-100 text-stone-700' : doubt.status === 'ANSWERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber/20 text-[#93620c]'}>
                {doubt.status}
              </Badge>
              {doubt.isPinned && <Badge className="bg-lime/40 text-moss-900"><Pin size={12} /> Pinned</Badge>}
            </div>
            <h2 className="mt-3 text-lg font-bold text-ink">{doubt.title}</h2>
          </div>
          {isMine && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate('OPEN')}>Reopen</Button>
              <Button size="sm" variant="secondary" disabled={setStatus.isPending} onClick={() => setStatus.mutate('ANSWERED')}><ShieldCheck size={14} /> Answered</Button>
              <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate('CLOSED')}>Close</Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">{doubt.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-stone-400">
          <RoleBadge name={doubt.student.name} role="STUDENT" />
          <span>{formatDateTime(doubt.createdAt)}</span>
          <span>{doubt._count.replies} replies</span>
        </div>
      </div>
      <div className="bg-stone-50/60 p-5">
        <button className="inline-flex items-center gap-2 text-sm font-bold text-moss-700" onClick={() => setOpenReplies((value) => !value)}>
          <MessageSquareReply size={16} /> {openReplies ? 'Hide thread' : 'Open thread'}
        </button>
        <ReplyComposer disabled={doubt.status === 'CLOSED'} pending={addReply.isPending} onSubmit={(replyText) => addReply.mutate(replyText)} />
        {openReplies && <ReplyThread doubt={doubt} canPin={isMine} />}
      </div>
    </Card>
  );
};

export const DoubtsPage = () => {
  const { batchId = '' } = useParams();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [scope, setScope] = useState<'mine' | 'public'>('mine');
  const [status, setStatus] = useState<'ALL' | DoubtStatus>('ALL');

  const queryPath = `/api/v1/mentorship/batches/${batchId}/doubts?scope=${scope}${scope === 'public' && status !== 'ALL' ? `&status=${status}` : ''}`;
  const doubts = useQuery({ queryKey: ['mentorship-doubts', batchId, scope, status], queryFn: () => api<{ doubts: Doubt[] }>(queryPath) });
  const create = useMutation({
    mutationFn: () => api(`/api/v1/mentorship/batches/${batchId}/doubts`, { method: 'POST', body: JSON.stringify({ title, description, visibility }) }),
    onSuccess: () => {
      setOpen(false);
      setTitle('');
      setDescription('');
      setScope('mine');
      client.invalidateQueries({ queryKey: ['mentorship-doubts', batchId] });
    },
  });

  if (doubts.isLoading) return <Skeleton className="h-[520px]" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="inline-flex items-center gap-1 text-sm font-semibold text-moss-700" to={`/student/mentorship/batches/${batchId}`}>
            <ChevronLeft size={16} /> Batch dashboard
          </Link>
          <p className="mt-4 eyebrow">Batch discussion</p>
          <h1 className="text-3xl font-bold">Doubts</h1>
          <p className="mt-2 text-sm text-stone-500">Your private doubts stay with mentors. Public doubts are visible to the batch until closed.</p>
        </div>
        <Button onClick={() => setOpen((value) => !value)}><MessageCirclePlus size={16} />Ask a doubt</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={scope === 'mine' ? 'primary' : 'outline'} onClick={() => setScope('mine')}>My doubts</Button>
        <Button size="sm" variant={scope === 'public' ? 'primary' : 'outline'} onClick={() => setScope('public')}>Public doubts</Button>
        {scope === 'public' && (
          <select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | DoubtStatus)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
            <option value="ALL">All public</option>
            <option value="OPEN">Open</option>
            <option value="ANSWERED">Answered</option>
            <option value="CLOSED">Closed</option>
          </select>
        )}
      </div>

      {open && (
        <Card className="p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="focus-ring rounded-xl border border-stone-200 px-3 py-2.5" placeholder="Write a clear title" />
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
              <option value="PUBLIC">Public to batch</option>
              <option value="PRIVATE">Private with mentors</option>
            </select>
          </div>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} className="focus-ring mt-3 min-h-32 w-full rounded-xl border border-stone-200 p-3" placeholder="Describe your question with context, what you tried, and where you are stuck." />
          <div className="mt-3 flex justify-end">
            <Button disabled={!title.trim() || !description.trim() || create.isPending} onClick={() => create.mutate()}>{create.isPending ? 'Posting...' : 'Post doubt'}</Button>
          </div>
        </Card>
      )}

      {doubts.data?.doubts.length ? (
        <div className="space-y-4">{doubts.data.doubts.map((doubt) => <DoubtCard key={doubt.id} doubt={doubt} batchId={batchId} isMine={scope === 'mine'} />)}</div>
      ) : (
        <EmptyState icon={MessageCirclePlus} title="No doubts found" description="Try another filter or start a new discussion." />
      )}
    </div>
  );
};
