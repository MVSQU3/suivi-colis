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
