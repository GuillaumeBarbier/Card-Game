"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import PAIRS from "@/data/undercover.json";
import { dismissKeyboard, loadProfile, vibrate } from "@/lib/store";
import ConfettiRain from "./ConfettiRain";

/* ---------- règles de points ---------- */
const PTS_FIRST = 2; // démasqué au premier vote : +2 par joueur (sauf l'intrus)
const PTS_SECOND = 1; // au second vote : +1
const PTS_ESCAPED = 4; // jamais démasqué : +4 pour le joueur sous couverture

/* ---------- état ---------- */

interface UPlayer {
  name: string;
  score: number;
}

type Step = "reveal" | "discuss" | "accuse" | "accuse2" | "result";

interface URound {
  commonWord: string;
  secretWord: string;
  undercover: number;
  firstSpeaker: number;
  step: Step;
  revealIdx: number;
  firstAccused: number | null;
  outcome: "first" | "second" | "escaped" | null;
}

interface UState {
  players: UPlayer[];
  used: number[];
  roundCount: number;
  phase: "round" | "end";
  round: URound | null;
}

const KEY = "entrenous.undercover";

function newRound(s: UState): URound {
  let available = (PAIRS as string[][])
    .map((_, i) => i)
    .filter((i) => !s.used.includes(i));
  if (available.length === 0) {
    s.used = [];
    available = (PAIRS as string[][]).map((_, i) => i);
  }
  const pairIdx = available[Math.floor(Math.random() * available.length)];
  s.used.push(pairIdx);
  const [a, b] = (PAIRS as string[][])[pairIdx];
  const commonIsA = Math.random() < 0.5;
  return {
    commonWord: commonIsA ? a : b,
    secretWord: commonIsA ? b : a,
    undercover: Math.floor(Math.random() * s.players.length),
    firstSpeaker: Math.floor(Math.random() * s.players.length),
    step: "reveal",
    revealIdx: 0,
    firstAccused: null,
    outcome: null,
  };
}

/* ---------- composant ---------- */

export default function Undercover() {
  const [state, setState] = useState<UState | null>(null);
  const [setup, setSetup] = useState(true);
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [wordShown, setWordShown] = useState(false);
  const [accused, setAccused] = useState<number | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2", ""]);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const s = JSON.parse(saved) as UState;
        if (s.players?.length >= 3) {
          setState(s);
          setSetup(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((s: UState) => {
    setState(s);
    localStorage.setItem(KEY, JSON.stringify(s));
  }, []);

  const start = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 3) return;
    dismissKeyboard();
    vibrate(20);
    const s: UState = {
      players: list.map((name) => ({ name, score: 0 })),
      used: [],
      roundCount: 1,
      phase: "round",
      round: null,
    };
    s.round = newRound(s);
    setWordShown(false);
    setAccused(null);
    persist(s);
    setSetup(false);
  };

  const reset = () => {
    localStorage.removeItem(KEY);
    setSetup(true);
    setState(null);
    setShowRanking(false);
  };

  const update = (fn: (s: UState) => void) => {
    if (!state) return;
    const s: UState = structuredClone(state);
    fn(s);
    persist(s);
  };

  const accuse = (idx: number) => {
    vibrate(20);
    setAccused(null);
    update((s) => {
      const r = s.round!;
      if (idx === r.undercover) {
        r.outcome = r.step === "accuse" ? "first" : "second";
        const pts = r.outcome === "first" ? PTS_FIRST : PTS_SECOND;
        s.players.forEach((p, i) => {
          if (i !== r.undercover) p.score += pts;
        });
        r.step = "result";
      } else if (r.step === "accuse") {
        r.firstAccused = idx;
        r.step = "accuse2";
      } else {
        r.outcome = "escaped";
        s.players[r.undercover].score += PTS_ESCAPED;
        r.step = "result";
      }
    });
  };

  const nextRound = () => {
    vibrate(15);
    setWordShown(false);
    setAccused(null);
    update((s) => {
      s.roundCount += 1;
      s.round = newRound(s);
    });
  };

  const endGame = () => {
    vibrate(20);
    setShowRanking(false);
    update((s) => {
      s.phase = "end";
      s.round = null;
    });
  };

  /* ---------- setup ---------- */
  if (setup || !state) {
    const validCount = names.filter((n) => n.trim()).length;
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
          <h1 className="display text-4xl leading-tight">
            Sous<br />
            <span className="italic text-flame">Couverture.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Tout le monde reçoit le même mot… sauf un joueur, qui en reçoit un
            presque identique. Chacun donne un indice à voix haute — démasquez
            l&apos;intrus sans vous trahir.
          </p>

          <div className="mt-6 space-y-2.5">
            {names.map((n, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={n}
                  onChange={(e) =>
                    setNames((arr) => arr.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  placeholder={`Joueur ${i + 1}`}
                  className="w-full rounded-2xl border border-line bg-white/[0.05] px-5 py-3.5 text-cream placeholder:text-mist focus:border-flame focus:outline-none"
                />
                {names.length > 3 && (
                  <button
                    onClick={() => setNames((arr) => arr.filter((_, j) => j !== i))}
                    className="w-12 rounded-2xl border border-line text-mist"
                    aria-label="Retirer"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {names.length < 10 && (
              <button
                onClick={() => setNames((arr) => [...arr, ""])}
                className="w-full rounded-2xl border border-dashed border-line py-3 text-sm text-mist"
              >
                + Ajouter un joueur
              </button>
            )}
          </div>

          <button
            onClick={start}
            disabled={validCount < 3}
            className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {validCount < 3 ? "3 joueurs minimum" : "Lancer la partie"}
          </button>
        </div>
      </Shell>
    );
  }

  const ranking = [...state.players].sort((a, b) => b.score - a.score);

  /* ---------- fin de partie ---------- */
  if (state.phase === "end") {
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center pb-safe text-center">
          <ConfettiRain />
          <p className="eyebrow text-mist">Classement final</p>
          <p className="display mt-3 text-5xl">{ranking[0].name} 🏆</p>
          <div className="mt-8 w-full space-y-2">
            {ranking.map((p, i) => (
              <div
                key={p.name}
                className={`flex items-center justify-between rounded-2xl border px-5 py-3 ${
                  i === 0 ? "border-flame/60 bg-flame/10" : "border-line bg-white/[0.03]"
                }`}
              >
                <span className="text-sm">
                  <span className="mr-2 text-mist">{i + 1}.</span>
                  {p.name}
                </span>
                <span className="display text-2xl tabular-nums">{p.score}</span>
              </div>
            ))}
          </div>
          <div className="mt-10 flex gap-3">
            <button
              onClick={() => {
                vibrate(15);
                update((s) => {
                  s.players.forEach((p) => (p.score = 0));
                  s.roundCount = 1;
                  s.phase = "round";
                  s.round = newRound(s);
                });
                setWordShown(false);
              }}
              className="rounded-full bg-flame px-7 py-4 font-semibold text-ink"
            >
              Rejouer
            </button>
            <button
              onClick={reset}
              className="rounded-full border border-line px-7 py-4 text-cream"
            >
              Nouveaux joueurs
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const r = state.round!;
  const revealPlayer = state.players[r.revealIdx];

  return (
    <Shell
      subtitle={`Manche ${state.roundCount}`}
      onRanking={() => setShowRanking(true)}
      onReset={reset}
    >
      {/* ---------- classement en cours de partie ---------- */}
      <AnimatePresence>
        {showRanking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/70 backdrop-blur-sm"
            onClick={() => setShowRanking(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="rounded-t-[2rem] border-t border-line bg-[#161419] px-6 pb-safe pb-8 pt-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
              <p className="eyebrow text-mist">Classement · manche {state.roundCount}</p>
              <div className="mt-4 space-y-2">
                {ranking.map((p, i) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.03] px-4 py-2.5"
                  >
                    <span className="text-sm">
                      <span className="mr-2 text-mist">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="display text-xl tabular-nums">{p.score}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={endGame}
                className="mt-5 w-full rounded-full border border-flame/50 py-3.5 text-sm font-medium text-flame"
              >
                Terminer la partie
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- révélation des mots ---------- */}
      {r.step === "reveal" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          {!wordShown ? (
            <motion.div
              key={`handoff-${r.revealIdx}`}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <p className="eyebrow text-mist">
                Mot secret {r.revealIdx + 1} / {state.players.length}
              </p>
              <p className="display mt-3 text-4xl">
                Passe le téléphone à{" "}
                <span className="italic text-flame">{revealPlayer.name}</span>
              </p>
              <p className="mt-3 text-xs text-mist">Les autres, on ne regarde pas 👀</p>
              <button
                onClick={() => {
                  dismissKeyboard();
                  vibrate(15);
                  setWordShown(true);
                }}
                className="mt-8 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
              >
                Je suis {revealPlayer.name} — voir mon mot
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`word-${r.revealIdx}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              <p className="eyebrow text-mist">Ton mot secret</p>
              <div className="mx-auto mt-6 flex min-h-40 items-center justify-center rounded-3xl border border-cream/20 bg-cream px-6 py-10 shadow-[0_20px_60px_-20px_rgba(244,238,227,0.3)]">
                <p className="display text-5xl leading-tight text-ink">
                  {r.revealIdx === r.undercover ? r.secretWord : r.commonWord}
                </p>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-mist">
                Mémorise-le et ne le dis à personne.
                <br />
                Tu donneras seulement un indice qui l&apos;évoque.
              </p>
              <button
                onClick={() => {
                  vibrate(15);
                  setWordShown(false);
                  update((s) => {
                    const round = s.round!;
                    if (round.revealIdx + 1 >= s.players.length) {
                      round.step = "discuss";
                    } else {
                      round.revealIdx += 1;
                    }
                  });
                }}
                className="mt-8 w-full rounded-full bg-cream py-4.5 font-semibold text-ink active:scale-[0.98] transition-transform"
              >
                C&apos;est mémorisé — cacher le mot
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ---------- débat à voix haute ---------- */}
      {r.step === "discuss" && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-1 flex-col justify-center pb-safe pb-8"
        >
          <p className="eyebrow text-center text-mist">À voix haute</p>
          <p className="display mt-3 text-center text-3xl leading-snug">
            Chacun son tour,
            <br />
            donnez <span className="italic text-flame">un indice</span>.
          </p>
          <p className="mx-auto mt-3 max-w-72 text-center text-sm leading-relaxed text-mist">
            Un mot qui évoque ton mot secret — assez précis pour rassurer les
            autres, assez flou pour ne pas aider l&apos;intrus.
          </p>

          <div className="mt-7">
            <p className="eyebrow mb-2.5 text-mist">Ordre de passage</p>
            <div className="flex flex-wrap gap-2">
              {state.players.map((_, i) => {
                const idx = (r.firstSpeaker + i) % state.players.length;
                return (
                  <span
                    key={idx}
                    className={`rounded-full border px-4 py-2 text-sm ${
                      i === 0
                        ? "border-flame bg-flame/15 text-flame"
                        : "border-line bg-white/[0.03] text-cream"
                    }`}
                  >
                    {i + 1}. {state.players[idx].name}
                  </span>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => {
              vibrate(15);
              update((s) => {
                s.round!.step = "accuse";
              });
            }}
            className="mt-9 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
          >
            Tout le monde a parlé — au vote !
          </button>
          <p className="mt-3 text-center text-xs text-mist">
            Débattez autant que vous voulez avant de voter.
          </p>
        </motion.div>
      )}

      {/* ---------- accusation (1er et 2e vote) ---------- */}
      {(r.step === "accuse" || r.step === "accuse2") && (
        <motion.div
          key={r.step}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-1 flex-col justify-center pb-safe pb-8"
        >
          {r.step === "accuse2" && (
            <motion.p
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-5 rounded-2xl border border-flame/40 bg-flame/10 px-5 py-3.5 text-center text-sm text-flame"
            >
              Raté ! Ce n&apos;était pas {state.players[r.firstAccused!].name}.
              <br />
              <span className="text-cream">Une dernière chance…</span>
            </motion.p>
          )}
          <p className="eyebrow text-center text-mist">
            {r.step === "accuse" ? "Le verdict du groupe" : "Second vote"}
          </p>
          <p className="display mt-3 text-center text-3xl leading-snug">
            Qui est <span className="italic text-flame">sous couverture</span> ?
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2.5">
            {state.players.map((p, i) => {
              const excluded = r.step === "accuse2" && i === r.firstAccused;
              return (
                <button
                  key={p.name}
                  disabled={excluded}
                  onClick={() => {
                    vibrate(10);
                    setAccused(i);
                  }}
                  className={`rounded-2xl border py-4 text-sm font-medium transition-colors ${
                    excluded
                      ? "border-line text-mist/30 line-through"
                      : accused === i
                        ? "border-flame bg-flame text-ink"
                        : "border-line bg-white/[0.04] text-cream"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => accused !== null && accuse(accused)}
            disabled={accused === null}
            className="mt-7 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {accused !== null
              ? `Accuser ${state.players[accused].name}`
              : "Choisissez un suspect"}
          </button>
        </motion.div>
      )}

      {/* ---------- résultat de la manche ---------- */}
      {r.step === "result" && r.outcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-1 flex-col items-center justify-center pb-safe pb-8 text-center"
        >
          {r.outcome !== "escaped" && <ConfettiRain />}
          <p className="eyebrow text-mist">
            {r.outcome === "escaped" ? "Personne ne l'a vu venir" : "Démasqué !"}
          </p>
          <p className="display mt-3 text-4xl leading-snug">
            <span className="italic text-flame">{state.players[r.undercover].name}</span>
            <br />
            était sous couverture
          </p>

          <div className="mt-7 flex items-stretch gap-3">
            <div className="rounded-2xl border border-line bg-white/[0.04] px-5 py-4">
              <p className="eyebrow text-mist" style={{ fontSize: "0.55rem" }}>
                Votre mot
              </p>
              <p className="display mt-1 text-2xl">{r.commonWord}</p>
            </div>
            <div className="rounded-2xl border border-flame/50 bg-flame/10 px-5 py-4">
              <p className="eyebrow text-flame" style={{ fontSize: "0.55rem" }}>
                Son mot
              </p>
              <p className="display mt-1 text-2xl text-flame">{r.secretWord}</p>
            </div>
          </div>

          <p className="mt-6 text-sm text-mist">
            {r.outcome === "first" &&
              `Trouvé du premier coup : +${PTS_FIRST} points pour les autres joueurs.`}
            {r.outcome === "second" &&
              `Trouvé à la seconde chance : +${PTS_SECOND} point pour les autres joueurs.`}
            {r.outcome === "escaped" &&
              `Il file entre les mailles : +${PTS_ESCAPED} points pour ${state.players[r.undercover].name}.`}
          </p>

          <div className="mt-9 flex w-full flex-col gap-2.5">
            <button
              onClick={nextRound}
              className="w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
            >
              Mots suivants
            </button>
            <button
              onClick={endGame}
              className="w-full rounded-full border border-line py-4 text-cream"
            >
              Terminer la partie
            </button>
          </div>
        </motion.div>
      )}
    </Shell>
  );
}

/* ---------- coquille ---------- */

function Shell({
  children,
  subtitle,
  onRanking,
  onReset,
}: {
  children: React.ReactNode;
  subtitle?: string;
  onRanking?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-scene" />
      <div className="bg-noise" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        <header className="pt-safe flex items-center justify-between pb-3 pt-6">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
            aria-label="Retour"
          >
            ←
          </Link>
          <div className="text-center">
            <p className="eyebrow text-mist">Sous Couverture</p>
            {subtitle && <p className="mt-0.5 text-xs text-mist">{subtitle}</p>}
          </div>
          <div className="flex gap-2">
            {onRanking && (
              <button
                onClick={onRanking}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
                aria-label="Classement"
              >
                🏆
              </button>
            )}
            {onReset ? (
              <button
                onClick={onReset}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
                aria-label="Nouvelle partie"
              >
                ↺
              </button>
            ) : (
              !onRanking && <span className="h-10 w-10" />
            )}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
