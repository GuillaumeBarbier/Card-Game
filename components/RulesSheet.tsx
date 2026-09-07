"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { vibrate } from "@/lib/store";

/** Une règle numérotée dans la fiche. */
export function Rule({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3.5">
      <span className="display mt-0.5 shrink-0 text-2xl italic text-flame">{n}</span>
      <div>
        <p className="text-sm font-semibold text-cream">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-mist">{children}</p>
      </div>
    </div>
  );
}

/**
 * Bouton « ? » + fiche des règles en panneau coulissant scrollable.
 * À placer dans le header d'un jeu ; gère son propre état.
 */
export default function RulesButton({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          vibrate(10);
          setOpen(true);
        }}
        className="display flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04] text-lg italic text-cream"
        aria-label="Règles du jeu"
      >
        ?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex flex-col justify-end bg-ink/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="rounded-t-[2rem] border-t border-line bg-[#161419]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-4 h-1 w-10 rounded-full bg-white/20" />
              <div className="max-h-[72vh] overflow-y-auto px-6 pb-4 pt-4">
                <p className="eyebrow text-mist">Comment on joue</p>
                <p className="display mt-1.5 text-3xl">{title}</p>
                <div className="mt-5 space-y-5">{children}</div>
              </div>
              <div className="px-6 pb-safe pb-6 pt-2">
                <button
                  onClick={() => {
                    vibrate(10);
                    setOpen(false);
                  }}
                  className="w-full rounded-full bg-flame py-4 font-semibold text-ink active:scale-[0.98] transition-transform"
                >
                  Compris, on joue !
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
