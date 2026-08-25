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

// Couleurs vives (même saturation que l'accent de l'app), toutes
// identifiables sans confusion par de jeunes enfants.
// `deep` = couleur des chiffres/du texte posés sur la couleur.
export const FAMILIES: Family[] = [
  { id: 1, name: "Rouge", color: "#E8342E", deep: "#FFFFFF" },
  { id: 2, name: "Orange", color: "#FF8A1E", deep: "#5E3200" },
  { id: 3, name: "Jaune", color: "#FFCF24", deep: "#6E5300" },
  { id: 4, name: "Vert", color: "#2DB958", deep: "#FFFFFF" },
  { id: 5, name: "Bleu", color: "#2E8DFF", deep: "#FFFFFF" },
  { id: 6, name: "Rose", color: "#FF5DA8", deep: "#FFFFFF" },
  { id: 7, name: "Violet", color: "#8C52E8", deep: "#FFFFFF" },
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
