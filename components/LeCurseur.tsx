"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import AXES from "@/data/curseur.json";
import { dismissKeyboard, loadProfile, vibrate } from "@/lib/store";
import ConfettiRain from "./ConfettiRain";

const TOTAL_ROUNDS = 7;
// zone cible : ±5 → 4 pts, ±10 → 3 pts, ±16 → 2 pts
const RINGS = [
  { d: 5, pts: 4 },
  { d: 10, pts: 3 },
  { d: 16, pts: 2 },
];

type Phase = "setup" | "handoff" | "target" | "clue" | "place" | "reveal" | "end";

interface CState {
  players: string[];
  round: number;
  score: number;
  seer: number;
  axis: [string, string];
  target: number;
  usedAxes: number[];
  phase: Phase;
}

const KEY = "entrenous.curseur";

function pointsFor(diff: number): number {
  for (const r of RINGS) if (diff <= r.d) return r.pts;
  return 0;
}

function verdictFor(score: number): string {
  const max = TOTAL_ROUNDS * 4;
  const ratio = score / max;
  if (ratio >= 0.85) return "Fusionnels. C'en est presque inquiétant.";
  if (ratio >= 0.65) return "Belle connexion — vous vous devinez.";
  if (ratio >= 0.4) return "Il y a du signal, mais aussi de la friture.";
  if (ratio >= 0.2) return "Vous vivez sur la même planète, c'est déjà ça.";
  return "On dirait deux langues étrangères. Rejouez, vite.";
}

export default function LeCurseur() {
  const [state, setState] = useState<CState | null>(null);
  const [names, setNames] = useState<string[]>(["", ""]);
  const [cursor, setCursor] = useState(50);
  const [lastPts, setLastPts] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2"]);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const s = JSON.parse(saved) as CState;
        if (s.players?.length >= 2 && s.phase !== "end") setState(s);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: CState | null) => {
    setState(s);
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  };

  const newRound = (s: CState): CState => {
    let pool = (AXES as [string, string][]).map((_, i) => i).filter((i) => !s.usedAxes.includes(i));
    if (pool.length === 0) {
      s.usedAxes = [];
      pool = (AXES as [string, string][]).map((_, i) => i);
    }
    const idx = pool[Math.floor(Math.random() * pool.length)];
    s.usedAxes.push(idx);
    s.axis = (AXES as [string, string][])[idx];
    // cible jamais collée aux bords pour que les anneaux restent entiers
    s.target = 8 + Math.random() * 84;
    s.phase = "handoff";
    return s;
  };

  const start = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 2) return;
    dismissKeyboard();
    vibrate(20);
    setCursor(50);
    setLastPts(null);
    persist(
      newRound({
        players: list,
        round: 1,
        score: 0,
        seer: Math.floor(Math.random() * list.length),
        axis: ["", ""],
        target: 50,
        usedAxes: [],
        phase: "handoff",
      }),
    );
  };

  const update = (fn: (s: CState) => void) => {
    if (!state) return;
    const s = structuredClone(state);
    fn(s);
    persist(s);
  };

  const drag = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    setCursor((x / rect.width) * 100);
  };

  const validate = () => {
    if (!state) return;
    const pts = pointsFor(Math.abs(cursor - state.target));
    setLastPts(pts);
    vibrate(pts === 4 ? [40, 60, 40, 60, 120] : pts > 0 ? [30, 40, 30] : 60);
    update((s) => {
      s.score += pts;
      s.phase = "reveal";
    });
  };

  const next = () => {
    vibrate(15);
    setCursor(50);
    setLastPts(null);
    update((s) => {
      if (s.round >= TOTAL_ROUNDS) {
        s.phase = "end";
      } else {
        s.round += 1;
        s.seer = (s.seer + 1) % s.players.length;
        newRound(s);
      }
    });
  };

  const reset = () => {
    persist(null);
    setCursor(50);
    setLastPts(null);
  };

  /* ---------- setup ---------- */
  if (!state) {
    const validCount = names.filter((n) => n.trim()).length;
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
          <h1 className="display text-4xl leading-tight">
            Le<br />
            <span className="italic text-flame">Curseur.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Un joueur voit où se cache la cible entre deux extrêmes et donne un
            seul indice. Les autres placent le curseur. Êtes-vous sur la même
            longueur d&apos;onde ?
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
                {names.length > 2 && (
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
            disabled={validCount < 2}
            className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {validCount < 2 ? "2 joueurs minimum" : `Jouer (${TOTAL_ROUNDS} manches)`}
          </button>
        </div>
      </Shell>
    );
  }

  const seer = state.players[state.seer];
  const [left, right] = state.axis;

  /* ---------- fin ---------- */
  if (state.phase === "end") {
    const max = TOTAL_ROUNDS * 4;
    return (
      <Shell onReset={reset}>
        {state.score / max >= 0.65 && <ConfettiRain />}
        <div className="flex flex-1 flex-col items-center justify-center pb-safe text-center">
          <p className="eyebrow text-mist">Score d&apos;équipe</p>
          <p className="display mt-4 text-7xl">
            {state.score}
            <span className="text-3xl text-mist"> / {max}</span>
          </p>
          <p className="mt-4 max-w-64 text-sm leading-relaxed text-mist">
            {verdictFor(state.score)}
          </p>
          <button
            onClick={() => {
              reset();
            }}
            className="mt-10 rounded-full bg-flame px-8 py-4 font-semibold text-ink"
          >
            Rejouer
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell subtitle={`Manche ${state.round}/${TOTAL_ROUNDS} · ${state.score} pts`} onReset={reset}>
      {/* ---------- passage au voyant ---------- */}
      {state.phase === "handoff" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8 text-center">
          <p className="eyebrow text-mist">Le voyant de cette manche</p>
          <p className="display mt-3 text-4xl">
            Passe le téléphone à <span className="italic text-flame">{seer}</span>
          </p>
          <p className="mt-3 text-xs text-mist">Les autres, on ne regarde pas 👀</p>
          <button
            onClick={() => {
              vibrate(15);
              update((s) => {
                s.phase = "target";
              });
            }}
            className="mt-8 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
          >
            Je suis {seer} — voir la cible
          </button>
        </div>
      )}

      {/* ---------- cible secrète ---------- */}
      {state.phase === "target" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          <p className="eyebrow text-center text-mist">Ta cible secrète</p>
          <Scale left={left} right={right} target={state.target} className="mt-6" />
          <p className="mx-auto mt-5 max-w-72 text-center text-sm leading-relaxed text-mist">
            Trouve UN indice (mot ou expression) qui se situe pile dans la zone
            orange sur cet axe.
          </p>
          <button
            onClick={() => {
              vibrate(15);
              update((s) => {
                s.phase = "clue";
              });
            }}
            className="mt-8 w-full rounded-full bg-cream py-4.5 font-semibold text-ink active:scale-[0.98] transition-transform"
          >
            J&apos;ai mon indice — cacher la cible
          </button>
        </div>
      )}

      {/* ---------- annonce de l'indice ---------- */}
      {state.phase === "clue" && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8 text-center">
          <Scale left={left} right={right} className="mt-2" />
          <p className="display mt-8 text-3xl leading-snug">
            <span className="italic text-flame">{seer}</span>, annonce ton indice
            à voix haute.
          </p>
          <p className="mt-3 text-sm text-mist">
            Un seul indice, pas de chiffre, pas de « plutôt à gauche » !
          </p>
          <button
            onClick={() => {
              vibrate(15);
              update((s) => {
                s.phase = "place";
              });
            }}
            className="mt-8 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
          >
            C&apos;est dit — au tour de l&apos;équipe
          </button>
        </div>
      )}

      {/* ---------- placement du curseur ---------- */}
      {(state.phase === "place" || state.phase === "reveal") && (
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          <p className="eyebrow text-center text-mist">
            {state.phase === "place" ? "Placez le curseur ensemble" : "Révélation"}
          </p>

          <Scale
            left={left}
            right={right}
            target={state.phase === "reveal" ? state.target : undefined}
            cursor={cursor}
            onDrag={state.phase === "place" ? drag : undefined}
            trackRef={trackRef}
            className="mt-6"
          />

          {state.phase === "place" ? (
            <>
              <p className="mx-auto mt-5 max-w-64 text-center text-xs text-mist">
                Glisse le curseur — {seer} garde le silence et son air mystérieux.
              </p>
              <button
                onClick={validate}
                className="mt-8 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
              >
                Valider
              </button>
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {lastPts === 4 && <ConfettiRain />}
              <p
                className={`display mt-6 text-5xl italic ${
                  lastPts && lastPts > 0 ? "text-sage" : "text-flame"
                }`}
              >
                {lastPts === 4 && "En plein cœur !"}
                {lastPts === 3 && "Tout près !"}
                {lastPts === 2 && "Pas mal."}
                {lastPts === 0 && "À côté…"}
              </p>
              <p className="mt-2 text-sm text-mist">
                {lastPts && lastPts > 0 ? `+${lastPts} points` : "Aucun point"} · total{" "}
                {state.score}
              </p>
              <button
                onClick={next}
                className="mt-8 w-full rounded-full bg-cream py-4.5 font-semibold text-ink active:scale-[0.98] transition-transform"
              >
                {state.round >= TOTAL_ROUNDS ? "Voir le score final" : "Manche suivante"}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ---------- l'échelle ---------- */

function Scale({
  left,
  right,
  target,
  cursor,
  onDrag,
  trackRef,
  className = "",
}: {
  left: string;
  right: string;
  target?: number;
  cursor?: number;
  onDrag?: (clientX: number) => void;
  trackRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2.5 flex items-end justify-between gap-4">
        <span className="display max-w-[45%] text-xl leading-tight">{left}</span>
        <span className="display max-w-[45%] text-right text-xl leading-tight">{right}</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-16 touch-none select-none overflow-hidden rounded-2xl border border-line bg-white/[0.05]"
        onPointerDown={(e) => {
          onDrag?.(e.clientX);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) onDrag?.(e.clientX);
        }}
      >
        {/* anneaux de la cible */}
        {target !== undefined && (
          <>
            {[...RINGS].reverse().map((r, i) => (
              <motion.div
                key={r.d}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 * i }}
                className="absolute inset-y-0"
                style={{
                  left: `${Math.max(0, target - r.d)}%`,
                  width: `${Math.min(100, target + r.d) - Math.max(0, target - r.d)}%`,
                  background:
                    r.pts === 4
                      ? "rgba(255,77,46,0.85)"
                      : r.pts === 3
                        ? "rgba(255,77,46,0.45)"
                        : "rgba(255,77,46,0.2)",
                }}
              />
            ))}
            <div
              className="absolute inset-y-0 w-0.5 bg-cream"
              style={{ left: `${target}%` }}
            />
          </>
        )}
        {/* curseur */}
        {cursor !== undefined && (
          <div
            className="absolute top-0 bottom-0 flex items-center"
            style={{ left: `${cursor}%`, transform: "translateX(-50%)" }}
          >
            <div className="h-full w-1 rounded-full bg-cream shadow-[0_0_12px_rgba(244,238,227,0.8)]" />
            <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream bg-ink/70" />
          </div>
        )}
      </div>
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
            <p className="eyebrow text-mist">Le Curseur</p>
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
