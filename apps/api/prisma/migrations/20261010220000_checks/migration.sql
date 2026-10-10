-- Un checkpoint cible exactement un lot OU un colis.
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_cible_unique_chk" CHECK (("lotId" IS NULL) <> ("colisId" IS NULL));
-- Une affectation fermee finit strictement apres son debut.
ALTER TABLE "AffectationLot" ADD CONSTRAINT "AffectationLot_periode_chk" CHECK ("fin" IS NULL OR "fin" > "debut");