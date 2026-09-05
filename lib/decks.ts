import type { Card, Deck } from "./types";
import verdictCards from "@/data/verdict.json";
import ouinonCards from "@/data/ouinon.json";

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
    slug: "oui-non",
    name: "Oui ou Non",
    tagline: "500 questions, zéro nuance permise",
    description:
      "Une question de fond, deux réponses possibles seulement. Chacun tranche en secret — puis on compare, et on débat.",
    accent: "#d8b56a",
    // Ne devient jouable qu'une fois le vrai contenu fusionné (le fichier
    // placeholder de dev ne contient que quelques cartes).
    available: (ouinonCards as Card[]).length >= 100,
    cardCount: (ouinonCards as Card[]).length,
  },
];

export function getDeck(slug: string): Deck | undefined {
  return DECKS.find((d) => d.slug === slug);
}

export function getCards(slug: string): Card[] {
  if (slug === "verdict") return verdictCards as Card[];
  if (slug === "oui-non") return ouinonCards as Card[];
  return [];
}
