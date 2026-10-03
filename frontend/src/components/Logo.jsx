export default function Logo({ light }) {
  return (
    <div className={`logo ${light ? 'light' : ''}`}>
      <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#19C6A1" />
            <stop offset="1" stopColor="#0E8F9E" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="13" fill="url(#lg)" />
        <path d="M14 34 C14 22, 34 28, 34 14" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <circle cx="14" cy="34" r="4.5" fill="#fff" />
        <circle cx="34" cy="14" r="4.5" fill="#101B3D" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <span>Move<b>Smart</b></span>
    </div>
  );
}
