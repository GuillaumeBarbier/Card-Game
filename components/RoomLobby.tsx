"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { loadProfile, loadSeen, saveProfile, vibrate } from "@/lib/store";

type Mode = "create" | "join";

export default function RoomLobby() {
  const router = useRouter();
  const search = useSearchParams();
  const deckSlug = search.get("deck") ?? "verdict";
  const [mode, setMode] = useState<Mode>("create");
  const [name, setName] = useState(() => loadProfile().p1);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    vibrate(15);
    saveProfile({ ...loadProfile(), p1: name.trim() });
    try {
      const url =
        mode === "create" ? "/api/room" : `/api/room/${code.trim().toUpperCase()}/join`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          deckSlug,
          seenIds: mode === "create" ? [...loadSeen(deckSlug)] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue");
        setBusy(false);
        return;
      }
      sessionStorage.setItem(`entrenous.room.${data.code}`, data.playerId);
      router.push(`/room/${data.code}`);
    } catch {
      setError("Connexion impossible — réessaie");
      setBusy(false);
    }
  };

  const ready = name.trim().length > 0 && (mode === "create" || code.trim().length === 4);

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
          <p className="eyebrow text-mist">Jouer à distance</p>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col justify-center pb-safe pb-10"
        >
          <h1 className="display text-4xl leading-tight">
            Chacun son téléphone,
            <br />
            <span className="italic text-flame">une seule partie.</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-mist">
            Créez une salle, partagez le code, répondez chacun en secret avant la fin
            du compte à rebours — puis découvrez la réponse de l&apos;autre.
          </p>

          {/* mode switch */}
          <div className="mt-8 flex rounded-full border border-line bg-white/[0.04] p-1">
            {(
              [
                { key: "create", label: "Créer une salle" },
                { key: "join", label: "Rejoindre" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key);
                  setError(null);
                }}
                className={`flex-1 rounded-full py-3 text-sm font-medium transition-colors ${
                  mode === key ? "bg-cream text-ink" : "text-mist"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton prénom"
              className="w-full rounded-2xl border border-line bg-white/[0.05] px-5 py-4 text-cream placeholder:text-mist focus:border-flame focus:outline-none"
            />
            {mode === "join" && (
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="CODE"
                autoCapitalize="characters"
                autoComplete="off"
                className="w-full rounded-2xl border border-line bg-white/[0.05] px-5 py-4 text-center font-mono text-2xl tracking-[0.5em] text-cream placeholder:tracking-normal placeholder:text-mist focus:border-flame focus:outline-none"
              />
            )}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 text-sm text-flame"
            >
              {error}
            </motion.p>
          )}

          <button
            onClick={go}
            disabled={!ready || busy}
            className="mt-6 w-full rounded-full bg-flame py-4.5 font-semibold text-ink shadow-[0_10px_40px_-10px_rgba(255,77,46,0.6)] transition-all active:scale-[0.98] disabled:opacity-30"
          >
            {busy ? "Un instant…" : mode === "create" ? "Créer la salle" : "Rejoindre la salle"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
