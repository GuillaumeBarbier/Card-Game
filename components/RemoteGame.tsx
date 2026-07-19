"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { Choice } from "@/lib/types";
import { useRoom } from "@/lib/useRoom";
import { markSeen, vibrate } from "@/lib/store";
import GameCard from "./GameCard";
import CountdownRing from "./CountdownRing";

export default function RemoteGame({ code }: { code: string }) {
  const [playerId, setPlayerId] = useState("");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const { state, connected, act, remainingMs } = useRoom(code, playerId);

  useEffect(() => {
    setPlayerId(sessionStorage.getItem(`entrenous.room.${code}`) ?? "");
  }, [code]);

  // Reset local answer state on each new round.
  useEffect(() => {
    if (state?.phase === "countdown" && !state.myAnswer) return;
    if (state?.phase === "idle" || state?.phase === "lobby") {
      setChoice(null);
      setNote("");
      setSent(false);
    }
  }, [state?.phase, state?.position, state?.myAnswer]);

  useEffect(() => {
    if (state?.phase === "countdown") vibrate(30);
    if (state?.phase === "reveal") {
      vibrate([40, 60, 40]);
      if (state.card) markSeen(state.deckSlug, state.card.id);
    }
  }, [state?.phase, state?.card, state?.deckSlug]);

  if (!playerId) {
    return (
      <Shell code={code}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-mist">
            Cette salle a été ouverte sur un autre appareil.
          </p>
          <Link href="/room" className="rounded-full bg-flame px-6 py-3 font-semibold text-ink">
            Rejoindre avec le code {code}
          </Link>
        </div>
      </Shell>
    );
  }

  if (!state) {
    return (
      <Shell code={code}>
        <div className="flex flex-1 items-center justify-center">
          <p className="animate-pulse text-mist">Connexion à la salle…</p>
        </div>
      </Shell>
    );
  }

  const me = state.players.find((p) => p.id === playerId);
  const card = state.card;
  const other = state.players.find((p) => p.id !== playerId);
  const submit = (c: Choice) => {
    setChoice(c);
    setSent(true);
    vibrate(20);
    act({ type: "answer", choice: c, note });
  };

  return (
    <Shell
      code={code}
      score={
        state.rounds > 0
          ? `${state.agreements} accords · ${state.rounds - state.agreements} clashs`
          : undefined
      }
      offline={!connected}
    >
      {/* ---- LOBBY ---- */}
      {state.phase === "lobby" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="eyebrow text-mist">Code de la salle</p>
          <motion.p
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="display mt-4 text-7xl tracking-[0.18em] text-cream"
          >
            {state.code}
          </motion.p>
          <p className="mt-6 max-w-60 text-sm leading-relaxed text-mist">
            Partage ce code avec ta moitié — la partie démarre dès qu&apos;elle rejoint.
          </p>
          <div className="mt-8 flex items-center gap-2 text-sm text-mist">
            <span className="h-2 w-2 animate-pulse rounded-full bg-flame" />
            En attente de l&apos;autre joueur…
          </div>
        </div>
      )}

      {/* ---- DONE ---- */}
      {state.phase === "done" && (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <p className="eyebrow text-mist">Partie terminée</p>
          <p className="display mt-4 text-6xl">
            {state.rounds ? Math.round((state.agreements / state.rounds) * 100) : 0}%
          </p>
          <p className="mt-2 text-mist">d&apos;accords sur {state.rounds} verdicts</p>
          <Link href="/" className="mt-10 rounded-full bg-flame px-8 py-4 font-semibold text-ink">
            Retour à l&apos;accueil
          </Link>
        </div>
      )}

      {/* ---- GAME ---- */}
      {(state.phase === "idle" || state.phase === "countdown" || state.phase === "reveal") &&
        card && (
          <>
            <div className="relative mx-auto w-full max-w-md flex-1 px-6 pt-4">
              <div className="relative h-full pb-4">
                <GameCard card={card} index={state.position} total={state.total} />
              </div>
            </div>

            <footer className="pb-safe mx-auto w-full max-w-md px-6 pt-4">
              <div className="flex min-h-44 flex-col justify-end">
                <AnimatePresence mode="wait">
                  {state.phase === "idle" && (
                    <motion.div
                      key="idle"
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                    >
                      <button
                        onClick={() => act({ type: "start" })}
                        className="w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
                      >
                        Lancer le verdict
                      </button>
                      <p className="mt-3 text-center text-xs text-mist">
                        15 secondes pour répondre, chacun de son côté
                      </p>
                    </motion.div>
                  )}

                  {state.phase === "countdown" && (
                    <motion.div
                      key="countdown"
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      className="space-y-4"
                    >
                      <CountdownRing remainingMs={remainingMs} />
                      {!sent ? (
                        <>
                          <div className="flex gap-2.5">
                            {(["A", "B"] as const).map((c) => (
                              <button
                                key={c}
                                onClick={() => submit(c)}
                                className={`flex-1 rounded-2xl border px-3 py-3.5 text-sm leading-snug transition-colors ${
                                  choice === c
                                    ? "border-flame bg-flame font-semibold text-ink"
                                    : "border-line bg-white/[0.04] text-cream"
                                }`}
                              >
                                {c === "A" ? card.optionA : card.optionB}
                              </button>
                            ))}
                          </div>
                          <input
                            value={note}
                            onChange={(e) => setNote(e.target.value.slice(0, 140))}
                            placeholder="Un mot pour ta défense ? (optionnel)"
                            className="w-full rounded-2xl border border-line bg-white/[0.05] px-4 py-3 text-sm text-cream placeholder:text-mist focus:border-flame focus:outline-none"
                          />
                        </>
                      ) : (
                        <div className="rounded-2xl border border-line bg-white/[0.04] px-4 py-4 text-center">
                          <p className="text-sm text-sage">Réponse verrouillée ✓</p>
                          <p className="mt-1 text-xs text-mist">
                            {other?.answered
                              ? "Révélation imminente…"
                              : `En attente de ${other?.name ?? "l'autre"}…`}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {state.phase === "reveal" && state.reveal && (
                    <motion.div
                      key="reveal"
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 16, opacity: 0 }}
                      className="text-center"
                    >
                      <motion.p
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 14 }}
                        className={`display italic text-4xl ${
                          state.reveal.agreed === null
                            ? "text-mist"
                            : state.reveal.agreed
                              ? "text-sage"
                              : "text-flame"
                        }`}
                      >
                        {state.reveal.agreed === null
                          ? "Temps écoulé"
                          : state.reveal.agreed
                            ? "Accord"
                            : "Désaccord"}
                      </motion.p>
                      <div className="mt-4 flex items-stretch justify-center gap-3 text-left">
                        {state.reveal.answers.map(({ playerId: pid, name, answer }) => (
                          <div
                            key={pid}
                            className="max-w-[46%] flex-1 rounded-2xl border border-line bg-white/[0.04] px-4 py-3"
                          >
                            <p className="eyebrow mb-1 text-mist" style={{ fontSize: "0.55rem" }}>
                              {name} {pid === playerId ? "(toi)" : ""}
                            </p>
                            <p className="text-sm font-medium leading-snug">
                              {answer?.choice
                                ? answer.choice === "A"
                                  ? card.optionA
                                  : card.optionB
                                : "Pas de réponse"}
                            </p>
                            {answer?.note && (
                              <p className="mt-1.5 text-xs italic leading-snug text-mist">
                                « {answer.note} »
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => act({ type: "next" })}
                        className="mt-5 w-full rounded-full bg-cream py-4 font-semibold text-ink active:scale-[0.98] transition-transform"
                      >
                        Carte suivante
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </footer>
          </>
        )}

      {/* footer names */}
      {me && other && state.phase !== "done" && (
        <p className="pb-safe pb-2 text-center text-[0.65rem] tracking-wide text-mist">
          {me.name} & {other.name} · salle {state.code}
        </p>
      )}
    </Shell>
  );
}

function Shell({
  code,
  score,
  offline,
  children,
}: {
  code: string;
  score?: string;
  offline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="bg-scene" />
      <div className="bg-noise" />
      <header className="pt-safe flex items-center justify-between px-5 pb-2">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
          aria-label="Quitter"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="eyebrow text-mist">À distance · {code}</p>
          {score && <p className="mt-0.5 text-xs text-mist tabular-nums">{score}</p>}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full border border-line ${
            offline ? "bg-flame/20 text-flame" : "bg-white/[0.04] text-sage"
          }`}
          title={offline ? "Reconnexion…" : "Connecté"}
        >
          ●
        </div>
      </header>
      {children}
    </div>
  );
}
