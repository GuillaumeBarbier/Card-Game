"use client";

import type { Card } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

export default function GameCard({
  card,
  index,
  total,
}: {
  card: Card;
  index: number;
  total: number;
}) {
  return (
    <div className="card-face relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[28px] p-6 text-ink">
      <div className="flex items-center justify-between">
        <span
          className="eyebrow rounded-full border border-ink/15 px-3 py-1.5"
          style={{ fontSize: "0.58rem" }}
        >
          {CATEGORY_LABELS[card.category]}
        </span>
        <span className="text-xs tracking-widest text-ink/40 tabular-nums">
          {String(index + 1).padStart(3, "0")} / {total}
        </span>
      </div>

      <p className="display px-1 text-[1.9rem] leading-[1.15] text-ink/90">
        {card.scenario}
      </p>

      <div className="space-y-2.5">
        <div className="flex items-center gap-3">
          <span className="display italic text-lg text-flame">A.</span>
          <span className="text-[0.95rem] font-medium text-ink/80">{card.optionA}</span>
        </div>
        <div className="h-px w-full bg-ink/10" />
        <div className="flex items-center gap-3">
          <span className="display italic text-lg text-ink/50">B.</span>
          <span className="text-[0.95rem] font-medium text-ink/80">{card.optionB}</span>
        </div>
        <div className="flex items-center gap-1.5 pt-2">
          {Array.from({ length: 3 }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                i < card.spice ? "bg-flame" : "bg-ink/15"
              }`}
            />
          ))}
          <span className="eyebrow ml-2 text-ink/35" style={{ fontSize: "0.55rem" }}>
            Intensité
          </span>
        </div>
      </div>
    </div>
  );
}
