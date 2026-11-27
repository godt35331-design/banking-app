import { useState } from 'react';
import { Link, Navigate } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthHeading, AuthShell, Field, FormError, PinBoxes } from '../components/AuthShell';
import { PillButton } from '../components/landing/motion';
import { KestrelCard } from '../components/landing/mocks';

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = ['Too short', 'Fair', 'Good', 'Strong', 'Very strong'];

export function Register() {
  const { user, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', pin: '', confirmPin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    if (!name || !email || !form.password || !form.pin) {
      return setError('Please fill in all required fields');
    }
    if (name.length < 2) return setError('Enter your full name');
    if (/[<>{}\\]/.test(name)) return setError('Your name contains characters that are not allowed');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return setError('Enter a valid email address');
    if (phone && !/^\+?[\d\s().-]{6,24}$/.test(phone)) return setError('Enter a valid phone number');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    if (form.password.length > 128) return setError('Password must be 128 characters or fewer');
    if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) return setError('Password must contain at least one letter and one number');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.pin.length !== 4) return setError('Your PIN must be exactly 4 digits');
    if (/^(\d)\1{3}$/.test(form.pin) || '0123456789'.includes(form.pin) || '9876543210'.includes(form.pin)) {
      return setError('Choose a PIN that is harder to guess (not 1111 or 1234)');
    }
    if (form.pin !== form.confirmPin) return setError('PINs do not match');

    setLoading(true);
    try {
      await register({ name, email, password: form.password, pin: form.pin, phone: phone || undefined });
    } catch (err: any) {
      setError(err.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const pw = strength(form.password);

  return (
    <AuthShell
      eyebrow="Open an account"
      title={<>Your branch,<br /><span className="text-brand-bright">now in your pocket.</span></>}
      subtitle="Open an account in about five minutes. Your first wallet is ready the moment you finish."
      showcase={
        <div>
          <div className="mx-auto max-w-[380px] -rotate-[4deg]">
            <KestrelCard skin={0} holder={form.name.trim() ? form.name.trim().toUpperCase().slice(0, 24) : 'YOUR NAME'} />
          </div>
          <ul className="mt-10 space-y-3 text-sm text-white/70">
            {['Hold USD, EUR and GBP in one account', 'Free local transfers', 'Create virtual cards whenever you need them'].map(t => (
              <li key={t} className="flex items-center gap-3"><CheckCircle2 size={17} className="text-brand-bright" /> {t}</li>
            ))}
          </ul>
        </div>
      }
    >
      <AuthHeading title="Create your account" subtitle="Tell us a little about yourself, then choose how you'll sign in." />
      <FormError message={error} />

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <fieldset className="space-y-5">
          <legend className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.14em] text-brand">1 · About you</legend>
          <Field label="Full name" value={form.name} onChange={set('name')} placeholder="Ama Mensah" autoComplete="name" autoFocus />
          <Field label="Email" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
          <Field label="Phone number" hint="Optional" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 555 000 0000" autoComplete="tel" />
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="mb-4 font-display text-xs font-semibold uppercase tracking-[0.14em] text-brand">2 · Security</legend>
          <div>
            <Field label="Password" hint="8+ characters, with a letter and a number" password value={form.password} onChange={set('password')} placeholder="Create a password" autoComplete="new-password" />
            {form.password && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map(i => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i < pw ? (pw >= 3 ? 'bg-brand' : 'bg-amber-400') : 'bg-night/10'}`} />
                  ))}
                </div>
                <span className="w-20 text-right text-xs text-muted">{STRENGTH[pw]}</span>
              </div>
            )}
          </div>
          <Field label="Confirm password" password value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" autoComplete="new-password" />
          <PinBoxes label="Secret PIN (4 digits)" value={form.pin} onChange={v => setForm(f => ({ ...f, pin: v }))} />
          <PinBoxes label="Confirm PIN" value={form.confirmPin} onChange={v => setForm(f => ({ ...f, confirmPin: v }))} />
          <p className="text-xs text-muted">You'll enter this PIN every time you sign in. Don't share it with anyone — our staff will never ask for it.</p>
        </fieldset>

        <PillButton full disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</PillButton>
      </form>

      <p className="mt-10 border-t border-night/5 pt-6 text-sm text-muted">
        Already bank with us online?{' '}
        <Link to="/login" className="font-medium text-brand hover:underline">Sign in</Link>
      </p>
    </AuthShell>
  );
}
