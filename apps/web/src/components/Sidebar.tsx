import { useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Wallet, CreditCard, ArrowRightLeft, Upload,
  RefreshCw, Landmark, FileText, ShieldCheck, Users, Settings,
  MessageSquare, Mail, LogOut, PanelLeftClose, CheckCircle2, ScrollText, SlidersHorizontal, Receipt,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { BrandMark, DarkGlow } from './AuthShell';
import { NotificationsButton } from './Notifications';

type NavEntry = { section: string } | { to: string; icon: typeof Wallet; label: string; badge?: string };

const nav: NavEntry[] = [
  { section: 'Dashboard' },
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/dashboard/wallets', icon: Wallet, label: 'Wallets' },
  { to: '/dashboard/cards', icon: CreditCard, label: 'Cards' },
  { section: 'Transactions' },
  { to: '/dashboard/transfer', icon: ArrowRightLeft, label: 'Transfer' },
  { to: '/dashboard/withdraw', icon: Upload, label: 'Withdraw' },
  { to: '/dashboard/swap', icon: RefreshCw, label: 'Currency Swap' },
  { section: 'Services' },
  { to: '/dashboard/loans', icon: Landmark, label: 'Loans' },
  { to: '/dashboard/tax-recovery', icon: FileText, label: 'Tax Recovery' },
  { to: '/dashboard/fund-recovery', icon: ShieldCheck, label: 'Fund Recovery' },
  { section: 'Account' },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
  { to: '/dashboard/support', icon: MessageSquare, label: 'Support' },
];

/** The bank staff's menu. `badge` names a count from /admin/overview's queue. */
const adminNav: NavEntry[] = [
  { section: 'Bank' },
  { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/customers', icon: Users, label: 'Customers', badge: 'kyc' },
  { to: '/admin/approvals', icon: CheckCircle2, label: 'Approvals', badge: 'approvals' },
  { to: '/admin/transactions', icon: Receipt, label: 'Transactions' },
  { to: '/admin/cards', icon: CreditCard, label: 'Cards' },
  { section: 'Services' },
  { to: '/admin/loans', icon: Landmark, label: 'Loans', badge: 'loans' },
  { to: '/admin/tax-refunds', icon: FileText, label: 'Tax refunds', badge: 'tax' },
  { to: '/admin/fund-recovery', icon: ShieldCheck, label: 'Fund recovery', badge: 'fund' },
  { to: '/admin/support', icon: MessageSquare, label: 'Support inbox', badge: 'support' },
  { to: '/admin/mail', icon: Mail, label: 'Mail' },
  { section: 'System' },
  { to: '/admin/settings', icon: SlidersHorizontal, label: 'Bank settings' },
  { to: '/admin/activity', icon: ScrollText, label: 'Activity log' },
];

export function Sidebar({ onHide, admin = false }: { onHide?: () => void; admin?: boolean }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const links = admin ? adminNav : nav;

  // Live "needs attention" counts for the admin menu.
  const { data: overview } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get<{ queue: Record<string, number> }>('/admin/overview'),
    enabled: admin,
    refetchInterval: 30_000,
  });
  const q = overview?.queue;
  const counts: Record<string, number> = q
    ? { kyc: q.kyc ?? 0, approvals: (q.transfers ?? 0) + (q.checks ?? 0), loans: q.loans ?? 0, tax: q.tax ?? 0, fund: q.fund ?? 0, support: q.support ?? 0 }
    : {};
  const initials = (user?.name ?? '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  // One highlight that slides to whichever link is active.
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ top: number; height: number; ready: boolean } | null>(null);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const measure = () => {
      const active = nav.querySelector<HTMLElement>('a[aria-current="page"]');
      if (!active) return setPill(null);
      // Position relative to the nav's content box (works while the nav is scrolled too).
      const top = active.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
      const height = active.getBoundingClientRect().height;
      setPill(p => (p && Math.abs(p.top - top) < 0.5 && Math.abs(p.height - height) < 0.5 ? p : { top, height, ready: p !== null }));
    };
    measure();
    // Re-measure when anything above or inside the menu changes size: fonts and the logo
    // loading, badges appearing, the window resizing, or the sidebar sliding in.
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    nav.querySelectorAll('a, p').forEach(el => ro.observe(el));
    const header = nav.previousElementSibling;
    if (header) ro.observe(header);
    document.fonts?.ready.then(measure).catch(() => undefined);
    window.addEventListener('resize', measure);
    const late = setTimeout(measure, 400);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); clearTimeout(late); };
  }, [pathname, links.length]);

  return (
    <aside className="relative flex h-full w-64 shrink-0 flex-col overflow-hidden rounded-[24px] bg-night text-white">
      <DarkGlow className="-left-32 -top-32 h-80 w-80 opacity-60" />
      <div className="relative flex items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center gap-2">
          <BrandMark dark />
          {admin && (
            <span className="rounded-full bg-brand-bright/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-bright">
              Staff
            </span>
          )}
        </div>
        {onHide && (
          <button
            onClick={onHide}
            title="Hide sidebar (Ctrl+B)"
            aria-label="Hide sidebar"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <nav ref={navRef} className="relative flex-1 overflow-y-auto px-3 pb-4">
        {pill && (
          <span
            aria-hidden="true"
            className="glass-strong pointer-events-none absolute left-3 right-3 rounded-xl"
            style={{
              top: pill.top,
              height: pill.height,
              transition: pill.ready ? 'top 0.32s cubic-bezier(.2,.8,.2,1), height 0.32s cubic-bezier(.2,.8,.2,1)' : 'none',
            }}
          />
        )}
        {links.map((item, i) => {
          if ('section' in item && !('to' in item)) {
            return (
              <p key={i} className="mb-1 mt-5 px-3 font-display text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 first:mt-1">
                {item.section}
              </p>
            );
          }
          const { to, icon: Icon, label, badge } = item as { to: string; icon: any; label: string; badge?: string };
          const count = badge ? counts[badge] ?? 0 : 0;
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard' || to === '/admin'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-300 ${
                  isActive ? 'font-medium text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={`transition-colors duration-300 ${isActive ? 'text-brand-bright' : ''}`} />
                  {label}
                  {count > 0 && (
                    <span className="pill-grow ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-brand-bright px-1.5 text-[11px] font-bold text-night">
                      {count}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="relative m-3 rounded-2xl bg-white/5 p-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-bright font-display text-sm font-semibold text-night">
            {initials}
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <p className="truncate font-medium">{user?.name}</p>
            <p className="truncate text-xs text-white/45">{user?.email}</p>
          </div>
          {!admin && <NotificationsButton />}
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2 text-sm text-white/70 transition-colors hover:bg-red-500/20 hover:text-red-200"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
