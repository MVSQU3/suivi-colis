import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, newLot, resetDb, sleep, tokens } from './helpers';

/** Regressions trouvees pendant le parcours demo navigateur (dates arrondies a la minute, egalites de date). */
describe('15. Regressions parcours demo', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  beforeAll(async () => { await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p); });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });
  const A = () => api(app, t.ownerA);
  const pub = (code: string) => api(app).get(`/public/suivi/${code}`);
  /** Date passee, a la seconde pleine, posterieure aux affectations deja creees. */
  const dateRonde = async () => { await sleep(1100); return new Date(Math.floor(Date.now() / 1000) * 1000).toISOString(); };

  describe('(a) egalite de date : checkpoint colis EXCEPTION vs checkpoint lot', () => {
    it.each([['lot puis colis'], ['colis puis lot']])('ordre de creation %s -> statut actuel EXCEPTION', async (ordre) => {
      const lot = await newLot(app, t.ownerA);
      const c = await newColis(app, t.ownerA, { lotId: lot.id });
      const D = await dateRonde();
      const postLot = async () => expect((await A().post(`/lots/${lot.id}/checkpoints`, { statut: 'PARTI_DE_CHINE', siteId: I.siteA, date: D })).status).toBe(201);
      const postEx = async () => expect((await A().post(`/colis/${c.id}/checkpoints`, { statut: 'EXCEPTION', siteId: I.siteA, date: D, commentaire: 'Carton abime (test egalite)' })).status).toBe(201);
      if (ordre === 'lot puis colis') { await postLot(); await sleep(20); await postEx(); } else { await postEx(); await sleep(20); await postLot(); }

      const r = await pub(c.trackingCode);
      expect(r.status).toBe(200);
      expect(r.body.statutActuel?.statut).toBe('EXCEPTION');
      const cps = r.body.checkpoints as { statut: string; date: string }[];
      const iLot = cps.findIndex((x) => x.statut === 'PARTI_DE_CHINE' && x.date === D);
      const iEx = cps.findIndex((x) => x.statut === 'EXCEPTION' && x.date === D);
      expect(iLot).toBeGreaterThanOrEqual(0); expect(iEx).toBeGreaterThan(iLot);

      expect((await A().get(`/colis/${c.id}`)).body.statutActuel).toBe('EXCEPTION');
      const det = await A().get(`/lots/${lot.id}`);
      expect(det.body.colis.find((x: { id: string }) => x.id === c.id)?.statutActuel).toBe('EXCEPTION');
      const list = (await A().get('/colis')).body as { id: string; statutActuel: string }[];
      expect(list.find((x) => x.id === c.id)?.statutActuel).toBe('EXCEPTION');
    });
  });

  describe('(b) egalite de date entre deux checkpoints colis : le plus recemment cree est le statut actuel', () => {
    it.each([['RECU_ENTREPOT_CHINE', 'ARRIVE_ABIDJAN'], ['ARRIVE_ABIDJAN', 'RECU_ENTREPOT_CHINE']])('%s puis %s -> statut = second', async (s1, s2) => {
      const c = await newColis(app, t.ownerA);
      const D = await dateRonde();
      expect((await A().post(`/colis/${c.id}/checkpoints`, { statut: s1, siteId: I.siteA, date: D })).status).toBe(201);
      await sleep(20);
      expect((await A().post(`/colis/${c.id}/checkpoints`, { statut: s2, siteId: I.siteA, date: D })).status).toBe(201);
      expect((await pub(c.trackingCode)).body.statutActuel?.statut).toBe(s2);
      expect((await A().get(`/colis/${c.id}`)).body.statutActuel).toBe(s2);
    });
  });

  describe('(c) heure serveur : affectation puis checkpoint de lot sans date', () => {
    it('updatedCount inclut le colis tout juste affecte et son suivi public montre le nouveau statut', async () => {
      const lot = await newLot(app, t.ownerA);
      await newColis(app, t.ownerA, { lotId: lot.id }); await newColis(app, t.ownerA, { lotId: lot.id });
      const c = await newColis(app, t.ownerA);
      expect((await A().post(`/lots/${lot.id}/colis`, { colisIds: [c.id] })).status).toBe(201);
      const r = await A().post(`/lots/${lot.id}/checkpoints`, { statut: 'PARTI_DE_CHINE', siteId: I.siteA });
      expect(r.status).toBe(201);
      const nb = (await A().get(`/lots/${lot.id}`)).body.colis.length;
      expect(nb).toBe(3);
      expect(r.body.updatedCount).toBe(nb);
      const pr = await pub(c.trackingCode);
      expect(pr.body.statutActuel?.statut).toBe('PARTI_DE_CHINE');
      expect(pr.body.checkpoints.map((x: { statut: string }) => x.statut)).toContain('PARTI_DE_CHINE');
    });
  });

  describe('(d) regle actuelle documentee : checkpoint de lot date avant l affectation du colis', () => {
    it('date explicite = debut - 30 s -> non herite par ce colis, exclu de updatedCount', async () => {
      const lot = await newLot(app, t.ownerA);
      const ancien = await newColis(app, t.ownerA, { lotId: lot.id });
      await p.affectationLot.updateMany({ where: { colisId: ancien.id, fin: null }, data: { debut: new Date(Date.now() - 10 * 60_000) } });
      const c = await newColis(app, t.ownerA);
      expect((await A().post(`/lots/${lot.id}/colis`, { colisIds: [c.id] })).status).toBe(201);
      const aff = await p.affectationLot.findFirstOrThrow({ where: { colisId: c.id, fin: null } });
      const D = new Date(aff.debut.getTime() - 30_000).toISOString();
      const r = await A().post(`/lots/${lot.id}/checkpoints`, { statut: 'CHARGE_DANS_LOT', siteId: I.siteA, date: D });
      expect(r.status).toBe(201);
      expect(r.body.updatedCount).toBe(1); // seul l'ancien colis
      const hist = (await A().get(`/colis/${c.id}`)).body.historique as { id: string }[];
      expect(hist.map((h) => h.id)).not.toContain(r.body.checkpointId);
      expect((await pub(c.trackingCode)).body.statutActuel).toBeNull();
      const histAncien = (await A().get(`/colis/${ancien.id}`)).body.historique as { id: string }[];
      expect(histAncien.map((h) => h.id)).toContain(r.body.checkpointId);
    });
  });
});
