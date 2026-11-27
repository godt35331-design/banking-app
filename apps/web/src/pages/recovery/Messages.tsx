import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import type { CaseDetail } from './ApplicationDetail';
import { StatusBadge, Thread, catName, type CaseSummary } from './shared';

/** All case conversations in one place. */
export function RecoveryMessages() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('case') ?? '';
  const { data: cases } = useQuery({
    queryKey: ['recovery-cases'],
    queryFn: () => api.get<CaseSummary[]>('/recovery/cases'),
    refetchInterval: 15_000,
  });
  const list = (cases ?? []).filter(c => c.status !== 'DRAFT');

  return (
    <div>
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">Messages</h1>
      <p className="mb-5 mt-1 text-sm text-muted">Talk to the case officer handling each application.</p>
      {!list.length ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-sm text-muted">Messages appear here once you've submitted an application.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <ul className={`space-y-2 ${selected ? 'hidden lg:block' : ''}`}>
            {list.map(c => (
              <li key={c.id}>
                <button onClick={() => setParams({ case: c.id })}
                  className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors ${selected === c.id ? 'bg-night text-white' : 'bg-white hover:bg-black/5'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.reference}</span>
                    <span className={`block truncate text-xs ${selected === c.id ? 'text-white/60' : 'text-muted'}`}>{catName(c.category)}</span>
                  </span>
                  {(c.unreadMessages ?? 0) > 0 ? (
                    <span className="grid h-6 min-w-6 place-items-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">{c.unreadMessages}</span>
                  ) : <StatusBadge status={c.status} />}
                </button>
              </li>
            ))}
          </ul>
          <div className={selected ? '' : 'hidden lg:block'}>
            {selected ? <Conversation id={selected} onBack={() => setParams({})} /> : (
              <div className="rounded-[24px] bg-white p-10 text-center text-sm text-muted">Choose an application.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Conversation({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: c } = useQuery({
    queryKey: ['recovery-case', id],
    queryFn: () => api.get<CaseDetail>(`/recovery/cases/${id}`),
    refetchInterval: 8_000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['recovery-case', id] });
    qc.invalidateQueries({ queryKey: ['recovery-cases'] });
  };
  const send = useMutation({ mutationFn: (body: string) => api.post(`/recovery/cases/${id}/messages`, { body }), onSuccess: refresh });
  const read = useMutation({ mutationFn: () => api.post(`/recovery/cases/${id}/messages/read`), onSuccess: refresh });
  const unread = c?.messages.filter(m => m.sender === 'STAFF' && !m.readAt).length ?? 0;
  useEffect(() => { if (unread) read.mutate(); }, [unread, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return <div className="skeleton h-80" />;
  return (
    <section className="rounded-[24px] bg-white p-5">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden" aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{c.reference}</p>
          <p className="text-xs text-muted">{catName(c.category)}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>
      <Thread
        messages={c.messages}
        me="CUSTOMER"
        onSend={body => send.mutateAsync(body)}
        sending={send.isPending}
        error={send.isError ? (send.error as Error).message : ''}
        disabled={c.status === 'CLOSED'}
        disabledText="This case is closed. Contact support if you need help."
      />
    </section>
  );
}
