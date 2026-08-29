"use client";

import { useEffect, useState } from "react";

const WORDS = ["Revenue", "New Users", "Clients", "Bookings", "High Intent traffic"];
const INTERVAL_MS = 2300;

export default function RotatingWord() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % WORDS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    /**
     * Grid-stacking every word reserves the width of the longest one, so the
     * headline never reflows as the word changes — no JS measurement needed.
     */
    <span className="relative inline-grid align-bottom">
      {WORDS.map((w) => (
        <span
          key={w}
          aria-hidden="true"
          className="invisible col-start-1 row-start-1 whitespace-nowrap px-[0.35em]"
        >
          {w}
        </span>
      ))}

      <span className="col-start-1 row-start-1 flex items-center justify-center">
        <span
          key={i}
          className="hl-word whitespace-nowrap rounded-[0.28em] px-[0.35em] pb-[0.06em] text-white"
          style={{ background: "var(--accent)" }}
        >
          {WORDS[i]}
        </span>
      </span>

      {/* Screen readers get the full list once, not a word swapping every 2s. */}
      <span className="sr-only">
        {WORDS.join(", ")}
      </span>
    </span>
  );
}
