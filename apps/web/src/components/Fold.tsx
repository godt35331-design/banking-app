import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * A section that starts closed (good on phones). Shows a one-line summary while closed.
 * `inner` = a lighter sub-section inside another Fold or panel.
 */
export function Fold({
  title, summary, inner = false, defaultOpen = false, badge, children,
}: {
  title: string;
  summary?: string;
  inner?: boolean;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const clean = summary?.replace(/(^[\s·]+|[\s·]+$)/g, '').replace(/(\s·\s)+/g, ' · ');
  return (
    <details open={defaultOpen} className={`group ${inner ? 'border-t border-line first:border-t-0' : 'rounded-[22px] bg-white sm:rounded-[24px]'}`}>
      <summary className={`flex cursor-pointer list-none items-center gap-3 ${inner ? 'py-3' : 'px-5 py-4 sm:px-6'} [&::-webkit-details-marker]:hidden`}>
        <span className="min-w-0 flex-1">
          <span className={`flex items-center gap-2 font-display font-semibold ${inner ? 'text-sm' : 'text-base sm:text-lg'}`}>{title}{badge}</span>
          {clean && <span className="block truncate text-xs text-muted group-open:hidden">{clean}</span>}
        </span>
        <ChevronDown size={18} className="shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
      </summary>
      <div className={inner ? 'pb-4' : 'px-5 pb-5 sm:px-6 sm:pb-6'}>{children}</div>
    </details>
  );
}
