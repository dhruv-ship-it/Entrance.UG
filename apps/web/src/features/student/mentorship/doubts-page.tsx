import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, LockKeyhole, MessageCirclePlus, MessageSquareReply, Send, ShieldCheck, UsersRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../../components/empty-state';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { api } from '../../../lib/api';
import { cn, formatDateTime } from '../../../lib/utils';

type Doubt = {
  id: string;
  title: string;
  description: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  isSatisfied: boolean;
  createdAt: string;
  student: { id: string; name: string; profileImage?: string | null };
  _count: { replies: number };
};

type Reply = {
  id: string;
  replyText: string;
  createdAt: string;
  student?: { id: string; name: string; profileImage?: string | null } | null;
  mentor?: { id: string; name: string; profileImage?: string | null } | null;
  _count: { childReplies: number };
};

const AuthorPill = ({ reply }: { reply: Reply }) => {
  const author = reply.mentor ?? reply.student;
  const isMentor = Boolean(reply.mentor);
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-600">
      <span className={cn('grid size-5 place-items-center rounded-full text-[10px] text-white', isMentor ? 'bg-moss-700' : 'bg-sky-600')}>
        {author?.name.split(' ').map((part) => part[0]).slice(0, 2).join('') ?? 'U'}
      </span>
      {author?.name ?? 'User'} {isMentor ? 'Mentor' : 'Student'}
    </div>
  );
};

const ReplyComposer = ({ onSubmit, pending, placeholder = 'Write a reply...' }: { onSubmit: (value: string) => void; pending?: boolean; placeholder?: string }) => {
  const [value, setValue] = useState('');

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="focus-ring min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm"
        placeholder={placeholder}
      />
      <Button
        size="sm"
        disabled={!value.trim() || pending}
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

const ReplyThread = ({ doubtId, parentReplyId }: { doubtId: string; parentReplyId?: string | null }) => {
  const client = useQueryClient();
  const queryKey = ['mentorship-doubt-replies', doubtId, parentReplyId ?? 'root'];
  const replies = useQuery({
    queryKey,
    queryFn: () => api<{ replies: Reply[] }>(`/api/v1/mentorship/doubts/${doubtId}/replies${parentReplyId ? `?parentReplyId=${parentReplyId}` : ''}`),
  });
  const [expandedChildren, setExpandedChildren] = useState<Record<string, boolean>>({});
  const addReply = useMutation({
    mutationFn: ({ replyText, parentId }: { replyText: string; parentId?: string | null }) => api<{ reply: Reply }>(`/api/v1/mentorship/doubts/${doubtId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ replyText, parentReplyId: parentId ?? null }),
    }),
    onSuccess: (_, variables) => {
      client.invalidateQueries({ queryKey: ['mentorship-doubts'] });
      client.invalidateQueries({ queryKey: ['mentorship-doubt-replies', doubtId, variables.parentId ?? 'root'] });
    },
  });

  if (replies.isLoading) return <Skeleton className="mt-4 h-24" />;

  return (
    <div className={cn('space-y-3', parentReplyId ? 'mt-3 border-l border-stone-200 pl-4' : 'mt-4')}>
      {replies.data?.replies.map((reply) => (
        <div key={reply.id} className="rounded-2xl border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <AuthorPill reply={reply} />
            <span className="text-xs font-medium text-stone-400">{formatDateTime(reply.createdAt)}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-600">{reply.replyText}</p>
          <ReplyComposer
            pending={addReply.isPending}
            placeholder="Reply to this message..."
            onSubmit={(replyText) => addReply.mutate({ replyText, parentId: reply.id })}
          />
          {reply._count.childReplies > 0 && (
            <button
              className="mt-3 text-xs font-bold text-moss-700"
              onClick={() => setExpandedChildren((state) => ({ ...state, [reply.id]: !state[reply.id] }))}
            >
              {expandedChildren[reply.id] ? 'Hide replies' : `Show ${reply._count.childReplies} replies`}
            </button>
          )}
          {expandedChildren[reply.id] && <ReplyThread doubtId={doubtId} parentReplyId={reply.id} />}
        </div>
      ))}
      {!parentReplyId && !replies.data?.replies.length && <p className="text-sm text-stone-500">No replies yet.</p>}
    </div>
  );
};

const DoubtCard = ({ doubt, batchId }: { doubt: Doubt; batchId: string }) => {
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
      client.invalidateQueries({ queryKey: ['mentorship-doubt-replies', doubt.id, 'root'] });
    },
  });
  const satisfy = useMutation({
    mutationFn: (isSatisfied: boolean) => api(`/api/v1/mentorship/doubts/${doubt.id}/satisfied`, {
      method: 'PATCH',
      body: JSON.stringify({ isSatisfied }),
    }),
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
              <Badge className={doubt.isSatisfied ? 'bg-emerald-100 text-emerald-800' : 'bg-amber/20 text-[#93620c]'}>
                {doubt.isSatisfied ? 'Satisfied' : doubt.status}
              </Badge>
            </div>
            <h2 className="mt-3 text-lg font-bold text-ink">{doubt.title}</h2>
          </div>
          <Button
            size="sm"
            variant={doubt.isSatisfied ? 'secondary' : 'outline'}
            disabled={satisfy.isPending}
            onClick={() => satisfy.mutate(!doubt.isSatisfied)}
          >
            <ShieldCheck size={14} /> {doubt.isSatisfied ? 'Undo satisfied' : 'Mark satisfied'}
          </Button>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">{doubt.description}</p>
        <p className="mt-4 text-xs font-medium text-stone-400">
          Asked by {doubt.student.name} · {formatDateTime(doubt.createdAt)} · {doubt._count.replies} replies
        </p>
      </div>
      <div className="bg-stone-50/60 p-5">
        <button className="inline-flex items-center gap-2 text-sm font-bold text-moss-700" onClick={() => setOpenReplies((value) => !value)}>
          <MessageSquareReply size={16} /> {openReplies ? 'Hide thread' : 'Open thread'}
        </button>
        <ReplyComposer pending={addReply.isPending} onSubmit={(replyText) => addReply.mutate(replyText)} />
        {openReplies && <ReplyThread doubtId={doubt.id} />}
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

  const doubts = useQuery({
    queryKey: ['mentorship-doubts', batchId],
    queryFn: () => api<{ doubts: Doubt[] }>(`/api/v1/mentorship/batches/${batchId}/doubts`),
  });
  const create = useMutation({
    mutationFn: () => api(`/api/v1/mentorship/batches/${batchId}/doubts`, {
      method: 'POST',
      body: JSON.stringify({ title, description, visibility }),
    }),
    onSuccess: () => {
      setOpen(false);
      setTitle('');
      setDescription('');
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
          <p className="mt-2 text-sm text-stone-500">Public doubts are visible to the batch. Private doubts stay between you and assigned mentors.</p>
        </div>
        <Button onClick={() => setOpen((value) => !value)}><MessageCirclePlus size={16} />Ask a doubt</Button>
      </div>

      {open && (
        <Card className="p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="focus-ring rounded-xl border border-stone-200 px-3 py-2.5"
              placeholder="Write a clear title"
            />
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as 'PUBLIC' | 'PRIVATE')}
              className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            >
              <option value="PUBLIC">Public to batch</option>
              <option value="PRIVATE">Private with mentors</option>
            </select>
          </div>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="focus-ring mt-3 min-h-32 w-full rounded-xl border border-stone-200 p-3"
            placeholder="Describe your question with context, what you tried, and where you are stuck."
          />
          <div className="mt-3 flex justify-end">
            <Button disabled={!title.trim() || !description.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Posting...' : 'Post doubt'}
            </Button>
          </div>
        </Card>
      )}

      {doubts.data?.doubts.length ? (
        <div className="space-y-4">
          {doubts.data.doubts.map((doubt) => <DoubtCard key={doubt.id} doubt={doubt} batchId={batchId} />)}
        </div>
      ) : (
        <EmptyState icon={MessageCirclePlus} title="No doubts yet" description="Start the conversation when you need help with a concept or question." />
      )}
    </div>
  );
};
