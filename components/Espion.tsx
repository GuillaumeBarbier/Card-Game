"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import LOCATIONS from "@/data/espion.json";
import { dismissKeyboard, loadProfile, vibrate } from "@/lib/store";
import ConfettiRain from "./ConfettiRain";
import RulesButton, { Rule } from "./RulesSheet";

/* ---------- points ---------- */
const PTS_FIRST = 2; // espion démasqué au premier vote
const PTS_SECOND = 1; // au second vote
const PTS_SPY_WIN = 4; // espion jamais pris, ou lieu deviné
const PTS_TIMEOUT_VOTE = 1; // vote de fin de temps réussi
const CANDIDATES = 12; // lieux affichés dans la grille de référence

interface Loc {
  lieu: string;
  roles: string[];
}

type Step = "reveal" | "play" | "vote" | "vote2" | "timeoutVote" | "spyGuess" | "result";
type Outcome = "first" | "second" | "escaped" | "timeoutCaught" | "spyGuessed" | "spyFailed";

interface ERound {
  locIdx: number;
  spy: number;
  roles: number[]; // rôle attribué à chaque joueur (index dans roles[])
  candidates: number[]; // grille des lieux possibles (contient locIdx)
  endsAt: number | null;
  step: Step;
  revealIdx: number;
  firstAccused: number | null;
  outcome: Outcome | null;
}

interface EState {
  players: { name: string; score: number }[];
  minutes: number;
  roundCount: number;
  phase: "round" | "end";
  r: ERound | null;
}

const KEY = "entrenous.espion";
const SEEN_KEY = "entrenous.espion.seen";

function loadSeen(): number[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as number[];
  } catch {
    return [];
  }
}

function markSeen(i: number) {
  const s = new Set(loadSeen());
  s.add(i);
  localStorage.setItem(SEEN_KEY, JSON.stringify([...s]));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newRound(playerCount: number): ERound {
  const all = (LOCATIONS as Loc[]).map((_, i) => i);
  let pool = all.filter((i) => !new Set(loadSeen()).has(i));
  if (pool.length === 0) {
    localStorage.removeItem(SEEN_KEY);
    pool = all;
  }
  const locIdx = pool[Math.floor(Math.random() * pool.length)];
  markSeen(locIdx);
  const loc = (LOCATIONS as Loc[])[locIdx];
  const roleOrder = shuffle(loc.roles.map((_, i) => i));
  const decoys = shuffle(all.filter((i) => i !== locIdx)).slice(0, CANDIDATES - 1);
  return {
    locIdx,
    spy: Math.floor(Math.random() * playerCount),
    roles: Array.from({ length: playerCount }, (_, i) => roleOrder[i % roleOrder.length]),
    candidates: shuffle([locIdx, ...decoys]),
    endsAt: null,
    step: "reveal",
    revealIdx: 0,
    firstAccused: null,
    outcome: null,
  };
}

function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Espion() {
  const [state, setState] = useState<EState | null>(null);
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [minutes, setMinutes] = useState(8);
  const [cardShown, setCardShown] = useState(false);
  const [accused, setAccused] = useState<number | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [showLocs, setShowLocs] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2", ""]);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const s = JSON.parse(saved) as EState;
        if (s.players?.length >= 3) setState(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // horloge pour le timer
  useEffect(() => {
    if (state?.r?.step !== "play") return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [state?.r?.step]);

  // fin du temps → vote obligatoire
  useEffect(() => {
    const r = state?.r;
    if (r?.step === "play" && r.endsAt !== null && now >= r.endsAt) {
      vibrate([200, 80, 200]);
      update((s) => {
        s.r!.step = "timeoutVote";
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const persist = (s: EState | null) => {
    setState(s);
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  };

  const update = (fn: (s: EState) => void) => {
    setState((prev) => {
      if (!prev) return prev;
      const s = structuredClone(prev);
      fn(s);
      localStorage.setItem(KEY, JSON.stringify(s));
      return s;
    });
  };

  const start = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 3) return;
    dismissKeyboard();
    vibrate(20);
    setCardShown(false);
    setAccused(null);
    setGuess(null);
    persist({
      players: list.map((name) => ({ name, score: 0 })),
      minutes,
      roundCount: 1,
      phase: "round",
      r: newRound(list.length),
    });
  };

  const reset = () => {
    persist(null);
    setShowRanking(false);
    setCardShown(false);
  };

  const finishRound = (outcome: Outcome) => {
    update((s) => {
      const r = s.r!;
      r.outcome = outcome;
      r.step = "result";
      switch (outcome) {
        case "first":
          s.players.forEach((p, i) => i !== r.spy && (p.score += PTS_FIRST));
          break;
        case "second":
          s.players.forEach((p, i) => i !== r.spy && (p.score += PTS_SECOND));
          break;
        case "timeoutCaught":
          s.players.forEach((p, i) => i !== r.spy && (p.score += PTS_TIMEOUT_VOTE));
          break;
        case "spyFailed":
          s.players.forEach((p, i) => i !== r.spy && (p.score += PTS_FIRST));
          break;
        case "escaped":
        case "spyGuessed":
          s.players[r.spy].score += PTS_SPY_WIN;
          break;
      }
    });
  };

  const accuse = (idx: number) => {
    if (!state?.r) return;
    vibrate(20);
    setAccused(null);
    const r = state.r;
    if (idx === r.spy) {
      finishRound(r.step === "vote" ? "first" : r.step === "vote2" ? "second" : "timeoutCaught");
    } else if (r.step === "vote") {
      update((s) => {
        s.r!.firstAccused = idx;
        s.r!.step = "vote2";
      });
    } else {
      finishRound("escaped");
    }
  };

  const nextRound = () => {
    vibrate(15);
    setCardShown(false);
    setAccused(null);
    setGuess(null);
    setShowLocs(false);
    update((s) => {
      s.roundCount += 1;
      s.r = newRound(s.players.length);
    });
  };

  const endGame = () => {
    vibrate(20);
    setShowRanking(false);
    update((s) => {
      s.phase = "end";
      s.r = null;
    });
  };

  /* ---------- setup ---------- */
  if (!state) {
    const validCount = names.filter((n) => n.trim()).length;
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
          <h1 className="display text-4xl leading-tight">
            L&apos;<span className="italic text-flame">Espion.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Tout le monde sait où on est… sauf l&apos;espion. Interrogez-vous à
            voix haute : soyez assez précis pour prouver que vous connaissez le
            lieu, assez flous pour ne pas le lui souffler.
          </p>

          <p className="eyebrow mt-6 mb-2 text-mist">Durée de la manche</p>
          <div className="flex rounded-full border border-line bg-white/[0.04] p-1">
            {[5, 8, 12].map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={`flex-1 rounded-full py-3 text-sm font-medium transition-colors ${
                  minutes === m ? "bg-cream text-ink" : "text-mist"
                }`}
              >
                {m} min
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2.5">
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
      <Shell onReset={reset}>
        <ConfettiRain />
        <div className="flex flex-1 flex-col items-center justify-center pb-safe text-center">
          <p className="eyebrow text-mist">Agent de l&apos;année</p>
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
                setCardShown(false);
                update((s) => {
                  s.players.forEach((p) => (p.score = 0));
                  s.roundCount = 1;
                  s.phase = "round";
                  s.r = newRound(s.players.length);
                });
              }}
              className="rounded-full bg-flame px-7 py-4 font-semibold text-ink"
            >
              Rejouer
            </button>
            <button onClick={reset} className="rounded-full border border-line px-7 py-4 text-cream">
              Nouveaux joueurs
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  const r = state.r!;
  const loc = (LOCATIONS as Loc[])[r.locIdx];
  const revealPlayer = state.players[r.revealIdx];
  const isSpyRevealing = r.revealIdx === r.spy;

  return (
    <Shell
      subtitle={`Manche ${state.roundCount}`}
      onRanking={() => setShowRanking(true)}
      onReset={reset}
    >
      {/* ---------- classement ---------- */}
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

      {/* ---------- révélation des cartes ---------- */}
      {r.step === "reveal" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          {!cardShown ? (
            <motion.div
              key={`h-${r.revealIdx}`}
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <p className="eyebrow text-mist">
                Carte secrète {r.revealIdx + 1} / {state.players.length}
              </p>
              <p className="display mt-3 text-4xl">
                Passe le téléphone à{" "}
                <span className="italic text-flame">{revealPlayer.name}</span>
              </p>
              <p className="mt-3 text-xs text-mist">Les autres, on ne regarde pas 👀</p>
              <button
                onClick={() => {
                  vibrate(15);
                  setCardShown(true);
                }}
                className="mt-8 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
              >
                Je suis {revealPlayer.name} — voir ma carte
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`c-${r.revealIdx}`}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center"
            >
              {isSpyRevealing ? (
                <div className="mx-auto rounded-3xl border border-flame/60 bg-flame/10 px-6 py-10">
                  <p className="text-5xl">🕶️</p>
                  <p className="display mt-3 text-4xl text-flame">Tu es l&apos;espion.</p>
                  <p className="mt-3 text-sm leading-relaxed text-mist">
                    Tu ne connais pas le lieu. Écoute, réponds sans te trahir…
                    et devine où vous êtes.
                  </p>
                </div>
              ) : (
                <div className="mx-auto rounded-3xl border border-cream/20 bg-cream px-6 py-10">
                  <p className="eyebrow text-ink/50">Le lieu</p>
                  <p className="display mt-1 text-4xl text-ink">{loc.lieu}</p>
                  <p className="eyebrow mt-5 text-ink/50">Ton rôle</p>
                  <p className="display mt-1 text-2xl italic text-ink">
                    {loc.roles[r.roles[r.revealIdx]]}
                  </p>
                </div>
              )}
              <p className="mt-4 text-xs text-mist">
                Mémorise, puis cache l&apos;écran avant de passer.
              </p>
              <button
                onClick={() => {
                  vibrate(15);
                  setCardShown(false);
                  update((s) => {
                    const rr = s.r!;
                    if (rr.revealIdx + 1 >= s.players.length) {
                      rr.step = "play";
                      rr.endsAt = Date.now() + s.minutes * 60_000;
                    } else {
                      rr.revealIdx += 1;
                    }
                  });
                }}
                className="mt-6 w-full rounded-full bg-cream py-4.5 font-semibold text-ink active:scale-[0.98] transition-transform"
              >
                {r.revealIdx + 1 >= state.players.length
                  ? "C'est mémorisé — lancer l'interrogatoire"
                  : "C'est mémorisé — cacher"}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* ---------- interrogatoire ---------- */}
      {r.step === "play" && (
        <div className="flex flex-1 flex-col pb-safe pb-6">
          <div className="mt-2 text-center">
            <p className="display text-6xl tabular-nums">
              {fmt((r.endsAt ?? 0) - now)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Posez-vous des questions à tour de rôle.
              <br />
              Précis sans vendre le lieu, flous sans devenir suspects.
            </p>
          </div>

          <button
            onClick={() => {
              vibrate(10);
              setShowLocs((v) => !v);
            }}
            className="mt-5 w-full rounded-2xl border border-line bg-white/[0.03] py-3 text-sm text-mist"
          >
            {showLocs ? "Masquer les lieux possibles" : "Voir les lieux possibles"}
          </button>
          <AnimatePresence>
            {showLocs && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  {r.candidates.map((ci) => (
                    <span
                      key={ci}
                      className="rounded-xl border border-line bg-white/[0.03] px-3 py-2 text-center text-xs text-cream"
                    >
                      {(LOCATIONS as Loc[])[ci].lieu}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-auto space-y-2.5">
            <button
              onClick={() => {
                vibrate(15);
                update((s) => {
                  s.r!.step = "vote";
                });
              }}
              className="w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
            >
              On accuse quelqu&apos;un !
            </button>
            <button
              onClick={() => {
                vibrate(20);
                update((s) => {
                  s.r!.step = "spyGuess";
                });
              }}
              className="w-full rounded-full border border-flame/50 py-4 text-sm font-medium text-flame"
            >
              🕶️ Je suis l&apos;espion — je devine le lieu
            </button>
          </div>
        </div>
      )}

      {/* ---------- votes ---------- */}
      {(r.step === "vote" || r.step === "vote2" || r.step === "timeoutVote") && (
        <motion.div
          key={r.step}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-1 flex-col justify-center pb-safe pb-8"
        >
          {r.step === "vote2" && (
            <p className="mb-5 rounded-2xl border border-flame/40 bg-flame/10 px-5 py-3.5 text-center text-sm text-flame">
              Raté ! Ce n&apos;était pas {state.players[r.firstAccused!].name}.
              <br />
              <span className="text-cream">Une dernière chance…</span>
            </p>
          )}
          {r.step === "timeoutVote" && (
            <p className="mb-5 rounded-2xl border border-line bg-white/[0.04] px-5 py-3.5 text-center text-sm text-cream">
              ⏱ Temps écoulé — vote final obligatoire, un seul essai !
            </p>
          )}
          <p className="eyebrow text-center text-mist">Le verdict du groupe</p>
          <p className="display mt-3 text-center text-3xl leading-snug">
            Qui est <span className="italic text-flame">l&apos;espion</span> ?
          </p>

          <div className="mt-7 grid grid-cols-2 gap-2.5">
            {state.players.map((p, i) => {
              const excluded = r.step === "vote2" && i === r.firstAccused;
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
            {accused !== null ? `Accuser ${state.players[accused].name}` : "Choisissez un suspect"}
          </button>
          {r.step === "vote" && (
            <button
              onClick={() => {
                vibrate(10);
                update((s) => {
                  s.r!.step = "play";
                });
              }}
              className="mx-auto mt-4 block text-xs text-mist underline underline-offset-4"
            >
              Fausse alerte — reprendre l&apos;interrogatoire
            </button>
          )}
        </motion.div>
      )}

      {/* ---------- l'espion devine ---------- */}
      {r.step === "spyGuess" && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex flex-1 flex-col justify-center pb-safe pb-8"
        >
          <p className="eyebrow text-center text-mist">Coup de théâtre 🕶️</p>
          <p className="display mt-3 text-center text-3xl leading-snug">
            Alors, où sommes-nous ?
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2">
            {r.candidates.map((ci) => (
              <button
                key={ci}
                onClick={() => {
                  vibrate(10);
                  setGuess(ci);
                }}
                className={`rounded-2xl border px-3 py-3.5 text-sm transition-colors ${
                  guess === ci
                    ? "border-flame bg-flame font-semibold text-ink"
                    : "border-line bg-white/[0.04] text-cream"
                }`}
              >
                {(LOCATIONS as Loc[])[ci].lieu}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              if (guess === null) return;
              vibrate(20);
              const ok = guess === r.locIdx;
              setGuess(null);
              finishRound(ok ? "spyGuessed" : "spyFailed");
            }}
            disabled={guess === null}
            className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {guess !== null
              ? `C'est sûr : ${(LOCATIONS as Loc[])[guess].lieu} !`
              : "Choisis un lieu"}
          </button>
          <button
            onClick={() => {
              vibrate(10);
              update((s) => {
                s.r!.step = "play";
              });
            }}
            className="mx-auto mt-4 block text-xs text-mist underline underline-offset-4"
          >
            Finalement non — reprendre
          </button>
        </motion.div>
      )}

      {/* ---------- résultat ---------- */}
      {r.step === "result" && r.outcome && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-1 flex-col items-center justify-center pb-safe pb-8 text-center"
        >
          {["first", "second", "timeoutCaught", "spyFailed"].includes(r.outcome) && (
            <ConfettiRain />
          )}
          <p className="eyebrow text-mist">
            {["escaped", "spyGuessed"].includes(r.outcome)
              ? "L'espion s'en sort"
              : "Espion démasqué !"}
          </p>
          <p className="display mt-3 text-4xl leading-snug">
            <span className="italic text-flame">{state.players[r.spy].name}</span>
            <br />
            était l&apos;espion
          </p>

          <div className="mt-6 rounded-2xl border border-line bg-white/[0.04] px-6 py-4">
            <p className="eyebrow text-mist" style={{ fontSize: "0.55rem" }}>
              Le lieu était
            </p>
            <p className="display mt-1 text-3xl">{loc.lieu}</p>
          </div>

          <p className="mt-5 max-w-72 text-sm leading-relaxed text-mist">
            {r.outcome === "first" && `Démasqué au premier vote : +${PTS_FIRST} pour les agents.`}
            {r.outcome === "second" && `Démasqué à la seconde chance : +${PTS_SECOND} pour les agents.`}
            {r.outcome === "timeoutCaught" && `Coincé au vote final : +${PTS_TIMEOUT_VOTE} pour les agents.`}
            {r.outcome === "spyFailed" && `Pari raté ! Mauvais lieu : +${PTS_FIRST} pour les agents.`}
            {r.outcome === "escaped" && `Les agents se sont trompés : +${PTS_SPY_WIN} pour l'espion.`}
            {r.outcome === "spyGuessed" && `Lieu deviné, coup parfait : +${PTS_SPY_WIN} pour l'espion.`}
          </p>

          <div className="mt-9 flex w-full flex-col gap-2.5">
            <button
              onClick={nextRound}
              className="w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
            >
              Nouvelle mission
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

const RULES = (
  <>
    <Rule n={1} title="Un lieu, un espion">
      Tous les joueurs voient le lieu de la manche et un rôle d&apos;ambiance.
      L&apos;espion, lui, ne sait pas où vous êtes.
    </Rule>
    <Rule n={2} title="Interrogatoire">
      Posez-vous des questions à tour de rôle (« Tu viens souvent ici ? »).
      Répondez assez précis pour prouver que vous connaissez le lieu, assez
      flou pour ne pas le souffler à l&apos;espion.
    </Rule>
    <Rule n={3} title="Les lieux possibles">
      La liste des lieux candidats est consultable par tout le monde — c&apos;est
      dedans que l&apos;espion pioche ses hypothèses.
    </Rule>
    <Rule n={4} title="Accusez !">
      À tout moment : vote du groupe. Espion pris : +2 chacun (+1 à la seconde
      chance ou au vote de fin de temps). Erreur : +4 pour l&apos;espion.
    </Rule>
    <Rule n={5} title="Le coup de théâtre">
      L&apos;espion peut interrompre la partie et deviner le lieu : correct,
      +4 pour lui ; raté, +2 pour les agents.
    </Rule>
    <Rule n={6} title="Temps écoulé">
      À la fin du chrono, vote final obligatoire — un seul essai.
    </Rule>
  </>
);

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
            <p className="eyebrow text-mist">L&apos;Espion</p>
            {subtitle && <p className="mt-0.5 text-xs text-mist">{subtitle}</p>}
          </div>
          <div className="flex gap-2">
            <RulesButton title="L'Espion">{RULES}</RulesButton>
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
