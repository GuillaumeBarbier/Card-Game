"use client";

import { useMemo } from "react";

const COLORS = ["#E8342E", "#FF8A1E", "#FFCF24", "#2DB958", "#2E8DFF", "#FF5DA8", "#8C52E8"];

export default function ConfettiRain({ startDelay = 0 }: { startDelay?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        delay: startDelay + Math.random() * 0.7,
        dur: 1.9 + Math.random() * 1.5,
        color: COLORS[i % COLORS.length],
        w: 6 + Math.random() * 8,
        drift: -60 + Math.random() * 120,
        tilt: Math.random() * 360,
      })),
    [startDelay],
  );
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          style={
            {
              position: "absolute",
              top: "-6vh",
              left: `${p.left}%`,
              width: p.w,
              height: p.w * 0.45,
              background: p.color,
              borderRadius: 2,
              animation: `confetti-fall ${p.dur}s ${p.delay}s cubic-bezier(0.25, 0.6, 0.45, 1) forwards`,
              "--drift": `${p.drift}px`,
              "--tilt": `${p.tilt}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
