# Kickoff : suivi des colis Chine → toute l'Afrique

> Rédigé le 08/11/2026 à la demande du user. Document de cadrage et feuille de route : **aucun code**. Il part de l'existant (MVP Chine → Côte d'Ivoire) et des études déjà faites (`etude-suivi-automatique*.md`, `cadrage-annuaire-transitaires.md`). Les chiffres non sourcés sont marqués « hypothèse », et les points à confirmer sont regroupés en section 9.

## 1. Le projet en une phrase

Un client qui commande de la marchandise en Chine et la confie à un transitaire africain sait à tout moment où en est son colis, **sans avoir à relancer le transitaire sur WhatsApp**. Il est prévenu automatiquement à chaque étape, par WhatsApp, par SMS ou dans une application.

## 2. Décisions de ce kickoff (08/11/2026)

| Sujet | Décision du user |
|---|---|
| Livrable | Cadrage et feuille de route, versionnés dans `docs/` |
| Couverture géographique | **Toute l'Afrique** : le produit ne doit plus supposer la Côte d'Ivoire |
| Canaux d'information du client final | **Notifications WhatsApp**, **SMS** et **application mobile**, en plus de la page web de suivi déjà en place |

### Décisions complémentaires (09/11/2026)

| Sujet | Décision du user | Conséquence |
|---|---|---|
| Deuxième pays | **Aucun partenaire hors Côte d'Ivoire pour l'instant** | La Côte d'Ivoire reste le pays pilote. On rend le modèle multi-pays (phase 1) sans traduire ni ouvrir de pays : l'anglais et les fournisseurs SMS d'autres pays attendront un premier transitaire étranger. |
| Numéro WhatsApp | **Un seul numéro pour la plateforme** | Un seul compte WhatsApp Business et une seule vérification Meta. Le nom du transitaire apparaît dans le texte du modèle de message. |
| Qui paie les notifications | **Non tranché, volontairement** | L'architecture reste neutre : chaque envoi est journalisé avec son coût et son tenant, ce qui permet plus tard un quota, une refacturation ou une inclusion dans l'abonnement sans rien refaire. |
| Application | **PWA pour le développement**, natif selon les besoins | Phase 3 en PWA. L'app native reste optionnelle (phase 6). |
| Hébergement | **OVHcloud**, ouvert à une meilleure offre | La phase 0 cible OVHcloud. Une comparaison rapide reste à faire (section 10). |
| Nouveaux statuts (transit terrestre, livraison à domicile) | **Pas pour le moment** | On garde les 8 statuts, en renommant seulement `ARRIVE_ABIDJAN` en `ARRIVE_DESTINATION`. |

## 3. Utilisateurs et problème

| Acteur | Aujourd'hui | Ce qu'on lui apporte |
|---|---|---|
| **Client final** (commerçant, particulier, souvent sur Android d'entrée de gamme, avec une data chère) | Il relance le transitaire sur WhatsApp et attend une réponse. Il ne sait pas si son colis est parti, arrivé ou bloqué en douane. | Un code de suivi, une page « Mes colis », des notifications à chaque étape, sans compte ni mot de passe |
| **Transitaire** (agent en Chine, agence au pays de destination) | Il répond un par un aux mêmes questions, avec des listes Excel et des groupes WhatsApp. | Une mise à jour **par lot** qui touche des centaines de colis à la fois, et des clients qui sont prévenus tout seuls |
| **Plateforme** (nous) | — | Un SaaS multi-transitaires, puis l'annuaire (voir `cadrage-annuaire-transitaires.md`) |

**Client payeur : le transitaire.** Le client final ne paie rien et n'a besoin d'aucun compte.

## 4. État des lieux : ce qui existe déjà

Le MVP local couvre déjà le cœur du suivi.

| Brique | Statut | Où |
|---|---|---|
| Multi-transitaires (tenant), rôles OWNER / AGENT / SUPER_ADMIN, isolation stricte (404 hors tenant) | ✅ | `apps/api/src/auth.ts`, e2e `02`, `03` |
| Clients, colis, lots (MER / AIR), affectation datée d'un colis à un lot, transferts | ✅ | `schema.prisma`, e2e `04`, `05` |
| Checkpoints append-only (sur un lot ou sur un colis), mise à jour groupée par lot, sites publics | ✅ | `history.ts`, e2e `04`, `07` |
| Page publique `/suivi/<code>` avec un code sans caractères ambigus, limitée à 30 req/min/IP | ✅ | `apps/web/app/(public)/suivi`, e2e `08`, `08b` |
| Lien magique à usage unique, puis session client « Mes colis » (cookie httpOnly, révocable) | ✅ | `acces.controller.ts`, e2e `14` |
| Partage vers WhatsApp **manuel** (`wa.me` pré-rempli, envoyé par l'agent) | ✅ | `tableau-de-bord/clients/[id]`, `colis/nouveau` |
| Notifications automatiques (WhatsApp, SMS, push) | ❌ | — |
| Application mobile | ❌ | — |
| Suivi automatique armateur / aérien | 📄 étudié, pas intégré | `etude-suivi-automatique.md` |
| Annuaire des transitaires | 📄 cadré, pas intégré | `cadrage-annuaire-transitaires.md` |
| Hébergement en ligne | ❌ (installation locale Windows uniquement) | `README.md`, `RUNBOOK.md` |

## 5. Ce qui bloque le passage à « toute l'Afrique »

Le code suppose la Côte d'Ivoire à plusieurs endroits. Il faut les généraliser **avant** d'ouvrir un deuxième pays, sinon chaque nouveau pays coûtera une exception de plus.

| Hypothèse codée en dur | Où | Ce qu'il faut à la place |
|---|---|---|
| Téléphone ivoirien `+225` + 10 chiffres | `apps/api/src/phone.ts`, `ClientForm.tsx`, `Gestion.tsx`, `lib/format.ts` | Format international E.164 validé par pays (bibliothèque `libphonenumber-js`), pays par défaut du transitaire |
| Statut `ARRIVE_ABIDJAN`, libellé « Arrivé à Abidjan » | `schema.prisma` (enum), `packages/shared`, études | Statut générique `ARRIVE_DESTINATION`. Le lieu précis (Lomé, Dakar, Mombasa, Lagos…) est porté par le `Site` du checkpoint |
| Devise XOF / « FCFA » | `formatXof` dans `packages/shared` | Devise par pays : XOF, XAF, NGN, GHS, KES, etc. |
| Fuseau `Africa/Abidjan` | `formatDate` dans `packages/shared` | Fuseau par transitaire. Les dates restent stockées en UTC |
| Locale `fr_CI`, textes « jusqu'à Abidjan » | `suivi/[code]/page.tsx` | Textes neutres (« jusqu'à destination ») et i18n **FR + EN** au minimum. Le portugais (Angola, Mozambique) viendra plus tard |
| Sites par défaut (port d'Abidjan, aéroport FHB) | `sites.controller.ts`, `seed.ts` | Référentiel de ports et d'aéroports africains (codes UN/LOCODE et IATA), proposé selon le pays du transitaire |
| Zones de retrait ivoiriennes, référence à la loi ivoirienne de 2013 | `cadrage-annuaire-transitaires.md` | Référentiel par pays, et conformité pays par pays (voir section 8) |

**Point de vigilance sur le renommage du statut.** `ALTER TYPE … RENAME VALUE` est sûr côté Postgres, mais le code `ARRIVE_ABIDJAN` est exposé par l'API publique (`statutActuel`, `checkpoints[].statut`). Il faut donc renommer dans une seule version de l'API et du web, ou garder l'ancien code en alias le temps d'une version.

**Modèle de données à prévoir (migrations additives) :**
- `Tenant` : `paysCode` (ISO 3166-1, par exemple `CI`, `SN`, `NG`), `devise`, `fuseau`, `langue`.
- `Client` : `paysCode` (un client peut habiter un autre pays que son transitaire), `langue`, préférences de notification (section 6).
- Le téléphone reste unique par tenant, mais au format E.164. Il faudra reprendre les numéros existants : préfixe `+225` déjà présent, donc une reprise triviale.

## 6. Notifications : WhatsApp, SMS, push

### Principe

À chaque nouveau checkpoint visible par le client (sur le colis ou sur son lot), on envoie **un seul message** par client et par événement, sur son canal préféré, avec un repli automatique :

```
checkpoint créé ─► table Notification (outbox, même transaction)
                  └─► worker ─► WhatsApp ──échec/non joignable──► SMS
                             └─► push (si l'app est installée)
```

- **Outbox transactionnelle.** La notification est écrite dans la même transaction que le checkpoint. Un worker l'envoie ensuite, avec plusieurs tentatives et une idempotence par `(clientId, checkpointId, canal)`. Une mise à jour groupée de 800 colis ne doit pas bloquer la requête de l'agent.
- **Regroupement.** Si un client a 5 colis dans le même lot, il reçoit **un** message (« 5 colis sont arrivés à Lomé »), pas cinq.
- **Fenêtre silencieuse** la nuit (heure locale du client), et pas de message pour les statuts internes. La liste des statuts notifiés est réglable par le transitaire.
- **Contenu.** Statut, lieu, nom du transitaire et lien vers `/suivi/<code>`. Jamais le contenu ni la valeur du colis.
- **Expéditeur.** Le message part au nom du transitaire (nom commercial dans le modèle de message), via **notre** compte d'envoi au MVP.
- **Journal.** Chaque envoi est tracé : canal, statut fournisseur (envoyé, distribué, lu, échec), coût. Ce journal sert à la facturation (section 7) et à l'écran « Notifications » du transitaire.

### WhatsApp (canal principal)

- Passer par la **WhatsApp Business Platform (Cloud API de Meta)**, directement ou via un BSP. L'envoi d'un message hors conversation ouverte impose un **modèle pré-approuvé** (catégorie « utility »).
- Tarification de Meta **par message et par pays** de destination. *À vérifier sur la grille officielle de Meta avant de chiffrer quoi que ce soit : les prix varient beaucoup d'un pays africain à l'autre.*
- **Consentement (opt-in) obligatoire.** Il est recueilli par le transitaire à la création du client (case à cocher et mention), et le client peut se désabonner (« STOP »).
- **Décidé : un numéro WhatsApp unique pour la plateforme.** Le modèle de message nomme le transitaire (par exemple « Votre colis confié à {transitaire} est arrivé à {lieu} »). Le client qui répond au message doit être renvoyé vers le WhatsApp du transitaire : le numéro de la plateforme ne fait pas de service client.

### SMS (repli et clients sans WhatsApp)

- Un agrégateur panafricain plutôt qu'un opérateur par pays. *Candidats à comparer (couverture, prix par pays, Sender ID) : Africa's Talking, Twilio, Infobip, Orange SMS API. Aucun prix relevé à ce stade.*
- Le **Sender ID alphanumérique** doit souvent être enregistré **pays par pays**, et les délais d'enregistrement varient (hypothèse : de quelques jours à plusieurs semaines). C'est à anticiper pour chaque pays ouvert.
- Message court (≤ 160 caractères GSM-7, donc sans accents si possible pour éviter l'Unicode qui coupe à 70) avec un lien court.

### Push (application)

- Web Push ou FCM, envoyé seulement si l'application est installée et si le client a accepté. Le push est **gratuit**, c'est donc le canal à privilégier dès qu'il existe.

## 7. Application mobile

**Recommandation : PWA d'abord, application native ensuite si les chiffres le justifient.**

| | PWA (progressive web app) | App native (Expo / React Native) |
|---|---|---|
| Installation | Depuis le lien de suivi, sans store, en quelques secondes | Play Store / App Store, téléchargement plus lourd |
| Poids et data | Très léger : on réutilise le web Next.js existant | Plus lourd, ce qui compte avec une data chère |
| Push | Oui sur Android ; sur iOS seulement une fois installée sur l'écran d'accueil | Oui partout |
| Coût de développement | Faible : manifest, service worker, cache hors ligne de « Mes colis » | Moyen à élevé : un deuxième code à maintenir, publication sur les stores |
| Hors ligne | Dernier état connu des colis | Idem |

**Décidé : PWA pour le développement.** L'essentiel des clients finaux est sur Android (hypothèse à confirmer par les transitaires) : la PWA couvre donc la majorité des cas pour un coût minime. On passera à Expo si le taux d'installation de la PWA est faible ou si les transitaires veulent une app à leur nom (marque blanche). Pour garder cette porte ouverte, la PWA ne parle qu'à l'API existante : une app native pourrait la réutiliser telle quelle.

**Parcours client dans l'app :** ouverture du lien magique (déjà en place), puis session « Mes colis », bouton « Installer l'application », acceptation des notifications, liste des colis avec leur statut, détail avec l'historique, et contact WhatsApp du transitaire. La règle produit existante reste valable : **aucun concurrent n'est affiché dans l'espace d'un transitaire.**

## 8. Risques principaux

| Risque | Impact | Parade |
|---|---|---|
| **Coût des notifications** WhatsApp et SMS, très variable selon le pays | Marge négative si le prix de l'abonnement ne le couvre pas | Quota de notifications inclus dans l'abonnement, au-delà refacturation ; regroupement par lot ; push gratuit en priorité |
| **Conformité données personnelles** : chaque pays a sa loi (Côte d'Ivoire 2013, Sénégal 2008, Nigeria NDPA 2023, Kenya 2019…) et parfois une déclaration à faire auprès d'une autorité | Blocage juridique dans un pays | Ouvrir les pays un par un, avec une checklist de conformité par pays ; minimisation des données (prénom, téléphone, aucun contenu de colis) ; validation juridique avant chaque lancement |
| **Opt-in WhatsApp** non recueilli par le transitaire | Signalements de spam, puis blocage du numéro par Meta | Case de consentement obligatoire à la création du client, désabonnement en un mot, suivi du taux de blocage |
| **Le transitaire ne met pas ses lots à jour** | Les notifications n'arrivent jamais, le client perd confiance | Mise à jour groupée en un clic (déjà en place), rappels au transitaire, puis suivi automatique des lots (phase 4) |
| **Saisie de checkpoints erronés** puis notification envoyée | Message faux chez des centaines de clients | Délai de grâce de quelques minutes avant l'envoi, pendant lequel l'agent peut annuler |
| **Passage du local Windows à un hébergement en ligne** | Indisponibilité, perte de données | Phase 0 : hébergement géré, sauvegardes automatiques, supervision |

## 9. Questions ouvertes

Les six questions du kickoff ont reçu une réponse le 09/11/2026 (section 2). Il reste :

1. **Modèle de facturation des notifications** : reporté volontairement. À reprendre quand on aura les grilles WhatsApp et SMS et les premiers volumes réels (journal d'envoi de la phase 2).
2. **Deuxième pays** : à décider au premier transitaire partenaire hors Côte d'Ivoire. Il déclenchera la traduction (si pays anglophone), l'enregistrement du Sender ID SMS et la checklist de conformité de ce pays.

## 10. Feuille de route

Effort : S = quelques jours, M = 1 à 3 semaines, L = plus d'un mois. Les phases 2 et 3 peuvent avancer en parallèle une fois la phase 1 posée.

| Phase | Contenu | Effort | Critère de fin |
|---|---|---|---|
| **0. Mise en production** | Hébergement sur **OVHcloud** (API, web, Postgres managé ou sur l'instance), domaine et HTTPS, sauvegardes automatiques, supervision, CI sur GitHub (tests unitaires et e2e à chaque push) | M | Un transitaire pilote utilise la plateforme en ligne pendant 2 semaines sans incident bloquant |
| **1. Fondations multi-pays** | Téléphone E.164 par pays ; `paysCode`, devise, fuseau et langue sur le tenant et le client ; statut `ARRIVE_DESTINATION` ; référentiel ports et aéroports ; structure i18n en place, avec le **français seul** tant qu'aucun pays anglophone n'est ouvert | M | Un transitaire fictif d'un autre pays francophone (par exemple Sénégal, +221, XOF) passe toute la suite e2e et le parcours démo, sans régression en Côte d'Ivoire |
| **2. Notifications** | Outbox et worker ; consentement et préférences du client ; WhatsApp sur un numéro unique de la plateforme (modèles approuvés) ; repli SMS (fournisseur couvrant la Côte d'Ivoire) ; coût enregistré par envoi et par tenant ; regroupement par lot ; fenêtre silencieuse ; délai d'annulation ; journal et écran « Notifications » pour le transitaire | L | Une mise à jour de lot de 500 colis notifie chaque client une seule fois en moins de 10 minutes (hypothèse de cible), avec un taux d'échec suivi |
| **3. Application client (PWA)** | Manifest, service worker, installation depuis « Mes colis », cache hors ligne, Web Push | M | Installation depuis un Android d'entrée de gamme en 3G, push reçu au checkpoint suivant |
| **4. Suivi automatique des lots** | Intégration du finaliste ShipsGo ou Vizion, après le test des 10 à 20 vraies références prévu dans `etude-suivi-automatique.md` | M | Les départs et arrivées d'un lot réel se mettent à jour sans saisie |
| **5. Annuaire des transitaires** | Selon `cadrage-annuaire-transitaires.md`, en généralisant les référentiels (villes de départ, zones de retrait) à plusieurs pays | L | Annuaire ouvert en Côte d'Ivoire, avec au moins N fiches vérifiées (N à fixer) |
| **6. App native (optionnelle)** | Expo / React Native, marque blanche éventuelle | L | Décision prise sur la base des taux d'installation de la PWA |

### Prochaines actions concrètes

1. **Hébergement (phase 0)** : chiffrer une configuration OVHcloud (VPS ou Public Cloud, Postgres managé ou non, sauvegardes) et la comparer à une ou deux offres équivalentes, sur le prix, la latence depuis Abidjan et la simplicité d'exploitation. On garde OVHcloud sauf écart net.
2. **Grilles tarifaires** : demander les prix WhatsApp (Meta ou un BSP) et SMS (2 ou 3 agrégateurs) pour la **Côte d'Ivoire**. Elles serviront plus tard à décider qui paie les notifications.
3. **Lancer la phase 0, puis la phase 1.** Les fondations multi-pays touchent le schéma et l'API publique : mieux vaut les faire **avant** d'avoir beaucoup de données en production.
