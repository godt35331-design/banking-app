import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Menu, PanelLeftOpen, MessageCircle, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Sidebar } from './Sidebar';
import { BrandMark } from './AuthShell';
import { NotificationsButton } from './Notifications';

const STORAGE_KEY = 'kestrel.sidebar-open';
const isSmallScreen = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;

/** Sidebar starts hidden on small screens, otherwise remembers the last choice. */
function initialOpen() {
  if (isSmallScreen()) return false;
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0';
  } catch {
    return true;
  }
}

/** Signs the user out after the bank's idle timeout (Bank settings → idle minutes). */
function useIdleLogout(enabled: boolean) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['bank-settings'],
    queryFn: () => api.get<{ idleMinutes?: number }>('/settings/bank'),
    enabled,
    staleTime: 5 * 60_000,
  });
  const minutes = data?.idleMinutes ?? 10;
  useEffect(() => {
    if (!enabled) return;
    let timer = 0;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await logout().catch(() => undefined);
        navigate('/login?reason=idle', { replace: true });
      }, minutes * 60_000);
    };
    const events = ['pointerdown', 'keydown', 'scroll', 'pointermove'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true, capture: true }));
    reset();
    return () => {
      window.clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset, { capture: true }));
    };
  }, [enabled, minutes, logout, navigate]);
}

/**
 * Shell for both areas: the customer dashboard (/dashboard) and the bank staff's admin area (/admin).
 * Admins are always sent to /admin; customers can never open /admin.
 */
export function DashboardLayout({ admin = false }: { admin?: boolean }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(initialOpen);

  const setSidebar = (next: boolean) => {
    setOpen(next);
    if (!isSmallScreen()) {
      try { localStorage.setItem(STORAGE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
    }
  };

  // New page starts at the top; on small screens the sidebar closes after picking a page.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
    if (isSmallScreen()) setOpen(false);
  }, [pathname]);

  useIdleLogout(!!user);

  // Ctrl+B / Cmd+B toggles the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebar(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-paper">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;
  if (!admin && user.role === 'ADMIN') return <Navigate to="/admin" replace />;

  return (
    <div className="flex h-[100dvh] bg-paper font-body text-night antialiased lg:p-3">
      {/* Small screens: dim the page behind the open sidebar */}
      {open && (
        <div className="dim-open fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebar(false)} />
      )}

      {/* Width animates to 0 to hide; the sidebar inside keeps its width so nothing reflows. */}
      <div
        className={`z-40 h-full shrink-0 overflow-hidden transition-[width,margin] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] max-lg:fixed max-lg:inset-y-3 max-lg:left-3 max-lg:h-auto ${
          open ? 'w-64 lg:mr-3' : 'w-0 lg:mr-0'
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <Sidebar admin={admin} onHide={() => setSidebar(false)} />
      </div>

      {/* min-w-0 stops long content from making the page wider than the screen */}
      <main ref={main} className="relative min-w-0 flex-1 overflow-y-auto overflow-x-hidden lg:rounded-[24px]">
        {/* Phones and tablets: a slim top bar with the menu, the logo and notifications */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line/70 bg-paper/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setSidebar(true)}
            aria-label="Open menu"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-night text-white active:scale-95"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0 flex-1"><BrandMark /></div>
          {!admin && <NotificationsButton light />}
        </header>
        {/* Large screens with the sidebar hidden: a floating Menu button */}
        {!open && (
          <button
            onClick={() => setSidebar(true)}
            title="Show sidebar (Ctrl+B)"
            aria-label="Show sidebar"
            className="pill-grow sticky left-3 top-3 z-20 ml-3 mt-3 hidden h-10 w-fit items-center gap-2 rounded-full bg-night pl-3 pr-4 text-sm font-medium text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95 lg:flex"
          >
            <PanelLeftOpen size={18} /> Menu
          </button>
        )}
        {/* keyed by route so each page's blocks cascade in when you switch pages */}
        <div key={pathname} className="page-enter mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </main>

      {!admin && <ChatSupportBubble />}
    </div>
  );
}

function ChatSupportBubble() {
  const [open, setOpen] = useState(false);
  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:right-8 sm:w-[380px]">
          <div className="flex items-center justify-between bg-night px-5 py-4 text-white">
            <div>
              <p className="text-sm font-semibold">Chat Support</p>
              <p className="text-xs text-white/60">We typically reply within minutes</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: 320 }}>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-brand-soft px-4 py-2.5 text-sm text-night">
              Hello! How can we help you today?
            </div>
          </div>
          <form
            className="flex items-center gap-2 border-t border-line px-4 py-3"
            onSubmit={e => { e.preventDefault(); }}
          >
            <input
              type="text"
              placeholder="Type a message…"
              className="min-w-0 flex-1 rounded-full bg-paper px-4 py-2.5 text-sm outline-none ring-1 ring-line focus:ring-brand"
            />
            <button type="submit" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white hover:bg-brand/90">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"/><path d="M22 2 15 22 11 13 2 9z"/></svg>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Chat support"
        className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:right-8"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
