import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import { api } from '../lib/api';
import { Sheet } from './Sheet';

type Note = { id: string; body: string; readAt: string | null; createdAt: string };

function ago(d: string) {
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)} d ago`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Bell with unread count; opens the list of messages from the bank and marks them read. */
export function NotificationsButton({ light = false }: { light?: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ items: Note[]; unread: number }>('/notifications'),
    refetchInterval: 20_000,
  });
  const markRead = useMutation({
    mutationFn: () => api.post('/notifications/read'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unread = data?.unread ?? 0;
  // Remember which ones were unread when the panel opened, so they stay highlighted while it's open.
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const show = () => {
    setFresh(new Set((data?.items ?? []).filter(n => !n.readAt).map(n => n.id)));
    setOpen(true);
    if (unread) markRead.mutate();
  };

  return (
    <>
      <button
        onClick={show}
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        title="Notifications"
        className={`relative grid shrink-0 place-items-center rounded-full transition-colors ${
          light ? 'h-10 w-10 bg-white text-night shadow-sm hover:bg-white/70' : 'h-9 w-9 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white'
        }`}
      >
        <Bell size={17} className={unread ? 'animate-[wiggle_1s_ease-in-out_2]' : ''} />
        {unread > 0 && (
          <span className="pill-grow absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-bright px-1 text-[10px] font-bold text-night">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Notifications" subtitle="Updates from the bank about your account">
        {!data?.items.length ? (
          <div className="flex flex-col items-center py-10 text-center text-muted">
            <BellOff size={28} />
            <p className="mt-3 text-sm">No notifications yet</p>
          </div>
        ) : (
          <ul className="stagger -mx-2 space-y-1">
            {data.items.map((n, i) => (
              <li key={n.id} style={{ ['--i' as string]: Math.min(i, 8) }}
                className={`flex gap-3 rounded-2xl px-3 py-3 ${fresh.has(n.id) ? 'bg-brand-soft/60' : ''}`}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${fresh.has(n.id) ? 'bg-brand' : 'bg-black/15'}`} />
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed">{n.body}</p>
                  <p className="mt-0.5 text-xs text-muted">{ago(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
