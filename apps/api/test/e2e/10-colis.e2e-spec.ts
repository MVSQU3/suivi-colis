import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, resetDb, tokens } from './helpers';

describe('10. Creation de colis', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let clientA: string;
  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    clientA = (await p.client.findFirstOrThrow({ where: { tenantId: I.tA } })).id;
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  it('lotId d un autre tenant -> 404, aucun colis cree', async () => {
    const lotB = (await p.lot.findFirstOrThrow({ where: { tenantId: I.tB } })).id;
    const before = await p.colis.count();
    expect((await api(app, t.ownerA).post('/colis', { clientId: clientA, description: 'Test lot B', mode: 'MER', lotId: lotB })).status).toBe(404);
    expect(await p.colis.count()).toBe(before);
  });
  it('clientId d un autre tenant -> 404', async () => {
    const clientB = (await p.client.findFirstOrThrow({ where: { tenantId: I.tB } })).id;
    expect((await api(app, t.ownerA).post('/colis', { clientId: clientB, description: 'Test client B', mode: 'MER' })).status).toBe(404);
  });
  it('poidsKg accepte (12.5) et renvoye', async () => {
    const r = await api(app, t.ownerA).post('/colis', { clientId: clientA, description: 'Colis pese', mode: 'AIR', poidsKg: 12.5 });
    expect(r.status).toBe(201); expect(r.body.poidsKg).toBe(12.5);
    expect(r.body.trackingCode).toMatch(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
  });
  it('poidsKg negatif -> 400', async () => {
    expect((await api(app, t.ownerA).post('/colis', { clientId: clientA, description: 'Colis negatif', mode: 'AIR', poidsKg: -3 })).status).toBe(400);
  });
});
