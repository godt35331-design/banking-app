import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, FileWarning } from 'lucide-react';
import { api } from '../../lib/api';
import { DropZone, Panel, catName, fmtDate, fmtSize, type DocMeta } from './shared';

type Centre = {
  documents: (DocMeta & { caseId: string; case: { reference: string | null; category: string } })[];
  requests: { id: string; label: string; note: string | null; createdAt: string; case: { id: string; reference: string | null; category: string; status: string } }[];
};

/** Every uploaded document, and every document a case officer has asked for. */
export function DocumentCentre() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['recovery-centre'],
    queryFn: () => api.get<Centre>('/recovery/centre'),
    refetchInterval: 20_000,
  });
  const upload = useMutation({
    mutationFn: ({ file, caseId, requestId }: { file: File; caseId: string; requestId: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'REQUESTED');
      fd.append('requestId', requestId);
      return api.upload(`/recovery/cases/${caseId}/documents`, fd);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recovery-centre'] });
      qc.invalidateQueries({ queryKey: ['recovery-cases'] });
    },
  });

  // Group uploaded documents by application.
  const groups = new Map<string, Centre['documents']>();
  for (const d of data?.documents ?? []) groups.set(d.caseId, [...(groups.get(d.caseId) ?? []), d]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">Document centre</h1>
        <p className="mt-1 text-sm text-muted">Your uploaded evidence, and any documents your case officer has requested.</p>
      </div>

      {isLoading ? <div className="skeleton h-60" /> : (
        <>
          <Panel className={data?.requests.length ? 'ring-2 ring-orange-300' : ''}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><FileWarning size={18} /> Requested documents</h2>
            {!data?.requests.length ? (
              <p className="mt-2 text-sm text-muted">Nothing requested right now.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.requests.map(r => (
                  <div key={r.id}>
                    <p className="mb-1.5 text-xs text-muted">
                      <Link to={`/dashboard/fund-recovery/applications/${r.case.id}`} className="font-semibold text-night hover:underline">{r.case.reference}</Link>
                      {' · '}{catName(r.case.category)} · requested {fmtDate(r.createdAt)}
                    </p>
                    <DropZone label={r.label} hint={r.note ?? undefined}
                      busy={upload.isPending && upload.variables?.requestId === r.id}
                      onFile={file => upload.mutate({ file, caseId: r.case.id, requestId: r.id })} />
                  </div>
                ))}
              </div>
            )}
            {upload.isError && <p className="mt-3 text-sm text-bad">{(upload.error as Error).message}</p>}
          </Panel>

          <Panel>
            <h2 className="font-display text-lg font-semibold">Uploaded documents ({data?.documents.length ?? 0})</h2>
            {!groups.size ? <p className="mt-2 text-sm text-muted">No documents uploaded yet.</p> : (
              <div className="mt-4 space-y-5">
                {[...groups.entries()].map(([caseId, docs]) => (
                  <div key={caseId}>
                    <p className="text-sm font-semibold">
                      {docs[0].case.reference ?? 'Draft'} <span className="font-normal text-muted">· {catName(docs[0].case.category)}</span>
                    </p>
                    <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
                      {docs.map(d => (
                        <li key={d.id}>
                          <a href={`/api/recovery/cases/${caseId}/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                            <Eye size={14} className="shrink-0 text-muted" />
                            <span className="min-w-0 flex-1 truncate">{d.name}</span>
                            <span className="shrink-0 text-xs text-muted">{fmtSize(d.size)} · {fmtDate(d.createdAt)}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
