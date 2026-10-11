import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, newLot, resetDb, sleep, tokens } from './helpers';

const FORBIDDEN_KEYS = ['id', 'tenantId', 'lotId', 'colisId', 'siteId', 'clientId'];
const keysDeep = (o: unknown, acc: string[] = []): string[] => {
  if (Array.isArray(o)) o.forEach((x) => keysDeep(x, acc));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.push(k); keysDeep(v, acc); }
  return acc;
};

describe('13. Edition, archivage, cloture, suppression', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  const A = () => api(app, t.ownerA), AG = () => api(app, t.agentA), B = () => api(app, t.ownerB);
  beforeAll(async () => { await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p); });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  describe('PATCH (OWNER et AGENT)', () => {
    let clientId: string, colis: { id: string }, lot: { id: string };
    beforeAll(async () => {
      clientId = (await A().post('/clients', { fullName: 'Client Edit', phone: '0711111111' })).body.id;
      colis = await newColis(app, t.ownerA); lot = await newLot(app, t.ownerA);
    });
    it.each([['OWNER'], ['AGENT']])('PATCH /clients/:id par %s -> 200, telephone normalise', async (who) => {
      const r = await (who === 'OWNER' ? A() : AG()).patch(`/clients/${clientId}`, { fullName: `Client ${who}`, phone: who === 'OWNER' ? '07 22 22 22 22' : '00225-07.33.33.33.33' });
      expect(r.status).toBe(200); expect(r.body.phone).toBe(who === 'OWNER' ? '+2250722222222' : '+2250733333333');
    });
    it('PATCH /clients/:id avec telephone d un autre client du tenant -> 409 clientExistant', async () => {
      const other = (await A().post('/clients', { fullName: 'Autre Client', phone: '0744444444' })).body;
      const r = await A().patch(`/clients/${clientId}`, { phone: '07 44 44 44 44' });
      expect(r.status).toBe(409); expect(r.body.clientExistant).toEqual(expect.objectContaining({ id: other.id }));
    });
    it('PATCH /clients/:id telephone invalide -> 400', async () => { expect((await A().patch(`/clients/${clientId}`, { phone: '123' })).status).toBe(400); });
    it.each([['OWNER'], ['AGENT']])('PATCH /colis/:id par %s -> 200', async (who) => {
      const r = await (who === 'OWNER' ? A() : AG()).patch(`/colis/${colis.id}`, { description: `Modifie ${who}`, poidsKg: 3.5 });
      expect(r.status).toBe(200); expect(r.body.description).toBe(`Modifie ${who}`);
    });
    it.each([['OWNER'], ['AGENT']])('PATCH /lots/:id par %s -> 200', async (who) => {
      const r = await (who === 'OWNER' ? A() : AG()).patch(`/lots/${lot.id}`, { departPrevu: new Date(Date.now() + 86_400_000).toISOString() });
      expect(r.status).toBe(200);
    });
    it('autre tenant : PATCH client/colis/lot -> 404', async () => {
      expect((await B().patch(`/clients/${clientId}`, { fullName: 'Pirate' })).status).toBe(404);
      expect((await B().patch(`/colis/${colis.id}`, { description: 'Pirate' })).status).toBe(404);
      expect((await B().patch(`/lots/${lot.id}`, { reference: 'PIRATE' })).status).toBe(404);
    });
  });

  describe('archiver / desarchiver / cloturer / rouvrir : OWNER seulement', () => {
    let clientId: string, colis: { id: string }, lot: { id: string };
    beforeAll(async () => {
      clientId = (await A().post('/clients', { fullName: 'Client Roles', phone: '0755555555' })).body.id;
      colis = await newColis(app, t.ownerA); lot = await newLot(app, t.ownerA);
    });
    const actions = () => [[`/clients/${clientId}/archiver`], [`/clients/${clientId}/desarchiver`], [`/colis/${colis.id}/archiver`], [`/colis/${colis.id}/desarchiver`], [`/lots/${lot.id}/cloturer`], [`/lots/${lot.id}/rouvrir`]];
    it('AGENT -> 403 sur chaque action', async () => { for (const [u] of actions()) expect([u, (await AG().post(u)).status]).toEqual([u, 403]); });
    it('autre tenant -> 404 sur chaque action', async () => { for (const [u] of actions()) expect([u, (await B().post(u)).status]).toEqual([u, 404]); });
    it('OWNER -> 200 sur chaque action', async () => { for (const [u] of actions()) expect([u, (await A().post(u)).status]).toEqual([u, 200]); });
  });

  describe('DELETE (OWNER seulement, sans historique)', () => {
    it('AGENT -> 403, autre tenant -> 404', async () => {
      const c = await newColis(app, t.ownerA); const l = await newLot(app, t.ownerA);
      const clientId = (await A().post('/clients', { fullName: 'Client Del', phone: '0766666661' })).body.id;
      for (const u of [`/colis/${c.id}`, `/lots/${l.id}`, `/clients/${clientId}`]) {
        expect([u, (await AG().del(u)).status]).toEqual([u, 403]);
        expect([u, (await B().del(u)).status]).toEqual([u, 404]);
      }
    });
    it('colis sans aucun checkpoint -> supprime', async () => {
      const c = await newColis(app, t.ownerA);
      expect((await A().del(`/colis/${c.id}`)).status).toBe(200);
      expect(await p.colis.count({ where: { id: c.id } })).toBe(0);
    });
    it('colis avec checkpoint propre -> 409 {message, action:archiver}', async () => {
      const c = await newColis(app, t.ownerA);
      await A().post(`/colis/${c.id}/checkpoints`, { statut: 'RECU_ENTREPOT_CHINE', siteId: I.siteA });
      const r = await A().del(`/colis/${c.id}`);
      expect(r.status).toBe(409); expect(r.body).toEqual(expect.objectContaining({ message: expect.any(String), action: 'archiver' }));
    });
    it('colis avec checkpoint herite de son lot -> 409 action:archiver', async () => {
      const l = await newLot(app, t.ownerA); const c = await newColis(app, t.ownerA, { lotId: l.id }); await sleep(20);
      await A().post(`/lots/${l.id}/checkpoints`, { statut: 'CHARGE_DANS_LOT', siteId: I.siteA });
      const r = await A().del(`/colis/${c.id}`);
      expect(r.status).toBe(409); expect(r.body.action).toBe('archiver');
    });
    it('client sans colis -> supprime ; client avec colis -> 409 action:archiver', async () => {
      const free = (await A().post('/clients', { fullName: 'Client Libre', phone: '0766666662' })).body.id;
      expect((await A().del(`/clients/${free}`)).status).toBe(200);
      const withColis = (await p.colis.findFirstOrThrow({ where: { tenantId: I.tA } })).clientId;
      const r = await A().del(`/clients/${withColis}`);
      expect(r.status).toBe(409); expect(r.body).toEqual(expect.objectContaining({ message: expect.any(String), action: 'archiver' }));
    });
    it('lot vierge -> supprime', async () => {
      const l = await newLot(app, t.ownerA);
      expect((await A().del(`/lots/${l.id}`)).status).toBe(200);
    });
    it('lot ayant eu un colis (meme retire) -> 409 action:cloturer', async () => {
      const l = await newLot(app, t.ownerA); const c = await newColis(app, t.ownerA, { lotId: l.id }); await sleep(10);
      expect((await A().del(`/lots/${l.id}/colis/${c.id}`)).status).toBe(200);
      const r = await A().del(`/lots/${l.id}`);
      expect(r.status).toBe(409); expect(r.body).toEqual(expect.objectContaining({ message: expect.any(String), action: 'cloturer' }));
    });
    it('lot ayant recu un checkpoint (sans colis) -> 409 action:cloturer', async () => {
      const l = await newLot(app, t.ownerA);
      await A().post(`/lots/${l.id}/checkpoints`, { statut: 'CHARGE_DANS_LOT', siteId: I.siteA });
      const r = await A().del(`/lots/${l.id}`);
      expect(r.status).toBe(409); expect(r.body.action).toBe('cloturer');
    });
  });

  describe('listes, stats et page publique des archives', () => {
    let colis: { id: string; trackingCode: string }; let clientId: string; let statsBefore: { colis: number; clients: number };
    beforeAll(async () => {
      statsBefore = (await A().get('/dashboard/stats')).body;
      colis = await newColis(app, t.ownerA);
      await A().post(`/colis/${colis.id}/checkpoints`, { statut: 'RECU_ENTREPOT_CHINE', siteId: I.siteA });
      clientId = (await p.colis.findUniqueOrThrow({ where: { id: colis.id } })).clientId;
      expect((await A().post(`/colis/${colis.id}/archiver`)).status).toBe(200);
      expect((await A().post(`/clients/${clientId}/archiver`)).status).toBe(200);
    });
    it('GET /colis exclut l archive, ?archives=1 l inclut', async () => {
      expect((await A().get('/colis')).body.map((c: { id: string }) => c.id)).not.toContain(colis.id);
      expect((await A().get('/colis?archives=1')).body.map((c: { id: string }) => c.id)).toContain(colis.id);
    });
    it('GET /clients exclut l archive, ?archives=1 l inclut', async () => {
      expect((await A().get('/clients')).body.map((c: { id: string }) => c.id)).not.toContain(clientId);
      expect((await A().get('/clients?archives=1')).body.map((c: { id: string }) => c.id)).toContain(clientId);
    });
    it('dashboard/stats ne compte pas les archives (colis et clients)', async () => {
      const s = (await A().get('/dashboard/stats')).body;
      expect(s.colis).toBe(statsBefore.colis);
      expect(s.clients).toBe(statsBefore.clients);
    });
    it('page publique d un colis archive : 200 {code, statut:inactif, transitaire}, sans historique ni id', async () => {
      const r = await api(app).get(`/public/suivi/${colis.trackingCode}`);
      expect(r.status).toBe(200);
      expect(r.body).toEqual(expect.objectContaining({ code: colis.trackingCode, statut: 'inactif', transitaire: expect.any(Object) }));
      for (const k of ['checkpoints', 'historique', 'statutActuel']) expect(r.body).not.toHaveProperty(k);
      const keys = keysDeep(r.body); for (const k of FORBIDDEN_KEYS) expect(keys).not.toContain(k);
    });
    it('code inconnu : toujours le meme 404 que code malforme', async () => {
      const u = await api(app).get('/public/suivi/ABCD-EFGH-JKMN'); const m = await api(app).get('/public/suivi/xx!!');
      expect(u.status).toBe(404); expect(u.body).toEqual(m.body);
    });
    it('desarchiver le colis restaure la reponse publique normale', async () => {
      expect((await A().post(`/colis/${colis.id}/desarchiver`)).status).toBe(200);
      const r = await api(app).get(`/public/suivi/${colis.trackingCode}`);
      expect(r.status).toBe(200); expect(r.body.statut).toBeUndefined();
      expect(Array.isArray(r.body.checkpoints)).toBe(true); expect(r.body.checkpoints.length).toBeGreaterThan(0);
      // NOTE (non asserte) : comportement du suivi public quand seul le CLIENT est archive
      // eslint-disable-next-line no-console
      console.log(`NOTE client archive (colis actif) -> public HTTP ${r.status}, statut=${r.body.statut ?? '(absent)'}, checkpoints=${r.body.checkpoints?.length}`);
    });
  });

  describe('lot cloture', () => {
    let lot: { id: string }; let inLot: { id: string }; let other: { id: string }; let clientId: string;
    beforeAll(async () => {
      lot = await newLot(app, t.ownerA); inLot = await newColis(app, t.ownerA, { lotId: lot.id }); other = await newColis(app, t.ownerA);
      clientId = (await p.colis.findUniqueOrThrow({ where: { id: other.id } })).clientId;
      await sleep(20);
      expect((await A().post(`/lots/${lot.id}/cloturer`)).status).toBe(200);
    });
    it('nouveau checkpoint de lot -> 409', async () => { expect((await A().post(`/lots/${lot.id}/checkpoints`, { statut: 'ARRIVE_ABIDJAN', siteId: I.siteA })).status).toBe(409); });
    it('affectation POST /lots/:id/colis -> 409', async () => { expect((await A().post(`/lots/${lot.id}/colis`, { colisIds: [other.id] })).status).toBe(409); });
    it('POST /colis avec ce lotId -> 409', async () => { expect((await A().post('/colis', { clientId, description: 'Vers lot clos', mode: 'MER', lotId: lot.id })).status).toBe(409); });
    it('checkpoints au niveau colis d un colis du lot clos acceptes (DISPONIBLE_AU_RETRAIT puis REMIS_AU_CLIENT -> 201)', async () => {
      expect((await AG().post(`/colis/${inLot.id}/checkpoints`, { statut: 'DISPONIBLE_AU_RETRAIT', siteId: I.siteA })).status).toBe(201);
      await sleep(10);
      expect((await AG().post(`/colis/${inLot.id}/checkpoints`, { statut: 'REMIS_AU_CLIENT', siteId: I.siteA })).status).toBe(201);
      expect((await A().get(`/colis/${inLot.id}`)).body.statutActuel).toBe('REMIS_AU_CLIENT');
    });
    it('rouvrir restaure checkpoint et affectation', async () => {
      expect((await A().post(`/lots/${lot.id}/rouvrir`)).status).toBe(200);
      expect((await A().post(`/lots/${lot.id}/checkpoints`, { statut: 'ARRIVE_ABIDJAN', siteId: I.siteA })).status).toBe(201);
      expect((await A().post(`/lots/${lot.id}/colis`, { colisIds: [other.id] })).status).toBe(201);
      expect((await A().post('/colis', { clientId, description: 'Lot rouvert', mode: 'MER', lotId: lot.id })).status).toBe(201);
    });
    it('retrait DELETE /lots/:id/colis/:colisId sur lot clos -> 200', async () => {
      expect((await A().post(`/lots/${lot.id}/cloturer`)).status).toBe(200);
      expect((await A().del(`/lots/${lot.id}/colis/${other.id}`)).status).toBe(200);
    });
  });
});
