# Roadmap

## Phase 1 — livrée

- Accueil multi-decks (« Le Verdict » jouable, 2 decks teaser « Bientôt »)
- Jeu sur un téléphone : pile de cartes swipeable (physique spring),
  compte à rebours 3-2-1, saisie des deux verdicts, écran Accord/Désaccord,
  score et progression sauvegardés en local
- 365 cartes « Le Verdict » (12 catégories, 3 niveaux d'intensité)
- PWA : manifest, icônes, plein écran iOS

## Phase 2 — mode à distance

- **Salles privées** : un joueur crée une salle (code court), l'autre rejoint
- **Synchro temps réel** : même carte affichée chez les deux, compte à rebours
  déclenché par l'un des deux, démarré simultanément
- **Réponses cachées** : chaque joueur saisit son verdict (+ mot libre
  optionnel) pendant le compte à rebours ; révélation mutuelle à zéro
- Implémentation : routes API Next.js + Server-Sent Events, état des salles
  en mémoire (suffisant pour un déploiement mono-instance Docker)
- Reconnexion tolérée (state rejouable côté serveur)

## Plus tard

- Nouveaux decks (« Vérités », « Premières Fois »)
- Filtre d'intensité (1-3)
- Historique / statistiques de couple
- Passage App Store via Capacitor (l'app est déjà pensée standalone/PWA)
