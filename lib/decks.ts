import type { Card, Deck } from "./types";
import verdictCards from "@/data/verdict.json";

export const DECKS: Deck[] = [
  {
    slug: "verdict",
    name: "Le Verdict",
    tagline: "365 dilemmes, deux verdicts",
    description:
      "Une situation ambiguë, deux lectures possibles. Le compte à rebours tombe, chacun tranche — en même temps.",
    accent: "#ff4d2e",
    available: true,
    cardCount: (verdictCards as Card[]).length,
  },
  {
    slug: "verites",
    name: "Vérités",
    tagline: "Les questions qu'on n'ose pas poser",
    description: "Bientôt disponible.",
    accent: "#d8b56a",
    available: false,
    cardCount: 0,
  },
  {
    slug: "premiere-fois",
    name: "Premières Fois",
    tagline: "Vos souvenirs, face à face",
    description: "Bientôt disponible.",
    accent: "#9db89a",
    available: false,
    cardCount: 0,
  },
];

export function getDeck(slug: string): Deck | undefined {
  return DECKS.find((d) => d.slug === slug);
}

export function getCards(slug: string): Card[] {
  if (slug === "verdict") return verdictCards as Card[];
  return [];
}
