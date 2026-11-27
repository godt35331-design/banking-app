import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const CLOSE_MS = 200;

/**
 * Bottom sheet: slides up from the bottom edge while the page behind dims.
 * On wide screens it sits centred at the bottom, max 520px wide.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  // Keep it mounted during the slide-down, then unmount.
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => { setMounted(false); setClosing(false); }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`absolute inset-0 bg-black/55 ${closing ? 'dim-close' : 'dim-open'}`} onClick={onClose} />
      <div
        className={`relative max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-[28px] bg-white px-6 pb-7 pt-3 font-body text-night shadow-2xl ${closing ? 'sheet-close' : 'sheet-open'}`}
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/15" />
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper text-muted transition-colors hover:bg-black/10 hover:text-night"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
