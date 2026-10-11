import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import request = require('supertest');
import { API, api, bootApp, ids, newColis, resetDb, tokens } from './helpers';

const FORBIDDEN_KEYS = ['id', 'tenantId', 'lotId', 'clientId', 'colisId', 'siteId'];
const keysDeep = (o: unknown, acc: string[] = []): string[] => {
  if (Array.isArray(o)) o.forEach((x) => keysDeep(x, acc));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.push(k); keysDeep(v, acc); }
  return acc;
};
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const siteUrl = () => (process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

/** Contexte partage ; chaque describe demarre sa propre app (limiteur POST /client/lien = 10/min par instance). */
describe('14. Magic-link client', () => {
  const p = new PrismaClient();
  let I: Awaited<ReturnType<typeof ids>>;
  beforeAll(async () => { await resetDb(); I = await ids(p); });
  afterAll(() => p.$disconnect());

  function setup() {
    const ctx = {} as { app: INestApplication; t: Awaited<ReturnType<typeof tokens>> };
    beforeAll(async () => { ctx.app = await bootApp(); ctx.t = await tokens(ctx.app); });
    afterAll(async () => { await ctx.app?.close(); });
    const srv = () => request(ctx.app.getHttpServer());
    const helpers = {
      A: () => api(ctx.app, ctx.t.ownerA), AG: () => api(ctx.app, ctx.t.agentA), B: () => api(ctx.app, ctx.t.ownerB),
      newClient: async (name = 'Client Lien') => {
        const r = await api(ctx.app, ctx.t.ownerA).post('/clients', { fullName: name, phone: '07' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0') });
        return r.body.id as string;
      },
      lien: async (clientId: string, token?: string) => {
        const r = await api(ctx.app, token ?? ctx.t.ownerA).post(`/clients/${clientId}/lien-acces`);
        if (r.status !== 201 && r.status !== 200) throw new Error(`lien-acces -> ${r.status}`);
        return { ...r.body, jeton: (r.body.url as string).split('/acces/')[1] } as { url: string; expireLe: string; jeton: string };
      },
      get: (j: string) => srv().get(`${API}/client/lien/${j}`),
      use: (j: string) => srv().post(`${API}/client/lien/${j}`),
      mes: (cookie?: string) => (cookie ? srv().get(`${API}/client/mes-colis`).set('Cookie', cookie) : srv().get(`${API}/client/mes-colis`)),
      session: async (clientId: string) => {
        const { jeton } = await helpers.lien(clientId);
        const r = await helpers.use(jeton);
        if (r.status !== 200) throw new Error(`POST lien -> ${r.status}`);
        const sc = ([] as string[]).concat(r.headers['set-cookie'] ?? []).find((c) => c.startsWith('sc_session='))!;
        return sc.split(';')[0];
      },
      srv, ctx,
    };
    return helpers;
  }

  describe('generation du lien et stockage', () => {
    const h = setup();
    it.each([['OWNER'], ['AGENT']])('POST /clients/:id/lien-acces par %s -> {url, expireLe ~ +48h}', async (who) => {
      const c = await h.newClient();
      const r = await (who === 'OWNER' ? h.A() : h.AG()).post(`/clients/${c}/lien-acces`);
      expect([200, 201]).toContain(r.status);
      expect(r.body.url).toMatch(new RegExp('^' + siteUrl().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/acces/[A-Za-z0-9_-]{20,}$'));
      const diff = new Date(r.body.expireLe).getTime() - (Date.now() + 48 * 3600_000);
      expect(Math.abs(diff)).toBeLessThan(5 * 60_000);
    });
    it('autre tenant -> 404', async () => {
      const c = await h.newClient();
      expect((await h.B().post(`/clients/${c}/lien-acces`)).status).toBe(404);
    });
    it('client archive -> 409', async () => {
      const c = await h.newClient();
      expect((await h.A().post(`/clients/${c}/archiver`)).status).toBe(200);
      expect((await h.A().post(`/clients/${c}/lien-acces`)).status).toBe(409);
    });
    it('jeton jamais stocke en clair (aucune colonne texte de la base ne le contient) ; tokenHash = sha256(jeton)', async () => {
      const c = await h.newClient();
      const { jeton } = await h.lien(c);
      const cols = await p.$queryRaw<{ table_name: string; column_name: string }[]>`
        SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND data_type IN ('text', 'character varying')`;
      for (const { table_name, column_name } of cols) {
        const n = await p.$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*) AS n FROM "${table_name}" WHERE position($1 in "${column_name}") > 0`, jeton);
        expect([`${table_name}.${column_name}`, Number(n[0].n)]).toEqual([`${table_name}.${column_name}`, 0]);
      }
      const row = await p.lienAcces.findFirstOrThrow({ where: { clientId: c, usedAt: null, revokedAt: null } });
      expect(row.tokenHash).not.toBe(jeton);
      expect(row.tokenHash).toBe(sha256(jeton));
    });
    it('GET /client/lien/:jeton -> {valide:true, transitaire:{nom,telephone}} sans nom ni id client', async () => {
      const c = await h.newClient('Zorglub Nomsecret');
      const { jeton } = await h.lien(c);
      const r = await h.get(jeton);
      expect(r.status).toBe(200);
      expect(r.body).toEqual(expect.objectContaining({ valide: true, transitaire: expect.objectContaining({ nom: expect.any(String), telephone: expect.anything() }) }));
      const s = JSON.stringify(r.body);
      expect(s).not.toContain('Zorglub'); expect(s).not.toContain(c);
      const keys = keysDeep(r.body); for (const k of FORBIDDEN_KEYS) expect(keys).not.toContain(k);
    });
    it('jeton inconnu -> {valide:false, transitaire:null}', async () => {
      const r = await h.get('jeton-totalement-inconnu-0000000000000000');
      expect(r.status).toBe(200); expect(r.body).toEqual({ valide: false, transitaire: null });
    });
  });

  describe('consommation du lien (POST)', () => {
    const h = setup();
    it('nouveau lien invalide le precedent non utilise (ancien POST -> 410)', async () => {
      const c = await h.newClient();
      const old = await h.lien(c); await h.lien(c);
      expect((await h.use(old.jeton)).status).toBe(410);
    });
    it('2 GET ne consomment pas ; POST -> 200 + cookie sc_session HttpOnly SameSite=Lax ; second POST -> 410', async () => {
      const c = await h.newClient();
      const { jeton } = await h.lien(c);
      expect((await h.get(jeton)).body.valide).toBe(true);
      expect((await h.get(jeton)).body.valide).toBe(true);
      const r = await h.use(jeton);
      expect(r.status).toBe(200);
      const sc = ([] as string[]).concat(r.headers['set-cookie'] ?? []).find((x) => x.startsWith('sc_session='));
      expect(sc).toBeDefined();
      expect(sc!).toMatch(/;\s*HttpOnly/i);
      expect(sc!).toMatch(/;\s*SameSite=Lax/i);
      expect((await h.use(jeton)).status).toBe(410);
      expect((await h.get(jeton)).body.valide).toBe(false);
    });
    it('lien expire -> 410', async () => {
      const c = await h.newClient();
      const { jeton } = await h.lien(c);
      await p.lienAcces.update({ where: { tokenHash: sha256(jeton) }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await h.use(jeton)).status).toBe(410);
    });
    it('concurrence : 5 POST simultanes sur le meme jeton -> exactement un 200, quatre 410', async () => {
      const c = await h.newClient();
      const { jeton } = await h.lien(c);
      const rs = await Promise.all(Array.from({ length: 5 }, () => h.use(jeton)));
      const st = rs.map((r) => r.status).sort();
      expect(st).toEqual([200, 410, 410, 410, 410]);
      expect(await p.sessionClient.count({ where: { clientId: c } })).toBe(1);
    });
  });

  describe('session client : mes-colis, deconnexion, revocation', () => {
    const h = setup();
    it('GET /client/mes-colis : seulement les colis actifs de ce client, sans id interne', async () => {
      const c = await h.newClient('Client Mes Colis');
      const mk = async () => (await h.A().post('/colis', { clientId: c, description: 'Colis MC', mode: 'MER' })).body as { id: string; trackingCode: string };
      const c1 = await mk(); const c2 = await mk(); const archived = await mk();
      await h.A().post(`/colis/${c1.id}/checkpoints`, { statut: 'RECU_ENTREPOT_CHINE', siteId: I.siteA });
      expect((await h.A().post(`/colis/${archived.id}/archiver`)).status).toBe(200);
      const otherColis = await newColis(h.ctx.app, h.ctx.t.ownerA);
      const cookie = await h.session(c);
      const r = await h.mes(cookie);
      expect(r.status).toBe(200);
      expect(r.body.client).toEqual(expect.objectContaining({ nom: 'Client Mes Colis' }));
      expect(r.body.transitaire).toBeDefined();
      const codes = (r.body.colis as { code: string }[]).map((x) => x.code).sort();
      expect(codes).toEqual([c1.trackingCode, c2.trackingCode].sort());
      expect(JSON.stringify(r.body)).not.toContain(otherColis.trackingCode);
      const keys = keysDeep(r.body); for (const k of FORBIDDEN_KEYS) expect(keys).not.toContain(k);
    });
    it('mes-colis sans cookie ou cookie bidon -> 401', async () => {
      expect((await h.mes()).status).toBe(401);
      expect((await h.mes('sc_session=nimportequoi')).status).toBe(401);
    });
    it('cookie de session client ne donne pas acces au back-office (GET /colis, /clients -> 401)', async () => {
      const cookie = await h.session(await h.newClient());
      expect((await h.srv().get(`${API}/colis`).set('Cookie', cookie)).status).toBe(401);
      expect((await h.srv().get(`${API}/clients`).set('Cookie', cookie)).status).toBe(401);
    });
    it('POST /client/deconnexion puis mes-colis -> 401', async () => {
      const cookie = await h.session(await h.newClient());
      expect((await h.mes(cookie)).status).toBe(200);
      expect((await h.srv().post(`${API}/client/deconnexion`).set('Cookie', cookie)).status).toBe(200);
      expect((await h.mes(cookie)).status).toBe(401);
    });
    it('POST /clients/:id/deconnecter (back-office) -> sessionsRevoquees >= 1 puis mes-colis 401 ; autre tenant 404', async () => {
      const c = await h.newClient();
      const cookie = await h.session(c);
      expect((await h.B().post(`/clients/${c}/deconnecter`)).status).toBe(404);
      expect((await h.mes(cookie)).status).toBe(200);
      const r = await h.A().post(`/clients/${c}/deconnecter`);
      expect(r.status).toBe(200); expect(r.body.sessionsRevoquees).toBeGreaterThanOrEqual(1);
      expect((await h.mes(cookie)).status).toBe(401);
    });
  });

  describe('archivage du client', () => {
    const h = setup();
    it('archiver revoque les sessions (401) et les liens non utilises (410) ; lien-acces 409 tant qu archive', async () => {
      const c = await h.newClient();
      const cookie = await h.session(c);
      const pending = await h.lien(c);
      expect((await h.mes(cookie)).status).toBe(200);
      expect((await h.A().post(`/clients/${c}/archiver`)).status).toBe(200);
      expect((await h.mes(cookie)).status).toBe(401);
      expect((await h.use(pending.jeton)).status).toBe(410);
      expect((await h.A().post(`/clients/${c}/lien-acces`)).status).toBe(409);
      expect(await p.sessionClient.count({ where: { clientId: c, revokedAt: null } })).toBe(0);
      expect(await p.lienAcces.count({ where: { clientId: c, usedAt: null, revokedAt: null } })).toBe(0);
    });
  });
});
