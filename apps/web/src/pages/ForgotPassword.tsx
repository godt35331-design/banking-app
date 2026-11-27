import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { AuthHeading, AuthShell, Field, FormError } from '../components/AuthShell';
import { PillButton } from '../components/landing/motion';
import { api } from '../lib/api';

type Step = 'email' | 'code' | 'password' | 'done';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean) return setError('Please enter your email address');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return setError('Enter a valid email address');
    setEmail(clean);
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: clean });
      setStep('code');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email');
    setError('');
    setStep('password');
  };

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (!/^\d{4,6}$/.test(pin)) return setError('PIN must be 4–6 digits');
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, password, pin });
      setStep('done');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      if (/expired/i.test(err.message ?? '')) setStep('email');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === 'email' ? 0 : step === 'code' ? 1 : step === 'password' ? 2 : 3;

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={<>Reset your<br /><span className="text-brand-bright">password.</span></>}
      subtitle="Enter your email and we'll send you a code to reset your password."
      showcase={
        <div className="flex flex-col items-center gap-4">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/10 backdrop-blur-sm">
            <KeyRound size={36} className="text-brand-bright" />
          </span>
          <p className="text-center text-sm text-white/50">Secure password recovery</p>
        </div>
      }
    >
      {step !== 'done' && (
        <div className="mb-8 flex items-center gap-2 text-xs font-medium text-muted">
          {[0, 1, 2].map(i => (
            <span key={i} className={`h-1.5 w-10 rounded-full ${i <= stepIndex ? 'bg-brand' : 'bg-night/10'}`} />
          ))}
          <span className="ml-2">Step {stepIndex + 1} of 3</span>
        </div>
      )}

      {step === 'email' && (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Mail size={24} /></span>
          <div className="mt-6">
            <AuthHeading title="Forgot your password?" subtitle="Enter the email address linked to your account. We'll send a 6-digit reset code." />
          </div>
          <FormError message={error} />
          <form onSubmit={handleEmail} className="mt-8 space-y-5">
            <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            <div className="pt-2">
              <PillButton full disabled={loading}>
                {loading ? 'Sending…' : 'Send reset code'}
              </PillButton>
            </div>
          </form>
        </>
      )}

      {step === 'code' && (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><KeyRound size={24} /></span>
          <div className="mt-6">
            <AuthHeading title="Check your email" subtitle={`We sent a 6-digit code to ${email}. Enter it below.`} />
          </div>
          <FormError message={error} />
          <form onSubmit={handleCode} className="mt-8 space-y-5">
            <Field
              label="Reset code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              autoFocus
            />
            <p className="text-xs text-muted">The code expires in 15 minutes. Check your spam folder if you don't see it.</p>
            <div className="pt-2">
              <PillButton full disabled={loading}>Verify code</PillButton>
            </div>
          </form>
          <button
            type="button"
            onClick={() => { setStep('email'); setCode(''); setError(''); }}
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted hover:text-night"
          >
            <ArrowLeft size={16} /> Use a different email
          </button>
        </>
      )}

      {step === 'password' && (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><ShieldCheck size={24} /></span>
          <div className="mt-6">
            <AuthHeading title="Create new credentials" subtitle="Choose a strong password and a new PIN for your account." />
          </div>
          <FormError message={error} />
          <form onSubmit={handlePassword} className="mt-8 space-y-5">
            <Field label="New password" password autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoFocus />
            <Field label="Confirm password" password autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your password" />
            <Field
              label="New PIN"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="4–6 digit PIN"
            />
            <div className="pt-2">
              <PillButton full disabled={loading}>
                {loading ? 'Resetting…' : 'Reset password'}
              </PillButton>
            </div>
          </form>
        </>
      )}

      {step === 'done' && (
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={32} />
          </span>
          <h2 className="mt-6 font-display text-xl font-semibold">Password changed</h2>
          <p className="mt-2 text-sm text-muted">Your password has been successfully reset. You can now sign in with your new password.</p>
          <div className="mt-8">
            <PillButton full onClick={() => navigate('/login')}>
              Sign in
            </PillButton>
          </div>
        </div>
      )}

      {step !== 'done' && (
        <p className="mt-10 border-t border-night/5 pt-6 text-sm text-muted">
          Remember your password?{' '}
          <Link to="/login" className="font-medium text-brand hover:underline">Sign in</Link>
        </p>
      )}
    </AuthShell>
  );
}
