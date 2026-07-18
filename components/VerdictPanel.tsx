"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Card, Choice } from "@/lib/types";
import { vibrate } from "@/lib/store";

function ChoiceButton({
  label,
  selected,
  dim,
  onSelect,
}: {
  label: string;
  selected: boolean;
  dim: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onSelect}
      className={`flex-1 rounded-2xl border px-3 py-3 text-sm leading-snug transition-colors duration-200 ${
        selected
          ? "border-flame bg-flame text-ink font-semibold"
          : dim
            ? "border-line text-mist opacity-40"
            : "border-line bg-white/[0.04] text-cream"
      }`}
    >
      {label}
    </motion.button>
  );
}

export default function VerdictPanel({
  card,
  p1,
  p2,
  onComplete,
}: {
  card: Card;
  p1: string;
  p2: string;
  onComplete: (c1: Choice, c2: Choice) => void;
}) {
  const [c1, setC1] = useState<Choice | null>(null);
  const [c2, setC2] = useState<Choice | null>(null);

  const pick = (player: 1 | 2, choice: Choice) => {
    vibrate(15);
    const n1 = player === 1 ? choice : c1;
    const n2 = player === 2 ? choice : c2;
    if (player === 1) setC1(choice);
    else setC2(choice);
    if (n1 && n2) setTimeout(() => onComplete(n1, n2), 350);
  };

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="w-full space-y-4"
    >
      {(
        [
          { name: p1, choice: c1, player: 1 as const },
          { name: p2, choice: c2, player: 2 as const },
        ] as const
      ).map(({ name, choice, player }) => (
        <div key={player}>
          <p className="eyebrow text-mist mb-2">{name}</p>
          <div className="flex gap-2.5">
            <ChoiceButton
              label={card.optionA}
              selected={choice === "A"}
              dim={choice === "B"}
              onSelect={() => pick(player, "A")}
            />
            <ChoiceButton
              label={card.optionB}
              selected={choice === "B"}
              dim={choice === "A"}
              onSelect={() => pick(player, "B")}
            />
          </div>
        </div>
      ))}
    </motion.div>
  );
}
