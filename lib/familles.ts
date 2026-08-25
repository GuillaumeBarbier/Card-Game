// Jeu des 7 familles version enfants : 7 familles-couleurs × 4 chiffres = 28 cartes.
// On demande « le 1 Rose » — aucune lecture nécessaire, juste couleurs et chiffres.
// Le champ `image` permettra plus tard d'ajouter une illustration par-dessus la couleur.

export interface Family {
  id: number;
  name: string;
  color: string;
  /** Couleur d'accent plus soutenue (chiffres, bordures). */
  deep: string;
  image?: string;
}

export const FAMILIES: Family[] = [
  { id: 1, name: "Rose", color: "#F2C8CF", deep: "#B96B7B" },
  { id: 2, name: "Orange", color: "#F5CFA6", deep: "#BE7F3E" },
  { id: 3, name: "Jaune", color: "#F2E3AE", deep: "#A88D3E" },
  { id: 4, name: "Vert", color: "#C9DEC6", deep: "#5F8F5D" },
  { id: 5, name: "Bleu", color: "#BFD8E8", deep: "#4F7F9F" },
  { id: 6, name: "Violet", color: "#CBC6E8", deep: "#6F63A8" },
  { id: 7, name: "Marron", color: "#D9C3AC", deep: "#8F6F4F" },
];

export const NUMBERS = [1, 2, 3, 4] as const;

/** id de carte = famille * 10 + chiffre (1-4). */
export const cardId = (familyId: number, n: number) => familyId * 10 + n;
export const familyOf = (id: number) => Math.floor(id / 10);
export const numberOf = (id: number) => id % 10;

export const ALL_CARDS: number[] = FAMILIES.flatMap((f) =>
  NUMBERS.map((n) => cardId(f.id, n)),
);

export const familyById = (id: number) => FAMILIES.find((f) => f.id === id)!;

/** « le 1 Rose » */
export const cardLabel = (id: number) =>
  `le ${numberOf(id)} ${familyById(familyOf(id)).name}`;
