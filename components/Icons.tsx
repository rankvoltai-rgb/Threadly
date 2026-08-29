import type { CSSProperties } from "react";

/** The Threads glyph. Drives the wordmark and the drifting background. */
export const THREADS_PATH =
  "M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z";

export function Logo({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden="true">
      <path d={THREADS_PATH} />
    </svg>
  );
}

export function Spinner({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={`animate-spin ${className}`} style={style} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function Lock({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 20 20" className={className} style={style} fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="8" rx="2.2" fill="currentColor" />
      <path d="M7 9V6.8a3 3 0 1 1 6 0V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function Arrow({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Check({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" aria-hidden="true">
      <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Bookmark({
  className = "",
  style,
  filled = false,
}: {
  className?: string;
  style?: CSSProperties;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 16 16" className={className} style={style} fill="none" aria-hidden="true">
      <path
        d="M4 2.8h8a.8.8 0 0 1 .8.8v9.9L8 11.2l-4.8 2.3V3.6a.8.8 0 0 1 .8-.8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        fill={filled ? "currentColor" : "none"}
      />
    </svg>
  );
}
