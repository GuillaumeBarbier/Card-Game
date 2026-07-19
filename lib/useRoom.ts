"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Card, Choice } from "./types";

export interface RoomSnapshot {
  code: string;
  deckSlug: string;
  phase: "lobby" | "idle" | "countdown" | "reveal" | "done";
  position: number;
  total: number;
  card: Card | null;
  players: { id: string; name: string; answered: boolean }[];
  countdownEndsAt: number | null;
  serverNow: number;
  myAnswer: { choice: Choice | null; note: string } | null;
  reveal: {
    answers: {
      playerId: string;
      name: string;
      answer: { choice: Choice | null; note: string } | null;
    }[];
    agreed: boolean | null;
  } | null;
  agreements: number;
  rounds: number;
}

export function useRoom(code: string, playerId: string) {
  const [state, setState] = useState<RoomSnapshot | null>(null);
  const [connected, setConnected] = useState(true);
  const clockOffset = useRef(0);

  useEffect(() => {
    if (!code || !playerId) return;
    let source: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      source = new EventSource(
        `/api/room/${code}/events?player=${encodeURIComponent(playerId)}`,
      );
      source.onmessage = (e) => {
        setConnected(true);
        const snap = JSON.parse(e.data) as RoomSnapshot;
        clockOffset.current = snap.serverNow - Date.now();
        setState(snap);
      };
      source.onerror = () => {
        setConnected(false);
        source?.close();
        if (!closed) retry = setTimeout(connect, 1500);
      };
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      source?.close();
    };
  }, [code, playerId]);

  const act = useCallback(
    (payload: Record<string, unknown>) =>
      fetch(`/api/room/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, ...payload }),
      }).catch(() => {}),
    [code, playerId],
  );

  /** Remaining countdown ms, corrected with the server clock. */
  const remainingMs = useCallback(() => {
    if (!state?.countdownEndsAt) return 0;
    return Math.max(0, state.countdownEndsAt - (Date.now() + clockOffset.current));
  }, [state?.countdownEndsAt]);

  return { state, connected, act, remainingMs };
}
