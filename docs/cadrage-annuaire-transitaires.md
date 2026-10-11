# Cadrage : annuaire et comparateur de transitaires (type « Booking »)

> Rédigé le 11/10/2026 par COLIS-PRODUIT, à la demande du user. Aucun code. Les chiffres de marché restent ceux du cadrage principal, et tout ce qui n'est pas sourcé est marqué « hypothèse ».

## 1. L'idée en une phrase

Un acheteur qui veut faire venir de la marchandise de Chine trouve, compare et choisit un transitaire sur la plateforme, puis suit son colis au même endroit. Le transitaire, lui, gagne des clients en plus de gagner du temps.

## 2. Impact sur le positionnement

| | Cadrage actuel | Avec l'annuaire |
|---|---|---|
| Promesse | Outil SaaS de suivi pour le transitaire : moins de relances WhatsApp | Outil de suivi **et** canal d'acquisition de clients |
| Client payeur | Le transitaire, pour gagner du temps | Le transitaire, pour gagner du temps **et des clients** |
| Rôle de l'acheteur | Il consulte un suivi qu'on lui envoie | Il arrive sur la plateforme **avant** d'avoir un transitaire |
| Concurrence | WhatsApp, Excel | En plus : groupes Facebook/WhatsApp de recommandation, bouche-à-oreille |
| Risque nouveau | Faible : on outille des transitaires déjà choisis | **Confiance** : on recommande des tiers qui manipulent l'argent et la marchandise des acheteurs |

**Effet clé : la boucle de croissance.** Chaque colis suivi fait passer un acheteur sur la plateforme. S'il voit l'annuaire à ce moment-là, il pourra choisir un autre transitaire la fois suivante. C'est un levier fort, mais ça crée aussi une tension : **un transitaire n'acceptera pas d'outil qui montre ses concurrents à ses propres clients.** D'où la règle produit ci-dessous.

**Règle produit : pas de concurrents sur l'espace d'un transitaire.** La page `/suivi/<code>`, l'écran « Mes colis » et le lien d'accès n'affichent **jamais** l'annuaire ni un autre transitaire. L'annuaire vit sur une partie séparée du site (accueil public, `/transitaires`).

## 3. Parcours acheteur

1. **Recherche** sur `/transitaires` : mode (maritime ou aérien), ville de départ en Chine (Guangzhou, Yiwu, Shenzhen…), zone de retrait en CI (Adjamé, Treichville, Bouaké…), type de marchandise.
2. **Liste comparée** : nom et badge « Vérifié », délai indicatif par mode, tarif indicatif au kg (aérien) ou au CBM (maritime), note moyenne et nombre d'avis, zones de retrait, prochain départ si renseigné.
3. **Fiche transitaire** : présentation, adresses des entrepôts en Chine et en CI, tarifs indicatifs, fréquence des départs, avis, ancienneté sur la plateforme et **statistiques réelles issues du suivi** (par exemple le délai moyen constaté sur ses lots).
4. **Contact** : « Contacter sur WhatsApp » au MVP. En P1, une **demande de prise en charge** : l'acheteur décrit son envoi et le transitaire répond dans son back-office.
5. **Après livraison** : invitation à laisser un avis, **uniquement depuis un colis réellement remis** par ce transitaire.

## 4. Parcours transitaire

1. **Inscription** : nom commercial, téléphone, ville, modes proposés. Il crée son compte (tenant) comme aujourd'hui.
2. **Fiche publique** à compléter dans le back-office : présentation, entrepôts, zones de retrait, lignes, tarifs indicatifs, délais, photos.
3. **Vérification** avant publication (voir section 6). Tant qu'elle n'est pas faite, la fiche est en brouillon, invisible dans l'annuaire, mais l'outil de suivi fonctionne normalement.
4. **Réception des demandes** : notification puis réponse (P1).
5. **Statistiques de fiche** : vues, clics WhatsApp, demandes reçues.

## 5. Modèle économique

| Option | Principe | Pour | Contre | Recommandation |
|---|---|---|---|---|
| **Abonnement** (déjà prévu) | Le transitaire paie l'outil de suivi | Revenu récurrent, aligné avec le cadrage | N'exploite pas la valeur de l'acquisition | **Socle**, la fiche annuaire est incluse |
| **Mise en avant** | Le transitaire paie pour remonter dans les résultats d'une ligne ou d'une zone | Simple, sans dépendre des transactions | Peut dégrader la confiance si ce n'est pas signalé | **P1**, toujours étiqueté « Sponsorisé » |
| **Commission** | Pourcentage sur chaque envoi conclu via la plateforme | Aligné sur la valeur, c'est le modèle de Booking | Exige que la transaction passe par nous (paiement, devis). Le contournement par WhatsApp est très facile | **Pas avant P2** |
| **Frais par contact qualifié** | Le transitaire paie par demande reçue | Mesurable | Contestations (« demande non sérieuse ») | À étudier en P1 si les demandes décollent |

**Recommandation :** l'annuaire est gratuit pour l'acheteur, la fiche est incluse dans l'abonnement du transitaire, puis la mise en avant payante arrive en P1. La commission attend d'avoir un paiement ou un devis intégré, sinon elle sera contournée. **Aucun prix n'est fixé ici** : il faudra le valider pendant les entretiens transitaires.

## 6. Confiance : le vrai risque

**Faux transitaires et arnaques.** L'arnaque à l'avance de frais de transport est un risque réel dans ce métier, d'où un badge « Vérifié » attribué seulement après :
- une pièce d'entreprise (RCCM, compte contribuable) et une pièce d'identité du gérant ;
- un téléphone vérifié par code ;
- une adresse physique en CI, vérifiée par photo ou visite au début ;
- pour P1 : une activité réelle sur la plateforme (un nombre minimal de lots suivis) avant d'apparaître dans les résultats.

**Faux avis.**
- Un avis n'est possible **que depuis un colis marqué « Remis au client »** par ce transitaire, avec un seul avis par colis.
- Le transitaire peut répondre, mais pas supprimer. Un signalement est examiné par nous.
- On affiche le nombre d'avis à côté de la note, et l'ancienneté.
- **Limite connue :** un transitaire pourrait créer de faux clients et de faux colis pour s'auto-évaluer. Parades : contrôles de cohérence (même téléphone, colis jamais liés à un lot), et des statistiques de suivi réelles qui pèsent plus que les étoiles.

**Responsabilité.** Les CGU doivent préciser que la plateforme met en relation sans être transitaire, et que les tarifs sont indicatifs. Une validation juridique est **à faire** avant le lancement public.

**Données.** Les avis affichent un prénom et une initiale, jamais un téléphone.

## 7. Périmètre

**MVP de l'annuaire, après le MVP suivi actuel :**
- fiche publique du transitaire (édition dans le back-office, publication après vérification manuelle par nous) ;
- page `/transitaires` avec des filtres simples (mode, ville de départ, zone de retrait) et une fiche détail ;
- tarifs et délais **déclaratifs**, affichés comme « indicatifs » ;
- contact par WhatsApp ;
- avis réservés aux colis remis ;
- badge « Vérifié ».

**P1 :**
- demande de prise en charge dans la plateforme, avec réponse dans le back-office ;
- mise en avant payante (« Sponsorisé ») ;
- statistiques réelles sur la fiche (délai moyen constaté, nombre de lots) ;
- statistiques de fiche pour le transitaire ;
- calculateur de coût indicatif (poids ou volume multiplié par le tarif déclaré).

**P2 :**
- devis et paiement intégrés, puis commission ;
- comparaison automatique des délais réels entre transitaires.

**Hors périmètre :** réserver un espace dans un conteneur en ligne, et toute garantie sur la marchandise.

## 8. Décisions du user (11/10/2026)

1. **Comparaison publique : acceptée.** Un transitaire sérieux n'a rien à cacher. La règle de la section 2 reste valable : aucun concurrent sur l'espace d'un transitaire (`/suivi`, « Mes colis », lien d'accès).
2. **Amorçage par fiches « Non revendiquées », sans scraping.** Le scraping de Facebook est écarté, parce qu'il est contraire aux CGU de Facebook et pose un problème de données personnelles (loi ivoirienne de 2013). À la place :
   - **Création manuelle** par le user, à partir des **pages publiques** Facebook des transitaires. On ne reprend que les informations professionnelles publiées par l'entreprise : nom commercial, ville, modes, lien vers la page. Aucun numéro ni nom de personne privée, et aucun commentaire ou avis repris de Facebook.
   - **Affichage** : un statut visible « Non revendiquée », **sans badge, sans avis, sans tarifs ni délais** (on n'invente rien à leur place), et un lien vers la page Facebook source. Un bouton « C'est votre entreprise ? Revendiquer cette fiche » est proposé.
   - **Classement** : les fiches non revendiquées passent **toujours après** les fiches vérifiées dans les résultats, et on ne peut pas les mettre en avant.
   - **Revendication** : le transitaire crée son compte, rattache la fiche, la complète, puis envoie ses pièces. Elle passe « En attente de vérification », puis « Vérifiée » ou « Refusée » après validation par le user. Le contact WhatsApp n'apparaît qu'une fois la fiche revendiquée.
   - **Retrait à la demande** : un lien « Demander le retrait de cette fiche » sur chaque fiche non revendiquée. La fiche est masquée dès réception de la demande, puis supprimée après vérification sommaire, sous 72 h au plus. Les demandes sont tracées.
   - **Cycle de vie** : `NON_REVENDIQUE`, puis `EN_ATTENTE_VERIFICATION`, puis `VERIFIE` ou `REFUSE`, avec `RETIRE` possible à tout moment (modèle en section 9, COLIS-BACKEND).
3. **Vérification par le user au départ**, avec un **écran super-admin** simple :
   - une file des fiches « En attente de vérification », la plus ancienne en premier ;
   - pour chaque fiche, les pièces (RCCM, compte contribuable, pièce du gérant, photo de l'adresse), le téléphone vérifié et les informations saisies ;
   - les actions « Valider » ou « Refuser », avec un motif obligatoire en cas de refus, envoyé au transitaire ;
   - une file des demandes de retrait, et un journal des décisions (qui, quand, motif) ;
   - un accès réservé au rôle `SUPER_ADMIN`. Les pièces ne sont jamais publiques.

**Ajouts au périmètre MVP de l'annuaire :** fiches non revendiquées, revendication, retrait à la demande et écran super-admin de vérification.

**Reste à faire valider juridiquement** avant le lancement public : les CGU de mise en relation, la mention sur les fiches non revendiquées et la procédure de retrait.
## 9. Impact sur le modèle de données

**En bref : l'annuaire s'ajoute à côté du modèle actuel, sans le casser.** Le tenant reste l'unité d'isolation. Tout ce qui est privé (clients, colis, lots, checkpoints) reste filtré par `tenantId`, et l'annuaire ne lit que des tables publiques dédiées. Ce sont quatre migrations additives, sans reprise des données existantes.

**1. Profil public du tenant, dans une table séparée `ProfilPublic` (1-1 avec `Tenant`).** On ne charge pas `Tenant`, qui porte aussi des données internes. La table contient : `slug` unique (l'URL `/transitaires/<slug>`), présentation, ville et adresse physique, WhatsApp public, photos, `statut` (`NON_REVENDIQUE` → `EN_ATTENTE_VERIFICATION` → `VERIFIE` | `REFUSE`, et `RETIRE` possible depuis tout état), `verifieLe`, `verifiePar`, `motifRefus`, `lienFacebook`. **`tenantId` est nullable et unique** : une fiche `NON_REVENDIQUE` créée à la main n'a pas encore de tenant. La revendication crée ou rattache le tenant du transitaire et passe la fiche en `EN_ATTENTE_VERIFICATION`. L'API publique ne sert que `VERIFIE` (fiche complète) et `NON_REVENDIQUE` (liste blanche réduite : nom, ville, modes, lien Facebook ; ni WhatsApp, ni tarifs, ni avis, ni mise en avant, toujours classée après les fiches vérifiées), avec une liste blanche de champs, comme pour `/suivi`. Les pièces justificatives (RCCM, identité) vont dans une table `PieceVerification` privée, jamais exposée, avec stockage fichier hors base et effacement après décision.

**2. Offre comparable : `LigneTransport` (n par tenant).** Les champs sont : `mode` (MER | AIR), ville de départ (référentiel fixe : Guangzhou, Yiwu, Shenzhen…), `delaiMinJours`/`delaiMaxJours`, `tarifIndicatif` + `unite` (KG | CBM) + `devise` (XOF), `prochainDepart?`, `actif`. Les zones de retrait sont une table `ZoneRetrait` en référentiel commun (Adjamé, Treichville, Bouaké…), reliée au tenant en n-n. Un référentiel fixe vaut mieux que du texte libre, sinon on ne peut ni filtrer ni comparer. Les `Site` actuels restent internes au suivi, c'est un autre usage.

**3. Avis : `Avis` relié à un `Colis` réellement remis.** Les champs sont : `colisId` **unique** (un avis par colis), `tenantId`, `clientId`, note de 1 à 5 (CHECK), texte, `reponseTransitaire?`, `statutModeration`, `createdAt`. L'API n'accepte un avis que depuis une session client (`SessionClient`, le magic-link existant) dont le colis a un checkpoint `REMIS_AU_CLIENT`. On n'a donc pas besoin de nouveau compte acheteur au MVP. Aucune route de suppression n'est exposée au transitaire, la modération se fait côté plateforme. La note moyenne et le nombre d'avis sont dénormalisés sur `ProfilPublic` (mis à jour en transaction) pour que la liste reste rapide.

**4. Recherche.** Au MVP, une requête Postgres simple suffit : filtres sur `LigneTransport` (mode, ville de départ) et `ZoneRetrait`, tri par délai, tarif ou note, index composites sur `(mode, villeDepart)`, paginé, sans moteur externe. On passera à `pg_trgm` pour la recherche par nom si besoin, et à un moteur dédié seulement avec des centaines de fiches. La mise en avant (P1) sera un champ `sponsoriseJusquau` sur le profil, toujours étiqueté dans la réponse API.

**5. Ce qui change dans l'isolation multi-tenant.** C'est la première lecture **inter-tenants** de l'application. Elle passera par un module et un contrôleur `annuaire` séparés, en lecture seule, qui ne touchent qu'à `ProfilPublic`, `LigneTransport`, `ZoneRetrait` et `Avis` (modéré), jamais aux tables privées. On ajoutera un test e2e dédié : aucun champ privé ne sort de `/annuaire`. La règle produit « l'annuaire n'apparaît jamais sur `/suivi` ni sur Mes colis » est garantie côté API, puisque ces routes ne renvoient aucun lien vers d'autres tenants.

**6. Hors MVP.** La demande de prise en charge (P1) sera une table `DemandePriseEnCharge` (acheteur → tenant, statut), qui pourra se convertir en `Client` + `Colis` chez le transitaire. Le paiement et la commission (P2) demanderont un vrai compte acheteur, non prévu ici.

**7. Amorçage, retrait et super-admin (décisions du user).**
- `DemandeRetrait` : `profilId`, contact du demandeur, motif, `createdAt`, `traiteLe`, `traitePar`. À la création, la fiche passe en `RETIRE` dans la même transaction, donc elle est masquée immédiatement. Une tâche planifiée supprime ensuite définitivement les fiches `RETIRE` jamais revendiquées au plus tard 72 h après la demande. La demande, elle, est conservée comme trace.
- `JournalDecision` (append-only) : `profilId`, `action` (VALIDER, REFUSER, RETIRER, CREER_FICHE), `motif` (obligatoire pour REFUSER), `auteurId`, `createdAt`. Ce journal alimente l'écran super-admin.
- **Rôle `SUPER_ADMIN` hors tenant** : c'est un compte plateforme, sans `tenantId`, qui n'est pas une valeur de plus dans les rôles d'un tenant. Il a son propre guard et des routes sous `/api/v1/admin` (file par ancienneté, pièces, valider ou refuser, demandes de retrait). Ce compte est le seul qui lit entre tenants en dehors de l'annuaire public. Il faut un test e2e qui vérifie qu'un `OWNER` reçoit un 403 sur toutes ces routes.