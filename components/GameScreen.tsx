"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Card, Choice, Deck } from "@/lib/types";
import {
  loadGame,
  saveGame,
  clearGame,
  loadProfile,
  loadSeen,
  markSeen,
  unseenFirstOrder,
  type GameState,
} from "@/lib/store";
import CardStack from "./CardStack";
import CountdownOverlay from "./CountdownOverlay";
import VerdictPanel from "./VerdictPanel";
import ResultReveal from "./ResultReveal";

type Phase = "idle" | "countdown" | "answer" | "result";

export default function GameScreen({ deck, cards }: { deck: Deck; cards: Card[] }) {
  const [game, setGame] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [lastChoices, setLastChoices] = useState<{ c1: Choice; c2: Choice } | null>(null);
  const [profile, setProfile] = useState({ p1: "Joueur 1", p2: "Joueur 2" });

  useEffect(() => {
    const p = loadProfile();
    setProfile({ p1: p.p1 || "Joueur 1", p2: p.p2 || "Joueur 2" });
    const existing = loadGame(deck.slug);
    if (existing && existing.order.length === cards.length) {
      setGame(existing);
    } else {
      const fresh: GameState = {
        deckSlug: deck.slug,
        order: unseenFirstOrder(
          cards.map((c) => c.id),
          loadSeen(deck.slug),
          Date.now(),
        ),
        position: 0,
        results: [],
        startedAt: Date.now(),
      };
      saveGame(fresh);
      setGame(fresh);
    }
  }, [deck.slug, cards]);

  const queue = useMemo(() => {
    if (!game) return [];
    return game.order.slice(game.position, game.position + 3).map((i) => cards[i]);
  }, [game, cards]);

  const current = queue[0];
  const agreements = game?.results.filter((r) => r.agreed).length ?? 0;
  const clashes = (game?.results.length ?? 0) - agreements;
  const finished = game !== null && game.position >= cards.length;

  const advance = useCallback(() => {
    if (current) markSeen(deck.slug, current.id);
    setGame((g) => {
      if (!g) return g;
      const next = { ...g, position: g.position + 1 };
      saveGame(next);
      return next;
    });
    setPhase("idle");
    setLastChoices(null);
  }, [current, deck.slug]);

  const recordAnswers = useCallback(
    (c1: Choice, c2: Choice) => {
      if (!current) return;
      setLastChoices({ c1, c2 });
      setGame((g) => {
        if (!g) return g;
        const next: GameState = {
          ...g,
          results: [
            ...g.results,
            { cardId: current.id, p1: c1, p2: c2, agreed: c1 === c2 },
          ],
        };
        saveGame(next);
        return next;
      });
      setPhase("countdown");
    },
    [current],
  );

  const restart = useCallback(() => {
    clearGame(deck.slug);
    const fresh: GameState = {
      deckSlug: deck.slug,
      order: unseenFirstOrder(
        cards.map((c) => c.id),
        loadSeen(deck.slug),
        Date.now(),
      ),
      position: 0,
      results: [],
      startedAt: Date.now(),
    };
    saveGame(fresh);
    setGame(fresh);
    setPhase("idle");
    setLastChoices(null);
  }, [deck.slug, cards]);

  if (!game) return <div className="fixed inset-0" />;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="bg-scene" />
      <div className="bg-noise" />

      {/* header */}
      <header className="pt-safe flex items-center justify-between px-5 pb-2">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04] text-cream"
          aria-label="Retour"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="eyebrow text-mist">{deck.name}</p>
          <p className="mt-0.5 text-xs text-mist tabular-nums">
            <span className="text-sage">{agreements} accords</span>
            <span className="mx-1.5 opacity-40">·</span>
            <span className="text-flame">{clashes} clashs</span>
          </p>
        </div>
        <button
          onClick={restart}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04] text-cream"
          aria-label="Recommencer"
        >
          ↺
        </button>
      </header>

      {/* progress */}
      <div className="mx-5 h-0.5 overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full bg-flame"
          animate={{ width: `${(game.position / cards.length) * 100}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>

      {finished ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center px-8 text-center"
        >
          <p className="eyebrow text-mist">Jeu terminé</p>
          <p className="display mt-4 text-6xl">
            {game.results.length
              ? Math.round((agreements / game.results.length) * 100)
              : 0}
            %
          </p>
          <p className="mt-2 text-mist">d&apos;accords sur {game.results.length} verdicts</p>
          <button
            onClick={restart}
            className="mt-10 rounded-full bg-flame px-8 py-4 font-semibold text-ink"
          >
            Rejouer
          </button>
        </motion.div>
      ) : (
        <>
          {/* card stack */}
          <main className="relative mx-auto w-full max-w-md flex-1 px-6 pt-5">
            <div className="relative h-full pb-4">
              <CardStack
                cards={queue}
                position={game.position}
                total={cards.length}
                canSwipe={phase === "idle" || phase === "result"}
                onSwiped={advance}
              />
            </div>
          </main>

          {/* action zone */}
          <footer className="pb-safe mx-auto w-full max-w-md px-6 pt-5">
            <div className="flex min-h-40 items-end">
              <AnimatePresence mode="wait">
                {phase === "idle" && current && (
                  <motion.div
                    key="idle"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="w-full"
                  >
                    <button
                      onClick={() => setPhase("answer")}
                      className="w-full rounded-full bg-flame py-4.5 text-base font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
                    >
                      Lancer le verdict
                    </button>
                    <p className="mt-3 text-center text-xs text-mist">
                      ou swipe la carte pour passer
                    </p>
                  </motion.div>
                )}
                {phase === "answer" && current && (
                  <motion.div key="answer" exit={{ y: 20, opacity: 0 }} className="w-full">
                    <VerdictPanel
                      card={current}
                      p1={profile.p1}
                      p2={profile.p2}
                      onComplete={recordAnswers}
                    />
                  </motion.div>
                )}
                {phase === "result" && current && lastChoices && (
                  <motion.div key="result" exit={{ y: 20, opacity: 0 }} className="w-full">
                    <ResultReveal
                      card={current}
                      p1={profile.p1}
                      p2={profile.p2}
                      c1={lastChoices.c1}
                      c2={lastChoices.c2}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </footer>
        </>
      )}

      <AnimatePresence>
        {phase === "countdown" && (
          <CountdownOverlay onDone={() => setPhase("result")} />
        )}
      </AnimatePresence>
    </div>
  );
}
