export type Category =
  | "soirees"
  | "reseaux"
  | "ex"
  | "amis"
  | "argent"
  | "quotidien"
  | "travail"
  | "famille"
  | "vacances"
  | "seduction"
  | "telephone"
  | "jalousie"
  | "sexe"
  | "projets";

export interface Card {
  id: number;
  category: Category;
  scenario: string;
  optionA: string;
  optionB: string;
  spice: 1 | 2 | 3;
}

export interface Deck {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  accent: string;
  available: boolean;
  cardCount: number;
}

export type Choice = "A" | "B";

export interface RoundResult {
  cardId: number;
  p1: Choice;
  p2: Choice;
  agreed: boolean;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  soirees: "Soirées",
  reseaux: "Réseaux",
  ex: "Les ex",
  amis: "Amis",
  argent: "Argent",
  quotidien: "Quotidien",
  travail: "Travail",
  famille: "Famille",
  vacances: "Vacances",
  seduction: "Séduction",
  telephone: "Téléphone",
  jalousie: "Jalousie",
  sexe: "Sexe",
  projets: "Projets",
};
