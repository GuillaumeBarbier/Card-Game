"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import type { Card, Choice } from "@/lib/types";
import { vibrate } from "@/lib/store";

function choiceLabel(card: Card, c: Choice) {
  return c === "A" ? card.optionA : card.optionB;
}

export default function ResultReveal({
  card,
  p1,
  p2,
  c1,
  c2,
}: {
  card: Card;
  p1: string;
  p2: string;
  c1: Choice;
  c2: Choice;
}) {
  const agreed = c1 === c2;

  useEffect(() => {
    vibrate(agreed ? [30, 60, 30] : [80, 50, 80]);
  }, [agreed]);

  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="w-full text-center"
    >
      <motion.p
        initial={{ scale: 0.7 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 14 }}
        className={`display italic text-5xl ${agreed ? "text-sage" : "text-flame"}`}
      >
        {agreed ? "Accord" : "Désaccord"}
      </motion.p>

      <div className="mt-5 flex items-stretch justify-center gap-3 text-left">
        {[
          { name: p1, c: c1 },
          { name: p2, c: c2 },
        ].map(({ name, c }, i) => (
          <div
            key={i}
            className="flex-1 max-w-[46%] rounded-2xl border border-line bg-white/[0.04] px-4 py-3"
          >
            <p className="eyebrow text-mist mb-1" style={{ fontSize: "0.55rem" }}>
              {name}
            </p>
            <p className="text-sm font-medium leading-snug">{choiceLabel(card, c)}</p>
          </div>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-5 text-xs tracking-wide text-mist"
      >
        Swipe la carte pour continuer →
      </motion.p>
    </motion.div>
  );
}
