import { NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Bell, FileSignature, Files, FolderOpen, Home, MessagesSquare, Plus, UserRound } from 'lucide-react';
import { api } from '../../lib/api';
import type { LoanSummary } from './shared';

const TABS = [
  { to: '/dashboard/loans', label: 'Overview', icon: Home, end: true },
  { to: '/dashboard/loans/apply', label: 'Apply', icon: Plus },
  { to: '/dashboard/loans/applications', label: 'My applications', icon: FolderOpen },
  { to: '/dashboard/loans/documents', label: 'Documents', icon: Files, badge: 'requests' as const },
  { to: '/dashboard/loans/offers', label: 'Offers & agreements', icon: FileSignature, badge: 'offers' as const },
  { to: '/dashboard/loans/updates', label: 'Notifications', icon: Bell },
  { to: '/dashboard/loans/messages', label: 'Messages', icon: MessagesSquare, badge: 'messages' as const },
  { to: '/dashboard/loans/profile', label: 'My profile', icon: UserRound },
];

/** Customer Loan Application Portal, separate from the Funds Recovery portal, with its own menu. */
export function LoanLayout() {
  const { data } = useQuery({
    queryKey: ['loan-apps'],
    queryFn: () => api.get<LoanSummary[]>('/loans/applications'),
    refetchInterval: 20_000,
  });
  const list = data ?? [];
  const counts = {
    requests: list.reduce((s, a) => s + (a.openRequests ?? 0), 0),
    messages: list.reduce((s, a) => s + (a.unreadMessages ?? 0), 0),
    offers: list.filter(a => a.status === 'OFFER_ISSUED' || a.status === 'AWAITING_SIGNATURE').length,
  };

  return (
    <div className="space-y-5">
      <nav className="-mx-1 flex gap-1 overflow-x-auto rounded-full bg-white p-1.5" aria-label="Loans">
        {TABS.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-night text-white' : 'text-night/70 hover:bg-paper hover:text-night'
              }`
            }
          >
            <Icon size={15} />
            {label}
            {badge && counts[badge] > 0 && (
              <span className="pill-grow grid h-5 min-w-5 place-items-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                {counts[badge]}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
