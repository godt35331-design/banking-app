import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Check, Clock, Eye, Loader2, Paperclip, ShieldAlert, ShieldCheck } from 'lucide-react';
import { TAX_DOC_MAX_BYTES, TAX_DOC_MIME } from '@kestrel/shared';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

type Kyc = {
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycIdType: string | null;
  kycSubmittedAt: string | null;
  kycNote: string | null;
  documents: { type: string; name: string; size: number }[];
};

const ID_TYPES = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'DRIVING_LICENCE', label: 'Driving licence' },
  { value: 'NATIONAL_ID', label: 'National ID card' },
];
const FILES = [
  { type: 'ID_FRONT', label: 'Photo of your ID', desc: 'The photo page of your passport, or the front of your card' },
  { type: 'ID_BACK', label: 'Back of your ID', desc: 'Not needed for passports' },
  { type: 'PROOF_OF_ADDRESS', label: 'Proof of address', desc: 'A utility bill or bank statement from the last 3 months' },
];
const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

/** Customer uploads ID documents; staff verify them in the admin area. */
export function IdentityVerification() {
  const qc = useQueryClient();
  const { refresh } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['kyc'], queryFn: () => api.get<Kyc>('/kyc'), refetchInterval: 15_000 });
  const [idType, setIdType] = useState('PASSPORT');
  const [files, setFiles] = useState<Record<string, File>>({});
  const [redo, setRedo] = useState(false);

  const required = idType === 'PASSPORT' ? ['ID_FRONT', 'PROOF_OF_ADDRESS'] : ['ID_FRONT', 'ID_BACK', 'PROOF_OF_ADDRESS'];
  const ready = required.every(t => files[t]);

  const submit = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('idType', idType);
      for (const t of required) fd.append(t, files[t]);
      return api.upload<Kyc>('/kyc', fd);
    },
    onSuccess: d => {
      qc.setQueryData(['kyc'], d);
      setFiles({});
      setRedo(false);
      refresh();
    },
  });

  if (isLoading || !data) return <div className="skeleton h-48" />;

  const status = data.kycStatus;
  const showForm = status === 'NOT_SUBMITTED' || status === 'REJECTED' || redo;

  return (
    <div className="space-y-4">
      {/* Status */}
      <div
        className={`flex items-start gap-4 rounded-[22px] p-5 ${
          status === 'APPROVED' ? 'bg-brand-soft' : status === 'PENDING' ? 'bg-amber-50' : status === 'REJECTED' ? 'bg-red-50' : 'bg-white'
        }`}
      >
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
          status === 'APPROVED' ? 'bg-brand text-white' : status === 'PENDING' ? 'bg-amber-500 text-white' : status === 'REJECTED' ? 'bg-bad text-white' : 'bg-paper text-muted'
        }`}>
          {status === 'APPROVED' ? <BadgeCheck size={20} /> : status === 'PENDING' ? <Clock size={20} /> : status === 'REJECTED' ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
        </span>
        <div>
          <p className="font-semibold">
            {status === 'APPROVED' ? 'Your identity is verified'
              : status === 'PENDING' ? "We're checking your documents"
                : status === 'REJECTED' ? "We couldn't verify your identity"
                  : 'Verify your identity'}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {status === 'APPROVED' ? 'Thank you. There is nothing else you need to do.'
              : status === 'PENDING' ? `Sent ${data.kycSubmittedAt ? new Date(data.kycSubmittedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}. This usually takes 1–2 working days. We'll notify you.`
                : status === 'REJECTED' ? (data.kycNote ?? 'Please send new documents.')
                  : 'Banks are required to confirm who their customers are. Upload a photo ID and a proof of address.'}
          </p>
          {data.documents.length > 0 && !showForm && (
            <div className="mt-3 flex flex-wrap gap-2">
              {data.documents.map(d => (
                <a key={d.type} href={`/api/kyc/documents/${d.type}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium hover:bg-black/5">
                  <Eye size={12} /> {FILES.find(f => f.type === d.type)?.label ?? d.type}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="rounded-[22px] bg-white p-5 sm:p-6">
          <p className="text-sm font-semibold">Type of ID</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ID_TYPES.map(t => (
              <button key={t.value} onClick={() => setIdType(t.value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${idType === t.value ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {FILES.filter(f => required.includes(f.type)).map(f => (
              <Upload key={f.type} label={f.label} desc={f.desc} file={files[f.type]}
                onFile={file => setFiles(m => ({ ...m, [f.type]: file }))} />
            ))}
          </div>

          {submit.isError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(submit.error as Error).message}</p>}
          <button onClick={() => submit.mutate()} disabled={!ready || submit.isPending}
            className="mt-5 flex items-center gap-2 rounded-full bg-night px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40">
            {submit.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : 'Send for checking'}
          </button>
        </div>
      )}
    </div>
  );
}

function Upload({ label, desc, file, onFile }: { label: string; desc: string; file?: File; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const accept = (f?: File | null) => {
    if (!f) return;
    if (!TAX_DOC_MIME.includes(f.type)) return setError('Use a PDF, JPG or PNG file');
    if (f.size > TAX_DOC_MAX_BYTES) return setError('File is larger than 10 MB');
    setError('');
    onFile(f);
  };
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); accept(e.dataTransfer.files?.[0]); }}
      className={`rounded-2xl border-2 p-4 text-left transition-colors ${file ? 'border-solid border-brand/40 bg-brand-soft/40' : 'border-dashed border-line hover:border-night'}`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full ${file ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>
        {file ? <Check size={16} /> : <Paperclip size={15} />}
      </span>
      <span className="mt-3 block font-semibold">{label}</span>
      <span className="mt-0.5 block truncate text-xs text-muted">{file ? `${file.name} · ${fmtSize(file.size)}` : desc}</span>
      {error && <span className="mt-1 block text-xs text-bad">{error}</span>}
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => { accept(e.target.files?.[0]); e.target.value = ''; }} />
    </button>
  );
}
