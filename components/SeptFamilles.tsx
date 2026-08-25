"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ALL_CARDS,
  FAMILIES,
  MEMBERS,
  cardId,
  familyById,
  familyOf,
  memberOf,
  type Family,
} from "@/lib/familles";
import { loadProfile, vibrate } from "@/lib/store";

/* ---------- état du jeu ---------- */

interface FPlayer {
  name: string;
  hand: number[];
  families: number[];
}

interface FState {
  players: FPlayer[];
  pile: number[];
  current: number;
  phase: "handoff" | "play" | "end";
  event: string | null;
  celebration: number | null;
}

const KEY = "entrenous.familles";

function shuffled<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(names: string[]): FState {
  const pile = shuffled(ALL_CARDS);
  const players: FPlayer[] = names.map((name) => ({
    name,
    hand: pile.splice(0, 6),
    families: [],
  }));
  return { players, pile, current: 0, phase: "handoff", event: null, celebration: null };
}

/* ---------- carte visuelle ---------- */

function FamilyCard({
  family,
  memberIdx,
  owned = true,
  small = false,
}: {
  family: Family;
  memberIdx?: number;
  owned?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-xl border ${
        small ? "h-14 w-10" : "h-24 w-[4.2rem]"
      } ${owned ? "" : "opacity-35"}`}
      style={{
        background: family.image
          ? `url(${family.image}) center/cover, ${family.color}`
          : family.color,
        borderColor: `${family.deep}55`,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <span
        className={`display leading-none ${small ? "text-xl" : "text-4xl"}`}
        style={{ color: family.deep }}
      >
        {family.id}
      </span>
      {memberIdx !== undefined && (
        <span
          className={`mt-0.5 font-medium ${small ? "text-[0.5rem]" : "text-[0.65rem]"}`}
          style={{ color: "#3a3140" }}
        >
          {MEMBERS[memberIdx]}
        </span>
      )}
    </div>
  );
}

/* ---------- composant principal ---------- */

export default function SeptFamilles() {
  const [state, setState] = useState<FState | null>(null);
  const [setup, setSetup] = useState(true);
  const [names, setNames] = useState<string[]>(["", ""]);
  const [askFamily, setAskFamily] = useState<number | null>(null);
  const [askMember, setAskMember] = useState<number | null>(null);
  const [askTarget, setAskTarget] = useState<number | null>(null);

  useEffect(() => {
    const p = loadProfile();
    setNames([p.p1 || "Joueur 1", p.p2 || "Joueur 2"]);
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const s = JSON.parse(saved) as FState;
        if (s.players?.length) {
          setState(s);
          setSetup(false);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((s: FState) => {
    setState(s);
    localStorage.setItem(KEY, JSON.stringify(s));
  }, []);

  const resetAsk = () => {
    setAskFamily(null);
    setAskMember(null);
    setAskTarget(null);
  };

  const start = () => {
    const list = names.map((n) => n.trim()).filter(Boolean);
    if (list.length < 2) return;
    vibrate(20);
    persist(deal(list));
    resetAsk();
    setSetup(false);
  };

  const reset = () => {
    localStorage.removeItem(KEY);
    resetAsk();
    setSetup(true);
    setState(null);
  };

  /** Détecte et pose les familles complètes du joueur. Retourne l'id posé ou null. */
  const layDownComplete = (p: FPlayer): number | null => {
    for (const f of FAMILIES) {
      const ids = MEMBERS.map((_, m) => cardId(f.id, m));
      if (ids.every((id) => p.hand.includes(id))) {
        p.hand = p.hand.filter((id) => !ids.includes(id));
        p.families.push(f.id);
        return f.id;
      }
    }
    return null;
  };

  const enterPlay = () => {
    if (!state) return;
    vibrate(15);
    const s: FState = structuredClone(state);
    const me = s.players[s.current];
    // Main vide en début de tour : on pioche une carte pour pouvoir jouer.
    if (me.hand.length === 0 && s.pile.length > 0) {
      me.hand.push(s.pile.shift()!);
      s.event = `${me.name} n'avait plus de carte et en pioche une.`;
    }
    s.phase = "play";
    persist(s);
  };

  const ask = () => {
    if (!state || askFamily === null || askMember === null || askTarget === null) return;
    const wanted = cardId(askFamily, askMember);
    const s: FState = structuredClone(state);
    const me = s.players[s.current];
    const target = s.players[askTarget];
    s.celebration = null;

    const memberLabel = `${MEMBERS[askMember]} de la famille ${askFamily}`;

    if (target.hand.includes(wanted)) {
      target.hand = target.hand.filter((id) => id !== wanted);
      me.hand.push(wanted);
      vibrate([30, 40, 30]);
      s.event = `${target.name} avait ${memberLabel} — ${me.name} rejoue !`;
    } else if (s.pile.length > 0) {
      const drawn = s.pile.shift()!;
      me.hand.push(drawn);
      if (drawn === wanted) {
        vibrate([30, 40, 30, 40, 60]);
        s.event = `Bonne pioche ! ${me.name} tire exactement ${memberLabel} et rejoue.`;
      } else {
        vibrate(40);
        s.event = `${target.name} n'a pas ${memberLabel}. Mauvaise pioche — au tour de ${target.name}.`;
        s.current = askTarget;
        s.phase = "handoff";
      }
    } else {
      vibrate(40);
      s.event = `${target.name} n'a pas ${memberLabel} et la pioche est vide — au tour de ${target.name}.`;
      s.current = askTarget;
      s.phase = "handoff";
    }

    const laid = layDownComplete(me);
    if (laid !== null) {
      s.celebration = laid;
      s.event = `${s.event} 👏 ${me.name} pose la famille ${laid} complète !`;
      vibrate([40, 60, 40, 60, 120]);
    }

    const total = s.players.reduce((n, p) => n + p.families.length, 0);
    if (total >= FAMILIES.length) {
      s.phase = "end";
    } else if (s.phase === "play") {
      // Le joueur rejoue mais n'a peut-être plus de carte en main.
      if (me.hand.length === 0 && s.pile.length > 0) {
        me.hand.push(s.pile.shift()!);
      }
      if (me.hand.length === 0) {
        const next = (s.current + 1) % s.players.length;
        s.event = `${s.event} ${me.name} n'a plus de carte — au tour de ${s.players[next].name}.`;
        s.current = next;
        s.phase = "handoff";
      }
    }

    resetAsk();
    persist(s);
  };

  /* ---------- setup ---------- */
  if (setup || !state) {
    return (
      <Shell>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-10">
          <h1 className="display text-4xl leading-tight">
            Le jeu des<br />
            <span className="italic text-flame">7 familles.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Un seul téléphone : l&apos;app connaît toutes les mains, distribue,
            vérifie les demandes et fait piocher. Impossible de tricher.
          </p>

          <div className="mt-6 flex gap-1.5">
            {FAMILIES.map((f) => (
              <FamilyCard key={f.id} family={f} small />
            ))}
          </div>

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
            disabled={names.filter((n) => n.trim()).length < 2}
            className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform disabled:opacity-30"
          >
            Distribuer les cartes
          </button>
        </div>
      </Shell>
    );
  }

  const me = state.players[state.current];

  /* ---------- fin de partie ---------- */
  if (state.phase === "end") {
    const ranking = [...state.players].sort((a, b) => b.families.length - a.families.length);
    return (
      <Shell onReset={reset}>
        <div className="flex flex-1 flex-col items-center justify-center pb-safe text-center">
          <p className="eyebrow text-mist">Partie terminée</p>
          <p className="display mt-3 text-5xl">{ranking[0].name} 🏆</p>
          <div className="mt-8 w-full space-y-2">
            {ranking.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-2xl border border-line bg-white/[0.03] px-5 py-3"
              >
                <span className="text-sm">{p.name}</span>
                <span className="flex gap-1">
                  {p.families.map((fid) => (
                    <FamilyCard key={fid} family={familyById(fid)} small />
                  ))}
                  {p.families.length === 0 && <span className="text-xs text-mist">—</span>}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="mt-10 rounded-full bg-flame px-8 py-4 font-semibold text-ink"
          >
            Rejouer
          </button>
        </div>
      </Shell>
    );
  }

  /* ---------- écran de passage ---------- */
  if (state.phase === "handoff") {
    return (
      <Shell onReset={reset}>
        <div className="flex flex-1 flex-col justify-center pb-safe pb-8">
          {state.event && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 rounded-2xl border border-line bg-white/[0.04] px-5 py-4 text-center text-sm leading-relaxed text-cream"
            >
              {state.event}
            </motion.p>
          )}
          <p className="eyebrow text-center text-mist">C&apos;est au tour de</p>
          <p className="display mt-2 text-center text-5xl">
            <span className="italic text-flame">{me.name}</span>
          </p>

          {/* tableau public */}
          <div className="mt-8 space-y-2">
            {state.players.map((p, i) => (
              <div
                key={p.name}
                className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 ${
                  i === state.current ? "border-flame/60 bg-flame/10" : "border-line bg-white/[0.03]"
                }`}
              >
                <span className="text-sm">{p.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs text-mist">{p.hand.length} cartes</span>
                  <span className="flex gap-1">
                    {p.families.map((fid) => (
                      <span
                        key={fid}
                        className="display flex h-6 w-5 items-center justify-center rounded-md text-xs"
                        style={{ background: familyById(fid).color, color: familyById(fid).deep }}
                      >
                        {fid}
                      </span>
                    ))}
                  </span>
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-mist">
            Pioche : {state.pile.length} carte{state.pile.length > 1 ? "s" : ""}
          </p>

          <button
            onClick={enterPlay}
            className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] active:scale-[0.98] transition-transform"
          >
            Je suis {me.name} — voir ma main
          </button>
          <p className="mt-3 text-center text-xs text-mist">
            Les autres, on ne regarde pas 👀
          </p>
        </div>
      </Shell>
    );
  }

  /* ---------- tour de jeu (main visible) ---------- */
  const myFamilies = [...new Set(me.hand.map(familyOf))].sort((a, b) => a - b);

  return (
    <Shell onReset={reset}>
      <div className="flex flex-1 flex-col pb-safe pb-6">
        <div className="flex items-center justify-between">
          <p className="text-sm">
            <span className="font-semibold text-flame">{me.name}</span>
            <span className="text-mist"> · {me.hand.length} cartes</span>
          </p>
          <p className="text-xs text-mist">Pioche : {state.pile.length}</p>
        </div>

        {state.event && (
          <motion.p
            key={state.event}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 rounded-xl border border-line bg-white/[0.04] px-4 py-2.5 text-xs leading-relaxed text-mist"
          >
            {state.event}
          </motion.p>
        )}

        {/* main groupée par famille */}
        <p className="eyebrow mt-5 text-mist">Ma main — tape une famille pour demander</p>
        <div className="-mx-6 mt-3 flex gap-3 overflow-x-auto px-6 pb-2">
          {myFamilies.map((fid) => {
            const family = familyById(fid);
            const owned = me.hand.filter((id) => familyOf(id) === fid).map(memberOf);
            return (
              <button
                key={fid}
                onClick={() => {
                  vibrate(10);
                  setAskFamily(fid);
                  setAskMember(null);
                  setAskTarget(null);
                }}
                className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-colors ${
                  askFamily === fid ? "border-cream/60 bg-white/[0.07]" : "border-line bg-white/[0.03]"
                }`}
              >
                <FamilyCard family={family} />
                <div className="flex flex-wrap justify-center gap-1" style={{ maxWidth: "5rem" }}>
                  {owned.sort().map((m) => (
                    <span
                      key={m}
                      className="rounded-full px-1.5 py-0.5 text-[0.55rem] font-medium"
                      style={{ background: family.color, color: "#3a3140" }}
                    >
                      {MEMBERS[m]}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {me.families.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[0.6rem] uppercase tracking-widest text-mist">Posées</span>
            {me.families.map((fid) => (
              <FamilyCard key={fid} family={familyById(fid)} small />
            ))}
          </div>
        )}

        {/* constructeur de demande */}
        <div className="mt-auto">
          <AnimatePresence mode="wait">
            {askFamily !== null && (
              <motion.div
                key={askFamily}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 16, opacity: 0 }}
                className="rounded-3xl border border-line bg-white/[0.04] p-4"
              >
                <p className="text-xs text-mist">
                  Famille {askFamily} — quelle carte veux-tu ?
                </p>
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {MEMBERS.map((m, idx) => {
                    const has = me.hand.includes(cardId(askFamily, idx));
                    return (
                      <button
                        key={m}
                        disabled={has}
                        onClick={() => {
                          vibrate(10);
                          setAskMember(idx);
                        }}
                        className={`rounded-xl border py-2.5 text-sm transition-colors ${
                          has
                            ? "border-line text-mist/40 line-through"
                            : askMember === idx
                              ? "border-flame bg-flame font-semibold text-ink"
                              : "border-line bg-white/[0.04] text-cream"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>

                {askMember !== null && (
                  <>
                    <p className="mt-3 text-xs text-mist">À qui la demander ?</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.players.map((p, i) =>
                        i === state.current ? null : (
                          <button
                            key={p.name}
                            onClick={() => {
                              vibrate(10);
                              setAskTarget(i);
                            }}
                            className={`rounded-full border px-4 py-2.5 text-sm transition-colors ${
                              askTarget === i
                                ? "border-flame bg-flame font-semibold text-ink"
                                : "border-line bg-white/[0.04] text-cream"
                            }`}
                          >
                            {p.name}
                          </button>
                        ),
                      )}
                    </div>
                  </>
                )}

                <button
                  onClick={ask}
                  disabled={askMember === null || askTarget === null}
                  className="mt-4 w-full rounded-full bg-flame py-4 font-semibold text-ink active:scale-[0.98] transition-transform disabled:opacity-30"
                >
                  {askMember !== null && askTarget !== null
                    ? `Demander ${MEMBERS[askMember]} (famille ${askFamily}) à ${state.players[askTarget].name}`
                    : "Demander"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          {askFamily === null && (
            <p className="rounded-3xl border border-dashed border-line px-4 py-5 text-center text-xs text-mist">
              Règle : tu ne peux demander que dans une famille que tu as déjà en main.
            </p>
          )}
        </div>
      </div>
    </Shell>
  );
}

/* ---------- coquille commune ---------- */

function Shell({ children, onReset }: { children: React.ReactNode; onReset?: () => void }) {
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
          <p className="eyebrow text-mist">7 Familles</p>
          {onReset ? (
            <button
              onClick={onReset}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white/[0.04]"
              aria-label="Nouvelle partie"
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
