/**
 * Round currency flags drawn in SVG. Windows doesn't render flag emojis (they show as "US", "EU"),
 * so we draw them ourselves.
 */
export function Flag({ code, size = 20, className = '' }: { code: string; size?: number; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full ring-1 ring-black/10 ${className}`}
      style={{ width: size, height: size }}
      aria-label={code}
      role="img"
    >
      <svg viewBox="0 0 30 30" width={size} height={size} preserveAspectRatio="xMidYMid slice">
        {code === 'USD' && <US />}
        {code === 'EUR' && <EU />}
        {code === 'GBP' && <GB />}
        {!['USD', 'EUR', 'GBP'].includes(code) && <rect width="30" height="30" fill="#8b6a3e" />}
      </svg>
    </span>
  );
}

function US() {
  return (
    <>
      <rect width="30" height="30" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map(i => (
        <rect key={i} y={i * (30 / 13)} width="30" height={30 / 13} fill="#b22234" />
      ))}
      <rect width="14" height={(30 / 13) * 7} fill="#3c3b6e" />
      {[0, 1, 2].map(r =>
        [0, 1, 2].map(c => <circle key={`${r}${c}`} cx={2.6 + c * 4.4 + (r % 2) * 1.2} cy={2.6 + r * 5} r="0.9" fill="#fff" />),
      )}
    </>
  );
}

function EU() {
  return (
    <>
      <rect width="30" height="30" fill="#003399" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <circle key={i} cx={15 + Math.cos(a) * 8} cy={15 + Math.sin(a) * 8} r="1.25" fill="#ffcc00" />;
      })}
    </>
  );
}

function GB() {
  return (
    <>
      <rect width="30" height="30" fill="#012169" />
      <path d="M0 0L30 30M30 0L0 30" stroke="#fff" strokeWidth="6" />
      <path d="M0 0L30 30M30 0L0 30" stroke="#c8102e" strokeWidth="2" />
      <path d="M15 0v30M0 15h30" stroke="#fff" strokeWidth="9" />
      <path d="M15 0v30M0 15h30" stroke="#c8102e" strokeWidth="5" />
    </>
  );
}
