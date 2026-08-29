import { THREADS_PATH } from "./Icons";

/**
 * Threads glyphs drifting down behind the hero. Values are a fixed table rather
 * than Math.random() so the server and client render identical markup — random
 * positions here would hydrate-mismatch on every load.
 */
const DROPS = [
  { l: 30.71, s: 18, d: 29.1, y: -28.6, o: 0.096, x: -49, r: 36, t: 78 },
  { l: 19.68, s: 16, d: 30.1, y: -27.9, o: 0.037, x: -9, r: 144, t: 15 },
  { l: 20.55, s: 46, d: 44.5, y: -12.7, o: 0.062, x: 57, r: -200, t: 74 },
  { l: 27.25, s: 18, d: 33.1, y: -12.9, o: 0.075, x: 22, r: -175, t: 51 },
  { l: 16.97, s: 16, d: 33.3, y: -28.1, o: 0.035, x: -35, r: 79, t: 39 },
  { l: 29.73, s: 46, d: 43.9, y: -19.2, o: 0.05, x: -38, r: 123, t: 12 },
  { l: 28.33, s: 34, d: 42.5, y: -8.1, o: 0.053, x: 58, r: -168, t: 38 },
  { l: 74.47, s: 18, d: 44.1, y: -17.3, o: 0.107, x: -51, r: 26, t: 68 },
  { l: 80.65, s: 26, d: 37.5, y: -12.2, o: 0.076, x: -5, r: 150, t: 81 },
  { l: 45.88, s: 16, d: 19.7, y: -9.0, o: 0.082, x: 59, r: 142, t: 28 },
  { l: 36.96, s: 26, d: 18.6, y: -16.1, o: 0.043, x: -46, r: -194, t: 66 },
  { l: 11.06, s: 20, d: 29.1, y: -2.5, o: 0.07, x: -40, r: -43, t: 27 },
  { l: 11.83, s: 30, d: 42.2, y: -21.6, o: 0.063, x: -17, r: 169, t: 82 },
  { l: 13.24, s: 18, d: 22.2, y: -10.2, o: 0.031, x: 40, r: -140, t: 28 },
  { l: 12.71, s: 40, d: 28.3, y: -13.0, o: 0.106, x: 23, r: 7, t: 54 },
  { l: 66.3, s: 14, d: 30.8, y: -3.9, o: 0.106, x: 22, r: 26, t: 37 },
  { l: 37.81, s: 34, d: 35.8, y: -28.1, o: 0.035, x: -35, r: -149, t: 32 },
  { l: 3.31, s: 14, d: 33.9, y: -13.9, o: 0.106, x: 14, r: -189, t: 22 },
  { l: 36.0, s: 22, d: 44.8, y: -11.9, o: 0.068, x: -46, r: -5, t: 83 },
  { l: 46.52, s: 22, d: 20.4, y: -26.9, o: 0.057, x: -28, r: 145, t: 18 },
  { l: 0.33, s: 40, d: 28.1, y: -9.3, o: 0.103, x: 31, r: -89, t: 56 },
  { l: 7.19, s: 22, d: 32.5, y: -2.8, o: 0.058, x: -33, r: 18, t: 45 },
  { l: 62.28, s: 46, d: 40.7, y: -0.5, o: 0.098, x: 37, r: 140, t: 64 },
  { l: 20.9, s: 40, d: 31.8, y: -8.1, o: 0.109, x: 35, r: -12, t: 20 },
  { l: 59.12, s: 26, d: 30.5, y: -1.9, o: 0.109, x: 55, r: -60, t: 23 },
  { l: 20.91, s: 20, d: 27.5, y: -15.5, o: 0.109, x: 13, r: -219, t: 78 },
  { l: 32.74, s: 16, d: 41.4, y: -26.4, o: 0.061, x: 25, r: -132, t: 76 },
  { l: 41.83, s: 26, d: 20.4, y: -1.6, o: 0.088, x: -4, r: 107, t: 12 },
  { l: 14.04, s: 18, d: 18.8, y: -12.3, o: 0.067, x: 19, r: 49, t: 53 },
  { l: 45.91, s: 26, d: 22.4, y: -13.6, o: 0.032, x: 36, r: 100, t: 13 },
  { l: 73.7, s: 18, d: 30.1, y: -3.8, o: 0.096, x: -35, r: -109, t: 28 },
  { l: 22.29, s: 46, d: 27.1, y: -13.7, o: 0.097, x: -53, r: 106, t: 77 },
  { l: 64.91, s: 40, d: 29.8, y: -2.5, o: 0.07, x: 4, r: 10, t: 6 },
  { l: 42.45, s: 18, d: 35.0, y: -6.7, o: 0.042, x: -43, r: 52, t: 15 },
];

export default function ThreadsRain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {DROPS.map((d, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="currentColor"
          className="thread-drop"
          width={d.s}
          height={d.s}
          style={
            {
              left: `${d.l}%`,
              opacity: d.o,
              "--dur": `${d.d}s`,
              "--delay": `${d.y}s`,
              "--drift": `${d.x}px`,
              "--spin": `${d.r}deg`,
              "--static-top": `${d.t}vh`,
            } as React.CSSProperties
          }
        >
          <path d={THREADS_PATH} />
        </svg>
      ))}
    </div>
  );
}
