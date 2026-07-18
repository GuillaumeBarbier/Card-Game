# Entre Nous — le jeu de cartes des couples

Web app mobile-first de jeu de cartes interactif pour couples. Une carte, un
compte à rebours, deux verdicts : découvrez si vous êtes vraiment d'accord.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS 4**
- **Motion** (framer-motion) pour la pile de cartes swipeable et les transitions
- Polices auto-hébergées : Instrument Serif (display) + Space Grotesk (UI)
- Données des jeux : JSON statique dans `data/`

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000 (idéalement en mode mobile / responsive).

## Structure

- `app/` — pages (accueil, `/play/[deck]`)
- `components/` — UI (CardStack, GameScreen, CountdownOverlay, VerdictPanel…)
- `lib/` — types, registre des decks, stockage local (progression, prénoms)
- `data/verdict.json` — les 365 cartes du jeu « Le Verdict »
- `content/verdict/part-*.json` — source des cartes, fusionnées via
  `node scripts/merge-cards.mjs`

## Jeux

L'app est conçue multi-decks (`lib/decks.ts`) : « Le Verdict » est jouable,
d'autres decks sont prévus (tuiles « Bientôt » sur l'accueil).

## Modes

- **Sur un téléphone** : la carte s'affiche, compte à rebours 3-2-1, les deux
  joueurs annoncent leur verdict en même temps puis le saisissent — accord ou
  désaccord, score suivi en local.
- **À distance** : salle privée synchronisée entre deux téléphones (en cours).
