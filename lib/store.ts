"use client";

import type { RoundResult } from "./types";

export interface GameState {
  deckSlug: string;
  order: number[];
  position: number;
  results: RoundResult[];
  startedAt: number;
}

export interface Profile {
  p1: string;
  p2: string;
}

const PROFILE_KEY = "entrenous.profile";
const GAME_KEY = (slug: string) => `entrenous.game.${slug}`;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return { p1: "", p2: "" };
  return safeParse<Profile>(localStorage.getItem(PROFILE_KEY)) ?? { p1: "", p2: "" };
}

export function saveProfile(profile: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function loadGame(slug: string): GameState | null {
  if (typeof window === "undefined") return null;
  return safeParse<GameState>(localStorage.getItem(GAME_KEY(slug)));
}

export function saveGame(state: GameState) {
  localStorage.setItem(GAME_KEY(state.deckSlug), JSON.stringify(state));
}

export function clearGame(slug: string) {
  localStorage.removeItem(GAME_KEY(slug));
}

/** Deterministic shuffle (mulberry32) so a seed can reproduce an order. */
export function shuffledOrder(count: number, seed: number): number[] {
  let a = seed >>> 0;
  const rand = () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const SEEN_KEY = (slug: string) => `entrenous.seen.${slug}`;

/** Ids des cartes déjà jouées (tous modes confondus), persistés en local. */
export function loadSeen(slug: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  return new Set(safeParse<number[]>(localStorage.getItem(SEEN_KEY(slug))) ?? []);
}

export function markSeen(slug: string, cardId: number) {
  const seen = loadSeen(slug);
  seen.add(cardId);
  localStorage.setItem(SEEN_KEY(slug), JSON.stringify([...seen]));
}

export function clearSeen(slug: string) {
  localStorage.removeItem(SEEN_KEY(slug));
}

/**
 * Ordre de jeu : toutes les cartes jamais vues d'abord (mélangées), puis les
 * déjà-vues (mélangées). Une carte ne revient donc pas avant l'épuisement du
 * paquet.
 */
export function unseenFirstOrder(
  cardIds: number[],
  seen: Set<number>,
  seed: number,
): number[] {
  const order = shuffledOrder(cardIds.length, seed);
  const unseen = order.filter((i) => !seen.has(cardIds[i]));
  const alreadySeen = order.filter((i) => seen.has(cardIds[i]));
  return [...unseen, ...alreadySeen];
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}
