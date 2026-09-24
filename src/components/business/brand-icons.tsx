// Simple brand glyphs (lucide no longer ships brand icons).
type P = { className?: string };

export function InstagramIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4A21 21 0 0 0 14.3 4c-2.3 0-3.8 1.4-3.8 3.9v2.6H8v3h2.5V21h3z" />
    </svg>
  );
}

export function TikTokIcon({ className }: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M16.6 3c.3 2.2 1.6 3.7 3.9 3.9v3.1a7.6 7.6 0 0 1-3.8-1.1v6.3c0 3.4-2.6 5.8-5.9 5.8a5.8 5.8 0 0 1-5.8-5.8c0-3.5 3-6.1 6.6-5.7v3.2a2.7 2.7 0 0 0-3.4 2.6c0 1.5 1.2 2.6 2.6 2.6 1.6 0 2.7-1.1 2.7-2.9V3h3.1z" />
    </svg>
  );
}
