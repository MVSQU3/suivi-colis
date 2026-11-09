-- Phase 1 du kickoff Afrique : le produit ne suppose plus la Cote d'Ivoire.
-- Statut generique : le lieu precis (Abidjan, Lome, Dakar...) est porte par le site du checkpoint.
ALTER TYPE "StatutCheckpoint" RENAME VALUE 'ARRIVE_ABIDJAN' TO 'ARRIVE_DESTINATION';

-- Parametres pays du transitaire. Les tenants existants sont ivoiriens : valeurs par defaut = Cote d'Ivoire.
-- Les telephones sont deja stockes en E.164 (+225...) : aucune reprise de donnees.
ALTER TABLE "Tenant" ADD COLUMN "paysCode" TEXT NOT NULL DEFAULT 'CI';
ALTER TABLE "Tenant" ADD COLUMN "devise" TEXT NOT NULL DEFAULT 'XOF';
ALTER TABLE "Tenant" ADD COLUMN "fuseau" TEXT NOT NULL DEFAULT 'Africa/Abidjan';
ALTER TABLE "Tenant" ADD COLUMN "langue" TEXT NOT NULL DEFAULT 'fr';
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_paysCode_format" CHECK ("paysCode" ~ '^[A-Z]{2}$');
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_devise_format" CHECK ("devise" ~ '^[A-Z]{3}$');
