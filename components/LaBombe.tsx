"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import CATEGORIES from "@/data/bombe.json";
import { dismissKeyboard, loadProfile, vibrate } from "@/lib/store";
import ConfettiRain from "./ConfettiRain";

interface BombeCat {
  cat: string;
  level: number;
}

const LEVELS = [
  { id: 1, label: "Enfants" },
  { id: 2, label: "Famille" },
  { id: 3, label: "Pimenté" },
];

const FUSES = [
  { id: "courte", label: "Courte", min: 12_000, max: 25_000 },
  { id: "normale", label: "Normale", min: 20_000, max: 40_000 },
  { id: "longue", label: "Longue", min: 30_000, max: 60_000 },
] as const;

type Phase = "setup" | "ready" | "burning" | "boom" | "podium";

export default function LaBombe() {
  const [names, setNames] = useState<string[]>(["", "", ""]);
  const [level, setLevel] = useState(2);
  const [fuse, setFuse] = useState<(typeof FUSES)[number]["id"]>("normale");
  const [phase, setPhase] = useState<Phase>("setup");
  const [alive, setAlive] = useState<string[]>([]);
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [holder, setHolder] = useState(0);
  const [category, setCategory] = useState<string>("");
  const [usedCats, setUsedCats] = useState<Set<string>>(new Set());
  const [pulse, setPulse] = useState(0);

  const explodeAt = useRef(0);
  const startedAt = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2", ""]);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const pickCategory = (used: Set<string>) => {
    const pool = (CATEGORIES as BombeCat[]).filter(
      (c) => c.level === level && !used.has(c.cat),
    );
    const fallback = (CATEGORIES as BombeCat[]).filter((c) => c.level === level);
    const source = pool.length > 0 ? pool : fallback;
    return source[Math.floor(Math.random() * source.length)].cat;
  };

  const newRound = (players: string[], startHolder: number) => {
    const cat = pickCategory(usedCats);
    setUsedCats((u) => new Set(u).add(cat));
    setCategory(cat);
    setAlive(players);
    setHolder(Math.min(startHolder, players.length - 1));
    setPhase("ready");
  };

  const startGame = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 3) return;
    dismissKeyboard();
    vibrate(20);
    setEliminated([]);
    setUsedCats(new Set());
    newRound(list, Math.floor(Math.random() * list.length));
  };

  const light = () => {
    vibrate(30);
    const f = FUSES.find((x) => x.id === fuse)!;
    const total = f.min + Math.random() * (f.max - f.min);
    startedAt.current = Date.now();
    explodeAt.current = startedAt.current + total;
    setPhase("burning");

    timers.current.forEach(clearTimeout);
    timers.current = [];
    const boom = setTimeout(() => {
      vibrate([400, 120, 400]);
      setPhase("boom");
    }, total);
    timers.current.push(boom);

    // pulsations qui s'accélèrent avec le temps écoulé (pas le temps restant)
    const tick = () => {
      const elapsed = Date.now() - startedAt.current;
      if (Date.now() >= explodeAt.current) return;
      vibrate(8);
      setPulse((p) => p + 1);
      const period = Math.max(260, 950 - elapsed / 35);
      const t = setTimeout(tick, period);
      timers.current.push(t);
    };
    const t0 = setTimeout(tick, 900);
    timers.current.push(t0);
  };

  const passBomb = () => {
    vibrate(12);
    setHolder((h) => (h + 1) % alive.length);
  };

  const afterBoom = (eliminate: boolean) => {
    vibrate(15);
    const loserIdx = holder;
    const loser = alive[loserIdx];
    let players = alive;
    if (eliminate) {
      players = alive.filter((_, i) => i !== loserIdx);
      setEliminated((e) => [loser, ...e]);
      if (players.length <= 1) {
        setAlive(players);
        setPhase("podium");
        return;
      }
    }
    // le perdant (ou son suivant s'il est éliminé) démarre la manche suivante
    const start = eliminate ? loserIdx % players.length : loserIdx;
    newRound(players, start);
  };

  const backToSetup = () => {
    timers.current.forEach(clearTimeout);
    setPhase("setup");
  };

  /* ---------- setup ---------- */
  if (phase === "setup") {
    const validCount = names.filter((n) => n.trim()).length;
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
          <h1 className="display text-4xl leading-tight">
            La<br />
            <span className="italic text-flame">Bombe.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Une catégorie, un mot chacun, et on se passe le téléphone — vite !
            Celui qui le tient quand ça explose a perdu.
          </p>

          <p className="eyebrow mt-6 mb-2 text-mist">Catégories</p>
          <div className="flex rounded-full border border-line bg-white/[0.04] p-1">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`flex-1 rounded-full py-3 text-sm font-medium transition-colors ${
                  level === l.id ? "bg-cream text-ink" : "text-mist"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          <p className="eyebrow mt-4 mb-2 text-mist">Mèche</p>
          <div className="flex rounded-full border border-line bg-white/[0.04] p-1">
            {FUSES.map((f) => (
              <button
                key={f.id}
                onClick={() => setFuse(f.id)}
                className={`flex-1 rounded-full py-3 text-sm font-medium transition-colors ${
                  fuse === f.id ? "bg-cream text-ink" : "text-mist"
                }`}
              >
                {f.label}
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
          <p className="mt-2 text-xs text-mist">
            Installez-vous en cercle dans cet ordre — le téléphone tournera dans
            le même sens.
          </p>

          <button
            onClick={startGame}
            disabled={validCount < 3}
            className="mt-5 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            {validCount < 3 ? "3 joueurs minimum" : "Jouer"}
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------- podium ---------- */
  if (phase === "podium") {
    return (
      <Shell onReset={backToSetup}>
        <ConfettiRain />
        <div className="flex flex-1 flex-col items-center justify-center pb-safe text-center">
          <p className="eyebrow text-mist">Dernier survivant</p>
          <p className="display mt-3 text-5xl">{alive[0]} 🏆</p>
          <div className="mt-8 w-full space-y-2">
            {[alive[0], ...eliminated].map((name, i) => (
              <div
                key={name}
                className={`flex items-center justify-between rounded-2xl border px-5 py-3 ${
                  i === 0 ? "border-flame/60 bg-flame/10" : "border-line bg-white/[0.03]"
                }`}
              >
                <span className="text-sm">
                  <span className="mr-2 text-mist">{i + 1}.</span>
                  {name}
                </span>
                <span>{i === 0 ? "🏆" : "💥"}</span>
              </div>
            ))}
          </div>
          <button
            onClick={startGame}
            className="mt-10 rounded-full bg-flame px-8 py-4 font-semibold text-ink"
          >
            Revanche
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------- prêt / mèche allumée / boum ---------- */
  return (
    <Shell
      onReset={backToSetup}
      subtitle={`${alive.length} joueur${alive.length > 1 ? "s" : ""} en jeu`}
    >
      <div className="flex flex-1 flex-col pb-safe pb-6">
        {/* catégorie */}
        <div className="mt-2 rounded-3xl border border-line bg-white/[0.04] px-6 py-7 text-center">
          <p className="eyebrow text-flame">Catégorie</p>
          <p className="display mt-2 text-3xl leading-snug">{category}</p>
        </div>

        {phase === "ready" && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex flex-1 flex-col justify-center text-center"
          >
            <p className="text-sm text-mist">
              <span className="font-semibold text-cream">{alive[holder]}</span> commence,
              puis on passe dans l&apos;ordre du cercle.
            </p>
            <p className="mt-2 text-xs text-mist">
              Dis un mot de la catégorie, tape l&apos;écran, passe le téléphone. Pas de
              répétition !
            </p>
            <button
              onClick={light}
              className="mt-8 w-full rounded-full bg-flame py-5 text-lg font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.8)] active:scale-[0.98] transition-transform"
            >
              Allumer la mèche 🔥
            </button>
          </motion.div>
        )}

        {phase === "burning" && (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 items-center justify-center">
              <motion.p
                key={pulse}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.18, 1] }}
                transition={{ duration: 0.3 }}
                className="text-8xl"
              >
                💣
              </motion.p>
            </div>
            <p className="mb-3 text-center text-xs text-mist">
              Dans les mains de{" "}
              <span className="font-semibold text-cream">{alive[holder]}</span>
            </p>
            <button
              onClick={passBomb}
              className="w-full rounded-3xl bg-cream py-10 text-xl font-semibold text-ink active:scale-[0.98] transition-transform"
            >
              MOT DIT — JE PASSE
            </button>
          </div>
        )}

        <AnimatePresence>
          {phase === "boom" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-flame px-8 text-center"
            >
              <motion.p
                initial={{ scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 12 }}
                className="text-8xl"
              >
                💥
              </motion.p>
              <p className="display mt-4 text-6xl italic text-ink">BOUM !</p>
              <p className="mt-3 text-lg font-medium text-ink">
                {alive[holder]} tenait la bombe…
              </p>
              <div className="mt-10 flex w-full flex-col gap-2.5">
                <button
                  onClick={() => afterBoom(true)}
                  className="w-full rounded-full bg-ink py-4.5 font-semibold text-cream active:scale-[0.98] transition-transform"
                >
                  {alive.length <= 2 ? "Fin de partie" : `Éliminer ${alive[holder]}`}
                </button>
                <button
                  onClick={() => afterBoom(false)}
                  className="w-full rounded-full border-2 border-ink/40 py-4 font-medium text-ink"
                >
                  On lui pardonne
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}

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
            <p className="eyebrow text-mist">La Bombe</p>
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
