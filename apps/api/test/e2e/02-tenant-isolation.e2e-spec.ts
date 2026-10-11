import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, resetDb, tokens } from './helpers';

describe('2. Isolation des tenants (B ne voit/modifie rien de A)', () => {
  let app: INestApplication; const p = new PrismaClient();
  let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let colisA: string, lotA: string, clientA: string, siteA: string, userA: string, colisB: string;

  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    colisA = (await p.colis.findFirstOrThrow({ where: { tenantId: I.tA } })).id;
    colisB = (await p.colis.findFirstOrThrow({ where: { tenantId: I.tB } })).id;
    lotA = (await p.lot.findFirstOrThrow({ where: { tenantId: I.tA } })).id;
    clientA = (await p.client.findFirstOrThrow({ where: { tenantId: I.tA } })).id;
    siteA = I.siteA;
    userA = (await p.user.findUniqueOrThrow({ where: { email: 'agent@abidjan-express.local' } })).id;
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  const B = () => api(app, t.ownerB);
  it('colis : GET 404', async () => { expect((await B().get(`/colis/${colisA}`)).status).toBe(404); });
  it('colis : POST checkpoint 404', async () => { expect((await B().post(`/colis/${colisA}/checkpoints`, { statut: 'ARRIVE_ABIDJAN', siteId: I.siteB })).status).toBe(404); });
  it('lot : GET 404', async () => { expect((await B().get(`/lots/${lotA}`)).status).toBe(404); });
  it('lot : POST checkpoint 404', async () => { expect((await B().post(`/lots/${lotA}/checkpoints`, { statut: 'ARRIVE_ABIDJAN', siteId: I.siteB })).status).toBe(404); });
  it('lot : POST affectation de colis 404', async () => { expect((await B().post(`/lots/${lotA}/colis`, { colisIds: [colisB] })).status).toBe(404); });
  it('lot : B ne peut pas affecter un colis de A a son propre lot (404)', async () => {
    const lotB = (await p.lot.findFirstOrThrow({ where: { tenantId: I.tB } })).id;
    expect((await B().post(`/lots/${lotB}/colis`, { colisIds: [colisA] })).status).toBe(404);
  });
  it('lot : DELETE retrait colis 404', async () => {
    const aff = await p.affectationLot.findFirstOrThrow({ where: { tenantId: I.tA, fin: null } });
    expect((await B().del(`/lots/${aff.lotId}/colis/${aff.colisId}`)).status).toBe(404);
  });
  it('client : GET 404', async () => { expect((await B().get(`/clients/${clientA}`)).status).toBe(404); });
  it('site : PATCH 404', async () => { expect((await B().patch(`/sites/${siteA}`, { nom: 'Pirate B' })).status).toBe(404); });
  it('user : PATCH desactiver 404', async () => { expect((await B().patch(`/users/${userA}/desactiver`)).status).toBe(404); });
  it('user : PATCH reactiver 404', async () => { expect((await B().patch(`/users/${userA}/reactiver`)).status).toBe(404); });
  it('listes de B ne contiennent aucune donnee de A', async () => {
    const all = JSON.stringify([(await B().get('/colis')).body, (await B().get('/lots')).body, (await B().get('/clients')).body, (await B().get('/sites')).body, (await B().get('/users')).body]);
    for (const id of [colisA, lotA, clientA, siteA, userA]) expect(all).not.toContain(id);
  });
  it('aucune donnee de A modifiee', async () => {
    expect((await p.site.findUniqueOrThrow({ where: { id: siteA } })).nom).not.toBe('Pirate B');
    expect((await p.user.findUniqueOrThrow({ where: { id: userA } })).isActive).toBe(true);
    expect(await p.checkpoint.count({ where: { tenantId: I.tA, siteId: I.siteB } })).toBe(0);
  });
});
