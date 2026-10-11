# Runbook de maintenance — suivi-colis

Environnement : Windows, PowerShell, **sans Docker**, PostgreSQL installé comme **service Windows**, `psql` / `pg_dump` / `pg_restore` dans le PATH.
Toutes les commandes se lancent depuis la racine du dépôt (`suivi-colis\`) sauf mention contraire.

> Aucun secret dans ce document : on cite uniquement des **noms de variables**. Les valeurs sont dans `apps/api/.env`, `apps/web/.env.local` et `.db-url.local` (ignorés par git).

---

## 1. Vue d'ensemble

| Composant | Dossier | Port | URL |
|---|---|---|---|
| API NestJS + Prisma | `apps/api` | 4000 | `http://localhost:4000/api/v1` (Swagger : `/api/docs`) |
| Web Next.js 14 | `apps/web` | 3000 | `http://localhost:3000` (proxy `/api/v1/*` → API via `API_INTERNAL_URL`) |
| Code partagé (statuts, libellés, codes de suivi) | `packages/shared` | — | — |

### Bases de données (même serveur Postgres, même rôle applicatif)

| Base | Rôle | Qui écrit dedans |
|---|---|---|
| `suivicolis` | Base principale (démo / « prod » locale). URL dans `.db-url.local`, recopiée dans `DATABASE_URL` de `apps/api/.env` par `pnpm env:setup`. | L'API, `pnpm db:seed`, `pnpm db:deploy` |
| `suivicolis_test` | Base de tests manuels / développement. | Uniquement à la main, jamais par la suite e2e |
| `suivicolis_e2e` | Base **dédiée** à la suite e2e (`pnpm --filter api test:e2e`). Vidée et réensemencée à chaque fichier de test. | Uniquement la suite e2e |

L'URL de `suivicolis_e2e` = celle de `.db-url.local` en remplaçant le nom de base final `/suivicolis` par `/suivicolis_e2e`.

### Règle de propriété des dossiers

- `apps/api/src`, `apps/api/prisma` : développeur backend.
- `apps/web` : développeur front.
- `apps/api/test` : QA (tests e2e).
- `packages/shared` : partagé, toute modification doit être suivie d'un rebuild complet.
- Chacun ne modifie et ne commite **que son dossier** (voir §8).

---

## 2. Démarrer / arrêter / relancer

### Démarrage complet (après une mise à jour du code)

```powershell
pnpm install                 # postinstall : construit packages/shared
pnpm db:generate             # client Prisma (API arrêtée, voir §3)
pnpm db:deploy               # migrations sur la base de DATABASE_URL (suivicolis)
pnpm build                   # shared + api + web, dans cet ordre
pnpm --filter api start      # = node dist/main.js dans apps/api
pnpm --filter web start      # = next start -p 3000
```

Équivalent manuel pour l'API : `cd apps\api; node dist\main.js`.
Développement avec rechargement : `pnpm dev` (lance `dev` dans tous les paquets).

Rebuild ciblé :

```powershell
pnpm --filter @suivi-colis/shared build
pnpm --filter api build
pnpm --filter web build
```

### Vérifier que l'API répond

```powershell
Invoke-RestMethod http://localhost:4000/api/v1/health    # attendu : status=ok, db=ok
```

### Trouver / arrêter le processus d'un port

```powershell
Get-NetTCPConnection -LocalPort 4000 -State Listen | Select-Object LocalPort, OwningProcess
Get-Process -Id (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess
Stop-Process -Id (Get-NetTCPConnection -LocalPort 4000 -State Listen).OwningProcess   # idem 3000 pour le web
```

Relancer = arrêter le processus puis refaire `pnpm --filter api start` (ou `web`). Après un changement de code : rebuild d'abord.

### Pièges

- **`NEXT_PUBLIC_API_URL`** : ancienne variable, **plus utilisée**. Le navigateur appelle `/api/v1` sur le site web et Next relaie vers l'API. Si elle traîne dans `apps/web/.env.local`, la supprimer pour éviter la confusion.
- **`API_INTERNAL_URL`** (`apps/web/.env.local`, sans `/api/v1`, défaut `http://127.0.0.1:4000`) est lue par `next.config` **au build** (rewrites) : après tout changement, **refaire `pnpm --filter web build`** puis relancer le web.
- **`PUBLIC_SITE_URL`** (`apps/api/.env`, utilisée pour générer les liens magiques `…/acces/<jeton>`) et **`NEXT_PUBLIC_SITE_URL`** (`apps/web/.env.local`, liens de suivi partagés, WhatsApp) doivent être **l'adresse publique réelle** du site (sans slash final). Avec `localhost`, les liens envoyés aux clients ne marchent pas sur leur téléphone. `NEXT_PUBLIC_*` est figée au build web : rebuild après modification.
- `CORS_ORIGINS` / `WEB_URL` (`apps/api/.env`) doivent correspondre à l'adresse du web.

---

## 3. Migrations

Dossier : `apps/api/prisma/migrations` (actuellement `init`, `checks`, `sites`, `poids_depart`, `archivage`, `magic_link`).

### Appliquer sur les trois bases

```powershell
# suivicolis (DATABASE_URL de apps/api/.env)
pnpm db:deploy

# suivicolis_test et suivicolis_e2e : surcharger DATABASE_URL le temps de la commande
$u = (Get-Content .db-url.local -Raw).Trim()
cd apps\api
$env:DATABASE_URL = $u -replace '/suivicolis(\?.*)?$', '/suivicolis_test$1'; npx prisma migrate deploy
$env:DATABASE_URL = $u -replace '/suivicolis(\?.*)?$', '/suivicolis_e2e$1';  npx prisma migrate deploy
Remove-Item Env:DATABASE_URL
cd ..\..
```

Ne jamais afficher `$u` ni `$env:DATABASE_URL` (contient le mot de passe).

### Règles

- Les contraintes métier critiques sont en **SQL brut dans les migrations** (Prisma ne sait pas les décrire) :
  - index unique partiel `AffectationLot_une_ouverte_par_colis` (une seule affectation ouverte par colis) ;
  - `CHECK` : checkpoint ciblant un lot **ou** un colis, `fin > debut` sur les affectations, commentaire obligatoire pour `EXCEPTION`, nom de site non vide ;
  - index unique `lower(btrim(nom))` sur les sites, index unique partiel « un lien d'accès actif par client ».
  Ne pas les supprimer en régénérant une migration.
- **Ne jamais modifier une migration déjà appliquée** : créer une nouvelle migration (`pnpm db:migrate` en développement uniquement).
- `pnpm db:reset` **efface la base** : jamais sur `suivicolis` avec des données réelles.
- **`pnpm db:generate` (prisma generate) sous Windows : arrêter l'API d'abord** (port 4000). Le moteur de requêtes Prisma est verrouillé par le processus Node et la génération échoue (EPERM) sinon. Relancer l'API ensuite.

---

## 4. Seed / reseed avant démo

```powershell
pnpm db:seed      # = pnpm --filter api seed (ts-node prisma/seed.ts)
```

- Crée les 2 tenants, les comptes de démo (mots de passe : variables `SEED_USER_PASSWORD` / `SEED_ADMIN_PASSWORD` de `apps/api/.env`), les sites par défaut, et des colis/lots d'exemple **uniquement si le tenant n'a aucun colis**.
- Il réinitialise le mot de passe et le verrouillage des comptes de démo.
- Pour repartir d'une démo propre : `pnpm db:reset` (efface la base de `DATABASE_URL`, réapplique les migrations puis lance le seed configuré dans `apps/api/package.json`) — cela **régénère tous les codes de suivi** (les anciens liens partagés deviennent invalides). Le seed affiche les nouveaux codes.
- **Jamais sur une base de production / avec des données de vrais clients.**

---

## 5. Sauvegarde et restauration

### Sauvegarde

```powershell
pnpm backup:db
```

`scripts/backup-db.mjs` lit `DATABASE_URL` dans `apps/api/.env` (donc la base `suivicolis`) et lance `pg_dump -Fc` vers `backups\suivi_colis_AAAAMMJJ_HHMM.dump`. Le dossier `backups\` ne doit pas être commité.

Manuel (autre base) :

```powershell
pg_dump -Fc -f backups\suivicolis_test.dump "<url de la base>"
```

### Restauration (toujours tester d'abord dans une base jetable)

```powershell
$u = (Get-Content .db-url.local -Raw).Trim()
$scratch = $u -replace '/suivicolis(\?.*)?$', '/suivicolis_restore$1'
psql $u -c "CREATE DATABASE suivicolis_restore"
pg_restore --no-owner -d $scratch backups\suivi_colis_AAAAMMJJ_HHMM.dump
psql $scratch -c 'SELECT count(*) FROM "Colis"'           # contrôle
psql $u -c "DROP DATABASE suivicolis_restore"              # nettoyage
```

Restauration réelle sur `suivicolis` : arrêter l'API, puis `pg_restore --clean --if-exists --no-owner -d <url suivicolis> <fichier>`, relancer l'API, vérifier `/api/v1/health`.

---

## 6. Tests

```powershell
pnpm test                          # tests unitaires API (src/**/*.spec.ts)
pnpm --filter api test:e2e         # suite e2e (ou : cd apps\api; pnpm test:e2e)
```

- La suite e2e démarre l'API **en mémoire** (pas besoin d'arrêter les serveurs 4000/3000) et tourne **uniquement sur `suivicolis_e2e`** : `test/e2e/setup-env.ts` force `DATABASE_URL` sur cette base et le helper refuse de s'exécuter sinon. Chaque fichier vide les tables et rejoue `prisma/seed.ts`.
- Pré-requis : migrations à jour sur `suivicolis_e2e` (§3).
- Ce qu'elle garantit : contraintes SQL, isolation entre transitaires, rôles OWNER/AGENT, checkpoints groupés par lot et transferts (bornes de dates), dates futures refusées, sites, page de suivi publique (aucun id interne ni référence de lot, 404 identiques, limitation 429), normalisation des téléphones, édition/archivage/clôture/suppression, liens magiques et sessions client, nombre de requêtes SQL constant (300 colis).
- **À lancer avant chaque commit touchant l'API.** Un test qui échoue = une anomalie à corriger dans le code, pas dans le test.

---

## 7. Incidents fréquents

| Symptôme | Cause / action |
|---|---|
| **API injoignable** (web en erreur, `/api/v1/health` KO) | Vérifier le port 4000 (`Get-NetTCPConnection`, §2). Vérifier le service Postgres : `Get-Service *postgres*` puis `Start-Service <nom>`. Relancer `pnpm --filter api start`. Si `db` KO dans health : URL / service Postgres. Si l'API refuse de démarrer « Configuration invalide » : `apps/api/.env` incomplet → `pnpm env:setup`. |
| **429 sur le suivi public** | Limite `TRACKING_RATE_LIMIT_PER_MIN` (30 requêtes/min par IP par défaut). Dire au client d'attendre une minute avant de recharger. Si beaucoup de clients partagent une IP (même Wi-Fi), augmenter `TRACKING_RATE_LIMIT_PER_MIN` dans `apps/api/.env` puis **relancer l'API**. |
| **429 sur l'ouverture d'un lien d'accès** (`/client/lien`) | Limite fixe dans le code : 10 POST/min et 30 GET/min par IP. Attendre une minute. |
| **Lien magique → 410 « expiré ou déjà utilisé »** | Lien expiré (48 h), déjà utilisé (usage unique) ou remplacé par un lien plus récent, ou client archivé. Le transitaire **régénère un lien** depuis la fiche client et le renvoie. |
| **Client qui a changé de téléphone / perdu son téléphone** | Sur la fiche client : **« Déconnecter ce client »** (révoque toutes ses sessions, `POST /clients/:id/deconnecter`), mettre à jour le numéro, renvoyer un nouveau lien. |
| **Utilisateur désactivé encore actif** | Problème connu : son JWT reste valide jusqu'à expiration (`JWT_ACCESS_TTL`, 15 min). Il ne peut plus se reconnecter. En cas d'urgence : changer `JWT_ACCESS_SECRET` et relancer l'API (déconnecte **tout le monde**). |
| **Page de suivi affiche « inactif »** | Le colis est archivé. Le désarchiver (OWNER) si le suivi doit redevenir visible. |
| **Le PC perd la connexion / l'agent distant ne répond plus** | Attendre et relancer la commande. Vérifier ensuite que les serveurs tournent toujours (§2) et qu'aucune commande n'est restée à moitié (ex. `git status`). |

---

## 8. Règles git

- Toujours `git status` avant `git add`.
- Ajouter des **chemins explicites** et commiter en limitant au dossier :
  `git add apps/api/test` puis `git commit -m "..." -- apps/api/test`
- **Jamais `git add -A`** ni `git add .` (d'autres personnes ont des modifications en cours dans le même dépôt).
- Le dépôt n'a **pas de remote** : pas de push.
- Aucun secret commité : `.db-url.local`, `apps/api/.env`, `apps/web/.env.local`, `backups/` restent hors git. Seuls les `.env.example` (sans valeurs réelles) sont versionnés.
- Pas de réécriture d'historique (`reset --hard`, `--amend` sur un commit partagé) sans accord.

---

## 9. Checklist avant démo

- [ ] Service Postgres démarré (`Get-Service *postgres*`).
- [ ] `git status` propre ou modifications connues ; dernier code construit (`pnpm build`).
- [ ] `pnpm db:deploy` : « No pending migrations ».
- [ ] `pnpm --filter api test:e2e` vert.
- [ ] Sauvegarde fraîche : `pnpm backup:db`.
- [ ] Si besoin d'une démo propre : reseed (§4) et noter les nouveaux codes de suivi.
- [ ] API : `Invoke-RestMethod http://localhost:4000/api/v1/health` → ok.
- [ ] Web : `http://localhost:3000` s'ouvre, connexion OWNER et AGENT de démo OK.
- [ ] `PUBLIC_SITE_URL` et `NEXT_PUBLIC_SITE_URL` = adresse réellement accessible depuis un téléphone ; web reconstruit après modification.
- [ ] Un code de suivi s'ouvre sur la page publique depuis un téléphone ; un lien magique généré s'ouvre et affiche « Mes colis ».
