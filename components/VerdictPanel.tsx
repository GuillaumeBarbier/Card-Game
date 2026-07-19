"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Card, Choice } from "@/lib/types";
import { vibrate } from "@/lib/store";

type Step =
  | { kind: "handoff"; player: 1 | 2 }
  | { kind: "pick"; player: 1 | 2 };

/**
 * Saisie séquentielle et secrète sur un seul téléphone : chaque joueur prend
 * l'appareil à tour de rôle, choisit son verdict (aucune sélection affichée),
 * puis passe le téléphone. Les deux réponses ne sont révélées qu'à la fin.
 */
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
  const [step, setStep] = useState<Step>({ kind: "handoff", player: 1 });
  const firstChoice = useRef<Choice | null>(null);

  const names = { 1: p1, 2: p2 } as const;

  const pick = (choice: Choice) => {
    vibrate(15);
    if (step.kind !== "pick") return;
    if (step.player === 1) {
      firstChoice.current = choice;
      setStep({ kind: "handoff", player: 2 });
    } else if (firstChoice.current) {
      onComplete(firstChoice.current, choice);
    }
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {step.kind === "handoff" ? (
          <motion.div
            key={`handoff-${step.player}`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full text-center"
          >
            {step.player === 2 && (
              <p className="mb-2 text-xs text-sage">
                Verdict de {names[1]} verrouillé 🔒
              </p>
            )}
            <p className="eyebrow text-mist">
              {step.player === 1 ? "On répond en secret" : "À l'autre de jouer"}
            </p>
            <p className="display mt-1.5 text-3xl">
              Passe le téléphone à{" "}
              <span className="italic text-flame">{names[step.player]}</span>
            </p>
            <p className="mt-2 text-xs text-mist">
              {names[step.player === 1 ? 2 : 1]}, on ne regarde pas 👀
            </p>
            <button
              onClick={() => {
                vibrate(15);
                setStep({ kind: "pick", player: step.player });
              }}
              className="mt-4 w-full rounded-full bg-flame py-4 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
            >
              Je suis {names[step.player]} — je réponds
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`pick-${step.player}`}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full"
          >
            <p className="eyebrow mb-3 text-center text-mist">
              Ton verdict, {names[step.player]} — il restera secret
            </p>
            <div className="flex gap-2.5">
              {(["A", "B"] as const).map((c) => (
                <motion.button
                  key={c}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => pick(c)}
                  className="flex-1 rounded-2xl border border-line bg-white/[0.04] px-3 py-4 text-sm leading-snug text-cream"
                >
                  {c === "A" ? card.optionA : card.optionB}
                </motion.button>
              ))}
            </div>
            <p className="mt-3 text-center text-[0.65rem] text-mist">
              Un seul tap — ta réponse est enregistrée sans s&apos;afficher.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
