"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { dismissKeyboard, loadProfile, vibrate } from "@/lib/store";

/* ---------- géométrie de la cible ---------- */

// Ordre officiel des secteurs, 20 en haut, sens horaire.
const SECTORS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const CX = 200;
const CY = 200;
const R = 178;

// Anneaux élargis par rapport au réel pour rester tapables au doigt.
const RINGS = {
  bullseye: 0.1,
  bull: 0.19,
  innerSingle: 0.45,
  triple: 0.6,
  outerSingle: 0.86,
  double: 1.0,
};

function polar(radius: number, angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}

function annularSector(r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
}

interface Hit {
  label: string;
  value: number;
}

/* ---------- état du jeu ---------- */

interface Player {
  name: string;
  score: number;
}

interface DartsState {
  target: number;
  players: Player[];
  current: number;
  turnStart: number;
  darts: Hit[];
  winner: number | null;
  bust: boolean;
}

interface Snapshot {
  state: DartsState;
}

const DARTS_KEY = "entrenous.darts";

function freshGame(target: number, names: string[]): DartsState {
  return {
    target,
    players: names.map((name) => ({ name, score: target })),
    current: 0,
    turnStart: target,
    darts: [],
    winner: null,
    bust: false,
  };
}

/* ---------- composant cible ---------- */

function Dartboard({ onHit, disabled }: { onHit: (h: Hit) => void; disabled: boolean }) {
  const dark = "#17161a";
  const light = "#efe7d6";
  const red = "#ff4d2e";
  const green = "#9db89a";

  const segments = useMemo(() => {
    const segs: { path: string; fill: string; hit: Hit }[] = [];
    SECTORS.forEach((n, i) => {
      const a0 = i * 18 - 9;
      const a1 = a0 + 18;
      const even = i % 2 === 0;
      const bands = [
        { r0: RINGS.bull, r1: RINGS.innerSingle, fill: even ? dark : light, label: `${n}`, value: n },
        { r0: RINGS.innerSingle, r1: RINGS.triple, fill: even ? red : green, label: `T${n}`, value: n * 3 },
        { r0: RINGS.triple, r1: RINGS.outerSingle, fill: even ? dark : light, label: `${n}`, value: n },
        { r0: RINGS.outerSingle, r1: RINGS.double, fill: even ? red : green, label: `D${n}`, value: n * 2 },
      ];
      for (const b of bands) {
        segs.push({
          path: annularSector(b.r0 * R, b.r1 * R, a0, a1),
          fill: b.fill,
          hit: { label: b.label, value: b.value },
        });
      }
    });
    return segs;
  }, []);

  return (
    <svg
      viewBox="0 0 400 400"
      className={`w-full ${disabled ? "pointer-events-none opacity-50" : ""}`}
      style={{ touchAction: "manipulation" }}
    >
      <circle cx={CX} cy={CY} r={R + 16} fill="#0f0e11" />
      {segments.map((s, i) => (
        <path
          key={i}
          d={s.path}
          fill={s.fill}
          stroke="#0b0a0c"
          strokeWidth="1"
          className="cursor-pointer active:opacity-70"
          onClick={() => onHit(s.hit)}
        />
      ))}
      {/* bull et bullseye */}
      <circle
        cx={CX}
        cy={CY}
        r={RINGS.bull * R}
        fill={green}
        stroke="#0b0a0c"
        className="cursor-pointer active:opacity-70"
        onClick={() => onHit({ label: "25", value: 25 })}
      />
      <circle
        cx={CX}
        cy={CY}
        r={RINGS.bullseye * R}
        fill={red}
        stroke="#0b0a0c"
        className="cursor-pointer active:opacity-70"
        onClick={() => onHit({ label: "Bull", value: 50 })}
      />
      {/* numéros */}
      {SECTORS.map((n, i) => {
        const [x, y] = polar(R + 8, i * 18);
        return (
          <text
            key={n}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(244,238,227,0.55)"
            fontSize="13"
            fontWeight="600"
          >
            {n}
          </text>
        );
      })}
    </svg>
  );
}

/* ---------- écran principal ---------- */

export default function DartsGame() {
  const [state, setState] = useState<DartsState | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [setup, setSetup] = useState(true);
  const [target, setTarget] = useState(301);
  const [names, setNames] = useState<string[]>(["", ""]);

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2"]);
    try {
      const saved = localStorage.getItem(DARTS_KEY);
      if (saved) {
        const s = JSON.parse(saved) as DartsState;
        if (s.players?.length) {
          setState(s);
          setSetup(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((s: DartsState) => {
    setState(s);
    localStorage.setItem(DARTS_KEY, JSON.stringify(s));
  }, []);

  const start = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 1) return;
    dismissKeyboard();
    vibrate(20);
    persist(freshGame(target, list));
    setHistory([]);
    setSetup(false);
  };

  const endTurn = (s: DartsState): DartsState => {
    const next = (s.current + 1) % s.players.length;
    return {
      ...s,
      current: next,
      turnStart: s.players[next].score,
      darts: [],
      bust: false,
    };
  };

  const onHit = (hit: Hit) => {
    if (!state || state.winner !== null) return;
    vibrate(12);
    setHistory((h) => [...h.slice(-60), { state }]);

    let s: DartsState = { ...state, darts: [...state.darts, hit], bust: false };
    const player = s.players[s.current];
    const newScore = player.score - hit.value;

    if (newScore < 0 || newScore === 1) {
      // Bust : le score revient au début du tour, joueur suivant.
      vibrate([60, 40, 60]);
      s = {
        ...s,
        players: s.players.map((p, i) =>
          i === s.current ? { ...p, score: s.turnStart } : p,
        ),
        bust: true,
      };
      persist({ ...endTurn(s), bust: true });
      return;
    }

    s = {
      ...s,
      players: s.players.map((p, i) =>
        i === s.current ? { ...p, score: newScore } : p,
      ),
    };

    if (newScore === 0) {
      vibrate([40, 60, 40, 60, 120]);
      persist({ ...s, winner: s.current });
      return;
    }

    persist(s.darts.length >= 3 ? endTurn(s) : s);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    vibrate(15);
    setHistory((h) => h.slice(0, -1));
    persist(last.state);
  };

  const reset = () => {
    localStorage.removeItem(DARTS_KEY);
    setHistory([]);
    setSetup(true);
    setState(null);
  };

  /* ---------- setup ---------- */
  if (setup || !state) {
    return (
      <div className="min-h-dvh">
        <div className="bg-scene" />
        <div className="bg-noise" />
        <div className="mx-auto flex min-h-dvh max-w-md flex-col px-6">
          <header className="pt-safe flex items-center gap-4 pt-6">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
              aria-label="Retour"
            >
              ←
            </Link>
            <p className="eyebrow text-mist">Fléchettes</p>
          </header>

          <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
            <h1 className="display text-4xl leading-tight">
              Compteur de<br />
              <span className="italic text-flame">fléchettes.</span>
            </h1>
            <p className="mt-3 text-sm text-mist">
              Tape la zone touchée sur la cible, l&apos;app compte pour vous.
            </p>

            <div className="mt-7 flex rounded-full border border-line bg-white/[0.04] p-1">
              {[301, 501].map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`flex-1 rounded-full py-3 text-sm font-medium transition-colors ${
                    target === t ? "bg-cream text-ink" : "text-mist"
                  }`}
                >
                  {t}
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
                  {names.length > 1 && (
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
              {names.length < 6 && (
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
              className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
            >
              C&apos;est parti
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- partie ---------- */
  const active = state.players[state.current];

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="bg-scene" />
      <div className="bg-noise" />

      <header className="pt-safe flex items-center justify-between px-5 pb-1">
        <Link
          href="/"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
          aria-label="Retour"
        >
          ←
        </Link>
        <p className="eyebrow text-mist">Fléchettes · {state.target}</p>
        <button
          onClick={reset}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
          aria-label="Nouvelle partie"
        >
          ↺
        </button>
      </header>

      {/* scores */}
      <div className="mx-auto flex w-full max-w-md gap-2 overflow-x-auto px-5 py-3">
        {state.players.map((p, i) => (
          <div
            key={i}
            className={`min-w-24 flex-1 rounded-2xl border px-3 py-2.5 text-center transition-colors ${
              i === state.current && state.winner === null
                ? "border-flame bg-flame/10"
                : "border-line bg-white/[0.03]"
            }`}
          >
            <p className="truncate text-[0.6rem] uppercase tracking-widest text-mist">
              {p.name}
            </p>
            <p className="display text-3xl tabular-nums">{p.score}</p>
          </div>
        ))}
      </div>

      {/* fin de partie */}
      {state.winner !== null ? (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center justify-center px-8 text-center"
        >
          <p className="eyebrow text-mist">Victoire</p>
          <p className="display mt-3 text-5xl">
            {state.players[state.winner].name} 🎯
          </p>
          <button
            onClick={reset}
            className="mt-10 rounded-full bg-flame px-8 py-4 font-semibold text-ink"
          >
            Nouvelle partie
          </button>
        </motion.div>
      ) : (
        <>
          {/* cible */}
          <main className="mx-auto w-full max-w-md flex-1 px-4">
            <Dartboard onHit={onHit} disabled={false} />
          </main>

          {/* tour en cours */}
          <footer className="pb-safe mx-auto w-full max-w-md px-5 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="text-flame font-semibold">{active.name}</span>
                  <span className="text-mist"> lance</span>
                </p>
                <div className="mt-1.5 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`inline-flex h-8 min-w-12 items-center justify-center rounded-full border px-2 text-sm tabular-nums ${
                        state.darts[i]
                          ? "border-cream/40 bg-white/[0.07] text-cream"
                          : "border-line text-mist/40"
                      }`}
                    >
                      {state.darts[i]?.label ?? "·"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onHit({ label: "0", value: 0 })}
                  className="rounded-full border border-line px-4 py-3 text-sm text-mist active:scale-95 transition-transform"
                >
                  Raté
                </button>
                <button
                  onClick={undo}
                  disabled={history.length === 0}
                  className="rounded-full border border-line px-4 py-3 text-sm text-cream disabled:opacity-30 active:scale-95 transition-transform"
                >
                  ⌫
                </button>
              </div>
            </div>
            <AnimatePresence>
              {state.bust && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mt-2 text-center text-sm text-flame"
                >
                  Bust ! Le score revient au début du tour.
                </motion.p>
              )}
            </AnimatePresence>
          </footer>
        </>
      )}
    </div>
  );
}
