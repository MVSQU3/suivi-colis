import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, newLot, resetDb, sleep, tokens } from './helpers';

describe('4. Mise a jour groupee par lot', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let lot: { id: string }; let c1: { id: string }, c2: { id: string }, c3: { id: string };
  let lotCpId: string;

  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    lot = await newLot(app, t.ownerA);
    c1 = await newColis(app, t.ownerA, { lotId: lot.id });
    c2 = await newColis(app, t.ownerA, { lotId: lot.id });
    c3 = await newColis(app, t.ownerA, { lotId: lot.id });
    await sleep(50);
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  it('POST /lots/:id/checkpoints apparait sur tous les colis du lot', async () => {
    const r = await api(app, t.agentA).post(`/lots/${lot.id}/checkpoints`, { statut: 'PARTI_DE_CHINE', siteId: I.siteA, commentaire: 'note interne lot' });
    expect(r.status).toBe(201);
    expect(r.body.updatedCount).toBe(3);
    lotCpId = r.body.checkpointId;
    for (const c of [c1, c2, c3]) {
      const g = await api(app, t.ownerA).get(`/colis/${c.id}`);
      expect(g.status).toBe(200);
      expect(g.body.historique.map((h: { id: string }) => h.id)).toContain(lotCpId);
      expect(g.body.statutActuel).toBe('PARTI_DE_CHINE');
    }
  });
  it('EXCEPTION au niveau colis prend le dessus dans l historique fusionne (ce colis seulement)', async () => {
    await sleep(20);
    const r = await api(app, t.agentA).post(`/colis/${c1.id}/checkpoints`, { statut: 'EXCEPTION', siteId: I.siteA, commentaire: 'Carton abime' });
    expect(r.status).toBe(201);
    const g1 = await api(app, t.ownerA).get(`/colis/${c1.id}`);
    expect(g1.body.statutActuel).toBe('EXCEPTION');
    expect(g1.body.historique.map((h: { statut: string }) => h.statut)).toEqual(expect.arrayContaining(['PARTI_DE_CHINE', 'EXCEPTION']));
    expect((await api(app, t.ownerA).get(`/colis/${c2.id}`)).body.statutActuel).toBe('PARTI_DE_CHINE');
    const list = (await api(app, t.ownerA).get('/colis')).body as { id: string; statutActuel: string }[];
    expect(list.find((x) => x.id === c1.id)?.statutActuel).toBe('EXCEPTION');
  });
  it('EXCEPTION sans texte refusee 400 (colis, commentaire absent)', async () => {
    expect((await api(app, t.agentA).post(`/colis/${c2.id}/checkpoints`, { statut: 'EXCEPTION', siteId: I.siteA })).status).toBe(400);
  });
  it('EXCEPTION avec commentaire blanc refusee 400 (colis)', async () => {
    expect((await api(app, t.agentA).post(`/colis/${c2.id}/checkpoints`, { statut: 'EXCEPTION', siteId: I.siteA, commentaire: '   ' })).status).toBe(400);
  });
  it('EXCEPTION sans texte refusee 400 (lot)', async () => {
    expect((await api(app, t.agentA).post(`/lots/${lot.id}/checkpoints`, { statut: 'EXCEPTION', siteId: I.siteA })).status).toBe(400);
  });
  it('aucune EXCEPTION enregistree par les requetes refusees', async () => {
    expect(await p.checkpoint.count({ where: { statut: 'EXCEPTION', OR: [{ colisId: c2.id }, { lotId: lot.id }] } })).toBe(0);
  });
});
