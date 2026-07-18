# Déploiement — entrenous.mooving-brands.com

Stack VPS Hostinger habituel : Docker + GHCR + Traefik + Watchtower.
Le repo contient déjà `Dockerfile`, `.dockerignore` et le workflow GitHub
Actions (`.github/workflows/docker-publish.yml`) qui publie l'image
`ghcr.io/guillaumebarbier/card-game:latest` à chaque push (branche
`main` ou `claude/couple-card-game-app-mln9kf`).

## Étapes manuelles restantes (une seule fois, ~5 min)

### 1. Rendre l'image GHCR publique

Après le premier run vert de GitHub Actions :

1. Ouvrir https://github.com/users/GuillaumeBarbier/packages/container/card-game/settings
2. Bas de page → **Danger Zone** → **Change visibility** → **Public**

### 2. DNS

Ajouter dans la zone `mooving-brands.com` :

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `entrenous` | `69.62.109.49` | 300 |

Vérifier : `dig +short entrenous.mooving-brands.com` → `69.62.109.49`

### 3. Premier déploiement sur le VPS

En SSH sur `root@69.62.109.49`, copier-coller le bloc :

```bash
dig +short entrenous.mooving-brands.com
docker pull ghcr.io/guillaumebarbier/card-game:latest

mkdir -p /root/card-game && cd /root/card-game

cat > docker-compose.yml <<'EOF'
services:
  card-game:
    image: ghcr.io/guillaumebarbier/card-game:latest
    container_name: card-game
    restart: unless-stopped
    expose:
      - "3000"
    labels:
      - com.centurylinklabs.watchtower.enable=true
      - traefik.enable=true
      - traefik.docker.network=root_default
      - traefik.http.routers.card-game-http.entrypoints=web
      - traefik.http.routers.card-game-http.rule=Host(`entrenous.mooving-brands.com`)
      - traefik.http.routers.card-game-http.middlewares=redirect-to-https@docker
      - traefik.http.routers.card-game.entrypoints=websecure
      - traefik.http.routers.card-game.rule=Host(`entrenous.mooving-brands.com`)
      - traefik.http.routers.card-game.tls=true
      - traefik.http.routers.card-game.tls.certresolver=mytlschallenge
      - traefik.http.routers.card-game.middlewares=card-game-security-headers
      - traefik.http.middlewares.card-game-security-headers.headers.browserXSSFilter=true
      - traefik.http.middlewares.card-game-security-headers.headers.contentTypeNosniff=true
      - traefik.http.middlewares.card-game-security-headers.headers.forceSTSHeader=true
      - traefik.http.middlewares.card-game-security-headers.headers.referrerPolicy=strict-origin-when-cross-origin
      - traefik.http.middlewares.card-game-security-headers.headers.stsIncludeSubdomains=true
      - traefik.http.middlewares.card-game-security-headers.headers.stsPreload=true
      - traefik.http.middlewares.card-game-security-headers.headers.stsSeconds=31536000
      - traefik.http.services.card-game.loadbalancer.server.port=3000

networks:
  default:
    name: root_default
    external: true
EOF

docker compose up -d
sleep 3
docker ps --filter name=card-game
docker logs card-game --tail 20
```

## Test sur iPhone

1. Ouvrir https://entrenous.mooving-brands.com dans Safari
   (le **premier hit prend 10-15 s** — négociation du certificat Let's Encrypt, c'est normal).
2. Partager → **« Sur l'écran d'accueil »** : l'app s'installe comme une vraie
   app plein écran (PWA, barre de statut sombre, icône dédiée).

## Mises à jour ensuite

Push GitHub → Actions rebuild (~2 min) → Watchtower redéploie sous 5 min.
Aucune action manuelle sur le VPS.

⚠️ Note : tant que la branche de dev `claude/couple-card-game-app-mln9kf`
n'est pas mergée dans `main`, c'est elle qui publie le tag `latest` (prévu
pour tester avant merge). Après merge dans `main`, retirer cette branche du
workflow `docker-publish.yml`.
