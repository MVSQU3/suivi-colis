-- Sites (lieux publics) par tenant
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Site_tenantId_idx" ON "Site"("tenantId");
ALTER TABLE "Site" ADD CONSTRAINT "Site_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Doublons insensibles a la casse et aux espaces de bord interdits
CREATE UNIQUE INDEX "Site_tenant_nom_ci_key" ON "Site"("tenantId", lower(btrim("nom")));
ALTER TABLE "Site" ADD CONSTRAINT "Site_nom_non_vide_chk" CHECK (length(btrim("nom")) >= 2);

ALTER TABLE "Checkpoint" ADD COLUMN "siteId" TEXT;
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Checkpoint_siteId_idx" ON "Checkpoint"("siteId");

-- Sites courants pour chaque tenant existant
INSERT INTO "Site" ("id", "tenantId", "nom", "updatedAt")
SELECT 's' || md5(random()::text || t."id" || n.nom), t."id", n.nom, CURRENT_TIMESTAMP
FROM "Tenant" t CROSS JOIN (VALUES ('Entrepôt Guangzhou (Baiyun)'), ('Port de Nansha'), ('Port autonome d''Abidjan'), ('Aéroport FHB')) AS n(nom);