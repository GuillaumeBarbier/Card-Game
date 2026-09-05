"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import QUESTIONS from "@/data/bobard.json";
import { dismissKeyboard, loadProfile, vibrate } from "@/lib/store";
import ConfettiRain from "./ConfettiRain";

const PTS_TRUTH = 2; // trouver la vraie réponse
const PTS_FOOL = 1; // par joueur piégé sur ton bobard

interface BQuestion {
  q: string;
  a: string;
  info: string;
}

type Step = "question" | "write" | "vote" | "reveal";

interface BRound {
  qIdx: number;
  step: Step;
  turn: number; // joueur en cours (écriture puis vote)
  answers: string[]; // bobard de chaque joueur
  votes: (number | null)[]; // index dans options, par joueur
  optionOrder: number[]; // permutation de [0..n] où n = vraie réponse
  revealStage: number;
}

interface BState {
  players: { name: string; score: number }[];
  used: number[];
  round: number;
  totalRounds: number;
  phase: "round" | "end";
  r: BRound | null;
}

const KEY = "entrenous.bobard";

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function LeBobard() {
  const [state, setState] = useState<BState | null>(null);
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2", ""]);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const s = JSON.parse(saved) as BState;
        if (s.players?.length >= 3) setState(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: BState | null) => {
    setState(s);
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  };

  const newRound = (s: BState) => {
    let pool = (QUESTIONS as BQuestion[]).map((_, i) => i).filter((i) => !s.used.includes(i));
    if (pool.length === 0) {
      s.used = [];
      pool = (QUESTIONS as BQuestion[]).map((_, i) => i);
    }
    const qIdx = pool[Math.floor(Math.random() * pool.length)];
    s.used.push(qIdx);
    s.r = {
      qIdx,
      step: "question",
      turn: 0,
      answers: [],
      votes: Array(s.players.length).fill(null),
      optionOrder: [],
      revealStage: 0,
    };
  };

  const start = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 3) return;
    dismissKeyboard();
    vibrate(20);
    const s: BState = {
      players: list.map((name) => ({ name, score: 0 })),
      used: [],
      round: 1,
      totalRounds: 5,
      phase: "round",
      r: null,
    };
    newRound(s);
    persist(s);
    setDraft("");
    setPicked(null);
    setError(null);
  };

  const update = (fn: (s: BState) => void) => {
    if (!state) return;
    const s = structuredClone(state);
    fn(s);
    persist(s);
  };

  const reset = () => persist(null);

  /* ---------- setup ---------- */
  if (!state) {
    const validCount = names.filter((n) => n.trim()).length;
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
          <h1 className="display text-4xl leading-tight">
            Le<br />
            <span className="italic text-flame">Bobard.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Une question au fait incroyable… mais vrai. Chacun invente en secret
            une fausse réponse crédible, puis on vote : trouvez la vérité, piégez
            les autres.
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
            {names.length < 8 && (
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
            {validCount < 3 ? "3 joueurs minimum" : "Jouer (5 manches)"}
          </button>
        </div>
      </Shell>
    );
  }

  const ranking = [...state.players].sort((a, b) => b.score - a.score);

  /* ---------- fin ---------- */
  if (state.phase === "end") {
    return (
      <Shell onReset={reset}>
        <ConfettiRain />
        <div className="flex flex-1 flex-col items-center justify-center pb-safe text-center">
          <p className="eyebrow text-mist">Mythomane d&apos;or</p>
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
                  s.round = 1;
                  s.phase = "round";
                  newRound(s);
                });
                setDraft("");
                setPicked(null);
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
  const question = (QUESTIONS as BQuestion[])[r.qIdx];
  const currentPlayer = state.players[r.turn];
  const options = r.optionOrder.map((idx) =>
    idx === state.players.length ? question.a : r.answers[idx],
  );

  return (
    <Shell subtitle={`Manche ${state.round}/${state.totalRounds}`} onReset={reset}>
      {/* ---------- question ---------- */}
      {r.step === "question" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8 text-center">
          <p className="eyebrow text-mist">Lisez à voix haute</p>
          <div className="mt-5 rounded-3xl border border-cream/20 bg-cream px-6 py-9">
            <p className="display text-3xl leading-snug text-ink">{question.q}</p>
          </div>
          <p className="mx-auto mt-5 max-w-72 text-sm leading-relaxed text-mist">
            Chacun va inventer en secret une fausse réponse crédible. Le
            téléphone va circuler — soyez convaincants.
          </p>
          <button
            onClick={() => {
              vibrate(15);
              update((s) => {
                s.r!.step = "write";
                s.r!.turn = 0;
              });
            }}
            className="mt-8 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
          >
            Commencer la saisie secrète
          </button>
        </div>
      )}

      {/* ---------- écriture des bobards ---------- */}
      {r.step === "write" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          <p className="eyebrow text-center text-mist">
            Bobard {r.turn + 1} / {state.players.length}
          </p>
          <p className="display mt-2 text-center text-3xl">
            À toi, <span className="italic text-flame">{currentPlayer.name}</span>
          </p>
          <p className="mt-4 rounded-2xl border border-line bg-white/[0.04] px-4 py-3 text-center text-sm text-cream">
            {question.q}
          </p>
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value.slice(0, 45));
              setError(null);
            }}
            placeholder="Ta fausse réponse crédible…"
            autoComplete="off"
            className="mt-4 w-full rounded-2xl border border-line bg-white/[0.05] px-5 py-4 text-cream placeholder:text-mist focus:border-flame focus:outline-none"
          />
          {error && <p className="mt-2 text-center text-sm text-flame">{error}</p>}
          <button
            onClick={() => {
              const clean = draft.trim();
              if (!clean) return;
              if (norm(clean) === norm(question.a)) {
                vibrate(40);
                setError("Trop proche de la vérité… ruse encore !");
                return;
              }
              if (r.answers.some((a) => norm(a) === norm(clean))) {
                vibrate(40);
                setError("Quelqu'un a eu la même idée — trouve autre chose !");
                return;
              }
              dismissKeyboard();
              vibrate(15);
              setDraft("");
              setError(null);
              update((s) => {
                const rr = s.r!;
                rr.answers.push(clean);
                if (rr.turn + 1 >= s.players.length) {
                  // toutes les réponses sont là : on mélange bobards + vérité
                  rr.optionOrder = shuffle([
                    ...s.players.map((_, i) => i),
                    s.players.length,
                  ]);
                  rr.step = "vote";
                  rr.turn = 0;
                } else {
                  rr.turn += 1;
                }
              });
            }}
            disabled={!draft.trim()}
            className="mt-5 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {r.turn + 1 >= state.players.length
              ? "Valider — passer au vote"
              : `Valider — passer à ${state.players[r.turn + 1].name}`}
          </button>
          <p className="mt-3 text-center text-xs text-mist">
            Personne ne regarde pendant que tu écris 👀
          </p>
        </div>
      )}

      {/* ---------- vote ---------- */}
      {r.step === "vote" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          <p className="eyebrow text-center text-mist">
            Vote {r.turn + 1} / {state.players.length}
          </p>
          <p className="display mt-2 text-center text-3xl">
            <span className="italic text-flame">{currentPlayer.name}</span>, la
            vraie réponse ?
          </p>
          <p className="mt-3 rounded-2xl border border-line bg-white/[0.04] px-4 py-3 text-center text-sm text-cream">
            {question.q}
          </p>
          <div className="mt-4 space-y-2">
            {options.map((opt, i) => {
              const isMine = r.optionOrder[i] === r.turn;
              return (
                <button
                  key={i}
                  disabled={isMine}
                  onClick={() => {
                    vibrate(10);
                    setPicked(i);
                  }}
                  className={`w-full rounded-2xl border px-4 py-3.5 text-left text-sm transition-colors ${
                    isMine
                      ? "border-line text-mist/40"
                      : picked === i
                        ? "border-flame bg-flame font-semibold text-ink"
                        : "border-line bg-white/[0.04] text-cream"
                  }`}
                >
                  {opt}
                  {isMine && <span className="ml-2 text-xs">(ta réponse)</span>}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              if (picked === null) return;
              vibrate(15);
              const choice = picked;
              setPicked(null);
              update((s) => {
                const rr = s.r!;
                rr.votes[rr.turn] = choice;
                if (rr.turn + 1 >= s.players.length) {
                  // scoring
                  rr.votes.forEach((v, voter) => {
                    if (v === null) return;
                    const src = rr.optionOrder[v];
                    if (src === s.players.length) {
                      s.players[voter].score += PTS_TRUTH;
                    } else {
                      s.players[src].score += PTS_FOOL;
                    }
                  });
                  rr.step = "reveal";
                  rr.revealStage = 0;
                } else {
                  rr.turn += 1;
                }
              });
            }}
            disabled={picked === null}
            className="mt-5 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {r.turn + 1 >= state.players.length
              ? "Voter — voir la vérité"
              : `Voter — passer à ${state.players[r.turn + 1].name}`}
          </button>
        </div>
      )}

      {/* ---------- révélation en escalier ---------- */}
      {r.step === "reveal" && (
        <RevealScreen
          state={state}
          question={question}
          onNext={() => {
            vibrate(15);
            setDraft("");
            setPicked(null);
            update((s) => {
              if (s.round >= s.totalRounds) {
                s.phase = "end";
                s.r = null;
              } else {
                s.round += 1;
                newRound(s);
              }
            });
          }}
        />
      )}
    </Shell>
  );
}

/* ---------- révélation ---------- */

function RevealScreen({
  state,
  question,
  onNext,
}: {
  state: BState;
  question: BQuestion;
  onNext: () => void;
}) {
  const r = state.r!;
  const [stage, setStage] = useState(0);

  // bobards triés par nombre de victimes croissant, vérité en dernier
  const fakeEntries = state.players
    .map((p, i) => ({
      author: p.name,
      text: r.answers[i],
      victims: r.votes
        .map((v, voter) => ({ v, voter }))
        .filter(({ v }) => v !== null && r.optionOrder[v!] === i)
        .map(({ voter }) => state.players[voter].name),
    }))
    .sort((a, b) => a.victims.length - b.victims.length);

  const truthFinders = r.votes
    .map((v, voter) => ({ v, voter }))
    .filter(({ v }) => v !== null && r.optionOrder[v!] === state.players.length)
    .map(({ voter }) => state.players[voter].name);

  const totalStages = fakeEntries.length + 1;
  const done = stage >= totalStages;

  return (
    <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
      {done && truthFinders.length > 0 && <ConfettiRain />}
      <p className="eyebrow text-center text-mist">La vérité éclate</p>

      <div className="mt-4 max-h-[46vh] space-y-2 overflow-y-auto">
        {fakeEntries.slice(0, Math.min(stage, fakeEntries.length)).map((e) => (
          <motion.div
            key={e.text}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-line bg-white/[0.04] px-4 py-3"
          >
            <p className="text-sm text-cream line-through decoration-flame/70">{e.text}</p>
            <p className="mt-1 text-xs text-mist">
              Bobard de <span className="text-flame">{e.author}</span>
              {e.victims.length > 0
                ? ` — a piégé ${e.victims.join(", ")} (+${e.victims.length * PTS_FOOL})`
                : " — n'a piégé personne"}
            </p>
          </motion.div>
        ))}
        {done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="rounded-2xl border border-sage/60 bg-sage/10 px-4 py-4"
          >
            <p className="eyebrow text-sage" style={{ fontSize: "0.55rem" }}>
              La vraie réponse
            </p>
            <p className="display mt-1 text-2xl text-sage">{question.a}</p>
            <p className="mt-2 text-xs leading-relaxed text-mist">{question.info}</p>
            <p className="mt-2 text-xs text-cream">
              {truthFinders.length > 0
                ? `Trouvée par ${truthFinders.join(", ")} (+${PTS_TRUTH} chacun)`
                : "Personne ne l'a trouvée !"}
            </p>
          </motion.div>
        )}
      </div>

      {!done ? (
        <button
          onClick={() => {
            vibrate(12);
            setStage((s) => s + 1);
          }}
          className="mt-6 w-full rounded-full bg-cream py-4 font-semibold text-ink active:scale-[0.98] transition-transform"
        >
          {stage < fakeEntries.length ? "Révéler un bobard…" : "…et la vérité !"}
        </button>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[...state.players]
              .sort((a, b) => b.score - a.score)
              .map((p) => (
                <span
                  key={p.name}
                  className="rounded-full border border-line bg-white/[0.04] px-3 py-1.5 text-xs text-cream"
                >
                  {p.name} · <span className="tabular-nums">{p.score}</span>
                </span>
              ))}
          </div>
          <button
            onClick={onNext}
            className="mt-5 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
          >
            {state.round >= state.totalRounds ? "Classement final" : "Manche suivante"}
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- coquille ---------- */

function Shell({
  children,
  subtitle,
  onReset,
}: {
  children: React.ReactNode;
  subtitle?: string;
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
            <p className="eyebrow text-mist">Le Bobard</p>
            {subtitle && <p className="mt-0.5 text-xs text-mist">{subtitle}</p>}
          </div>
          {onReset ? (
            <button
              onClick={onReset}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
              aria-label="Recommencer"
            >
              ↺
            </button>
          ) : (
            <span className="h-10 w-10" />
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
