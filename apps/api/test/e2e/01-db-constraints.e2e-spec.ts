import { PrismaClient } from '@prisma/client';
import { resetDb, ids } from './helpers';

/** Contraintes SQL verifiees en SQL brut (contournent l'app). */
describe('1. Contraintes base de donnees (SQL brut)', () => {
  const p = new PrismaClient();
  let tA: string, colisId: string, lotId: string;
  const VIOL = /constraint|contrainte|23514|23505|duplicate|dupliqu/i;

  beforeAll(async () => {
    await resetDb();
    ({ tA } = await ids(p));
    const aff = await p.affectationLot.findFirstOrThrow({ where: { tenantId: tA, fin: null } });
    colisId = aff.colisId; lotId = aff.lotId;
  });
  afterAll(() => p.$disconnect());

  it('checkpoint avec lotId ET colisId refuse', async () => {
    await expect(p.$executeRaw`INSERT INTO "Checkpoint"(id,"tenantId","lotId","colisId",statut,lieu,date) VALUES ('e2e-cp-both',${tA},${lotId},${colisId},'RECU_ENTREPOT_CHINE'::"StatutCheckpoint",'x',now())`).rejects.toThrow(VIOL);
  });
  it('checkpoint sans lotId ni colisId refuse', async () => {
    await expect(p.$executeRaw`INSERT INTO "Checkpoint"(id,"tenantId",statut,lieu,date) VALUES ('e2e-cp-none',${tA},'RECU_ENTREPOT_CHINE'::"StatutCheckpoint",'x',now())`).rejects.toThrow(VIOL);
  });
  it('AffectationLot avec fin = debut refusee', async () => {
    await expect(p.$executeRaw`INSERT INTO "AffectationLot"(id,"tenantId","colisId","lotId",debut,fin) VALUES ('e2e-aff-eq',${tA},${colisId},${lotId},'2026-01-01','2026-01-01')`).rejects.toThrow(VIOL);
  });
  it('AffectationLot avec fin < debut refusee', async () => {
    await expect(p.$executeRaw`INSERT INTO "AffectationLot"(id,"tenantId","colisId","lotId",debut,fin) VALUES ('e2e-aff-lt',${tA},${colisId},${lotId},'2026-01-02','2026-01-01')`).rejects.toThrow(VIOL);
  });
  it('deux affectations ouvertes (fin null) pour le meme colis refusees (index unique partiel)', async () => {
    await expect(p.$executeRaw`INSERT INTO "AffectationLot"(id,"tenantId","colisId","lotId",debut,fin) VALUES ('e2e-aff-open',${tA},${colisId},${lotId},now(),NULL)`).rejects.toThrow(VIOL);
  });
  it('controle positif : une affectation fermee valide est acceptee', async () => {
    await expect(p.$executeRaw`INSERT INTO "AffectationLot"(id,"tenantId","colisId","lotId",debut,fin) VALUES ('e2e-aff-ok',${tA},${colisId},${lotId},'2025-01-01','2025-01-02')`).resolves.toBe(1);
  });
});
