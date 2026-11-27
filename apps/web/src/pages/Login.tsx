import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowLeft, KeyRound, Loader2, Lock, Timer } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { AuthHeading, AuthShell, Field, FormError, PIN_LENGTH, PinBoxes } from '../components/AuthShell';
import { PillButton } from '../components/landing/motion';
import { CardStack } from '../components/landing/mocks';
import { Turnstile, turnstileEnabled, type TurnstileHandle } from '../components/Turnstile';

export function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'credentials' | 'pin'>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinState, setPinState] = useState<'idle' | 'success' | 'error'>('idle');
  // While the success animation plays, hold off the redirect to the dashboard.
  const [celebrating, setCelebrating] = useState(false);
  const busy = useRef(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  if (user && !celebrating) return <Navigate to="/dashboard" replace />;

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !password) return setError('Please enter your email and password');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean)) return setError('Enter a valid email address');
    setEmail(clean);
    setError('');
    setStep('pin');
  };

  const signIn = async (code: string) => {
    if (busy.current) return;
    if (code.length !== PIN_LENGTH) return setError(`Enter your ${PIN_LENGTH}-digit PIN`);
    if (turnstileEnabled && !captcha) return setError('Please complete the security check below');
    busy.current = true;
    setError('');
    setPinState('idle');
    setLoading(true);
    setCelebrating(true);
    try {
      await login(email, password, code, captcha ?? undefined);
      setLoading(false);
      setPinState('success');
      setTimeout(() => setCelebrating(false), 1400);
    } catch (err: any) {
      setCelebrating(false);
      setLoading(false);
      captchaRef.current?.reset();
      setError(err.message ?? 'Sign in failed');
      const pinProblem = /pin/i.test(err.message ?? '');
      setPinState(pinProblem ? 'error' : 'idle');
      setTimeout(() => { setPin(''); setPinState('idle'); }, pinProblem ? 650 : 0);
      if (!pinProblem) setStep('credentials');
    } finally {
      busy.current = false;
    }
  };

  const handlePin = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(pin);
  };

  const onPin = (v: string) => {
    setPin(v);
    if (pinState === 'error') setPinState('idle');
    if (v.length === PIN_LENGTH) signIn(v); // sign in as soon as the 4th digit is typed
  };
  const ok = pinState === 'success';

  return (
    <AuthShell
      eyebrow="Secure sign in"
      title={<>Welcome back to<br /><span className="text-brand-bright">your bank.</span></>}
      subtitle="Your accounts, cards and services — the same bank you know from the branch, available whenever you need it."
      showcase={
        <>
          <CardStack sizeClass="h-[230px] xl:h-[300px]" scaleClass="scale-[0.52] xl:scale-[0.68]" />
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
            <span className="inline-flex items-center gap-2"><KeyRound size={15} className="text-brand-bright" /> Password + secret PIN</span>
            <span className="inline-flex items-center gap-2"><Timer size={15} className="text-brand-bright" /> Auto sign-out when idle</span>
          </div>
        </>
      }
    >
      {/* step indicator */}
      <div className="mb-8 flex items-center gap-2 text-xs font-medium text-muted">
        <span className={`h-1.5 w-10 rounded-full ${step === 'credentials' ? 'bg-brand' : 'bg-brand/30'}`} />
        <span className={`h-1.5 w-10 rounded-full ${step === 'pin' ? 'bg-brand' : 'bg-night/10'}`} />
        <span className="ml-2">Step {step === 'credentials' ? 1 : 2} of 2</span>
      </div>

      {step === 'credentials' ? (
        <>
          <AuthHeading title="Sign in" subtitle="Enter the email and password for your account." />
          <FormError message={error} />
          <form onSubmit={handleCredentials} className="mt-8 space-y-5">
            <Field label="Email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoFocus />
            <Field label="Password" password autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" />
            <div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">Forgot password?</Link></div>
            <div className="pt-2"><PillButton full>Continue</PillButton></div>
          </form>
        </>
      ) : (
        <>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand"><Lock size={24} /></span>
          <div className="mt-6">
            <AuthHeading title="Enter your PIN" subtitle={`Signing in as ${email}. Enter your ${PIN_LENGTH}-digit PIN.`} />
          </div>
          <FormError message={error} />
          <form onSubmit={handlePin} className="mt-8 space-y-6">
            <PinBoxes value={pin} onChange={onPin} autoFocus state={pinState} disabled={loading || ok} />
            <p className="text-xs text-muted">For your security, the account locks after 5 wrong PIN attempts.</p>
            <Turnstile ref={captchaRef} onToken={setCaptcha} />
            <button
              type="submit"
              data-no-busy
              disabled={loading || ok}
              className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-full font-display text-base font-medium text-white transition-colors duration-500 ${
                ok ? 'bg-emerald-500' : 'bg-night hover:bg-night-2 disabled:opacity-90'
              }`}
            >
              {ok ? (
                <>
                  <span className="check-pop grid h-8 w-8 place-items-center rounded-full bg-white text-emerald-600">
                    <svg viewBox="0 0 24 24" className="check-draw h-5 w-5" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="check-text">PIN correct · welcome back</span>
                </>
              ) : loading ? (
                <><Loader2 size={18} className="animate-spin" /> Checking your PIN…</>
              ) : 'Sign in'}
            </button>
            <button
              type="button"
              disabled={loading || ok}
              onClick={() => { setStep('credentials'); setPin(''); setError(''); setPinState('idle'); }}
              className="inline-flex items-center gap-2 text-sm text-muted hover:text-night"
            >
              <ArrowLeft size={16} /> Use a different account
            </button>
          </form>
        </>
      )}

      <p className="mt-10 border-t border-night/5 pt-6 text-sm text-muted">
        New here?{' '}
        <Link to="/register" className="font-medium text-brand hover:underline">Open an account</Link>
      </p>
    </AuthShell>
  );
}
