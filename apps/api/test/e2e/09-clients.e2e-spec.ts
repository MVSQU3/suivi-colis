import { INestApplication } from '@nestjs/common';
import { api, bootApp, resetDb, tokens } from './helpers';

describe('9. Clients : normalisation du telephone et doublons', () => {
  let app: INestApplication; let t: Awaited<ReturnType<typeof tokens>>; let firstId: string;
  beforeAll(async () => { await resetDb(); app = await bootApp(); t = await tokens(app); });
  afterAll(async () => { await app?.close(); });

  it("'07 07 12 34 56' -> 201, normalise en +2250707123456", async () => {
    const r = await api(app, t.ownerA).post('/clients', { fullName: 'Kouame Test', phone: '07 07 12 34 56' });
    expect(r.status).toBe(201); expect(r.body.phone).toBe('+2250707123456'); firstId = r.body.id;
  });
  it.each(['0707123456', '00225-07.07.12.34.56', '+225 07 07 12 34 56'])('%p dans le meme tenant -> 409 avec clientExistant', async (phone) => {
    const r = await api(app, t.ownerA).post('/clients', { fullName: 'Doublon', phone });
    expect(r.status).toBe(409);
    expect(r.body.clientExistant).toEqual(expect.objectContaining({ id: firstId, fullName: 'Kouame Test' }));
  });
  it('meme numero dans un autre tenant -> 201', async () => {
    const r = await api(app, t.ownerB).post('/clients', { fullName: 'Autre Tenant', phone: '0707123456' });
    expect(r.status).toBe(201); expect(r.body.phone).toBe('+2250707123456');
  });
  it.each(['12345', '+33612345678', '07071234567', 'abcdefghij', ''])('numero invalide %p -> 400', async (phone) => {
    expect((await api(app, t.ownerA).post('/clients', { fullName: 'Invalide', phone })).status).toBe(400);
  });
});
