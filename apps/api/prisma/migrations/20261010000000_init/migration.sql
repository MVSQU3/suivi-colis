-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'OWNER', 'AGENT');

-- CreateEnum
CREATE TYPE "ModeTransport" AS ENUM ('MER', 'AIR');

-- CreateEnum
CREATE TYPE "StatutCheckpoint" AS ENUM ('RECU_ENTREPOT_CHINE', 'CHARGE_DANS_LOT', 'PARTI_DE_CHINE', 'ARRIVE_ABIDJAN', 'EN_DEDOUANEMENT', 'DISPONIBLE_AU_RETRAIT', 'REMIS_AU_CLIENT', 'EXCEPTION');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "phone" TEXT,
    "primaryColor" TEXT DEFAULT '#F77F00',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "mode" "ModeTransport" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Colis" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cartons" INTEGER NOT NULL DEFAULT 1,
    "mode" "ModeTransport" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Colis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffectationLot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "colisId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),

    CONSTRAINT "AffectationLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lotId" TEXT,
    "colisId" TEXT,
    "statut" "StatutCheckpoint" NOT NULL,
    "lieu" TEXT NOT NULL,
    "commentaire" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_phone_key" ON "Client"("tenantId", "phone");

-- CreateIndex
CREATE INDEX "Lot_tenantId_idx" ON "Lot"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_tenantId_reference_key" ON "Lot"("tenantId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "Colis_trackingCode_key" ON "Colis"("trackingCode");

-- CreateIndex
CREATE INDEX "Colis_tenantId_idx" ON "Colis"("tenantId");

-- CreateIndex
CREATE INDEX "AffectationLot_tenantId_idx" ON "AffectationLot"("tenantId");

-- CreateIndex
CREATE INDEX "AffectationLot_colisId_idx" ON "AffectationLot"("colisId");

-- CreateIndex
CREATE INDEX "AffectationLot_lotId_idx" ON "AffectationLot"("lotId");

-- CreateIndex
CREATE INDEX "Checkpoint_tenantId_idx" ON "Checkpoint"("tenantId");

-- CreateIndex
CREATE INDEX "Checkpoint_lotId_date_idx" ON "Checkpoint"("lotId", "date");

-- CreateIndex
CREATE INDEX "Checkpoint_colisId_date_idx" ON "Checkpoint"("colisId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colis" ADD CONSTRAINT "Colis_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Colis" ADD CONSTRAINT "Colis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationLot" ADD CONSTRAINT "AffectationLot_colisId_fkey" FOREIGN KEY ("colisId") REFERENCES "Colis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffectationLot" ADD CONSTRAINT "AffectationLot_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_colisId_fkey" FOREIGN KEY ("colisId") REFERENCES "Colis"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Au plus une affectation ouverte par colis
CREATE UNIQUE INDEX "AffectationLot_une_ouverte_par_colis" ON "AffectationLot"("colisId") WHERE "fin" IS NULL;
-- Un checkpoint cible soit un lot, soit un colis
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_cible_xor" CHECK (("lotId" IS NULL) <> ("colisId" IS NULL));
-- EXCEPTION exige un commentaire non vide
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_exception_commentaire" CHECK ("statut" <> 'EXCEPTION' OR length(btrim(coalesce("commentaire", ''))) > 0);
