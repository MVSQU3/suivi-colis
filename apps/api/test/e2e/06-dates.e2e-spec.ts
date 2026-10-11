import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, newLot, resetDb, tokens } from './helpers';

describe('6. Dates des checkpoints', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let C: { id: string }, L: { id: string };
  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    L = await newLot(app, t.ownerA); C = await newColis(app, t.ownerA);
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });
  const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

  it('colis : date > now + 2 min -> 400', async () => {
    expect((await api(app, t.ownerA).post(`/colis/${C.id}/checkpoints`, { statut: 'ARRIVE_ABIDJAN', siteId: I.siteA, date: iso(3 * 60_000) })).status).toBe(400);
  });
  it('lot : date > now + 2 min -> 400', async () => {
    expect((await api(app, t.ownerA).post(`/lots/${L.id}/checkpoints`, { statut: 'ARRIVE_ABIDJAN', siteId: I.siteA, date: iso(3 * 60_000) })).status).toBe(400);
  });
  it('colis : quelques secondes dans le futur (derive horloge) -> 201', async () => {
    expect((await api(app, t.ownerA).post(`/colis/${C.id}/checkpoints`, { statut: 'RECU_ENTREPOT_CHINE', siteId: I.siteA, date: iso(5_000) })).status).toBe(201);
  });
  it('colis : date passee -> 201', async () => {
    expect((await api(app, t.ownerA).post(`/colis/${C.id}/checkpoints`, { statut: 'RECU_ENTREPOT_CHINE', siteId: I.siteA, date: iso(-86_400_000) })).status).toBe(201);
  });
  it.each(['pas-une-date', '2026-13-45T00:00:00Z', '31/12/2026'])('colis : date invalide %p -> 400', async (d) => {
    expect((await api(app, t.ownerA).post(`/colis/${C.id}/checkpoints`, { statut: 'RECU_ENTREPOT_CHINE', siteId: I.siteA, date: d })).status).toBe(400);
  });
});
