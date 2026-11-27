import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { Avatar, Badge, Empty, Loading, PageHeader, fmtDateTime } from './ui';

type Thread = {
  userId: string;
  user: { id: string; name: string; email: string };
  lastMessage: string;
  lastSender: string;
  lastAt: string;
  waiting: boolean;
};
type Msg = { id: string; sender: 'CUSTOMER' | 'ADMIN' | 'BOT'; body: string; createdAt: string };

export function AdminSupport() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('user') ?? '';
  const { data: threads, isLoading } = useQuery({
    queryKey: ['admin-threads'],
    queryFn: () => api.get<Thread[]>('/admin/support/threads'),
    refetchInterval: 10_000,
  });

  const open = (id: string) => setParams(id ? { user: id } : {});

  return (
    <div>
      <PageHeader title="Support inbox" subtitle="Chats from customers. Waiting chats need a reply from staff." />
      <div className="grid h-[calc(100vh-200px)] min-h-[480px] gap-4 lg:grid-cols-[340px_1fr]">
        {/* Thread list */}
        <div className={`overflow-y-auto rounded-[22px] bg-white ${selected ? 'hidden lg:block' : ''}`}>
          {isLoading ? <div className="p-4"><Loading h="h-60" /></div> : !threads?.length ? (
            <p className="p-8 text-center text-sm text-muted">No chats yet</p>
          ) : (
            <ul className="divide-y divide-line">
              {threads.map(t => (
                <li key={t.userId}>
                  <button
                    onClick={() => open(t.userId)}
                    className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors ${selected === t.userId ? 'bg-paper' : 'hover:bg-paper/60'}`}
                  >
                    <Avatar name={t.user?.name ?? '?'} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{t.user?.name}</span>
                        <span className="shrink-0 text-[11px] text-muted">{fmtDateTime(t.lastAt)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {t.lastSender === 'ADMIN' ? 'You: ' : t.lastSender === 'BOT' ? 'Auto-reply: ' : ''}{t.lastMessage}
                      </span>
                      {t.waiting && <span className="mt-1.5 inline-block"><Badge tone="amber">Waiting for reply</Badge></span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Conversation */}
        <div className={`${selected ? '' : 'hidden lg:block'}`}>
          {selected ? (
            <Conversation userId={selected} name={threads?.find(t => t.userId === selected)?.user.name} onBack={() => open('')} />
          ) : (
            <Empty>Choose a chat on the left.</Empty>
          )}
        </div>
      </div>
    </div>
  );
}

function Conversation({ userId, name, onBack }: { userId: string; name?: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const { data: msgs } = useQuery({
    queryKey: ['admin-thread', userId],
    queryFn: () => api.get<Msg[]>(`/admin/support/threads/${userId}`),
    refetchInterval: 5_000,
  });
  const send = useMutation({
    mutationFn: () => api.post(`/admin/support/threads/${userId}`, { body: text }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['admin-thread', userId] });
      qc.invalidateQueries({ queryKey: ['admin-threads'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs?.length]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[22px] bg-white">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <button onClick={onBack} className="lg:hidden" aria-label="Back"><ArrowLeft size={18} /></button>
        <Avatar name={name ?? '?'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name ?? 'Customer'}</p>
          <Link to={`/admin/customers/${userId}`} className="text-xs font-medium text-brand hover:underline">Open customer</Link>
        </div>
      </div>
      <div className="flex-1 space-y-2.5 overflow-y-auto bg-paper/50 p-5">
        {msgs?.map(m => (
          <div key={m.id} className={`flex ${m.sender === 'CUSTOMER' ? 'justify-start' : 'justify-end'}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                m.sender === 'CUSTOMER' ? 'rounded-bl-md bg-white' : m.sender === 'BOT' ? 'rounded-br-md bg-black/5 text-muted' : 'rounded-br-md bg-night text-white'
              }`}
            >
              {m.sender === 'BOT' && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider">Auto-reply</p>}
              <p className="whitespace-pre-wrap">{m.body}</p>
              <p className={`mt-1 text-[10px] ${m.sender === 'ADMIN' ? 'text-white/50' : 'text-muted'}`}>{fmtDateTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        onSubmit={e => { e.preventDefault(); if (text.trim()) send.mutate(); }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write a reply…"
          maxLength={2000}
          className="flex-1 rounded-full border border-line px-4 py-2.5 text-sm outline-none focus:border-night"
        />
        <button type="submit" disabled={!text.trim() || send.isPending} className="grid h-11 w-11 place-items-center rounded-full bg-night text-white disabled:opacity-40" aria-label="Send">
          <Send size={16} />
        </button>
      </form>
      {send.isError && <p className="px-4 pb-3 text-sm text-bad">{(send.error as Error).message}</p>}
    </div>
  );
}
