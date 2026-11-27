import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { Settings as SettingsIcon, Lock, User, ShieldCheck } from 'lucide-react';
import { IdentityVerification } from '../components/IdentityVerification';
import { CURRENCIES, CURRENCY_META } from '@kestrel/shared';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export function Settings() {
  const { user, refresh } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'profile' | 'security' | 'identity'>(
    params.get('tab') === 'identity' ? 'identity' : params.get('tab') === 'security' ? 'security' : 'profile',
  );
  const [profile, setProfile] = useState({ name: user?.name ?? '', phone: user?.phone ?? '', mainCurrency: user?.mainCurrency ?? 'USD' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pins, setPins] = useState({ currentPin: '', newPin: '', confirmPin: '' });
  const [msg, setMsg] = useState('');

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/settings/profile', profile),
    onSuccess: () => { refresh(); setMsg('Profile updated'); setTimeout(() => setMsg(''), 3000); },
  });

  const changePassword = useMutation({
    mutationFn: () => api.post('/settings/change-password', { currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
    onSuccess: () => { setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' }); setMsg('Password changed'); setTimeout(() => setMsg(''), 3000); },
  });

  const changePin = useMutation({
    mutationFn: () => api.post('/settings/change-pin', { currentPin: pins.currentPin, newPin: pins.newPin }),
    onSuccess: () => { setPins({ currentPin: '', newPin: '', confirmPin: '' }); setMsg('PIN changed'); setTimeout(() => setMsg(''), 3000); },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Settings</h1>
      <p className="text-sm text-muted mb-6">Manage your account preferences and security</p>

      {msg && <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-ok">{msg}</div>}

      <div className="flex gap-2 mb-6 border-b border-line">
        {[
          { key: 'profile' as const, icon: User, label: 'Profile' },
          { key: 'security' as const, icon: Lock, label: 'Security' },
          { key: 'identity' as const, icon: ShieldCheck, label: 'Identity' },
        ].map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'identity' && <IdentityVerification />}

      {tab === 'profile' && (
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input value={user?.email ?? ''} disabled
                className="w-full rounded-lg border border-line bg-canvas px-3 py-2 text-sm text-muted" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Main Currency</label>
              <select value={profile.mainCurrency} onChange={e => setProfile(p => ({ ...p, mainCurrency: e.target.value }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
                {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_META[c].name} ({c})</option>)}
              </select>
            </div>
          </div>
          <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
            className="mt-4 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
          </button>
          {updateProfile.isError && <p className="mt-2 text-sm text-bad">{(updateProfile.error as Error).message}</p>}
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold mb-4">Change Password</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="password" placeholder="Current password" value={passwords.currentPassword}
                onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              <input type="password" placeholder="New password" value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              <input type="password" placeholder="Confirm new password" value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <button onClick={() => { if (passwords.newPassword !== passwords.confirmPassword) return setMsg('Passwords do not match'); changePassword.mutate(); }}
              disabled={changePassword.isPending}
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              Update Password
            </button>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="font-semibold mb-4">Change PIN</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="password" inputMode="numeric" maxLength={4} placeholder="Current PIN" value={pins.currentPin}
                onChange={e => setPins(p => ({ ...p, currentPin: e.target.value.replace(/\D/g, '') }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              <input type="password" inputMode="numeric" maxLength={4} placeholder="New PIN" value={pins.newPin}
                onChange={e => setPins(p => ({ ...p, newPin: e.target.value.replace(/\D/g, '') }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              <input type="password" inputMode="numeric" maxLength={4} placeholder="Confirm new PIN" value={pins.confirmPin}
                onChange={e => setPins(p => ({ ...p, confirmPin: e.target.value.replace(/\D/g, '') }))}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
            <button onClick={() => { if (!/^\d{4}$/.test(pins.newPin)) return setMsg('Your new PIN must be exactly 4 digits'); if (pins.newPin !== pins.confirmPin) return setMsg('PINs do not match'); changePin.mutate(); }}
              disabled={changePin.isPending}
              className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              Update PIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
