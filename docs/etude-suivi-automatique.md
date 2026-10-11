# Étude : suivi automatique des lots

> Volet technique : COLIS-BACKEND. Volet tarifs et modèle économique : COLIS-PRODUIT. Rien n'est intégré pour l'instant.

## Partie 1 : volet technique

# Étude technique : suivi automatique des lots Chine → Abidjan

*Rédigée le 11/10/2026. Les tarifs ne sont pas traités ici (un collègue les couvre). Chaque affirmation factuelle renvoie à une source. Quand une information n'a pas été trouvée, elle est marquée « non documenté publiquement ». Les colonnes « mapping » et « effort » sont des propositions de conception (S = quelques jours, M = 1 à 3 semaines, L = plus d'un mois ou contractualisation lourde).*

## 0. Contexte et contraintes internes

- Un **Lot** = un conteneur maritime (référence : n° ISO 6346, B/L ou booking) ou un envoi aérien (LTA/AWB).
- `StatutCheckpoint` : `RECU_ENTREPOT_CHINE`, `CHARGE_DANS_LOT`, `PARTI_DE_CHINE`, `ARRIVE_ABIDJAN`, `EN_DEDOUANEMENT`, `DISPONIBLE_AU_RETRAIT`, `REMIS_AU_CLIENT`, `EXCEPTION` (+ commentaire).
- Un checkpoint vise `lotId` et `siteId`, avec une date qui ne peut pas être dans le futur. Les événements « planifiés » ou « estimés » (ETA) ne deviennent donc **jamais** des checkpoints.
- Remarque : `RECU_ENTREPOT_CHINE` et `CHARGE_DANS_LOT` (empotage/consolidation chez le transitaire) précèdent la prise en charge par le transporteur. Aucune source externe ne les fournit de façon fiable : ils restent **manuels**. De même, `EN_DEDOUANEMENT`, `DISPONIBLE_AU_RETRAIT` et `REMIS_AU_CLIENT` dépendent surtout du transitaire à Abidjan.

## 1. Le standard DCSA Track & Trace (référence commune)

- Le DCSA publie un standard Track & Trace (spécifications sur SwaggerHub/GitHub). La version 2.2 ajoute une **Subscription Callback API** (push) avec en-têtes `Subscription-ID` et `Notification-Signature`. Les membres du DCSA sont notamment MSC, Maersk, CMA CGM, Hapag-Lloyd, ONE, Evergreen, Yang Ming, HMM et ZIM. — https://dcsa.org/newsroom/dcsa-releases-track-trace-interface-standard-version-2-2
- Le polling se fait via `GET /v2/events`, le push via `/v2/event-subscriptions`. — https://www.postman.com/joloffit/goflux/documentation/m1je11a/dcsa-openapi-specification-for-track-trace
- Types d'événements : `TRANSPORT` (`ARRI`, `DEPA`) — https://models.dcsa.org/2024Q4/EARoot/EA5/EA2/EA6/EA7/EA1/EA1/EA2640.htm ; `EQUIPMENT` (`LOAD`, `DISC`, `GTIN`, `GTOT`, `STUF`, `STRP`, `PICK`, `DROP`, `INSP`, `RSEA`, `RMVD`) ; `SHIPMENT`. Les événements sont classés `ACT` (réel), `PLN` (planifié) ou `EST` (estimé). — https://docs.vizionapi.com/docs/dcsa-milestones
- Le rôle du lieu (`POL`, `POD`, `RTP` = port de transbordement) permet de distinguer origine, transbordement et destination. — https://docs.vizionapi.com/docs/dcsa-milestones

### Mapping DCSA → statut interne (proposition, uniquement pour les événements `ACT`)

| Événement DCSA | Lieu | Statut interne |
|---|---|---|
| GTOT empty (conteneur vide sorti vers l'entrepôt) | origine | ignoré |
| STUF (empotage) | origine | `CHARGE_DANS_LOT` (si le transitaire ne l'a pas déjà saisi) |
| GTIN laden (Gate in) | POL Chine | ignoré (ou information) |
| LOAD (Loaded) | POL Chine | ignoré (précurseur du départ) |
| DEPA (Vessel departure) | POL Chine | `PARTI_DE_CHINE` |
| ARRI / DISC / LOAD / DEPA | RTP (transbordement) | ignoré (stocké en brut et affiché comme info) |
| ARRI (Arrival) | POD CIABJ | `ARRIVE_ABIDJAN` |
| DISC (Discharge) | POD CIABJ | `ARRIVE_ABIDJAN` (si ARRI est absent) |
| INSP (inspection) | POD | `EN_DEDOUANEMENT` (à valider) |
| GTOT laden (Gate out) | POD CIABJ | ignoré par défaut (sortie du port ≠ retrait client ; pourrait signaler la fin du dédouanement) |
| GTIN empty (retour du vide) | destination | ignoré |
| Événements PLN/EST | — | ignoré (dates futures) |

## 2. API directes des armateurs

### 2.1 MSC
- **Accès** : MSC Developer Portal et catalogue d'API. Identifiants UAT/production fournis seulement après onboarding. Standards supportés : DCSA, UN/EDIFACT, ANSI X12, SMDG, BIC. — https://www.msc.com/en/solutions/digital-solutions/direct-integrations ; https://developerportal.msc.com/api-catalogue
- **Format** : DCSA 2.2 (Equipment, Transport, Shipment), au niveau conteneur. Il existe aussi une **souscription via une file Azure Service Bus** (pas un webhook HTTP), qui reçoit les mêmes événements que l'API TnT, dont Vessel Arrival/Departure et l'ETA recalculée chaque jour. — https://developerportal.msc.com/content/TnT_Subscription_Customer_Onboarding.pdf
- **Fréquence** : les événements sont poussés « dès qu'ils sont disponibles auprès des agences ». L'ETA est recalculée quotidiennement. — même source.
- **Couverture Chine → Abidjan** : la liste des lignes et ports desservis n'est pas couverte par cette étude via l'API. Couverture spécifique par lane : non documenté publiquement dans les sources consultées.
- **Effort** : **M** (onboarding, file Azure Service Bus en plus d'un consumer DCSA). Ne couvre que les conteneurs MSC.

### 2.2 Maersk
- **Format** : API Track & Trace par numéro de conteneur, B/L ou booking, flux d'événements TRANSPORT/EQUIPMENT/SHIPMENT (OpenAPI non officielle republiée). — https://raw.githubusercontent.com/api-evangelist/maersk-line/refs/heads/main/openapi/maersk-line-tracking-api-openapi.yml
- **Webhooks** : le portail Maersk documente des webhooks (`shipment.status`, `shipment.documents`, `shipment.dimensions`), avec signature HMAC-SHA256 `X-Maersk-Signature-256` et jusqu'à 5 tentatives de renvoi. Cette page relève de « Maersk delivers » (logistique terrestre) : l'applicabilité au suivi maritime DCSA est à vérifier. — https://delivers.maersk.com/developer/apis/webhook/
- **Fréquence** : non documenté publiquement.
- **Couverture Chine → Abidjan** : non documenté publiquement (dans les sources consultées).
- **Effort** : **M** par armateur.

### 2.3 CMA CGM
- **Format** : API « operation.trackandtrace.v1 » conforme **DCSA 2.2.0**. Accès public par clé API (mouvements d'équipement standard, transbordements, dates planifiées) et accès privé OAuth2 (événements privés si l'on est partie au booking). « La gestion des souscriptions n'est pas encore couverte » : polling sur `GET /events`. — https://api-portal.cma-cgm.com/products/api/operation.trackandtrace.v1
- Le guide d'usage décrit pourtant une « CMA CGM event solution » en webhook, avec politique de retry (âge maximal par défaut : 24 h). — https://api-portal.cma-cgm.com/usage-guide
- Essai gratuit de 30 jours sur les API publiques, puis contrat. — https://api-portal.cma-cgm.com/starting-guide
- **Fréquence** : non documenté publiquement. **Couverture lane** : non documenté publiquement.
- **Effort** : **M**.

**Synthèse armateurs** : les données sont de première main, au format DCSA. Mais il faut **N intégrations et N contrats**. Les colis groupés passent souvent par des armateurs variés (COSCO, OOCL, etc.) que l'on ne couvre pas tous. Un transitaire passe aussi parfois par un NVOCC (B/L house) que l'API armateur ne reconnaît pas. Effort cumulé : **L**.

## 3. Agrégateurs maritimes

| Option | Couverture | Références acceptées | Événements / format | Push | Fréquence | Effort |
|---|---|---|---|---|---|---|
| **ShipsGo** | 160+ armateurs — https://shipsgo.com/ocean/container-tracking-api | Conteneur, MBL, booking (même source) | Jalons propriétaires : Booked, Loaded, Sailing, Arrived, Discharged, Not Released, Gate out ; port de transbordement ; coordonnées (même source) | Webhook (même source) | « au moins deux fois par jour » ; 100 req/min (même source) | **S** |
| **Vizion** | Annonce 98 % des expéditions maritimes mondiales — https://docs.vizionapi.com/docs/supported-carriers | Conteneur, B/L, booking + SCAC — https://docs.vizionapi.com/docs/input-options | **Codes DCSA** (event_type, event_classifier, rôle POL/POD/RTP) — https://docs.vizionapi.com/docs/dcsa-milestones | Webhook (`callback_url`) — https://docs.vizionapi.com/reference/webhooks | 12 h par défaut, 6/3/2 h sur demande, « Smart Updates » — https://support.vizionapi.com/migration/how-often-will-i-receive-updates | **S–M** |
| **Terminal49** | Voir détail ci-dessous | B/L, booking, conteneur — https://terminal49.com/docs/coverage/home | Événements propriétaires `container.transport.*` — https://terminal49.com/docs/api-docs/webhooks/event-catalog | Webhook (même source) | non documenté publiquement | **S** |
| **SeaRates** | Liste des lignes via endpoint — https://docs.searates.com/reference/tracking/shipping-lines-info | Conteneur (CT), B/L (BL), booking (BK) ; options `force_update`, `ais` — https://docs.searates.com/reference/tracking/tracking-by-container | Format propriétaire (détail des codes non vérifié) | Webhook annoncé commercialement — https://www.searates.com/integrations/api-container-tracking/ ; la doc publique documente les webhooks surtout pour l'API Booking | non documenté publiquement | **M** (polling probable) |
| **Portcast** | 220+ armateurs/NVOCC — https://www.portcast.io/container-tracking-api | Booking, B/L, conteneur (même source) | non documenté publiquement | non documenté publiquement | non documenté publiquement | **M** |
| **project44** | Sources : EDI/API des armateurs, AIS, ports — https://developers.project44.com/guides/shippers/visibility/ocean/p2p/overview | idem | Propriétaire | Webhook — https://developers.project44.com/guides/shippers/visibility/ocean/webhooks | non documenté publiquement | **L** (plateforme entreprise) |
| **GoComet** | Annonce 98 % des armateurs (page marketing) — https://www.gocomet.com/gocomet-vs-p44 | non documenté publiquement | non documenté publiquement | Webhooks/API annoncés (même source) | non documenté publiquement | **M** |

### Terminal49 hors Amérique du Nord (vérification demandée)
- Terminal49 déclare cartographier **tous** les ports des itinéraires (origine, transbordement, destination) par UN/LOCODE, et attribuer partout les événements remontés par l'armateur (chargé, parti, arrivé, déchargé, transbordement). — https://terminal49.com/docs/coverage/terminals
- Il y a **138 intégrations terminal directes** (holds, LFD, disponibilité). — https://terminal49.com/docs/coverage/home. La découverte du terminal de destination était auparavant limitée aux POD US/CA/MX. Elle a été étendue à l'international. — https://terminal49.com/docs/updates/home
- Vérification de la table publique (le 11/10/2026) : **aucun terminal en Chine continentale ni à Abidjan (CIABJ)**, aucun en Afrique de l'Ouest. Les seules intégrations africaines sont à Port-Saïd (EGPSD). Hong Kong (HKHKG) est intégré. — https://terminal49.com/docs/coverage/terminals
- MSC (MSCU), Maersk (MAEU), CMA CGM (CMDU), COSCO (COSU), OOCL (OOLU) et Hapag (HLCU) figurent parmi les armateurs. — https://terminal49.com/docs/coverage/ocean-carriers
- Conclusion : sur Chine → Abidjan, Terminal49 apporte **seulement les jalons armateur**, sans données terminal (disponibilité, holds). Son avantage différenciant (données terminal et rail nord-américaines) ne sert pas ici.

### Mapping ShipsGo / Terminal49 → statut interne (proposition)

| Événement typique | ShipsGo | Terminal49 | Statut interne |
|---|---|---|---|
| Gate in (POL) | — | `full_in` | ignoré |
| Loaded (POL) | Loaded | `vessel_loaded` | ignoré |
| Vessel departure (POL) | Sailing | `vessel_departed` | `PARTI_DE_CHINE` |
| Transshipment (arr./décharg./charg./dép.) | TS port details | `transshipment_arrived/discharged/loaded/departed` | ignoré (info) |
| Arrival (POD Abidjan) | Arrived | `vessel_arrived` / `vessel_berthed` | `ARRIVE_ABIDJAN` |
| Discharge (POD) | Discharged | `vessel_discharged` | `ARRIVE_ABIDJAN` (si absent) |
| Not released | Not Released | — | ignoré (éventuellement `EN_DEDOUANEMENT`, à valider avec un transitaire) |
| Gate out (POD) | Gate out | `full_out` | ignoré par défaut / option `DISPONIBLE_AU_RETRAIT` désactivée |
| Changement d'ETA | — | `estimated.*` | ignoré (mise à jour de l'ETA du lot, sans checkpoint) |

(Sources des noms d'événements : https://shipsgo.com/ocean/container-tracking-api ; https://terminal49.com/docs/api-docs/webhooks/event-catalog.)

## 4. AIS (position du navire)

| Option | Source / couverture | Accès | Effort |
|---|---|---|---|
| **MarineTraffic / Kpler AIS** | Sources TER, SAT et ROAM — https://servicedocs.marinetraffic.com/tag/AIS-API/ ; terrestre + roaming + satellite, latence satellite < 1 min annoncée — https://www.kpler.com/product/maritime/kplerais | API REST (polling) | **M** |
| **VesselFinder** | AIS satellite via `sat=1` (rendu seulement si plus récent que le terrestre), recherche par IMO — https://api.vesselfinder.com/docs/vessels.html | REST (polling) | **S** |
| **aisstream.io** | Gratuit, WebSocket `wss://stream.aisstream.io/v0/stream`, abonnement par bounding box — https://aisstream.io/documentation ; réseau terrestre de bénévoles, sans satellite — https://aisstream.io/coverage | WebSocket (push) | **S** (mais couverture en haute mer et en Afrique incertaine) |

- **Format** : messages AIS (position, MMSI/IMO), **pas d'événements conteneur**. Il n'y a aucun code DCSA ou EDIFACT.
- **Mapping** : l'AIS ne donne ni le chargement d'un conteneur précis ni sa sortie du port. Il peut seulement **corroborer** `PARTI_DE_CHINE`/`ARRIVE_ABIDJAN` (navire entrant dans une zone géographique autour de CIABJ). Proposition : usage pour l'affichage carte et l'ETA, **jamais** pour créer seul un checkpoint. Plusieurs agrégateurs fournissent déjà la position (ShipsGo : https://shipsgo.com/ocean/container-tracking-api ; SeaRates option `ais` : https://docs.searates.com/reference/tracking/tracking-by-container ; Terminal49 : https://terminal49.com/docs/coverage/home). Une intégration AIS dédiée n'est donc **pas nécessaire au MVP**.

## 5. Suivi aérien (LTA/AWB)

| Option | Couverture / ABJ | Format | Push | Fréquence | Effort |
|---|---|---|---|---|---|
| **Vizion Air** | 22 compagnies + 7 transitaires, dont AFKL (057/074), Emirates SkyCargo (176), Turkish (235), Saudia, Etihad. **Ethiopian (071) absent de la liste** — https://docs.vizionapi.com/docs/air-tracking | Codes canoniques de type Cargo-IMP/FSU : BKD, RCS, FOH, MAN, DEP, TFD, RCF, ARR, NFD, AWD, CCD, DLV, DIS… (même source) | Webhook signé HMAC-SHA256, `shipment.status_changed` etc. (même source) | « au moins toutes les heures » (même source) | **S** |
| **ShipsGo Air** | Suivi par AWB à 11 chiffres ; liste des compagnies non vérifiée pour ABJ — https://shipsgo.com/air/cargo-tracking-api | Propriétaire | Webhook (même source) | non documenté publiquement | **S** (même compte que le maritime) |
| **track-trace.com** | 236 compagnies, routage par préfixe AWB — https://www.track-trace.com/aircargo/help | Widget « Connect » pour l'intégration web — https://connect.track-trace.com/intro ; API JSON publique : non documenté publiquement | non | non documenté publiquement | inadapté à une ingestion automatique |
| **IATA ONE Record** | Standard. Les jalons FSU/XFSU sont mappés en `StatusUpdateEvent` (RCS, DEP, ARR, NFD, DLV…) — https://iata-cargo.github.io/ONE-Record/2026-07/Orchestration/xfsu/ ; filtre `GET /logistics-events?event-code=` — https://iata-cargo.github.io/ONE-Record/2025-07/API-Security/logistics-events/ | JSON-LD, abonnements/notifications | — | — | **L** (adoption par les compagnies desservant ABJ : non documenté publiquement) |
| **Air France KLM Cargo** | API Cargo Tracking (historique AWB, segments) pour clients — https://klm.mashery.com/apis/cargo_api | Propriétaire | non documenté publiquement | non documenté publiquement | **M** |
| **Emirates SkyCargo** | API « Host-to-Host » (booking, track & trace) sur demande à SkyCargoAPISupport@emirates.com ; pas de documentation publique — https://apis.io/apis/emirates-skycargo/emirates-skycargo-host-to-host-api/ | non documenté publiquement | non documenté publiquement | non documenté publiquement | **M–L** |
| **Ethiopian Cargo** | Suivi web uniquement ; API publique : non documenté publiquement — https://ethiopiancargo.azurewebsites.net/customer-care/help/faqs | — | — | — | — |

Le fait que ces compagnies desservent ABJ vient de l'énoncé : non vérifié ici.

### Mapping aérien (codes FSU) → statut interne (proposition)

| Code | Signification (source Vizion) | Statut interne |
|---|---|---|
| BKD | Réservé | ignoré |
| RCS / FOH | Reçu de l'expéditeur / fret en main (CAN) | ignoré (`CHARGE_DANS_LOT` reste manuel) |
| MAN / PRE | Manifesté / préparé | ignoré |
| DEP (origine Chine) | Départ | `PARTI_DE_CHINE` |
| ARR / RCF / DEP en escale (ADD, DXB, CDG, IST…) | Transit | ignoré (transbordement) |
| TFD / RCT | Transfert vers / depuis une autre compagnie | ignoré |
| ARR / RCF à ABJ | Arrivé | `ARRIVE_ABIDJAN` |
| NFD / AWD | Destinataire notifié / documents remis | ignoré par défaut (option `EN_DEDOUANEMENT`) |
| TGC | Sous contrôle douanier | `EN_DEDOUANEMENT` |
| CCD | Dédouané | ignoré (pas de statut dédié) |
| DLV | Livré au destinataire (= le transitaire) | ignoré : le transitaire est le destinataire, ce n'est pas `REMIS_AU_CLIENT` |
| DIS / RFF | Anomalie / retiré du vol | `EXCEPTION` (commentaire = libellé brut) |

(Codes : https://docs.vizionapi.com/docs/air-tracking)

## 6. Architecture proposée (sans implémentation)

**Modèle.** Ajouter sur `Lot` les champs `referenceSuivi` (string) et `typeReference` (enum `CONTENEUR_ISO6346 | BL | BOOKING | AWB`), plus `transporteurCode` optionnel (SCAC ou préfixe IATA), `suiviActif` et `fournisseurSuivi`. Valider le chiffre de contrôle ISO 6346 et le format AWB 3+8 à la saisie. Créer une table `AbonnementSuivi` (lotId, fournisseur, idExterne, statut, dernierSync) et une table **`EvenementBrut`** (fournisseur, idExterne ou hash, payload JSONB, codeEvenement, classifieur ACT/PLN/EST, unLocode, dateEvenement, reçuLe, traitéLe, checkpointId nullable). On garde tout le brut pour l'audit, le rejeu d'un mapping corrigé et l'affichage « détails transporteur » (y compris transbordements et ETA).

**Ingestion.** À la création ou mise à jour de la référence, un service NestJS crée l'abonnement chez le fournisseur. Un contrôleur `POST /webhooks/suivi/:fournisseur` vérifie la signature HMAC, stocke le payload, répond 2xx immédiatement et traite en asynchrone (queue BullMQ ou job Postgres). Un cron de rattrapage interroge en polling les abonnements muets depuis plus de 24 h. **Idempotence** : contrainte unique `(fournisseur, idEvenementExterne)`. À défaut d'identifiant externe, un hash `(lotId, code, unLocode, dateEvenement)`, avec `INSERT … ON CONFLICT DO NOTHING`. Les corrections (les événements DCSA peuvent être modifiés ou supprimés, cf. le document MSC) mettent à jour le brut, sans dupliquer le checkpoint.

**Règle de progression.** Le mapping convertit un événement `ACT` en statut candidat. On ne crée un checkpoint que si le statut candidat est **strictement supérieur** au statut courant du lot dans l'ordre de l'enum (EXCEPTION mise à part), et si `dateEvenement <= now()`. Les événements PLN/EST et ceux à date future sont rejetés comme checkpoints et servent seulement à mettre à jour l'ETA. **Transbordement** : on ne retient que les événements dont le rôle est POL (et UN/LOCODE en Chine, `CN*`) pour `PARTI_DE_CHINE`, et POD = `CIABJ` (ou ABJ en IATA) pour `ARRIVE_ABIDJAN`. Les événements RTP (Port Kelang, Lomé, Tanger Med, Algésiras…) ou en escale aérienne restent dans `EvenementBrut`. Le premier `DEPA` en Chine fait foi, même s'il y a d'autres départs en transbordement.

**Sites.** Ajouter `unLocode` (et `codeIata` pour les aéroports) sur `Site`, avec unicité `(tenantId, unLocode)`. Lors du mapping, chercher le site du tenant par code (ex. CNNSA Nansha, CNSHA Shanghai, CNNGB Ningbo, CNYTN Yantian, CIABJ, CAN/ABJ). S'il manque, le créer automatiquement en le marquant `creeAutomatiquement=true` pour revue, ou le rattacher à un site générique par pays. Terminal49 et Vizion fournissent déjà l'UN/LOCODE (https://terminal49.com/docs/coverage/terminals ; https://docs.vizionapi.com/docs/dcsa-milestones).

**Priorité du manuel.** Un checkpoint saisi par un utilisateur (`source=MANUEL`) n'est jamais modifié ni supprimé par l'automate. Si un checkpoint manuel existe déjà pour un statut égal ou supérieur, l'événement automatique est seulement archivé. Un utilisateur peut supprimer ou corriger un checkpoint automatique (`source=AUTO`, avec lien vers `EvenementBrut`). `EXCEPTION` automatique ne vient que de codes explicites (DIS, RFF, holds) avec le libellé brut en commentaire. Les statuts aval (`EN_DEDOUANEMENT`, `DISPONIBLE_AU_RETRAIT`, `REMIS_AU_CLIENT`) restent principalement manuels.

**Recommandation MVP.** Je recommande un **agrégateur unique, au format DCSA, avec webhooks, couvrant maritime et aérien** : **Vizion**. Raisons : codes DCSA standard et rôles POL/POD/RTP qui simplifient le mapping et le transbordement ; webhooks ; module aérien qui couvre AFKL, Emirates et Turkish, avec des codes FSU proches d'ONE Record. **ShipsGo** est l'alternative la plus simple (effort S, maritime et aérien, webhooks), mais avec des jalons propriétaires et une fréquence d'au moins deux fois par jour. Terminal49 n'apporte pas d'avantage spécifique sur Chine → Abidjan (aucun terminal intégré en Chine continentale ni à Abidjan). Les API armateurs (L cumulé) et ONE Record sont à garder pour plus tard, derrière la même interface `FournisseurSuivi`. L'AIS dédié n'est pas utile au MVP. Point à valider avant de s'engager : tester 10 à 20 vraies références de transitaires (dont des LTA Ethiopian, absent de la liste Vizion), pour mesurer la couverture réelle de la lane.


---

## Partie 2 : tarifs et modèle économique

# Étude suivi automatique des lots : tarifs et modèle économique (volet PRODUIT)

> Relevé le 11/10/2026 par COLIS-PRODUIT. Seuls les prix **publiés** sont chiffrés ; tout le reste est marqué « sur devis ». À fusionner avec le volet technique de COLIS-BACKEND dans `etude-suivi-automatique.md`.

## 1. Tarifs relevés

| Fournisseur | Modèle | Prix publié | Ce qui n'est pas publié | Source |
|---|---|---|---|---|
| **ShipsGo** (agrégateur, maritime + aérien) | Crédits prépayés, 1 crédit par nouveau suivi | **1 000 USD les 500 crédits, soit 2 USD par suivi**. Un suivi par B/L ou booking = 1 crédit, quel que soit le nombre de conteneurs. Crédits valables 1 an. 3 crédits offerts à l'essai. | **Frais annuels d'usage de l'API, sur devis.** Remises de volume sur devis. | [shipsgo.com/pricing](https://shipsgo.com/pricing), [aide ShipsGo MBL](https://help.shipsgo.com/article/35-credit-usage-for-mbl-tracking) |
| **SeaRates** (agrégateur) | Abonnement mensuel | Accès **web uniquement** : 29 USD/mois jusqu'à 10 expéditions, 99 USD jusqu'à 50, 279 USD jusqu'à 150 (−15 % à l'année). | **API : sur devis** (dépend du volume, de la fréquence de rafraîchissement, du type d'identifiant). Les plans web ne s'appliquent pas à l'API. | [searates.com/ir/pricing/tracking-system](https://www.searates.com/ir/pricing/tracking-system), [aide SeaRates](https://www.searates.com/help/tools/tracking-system/how-the-tracking-system-pricing-is-formed) |
| **Terminal49** (agrégateur, orienté États-Unis) | Paliers | Gratuit jusqu'à 10 conteneurs actifs. | Lite, Essential (seul palier avec API) et Complete : **sur devis**. | [terminal49.com/pricing](https://www.terminal49.com/pricing) |
| **Maersk** (armateur en direct) | Portail développeur en libre-service | FAQ : « certaines API sont gratuites, d'autres soumises à un plan payant » ; la version française dit « gratuites ». Track & Trace au standard DCSA. | Prix exact par API à lire dans le catalogue après inscription. Ne couvre que les conteneurs Maersk. | [FAQ Maersk](https://www.maersk.com/support/faqs/do-i-need-to-pay-to-use-your-api), [portail Maersk](https://www.maersk.com/digital-services/data-integrations/api) |
| **MSC** (armateur en direct) | Accès sur demande | Aucun prix publié. | Accès et conditions sur formulaire. | [developerportal.msc.com](https://developerportal.msc.com/) |
| **CMA CGM, Vizion, AIS, suivi LTA aérien** | — | **Non relevé** à ce stade : aucun prix public trouvé. | À demander. | — |

## 2. Coût par conteneur pour un transitaire type

Seule base chiffrable aujourd'hui : **ShipsGo, 2 USD par suivi** (prix public, hors frais annuels d'API sur devis).

- Un lot = un B/L ou un conteneur = **1 crédit = 2 USD**, une seule fois pour tout le trajet (les consultations suivantes sont gratuites).
- Rapporté au colis : un conteneur de groupage contient de l'ordre de 200 à 2 000 colis par mois selon le cadrage (**estimation à vérifier**). Le coût par colis est donc de l'ordre du centime d'USD : négligeable.
- Exemple de calcul (volume **hypothétique**, à remplacer par les entretiens) : un transitaire qui expédie 8 conteneurs et 10 LTA par mois consommerait 18 crédits, soit 36 USD/mois, plus les frais d'API annuels inconnus.

**Inconnue principale : les frais annuels d'API de ShipsGo et les tarifs API de SeaRates.** Tant qu'on n'a pas les devis, le coût fixe de la fonctionnalité n'est pas connu.

## 3. Recommandation de modèle économique

1. **Inclure le suivi automatique dans l'abonnement payant, avec un quota de lots par mois** (par exemple « jusqu'à N lots suivis automatiquement »), plutôt qu'une option à part. Le coût variable (environ 2 USD par lot) est faible par rapport au temps gagné, et c'est un argument de vente fort face à WhatsApp : « vos lots se mettent à jour tout seuls ».
2. **Au-delà du quota, facturer les lots supplémentaires** à un prix qui couvre le crédit et une marge.
3. **Garder la saisie manuelle par défaut** dans l'offre d'entrée : le suivi automatique ne remplace que les étapes armateur (départ, transbordement, arrivée au port), pas la réception en entrepôt, le dédouanement ni la remise, qui restent saisies par le transitaire.
4. **Avant de fixer le prix :** demander les devis API de ShipsGo et SeaRates pour notre volume, vérifier la couverture réelle des lignes Chine–Abidjan (volet BACKEND), et valider le volume de lots par transitaire lors des entretiens terrain.
