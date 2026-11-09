# suivi-colis — MVP local (Windows, sans Docker)

Plateforme multi-transitaires de suivi de colis Chine → Afrique (pays pilote : Côte d'Ivoire).
Monorepo pnpm : `apps/api` (NestJS + Prisma, port 4000), `apps/web` (Next.js 14, port 3000), `packages/shared` (statuts, libellés FR, référentiel des 54 pays africains, téléphones).

## Prérequis
Node.js ≥ 20, pnpm ≥ 9, PostgreSQL (service Windows), `psql` dans le PATH.

## Base de données (une fois, en tant que `postgres`)
```powershell
psql -U postgres -h 127.0.0.1 -c "CREATE ROLE suivicolis LOGIN PASSWORD '<mot_de_passe>' CREATEDB;"
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE suivicolis OWNER suivicolis;"
# une ligne, fichier ignoré par git :
Set-Content -Encoding ascii .db-url.local "postgresql://suivicolis:<mot_de_passe>@127.0.0.1:5432/suivicolis"
```

## Installation et lancement (PowerShell, à la racine)
```powershell
pnpm install          # construit aussi packages/shared (postinstall)
pnpm env:setup        # crée apps/api/.env : secrets JWT aléatoires, DATABASE_URL depuis .db-url.local, mot de passe seed aléatoire
pnpm db:generate
pnpm db:deploy        # applique les migrations (ou pnpm db:migrate en développement)
pnpm db:seed          # idempotent ; affiche les codes de suivi
pnpm build
pnpm --filter api start    # http://localhost:4000/api/v1  (Swagger : /api/docs)
pnpm --filter web start    # http://localhost:3000
```
Développement avec rechargement : `pnpm dev`.  Sauvegarde : `pnpm backup:db` (pg_dump → `backups/`).

## Comptes de démo
`owner@abidjan-express.local` (OWNER), `agent@abidjan-express.local` (AGENT), `owner@treichville-fret.local` (OWNER, 2e transitaire), `owner@dakar-fret.local` (OWNER, transitaire au Sénégal).
Mot de passe : valeur `SEED_USER_PASSWORD` dans `apps/api/.env`.

## Modèle métier
- Statuts (`StatutCheckpoint`) : RECU_ENTREPOT_CHINE, CHARGE_DANS_LOT, PARTI_DE_CHINE, ARRIVE_DESTINATION (le lieu précis est le site du checkpoint), EN_DEDOUANEMENT, DISPONIBLE_AU_RETRAIT, REMIS_AU_CLIENT, EXCEPTION (commentaire obligatoire). Libellés FR dans `packages/shared`.
- `AffectationLot(colisId, lotId, debut, fin?)` : période `[debut, fin[` ; une seule affectation ouverte par colis (service + index unique partiel).
- Un checkpoint cible un lot **ou** un colis (contrainte CHECK). Historique d'un colis = ses checkpoints + ceux de ses lots datés dans ses périodes d'affectation (un checkpoint de lot antidaté avant le transfert n'est pas hérité).
- Mise à jour groupée : `POST /lots/:id/checkpoints` → `{ updatedCount }`.
- `tenantId` uniquement issu du JWT ; tout accès hors tenant → 404.
- Pays du transitaire (`Tenant.paysCode`, `devise`, `fuseau`) : `GET/PATCH /parametres` (PATCH : OWNER). Téléphones clients en E.164 : numéro local lu dans le pays du transitaire, ou numéro africain avec indicatif.
- Public : `GET /api/v1/public/suivi/:code` → `{ transitaire:{nom, telephone, couleur, pays, fuseau}, statutActuel, checkpoints:[{date, lieu, statut, libelle}] }` ; code inconnu ou malformé → même 404 ; 30 req/min/IP → 429. Page web : `/suivi/<code>`.

## Règles
Aucun remote git, aucun secret commité (`.env`, `.db-url.local` ignorés).
