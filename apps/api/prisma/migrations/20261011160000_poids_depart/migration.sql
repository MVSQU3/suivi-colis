ALTER TABLE "Colis" ADD COLUMN "poidsKg" DOUBLE PRECISION;
ALTER TABLE "Colis" ADD CONSTRAINT "Colis_poids_positif_chk" CHECK ("poidsKg" IS NULL OR "poidsKg" > 0);
ALTER TABLE "Lot" ADD COLUMN "departPrevu" TIMESTAMP(3);
