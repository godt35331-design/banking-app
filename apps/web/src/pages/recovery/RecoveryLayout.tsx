import { NavLink, Outlet } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Home, MessagesSquare, Plus, Files } from 'lucide-react';
import { api } from '../../lib/api';
import type { CaseSummary } from './shared';

const TABS = [
  { to: '/dashboard/fund-recovery', label: 'Overview', icon: Home, end: true },
  { to: '/dashboard/fund-recovery/new', label: 'Start recovery', icon: Plus },
  { to: '/dashboard/fund-recovery/applications', label: 'My applications', icon: FolderOpen },
  { to: '/dashboard/fund-recovery/documents', label: 'Document centre', icon: Files, badge: 'requests' as const },
  { to: '/dashboard/fund-recovery/messages', label: 'Messages', icon: MessagesSquare, badge: 'messages' as const },
];

/** Customer portal for Funds Recovery Assistance, with its own sub-menu. */
export function RecoveryLayout() {
  const { data } = useQuery({
    queryKey: ['recovery-cases'],
    queryFn: () => api.get<CaseSummary[]>('/recovery/cases'),
    refetchInterval: 20_000,
  });
  const counts = {
    requests: (data ?? []).reduce((s, c) => s + (c.openRequests ?? 0), 0),
    messages: (data ?? []).reduce((s, c) => s + (c.unreadMessages ?? 0), 0),
  };

  return (
    <div className="space-y-5">
      <nav className="-mx-1 flex gap-1 overflow-x-auto rounded-full bg-white p-1.5" aria-label="Funds Recovery">
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
