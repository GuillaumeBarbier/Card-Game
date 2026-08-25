// Jeu des 7 familles — 7 familles × 6 membres = 42 cartes.
// Les familles sont identifiées par un chiffre + une couleur pastel ;
// le champ `image` permettra plus tard d'ajouter une illustration par-dessus.

export interface Family {
  id: number;
  color: string;
  /** Couleur d'accent plus soutenue (bordures, chiffres). */
  deep: string;
  image?: string;
}

export const FAMILIES: Family[] = [
  { id: 1, color: "#F2C8CF", deep: "#B96B7B" },
  { id: 2, color: "#F5D3B3", deep: "#C08552" },
  { id: 3, color: "#F2E3AE", deep: "#AD934A" },
  { id: 4, color: "#C9DEC6", deep: "#6E9A6C" },
  { id: 5, color: "#BFD8E8", deep: "#5D89A8" },
  { id: 6, color: "#CBC6E8", deep: "#7A6FB0" },
  { id: 7, color: "#E3C4DE", deep: "#A866A0" },
];

export const MEMBERS = ["Papi", "Mamie", "Papa", "Maman", "Fils", "Fille"] as const;

/** id de carte = famille * 10 + index membre (0-5). */
export const cardId = (familyId: number, memberIdx: number) => familyId * 10 + memberIdx;
export const familyOf = (id: number) => Math.floor(id / 10);
export const memberOf = (id: number) => id % 10;

export const ALL_CARDS: number[] = FAMILIES.flatMap((f) =>
  MEMBERS.map((_, m) => cardId(f.id, m)),
);

export const familyById = (id: number) => FAMILIES.find((f) => f.id === id)!;
