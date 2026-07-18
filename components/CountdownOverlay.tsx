"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { vibrate } from "@/lib/store";

export default function CountdownOverlay({
  seconds = 3,
  onDone,
}: {
  seconds?: number;
  onDone: () => void;
}) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    vibrate(30);
    if (count === 0) {
      const t = setTimeout(onDone, 900);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/85 backdrop-blur-xl"
    >
      <p className="eyebrow text-mist mb-6">Verdict dans</p>
      <AnimatePresence mode="popLayout">
        {count > 0 ? (
          <motion.span
            key={count}
            className="tick-pop display text-flame"
            style={{ fontSize: "9rem", lineHeight: 1 }}
          >
            {count}
          </motion.span>
        ) : (
          <motion.span
            key="go"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="display italic text-cream text-6xl"
          >
            Verdict&nbsp;!
          </motion.span>
        )}
      </AnimatePresence>
      <p className="mt-8 text-sm text-mist px-10 text-center">
        Annoncez votre réponse à voix haute, en même temps.
      </p>
    </motion.div>
  );
}
