# Entre Nous — le jeu de cartes des couples

Web app mobile-first de jeu de cartes interactif pour couples. Une carte, un
compte à rebours, deux verdicts : découvrez si vous êtes vraiment d'accord.

## Stack

- **Next.js 16** (App Router, TypeScript, output standalone) + **Tailwind CSS 4**
- **Motion** pour la pile de cartes swipeable et les transitions
- Polices auto-hébergées : Instrument Serif (display) + Space Grotesk (UI)
- PWA installable (manifest + icônes), données des jeux en JSON statique

## Lancer en local

```bash
npm install
npm run dev
```

Note : en production le build utilise `output: "standalone"` — tester avec
`node .next/standalone/server.js` (après copie de `public` et `.next/static`
dans `.next/standalone/`), pas avec `next start`.

## Modes de jeu

- **Sur un téléphone** (`/play/verdict`) : compte à rebours 3-2-1, les deux
  joueurs annoncent leur verdict en même temps puis le saisissent — accord ou
  désaccord, score suivi en local.
- **À distance** (`/room`) : salle privée à code 4 lettres, carte et compte à
  rebours synchronisés (SSE), chacun répond en secret depuis son téléphone
  (+ note optionnelle), révélation simultanée à la fin du compte à rebours.
  Rooms en mémoire process — adapté au déploiement mono-container.

## Structure

- `app/` — pages + API (`/api/room/*` : création, join, actions, SSE)
- `components/` — UI (CardStack, GameScreen, RemoteGame, CountdownRing…)
- `lib/` — types, decks, stockage local, store de salles côté serveur
- `data/verdict.json` — les 365 cartes (source : `content/verdict/part-*.json`,
  fusion via `node scripts/merge-cards.mjs`)
- `docs/DEPLOY.md` — mise en prod sur entrenous.guillaume-barbier.com

## Jeux

Architecture multi-decks (`lib/decks.ts`) : « Le Verdict » (365 cartes, 14
catégories, 3 niveaux d'intensité) est jouable ; d'autres decks sont prévus
(tuiles « Bientôt » sur l'accueil).
