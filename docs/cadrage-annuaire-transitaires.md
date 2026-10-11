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

## 8. Questions ouvertes pour le user

1. Les transitaires interrogés accepteront-ils d'être comparés publiquement ? À valider pendant les entretiens, avant de construire.
2. Faut-il lancer l'annuaire dès la mise en ligne, ou seulement quand on aura assez de transitaires vérifiés ? Un annuaire avec trois fiches fait plus de tort que de bien.
3. Qui fait la vérification au début (le user lui-même, un partenaire) ?

## 9. Impact sur le modèle de données (à compléter par COLIS-BACKEND)

_Profil public du tenant, recherche, avis : à rédiger, sans code._
