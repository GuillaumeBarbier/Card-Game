"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import type { Deck } from "@/lib/types";
import { loadProfile, saveProfile, vibrate } from "@/lib/store";

function DeckTile({ deck, onOpen }: { deck: Deck; onOpen: () => void }) {
  return (
    <motion.button
      whileTap={deck.available ? { scale: 0.975 } : undefined}
      onClick={() => {
        if (deck.available) {
          vibrate(15);
          onOpen();
        }
      }}
      className={`relative w-full overflow-hidden rounded-[26px] border border-line text-left ${
        deck.available ? "" : "opacity-55"
      }`}
      style={{
        background: `linear-gradient(150deg, ${deck.accent}1f 0%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.25) 100%)`,
      }}
    >
      {/* mini stack visual */}
      <div className="absolute -right-7 -top-9 h-36 w-28 rotate-[14deg]">
        <div className="absolute inset-0 translate-x-3 translate-y-2 rotate-6 rounded-2xl bg-white/[0.06]" />
        <div className="absolute inset-0 translate-x-1.5 translate-y-1 rotate-3 rounded-2xl bg-white/[0.1]" />
        <div className="card-face absolute inset-0 rounded-2xl opacity-90" />
        <span
          className="display absolute inset-0 flex items-center justify-center text-4xl italic"
          style={{ color: deck.accent }}
        >
          {deck.name.charAt(0)}
        </span>
      </div>

      <div className="relative p-6 pr-28">
        <p className="eyebrow" style={{ color: deck.accent }}>
          {deck.available ? `${deck.cardCount} cartes` : "Bientôt"}
        </p>
        <h2 className="display mt-2 text-[2rem] leading-none">{deck.name}</h2>
        <p className="mt-2 text-sm text-mist">{deck.tagline}</p>
        {deck.available && (
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-cream">
            Jouer
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full text-ink"
              style={{ background: deck.accent }}
            >
              →
            </span>
          </p>
        )}
      </div>
    </motion.button>
  );
}

export default function Home({ decks }: { decks: Deck[] }) {
  const router = useRouter();
  const [sheet, setSheet] = useState<Deck | null>(null);
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");

  useEffect(() => {
    const p = loadProfile();
    setP1(p.p1);
    setP2(p.p2);
  }, []);

  const start = () => {
    if (!sheet) return;
    saveProfile({ p1: p1.trim(), p2: p2.trim() });
    vibrate(20);
    router.push(`/play/${sheet.slug}`);
  };

  return (
    <div className="min-h-dvh">
      <div className="bg-scene" />
      <div className="bg-noise" />

      <div className="mx-auto max-w-md px-6">
        {/* hero */}
        <header className="pt-safe pt-12">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow text-flame"
          >
            Le jeu des couples
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="display mt-3 text-[3.4rem] leading-[0.95]"
          >
            Entre
            <br />
            <span className="italic shimmer-text">Nous</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mt-4 max-w-70 text-[0.95rem] leading-relaxed text-mist"
          >
            Une carte, un compte à rebours, deux verdicts. Découvrez si vous êtes
            vraiment d&apos;accord.
          </motion.p>
        </header>

        {/* decks */}
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-10 space-y-4 pb-safe pb-12"
        >
          {decks.map((deck) => (
            <DeckTile key={deck.slug} deck={deck} onOpen={() => setSheet(deck)} />
          ))}
        </motion.section>
      </div>

      {/* start sheet */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(null)}
              className="fixed inset-0 z-40 bg-ink/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-line bg-ink-2 px-6 pt-5 pb-safe pb-8"
            >
              <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/20" />
              <p className="eyebrow" style={{ color: sheet.accent }}>
                {sheet.name}
              </p>
              <h3 className="display mt-2 text-2xl">Qui joue ce soir&nbsp;?</h3>

              <div className="mt-5 space-y-3">
                <input
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  placeholder="Prénom joueur 1"
                  className="w-full rounded-2xl border border-line bg-white/[0.05] px-5 py-4 text-cream placeholder:text-mist focus:border-flame focus:outline-none"
                />
                <input
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  placeholder="Prénom joueur 2"
                  className="w-full rounded-2xl border border-line bg-white/[0.05] px-5 py-4 text-cream placeholder:text-mist focus:border-flame focus:outline-none"
                />
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={start}
                  className="w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
                >
                  Jouer sur ce téléphone
                </button>
                <button
                  disabled
                  className="w-full rounded-full border border-line py-4 text-mist"
                >
                  Jouer à distance
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-widest">
                    Bientôt
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
