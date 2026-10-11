import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { api, bootApp, resetDb, tokens } from './helpers';

describe('3. Roles et droits sur /users', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>;
  let agentId: string, ownerId: string;
  const strongPwd = () => randomBytes(18).toString('base64url');

  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app);
    agentId = (await p.user.findUniqueOrThrow({ where: { email: 'agent@abidjan-express.local' } })).id;
    ownerId = (await p.user.findUniqueOrThrow({ where: { email: 'owner@abidjan-express.local' } })).id;
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  it('AGENT : GET /users 403', async () => { expect((await api(app, t.agentA).get('/users')).status).toBe(403); });
  it('AGENT : POST /users 403', async () => {
    expect((await api(app, t.agentA).post('/users', { email: 'x-agent@e2e.local', fullName: 'X Y', role: 'AGENT', password: strongPwd() })).status).toBe(403);
  });
  it('AGENT : PATCH /users/:id/desactiver 403', async () => { expect((await api(app, t.agentA).patch(`/users/${ownerId}/desactiver`)).status).toBe(403); });
  it('sans token : 401 sur /users et /colis', async () => {
    expect((await api(app).get('/users')).status).toBe(401);
    expect((await api(app).get('/colis')).status).toBe(401);
  });
  it('token invalide : 401', async () => { expect((await api(app, 'abc.def.ghi').get('/users')).status).toBe(401); });
  it('OWNER d un autre tenant : 404 sur desactiver', async () => { expect((await api(app, t.ownerB).patch(`/users/${agentId}/desactiver`)).status).toBe(404); });
  it('inviter un SUPER_ADMIN : 400', async () => {
    const r = await api(app, t.ownerA).post('/users', { email: 'sa@e2e.local', fullName: 'Super Admin', role: 'SUPER_ADMIN', password: strongPwd() });
    expect(r.status).toBe(400);
    expect(await p.user.count({ where: { email: 'sa@e2e.local' } })).toBe(0);
  });
  it('OWNER peut inviter un AGENT (201, pas de hash renvoye)', async () => {
    const r = await api(app, t.ownerA).post('/users', { email: 'nouvel.agent@e2e.local', fullName: 'Nouvel Agent', role: 'AGENT', password: strongPwd() });
    expect(r.status).toBe(201);
    expect(r.body).not.toHaveProperty('passwordHash');
  });
  it('OWNER ne peut pas se desactiver lui-meme : 400', async () => {
    expect((await api(app, t.ownerA).patch(`/users/${ownerId}/desactiver`)).status).toBe(400);
    expect((await p.user.findUniqueOrThrow({ where: { id: ownerId } })).isActive).toBe(true);
  });
});
