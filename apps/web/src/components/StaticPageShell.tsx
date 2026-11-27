import { Link } from 'react-router';
import { BrandMark } from './AuthShell';
import { BANK_NAME } from '@kestrel/shared';
import type { ReactNode } from 'react';

function Glow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ background: 'radial-gradient(circle, rgba(212,180,131,0.45) 0%, rgba(139,106,62,0.25) 40%, transparent 70%)' }}
    />
  );
}

export function StaticPageShell({ title, subtitle, children }: { title: ReactNode; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-paper font-body text-night antialiased">
      <div className="relative overflow-hidden bg-night px-5 pb-16 pt-5 sm:px-10 sm:pb-20">
        <Glow className="-right-40 -top-40 h-[620px] w-[620px]" />
        <Glow className="-bottom-60 -left-40 h-[480px] w-[480px] opacity-60" />

        <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between py-4 sm:py-5">
          <Link to="/"><BrandMark /></Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-glass rounded-full px-5 py-2.5 font-display text-sm font-medium text-white/90 transition-colors hover:text-white">Sign in</Link>
            <Link to="/register" className="btn-glass-light hidden rounded-full bg-white px-5 py-2.5 font-display text-sm font-medium text-night transition-colors hover:bg-brand-bright sm:inline-block">Open account</Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto mt-14 max-w-3xl text-center sm:mt-18">
          <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-[50px]">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/65">{subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-14 sm:px-10 sm:py-20">
        {children}
      </div>

      <footer className="mx-auto max-w-6xl px-5 py-8 text-center text-xs text-muted sm:px-10">
        <Link to="/" className="hover:text-night">&larr; Back to home</Link>
        <span className="mx-3">&middot;</span>
        <span>&copy; {new Date().getFullYear()} {BANK_NAME}. All rights reserved.</span>
      </footer>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="mb-4 font-display text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted">{children}</div>
    </div>
  );
}
