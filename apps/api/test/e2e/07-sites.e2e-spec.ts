import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, resetDb, tokens } from './helpers';

describe('7. Sites (lieux publics)', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let C: { id: string; trackingCode: string };
  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    C = await newColis(app, t.ownerA);
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });
  const A = () => api(app, t.ownerA);

  it('siteId d un autre tenant et siteId inexistant -> meme 404 (meme corps)', async () => {
    const other = await A().post(`/colis/${C.id}/checkpoints`, { statut: 'ARRIVE_DESTINATION', siteId: I.siteB });
    const none = await A().post(`/colis/${C.id}/checkpoints`, { statut: 'ARRIVE_DESTINATION', siteId: 'cl_site_inexistant_000' });
    expect(other.status).toBe(404); expect(none.status).toBe(404);
    expect(other.body).toEqual(none.body);
  });
  it('site desactive -> 400', async () => {
    const s = await A().post('/sites', { nom: 'Site Bientot Ferme' });
    expect(s.status).toBe(201);
    expect((await A().patch(`/sites/${s.body.id}`, { actif: false })).status).toBe(200);
    expect((await A().post(`/colis/${C.id}/checkpoints`, { statut: 'ARRIVE_DESTINATION', siteId: s.body.id })).status).toBe(400);
  });
  it('siteId manquant -> 400', async () => {
    expect((await A().post(`/colis/${C.id}/checkpoints`, { statut: 'ARRIVE_DESTINATION', lieu: 'texte libre' })).status).toBe(400);
  });
  it.each(['depot yopougon', '  Depot Yopougon  ', 'DEPOT YOPOUGON'])('nom en double (casse/espaces) %p -> 409', async (nom) => {
    await A().post('/sites', { nom: 'Depot Yopougon' });
    expect((await A().post('/sites', { nom })).status).toBe(409);
  });
  it('meme nom autorise dans un autre tenant (201)', async () => {
    expect((await api(app, t.ownerB).post('/sites', { nom: 'Depot Yopougon' })).status).toBe(201);
  });
  it('renommer vers un nom existant (casse differente) -> 409', async () => {
    const s = await A().post('/sites', { nom: 'Hangar Bis' });
    expect((await A().patch(`/sites/${s.body.id}`, { nom: 'depot YOPOUGON' })).status).toBe(409);
  });
  it('renommer un site change le lieu affiche publiquement sur les anciens checkpoints', async () => {
    const s = await A().post('/sites', { nom: 'Hangar Treichville Zone 3' });
    const cp = await A().post(`/colis/${C.id}/checkpoints`, { statut: 'ARRIVE_DESTINATION', siteId: s.body.id, lieu: 'note interne quai 12' });
    expect(cp.status).toBe(201);
    const before = await api(app).get(`/public/suivi/${C.trackingCode}`);
    expect(before.body.checkpoints.map((c: { lieu: string }) => c.lieu)).toContain('Hangar Treichville Zone 3');
    expect((await A().patch(`/sites/${s.body.id}`, { nom: 'Hangar Vridi' })).status).toBe(200);
    const after = await api(app).get(`/public/suivi/${C.trackingCode}`);
    const lieux = after.body.checkpoints.map((c: { lieu: string }) => c.lieu);
    expect(lieux).toContain('Hangar Vridi');
    expect(lieux).not.toContain('Hangar Treichville Zone 3');
    expect(JSON.stringify(after.body)).not.toContain('quai 12');
  });
});
