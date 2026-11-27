import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Check, FileText, Loader2, TriangleAlert } from 'lucide-react';
import { RECOVERY_CATEGORIES } from '@kestrel/shared';
import { api } from '../../lib/api';
import { CATEGORY_ICON } from './RecoveryHome';

/** Step 3 of the journey: choose one of the six categories. */
export function NewApplication() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const highlight = params.get('category');
  const refs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (highlight) refs.current[highlight]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlight]);

  const start = useMutation({
    mutationFn: (category: string) => api.post<{ id: string }>('/recovery/cases', { category }),
    onSuccess: c => {
      qc.invalidateQueries({ queryKey: ['recovery-cases'] });
      navigate(`/dashboard/fund-recovery/apply/${c.id}`);
    },
  });

  return (
    <div>
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">Select a recovery category</h1>
      <p className="mt-1 text-sm text-muted">
        Choose the one that best describes your situation. You'll answer questions specific to it and see which documents help.
      </p>
      {start.isError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-bad">{(start.error as Error).message}</p>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {RECOVERY_CATEGORIES.map(c => {
          const Icon = CATEGORY_ICON[c.key];
          const busy = start.isPending && start.variables === c.key;
          return (
            <article
              key={c.key}
              ref={el => { refs.current[c.key] = el; }}
              className={`flex flex-col rounded-[24px] bg-white p-6 transition-shadow ${highlight === c.key ? 'ring-2 ring-night' : ''}`}
            >
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={22} /></span>
                <div>
                  <h2 className="font-display text-xl font-semibold">{c.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{c.description}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Situations covered</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {c.covers.map(x => (
                      <li key={x} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-brand" />{x}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Documents to prepare</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {c.evidence.map(e => (
                      <li key={e.key} className="flex gap-2"><FileText size={15} className="mt-0.5 shrink-0 text-muted" />{e.label}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {c.warning && (
                <p className="mt-4 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-warn">
                  <TriangleAlert size={15} className="shrink-0" /> {c.warning}
                </p>
              )}

              <button
                onClick={() => start.mutate(c.key)}
                disabled={start.isPending}
                className="mt-6 flex items-center justify-center gap-2 self-start rounded-full bg-night px-6 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? <Loader2 size={16} className="animate-spin" /> : null} Continue <ArrowRight size={16} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
