import "server-only";
import type { Choice, RoundResult } from "./types";
import { getCards } from "./decks";

export type RoomPhase = "lobby" | "idle" | "countdown" | "reveal" | "done";

export interface RoomPlayer {
  id: string;
  name: string;
}

export interface RemoteAnswer {
  choice: Choice | null;
  note: string;
}

export interface Room {
  code: string;
  deckSlug: string;
  order: number[];
  position: number;
  players: RoomPlayer[];
  phase: RoomPhase;
  countdownEndsAt: number | null;
  answers: Map<string, RemoteAnswer>;
  results: RoundResult[];
  agreements: number;
  listeners: Map<string, (payload: string) => void>;
  revealTimer: ReturnType<typeof setTimeout> | null;
  lastActivity: number;
}

export const COUNTDOWN_MS = 15_000;
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ"; // no I/L/O — ambiguous

// Survive dev HMR / route-module duplication: one store per process.
const g = globalThis as unknown as { __rooms?: Map<string, Room> };
const rooms: Map<string, Room> = (g.__rooms ??= new Map());

function makeCode(): string {
  let code = "";
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
    ).join("");
  } while (rooms.has(code));
  return code;
}

function shuffle(count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function sweep() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.lastActivity > ROOM_TTL_MS) {
      if (room.revealTimer) clearTimeout(room.revealTimer);
      room.listeners.clear();
      rooms.delete(code);
    }
  }
}

export function createRoom(deckSlug: string, hostName: string) {
  sweep();
  const cards = getCards(deckSlug);
  if (cards.length === 0) return null;
  const room: Room = {
    code: makeCode(),
    deckSlug,
    order: shuffle(cards.length),
    position: 0,
    players: [{ id: crypto.randomUUID(), name: hostName }],
    phase: "lobby",
    countdownEndsAt: null,
    answers: new Map(),
    results: [],
    agreements: 0,
    listeners: new Map(),
    revealTimer: null,
    lastActivity: Date.now(),
  };
  rooms.set(room.code, room);
  return { room, playerId: room.players[0].id };
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code.toUpperCase());
}

export function joinRoom(code: string, name: string) {
  const room = getRoom(code);
  if (!room) return { error: "introuvable" as const };
  if (room.players.length >= 2) return { error: "pleine" as const };
  const player: RoomPlayer = { id: crypto.randomUUID(), name };
  room.players.push(player);
  room.phase = "idle";
  room.lastActivity = Date.now();
  broadcast(room);
  return { room, playerId: player.id };
}

/** Client-safe snapshot. Hides the other player's answer until reveal. */
export function snapshot(room: Room, viewerId: string) {
  const cards = getCards(room.deckSlug);
  const card = cards[room.order[room.position]] ?? null;
  const mine = room.answers.get(viewerId);
  return {
    code: room.code,
    deckSlug: room.deckSlug,
    phase: room.phase,
    position: room.position,
    total: cards.length,
    card: room.phase === "lobby" ? null : card,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      answered: room.answers.has(p.id),
    })),
    countdownEndsAt: room.countdownEndsAt,
    serverNow: Date.now(),
    myAnswer: mine ?? null,
    reveal:
      room.phase === "reveal"
        ? {
            answers: room.players.map((p) => ({
              playerId: p.id,
              name: p.name,
              answer: room.answers.get(p.id) ?? null,
            })),
            agreed: computeAgreed(room),
          }
        : null,
    agreements: room.agreements,
    rounds: room.results.length,
  };
}

function computeAgreed(room: Room): boolean | null {
  const [a, b] = room.players.map((p) => room.answers.get(p.id)?.choice ?? null);
  if (!a || !b) return null;
  return a === b;
}

export function broadcast(room: Room) {
  for (const [viewerId, send] of room.listeners) {
    try {
      send(JSON.stringify(snapshot(room, viewerId)));
    } catch {
      room.listeners.delete(viewerId);
    }
  }
}

export function startCountdown(room: Room) {
  if (room.phase !== "idle" || room.players.length < 2) return;
  room.phase = "countdown";
  room.countdownEndsAt = Date.now() + COUNTDOWN_MS;
  room.answers = new Map();
  room.lastActivity = Date.now();
  if (room.revealTimer) clearTimeout(room.revealTimer);
  room.revealTimer = setTimeout(() => doReveal(room), COUNTDOWN_MS);
  broadcast(room);
}

export function submitAnswer(
  room: Room,
  playerId: string,
  choice: Choice,
  note: string,
) {
  if (room.phase !== "countdown") return;
  room.answers.set(playerId, { choice, note: note.slice(0, 140) });
  room.lastActivity = Date.now();
  // Both answered early → reveal without waiting out the clock.
  if (room.answers.size >= room.players.length) {
    if (room.revealTimer) clearTimeout(room.revealTimer);
    doReveal(room);
  } else {
    broadcast(room);
  }
}

function doReveal(room: Room) {
  if (room.phase !== "countdown") return;
  room.phase = "reveal";
  room.countdownEndsAt = null;
  room.revealTimer = null;
  const cards = getCards(room.deckSlug);
  const card = cards[room.order[room.position]];
  const agreed = computeAgreed(room);
  if (agreed !== null && card) {
    const [p1, p2] = room.players;
    room.results.push({
      cardId: card.id,
      p1: room.answers.get(p1.id)!.choice!,
      p2: room.answers.get(p2.id)!.choice!,
      agreed,
    });
    if (agreed) room.agreements += 1;
  }
  broadcast(room);
}

export function nextCard(room: Room) {
  if (room.phase !== "reveal") return;
  room.position += 1;
  room.answers = new Map();
  room.countdownEndsAt = null;
  const cards = getCards(room.deckSlug);
  room.phase = room.position >= cards.length ? "done" : "idle";
  room.lastActivity = Date.now();
  broadcast(room);
}

export function subscribe(
  room: Room,
  viewerId: string,
  send: (payload: string) => void,
) {
  room.listeners.set(viewerId, send);
  send(JSON.stringify(snapshot(room, viewerId)));
  return () => {
    room.listeners.delete(viewerId);
  };
}
