"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL_MS = 15_000;

export default function CountdownRing({
  remainingMs,
}: {
  remainingMs: () => number;
}) {
  const [left, setLeft] = useState(remainingMs());
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      setLeft(remainingMs());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [remainingMs]);

  const seconds = Math.ceil(left / 1000);
  const ratio = Math.min(1, Math.max(0, left / TOTAL_MS));
  const R = 26;
  const C = 2 * Math.PI * R;
  const urgent = seconds <= 5;

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(244,238,227,0.12)" strokeWidth="4" />
          <circle
            cx="32"
            cy="32"
            r={R}
            fill="none"
            stroke={urgent ? "#ff4d2e" : "#f4eee3"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
          />
        </svg>
        <span
          className={`display absolute inset-0 flex items-center justify-center text-2xl tabular-nums ${
            urgent ? "text-flame" : "text-cream"
          }`}
        >
          {seconds}
        </span>
      </div>
      <p className="text-xs leading-snug text-mist">
        Réponds avant la fin —<br />
        révélation simultanée.
      </p>
    </div>
  );
}
