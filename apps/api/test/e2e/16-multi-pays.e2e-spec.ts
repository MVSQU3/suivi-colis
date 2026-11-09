import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, login, resetDb, tokens } from './helpers';

const OWNER_SN = 'owner@dakar-fret.local';

describe('16. Multi-pays : transitaire hors Cote d\'Ivoire', () => {
  let app: INestApplication; let p: PrismaClient; let t: Awaited<ReturnType<typeof tokens>>; let sn: string;
  beforeAll(async () => { await resetDb(); app = await bootApp(); p = new PrismaClient(); t = await tokens(app); sn = await login(app, OWNER_SN); });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  describe('parametres', () => {
    it('/auth/me expose pays, devise, fuseau et langue du tenant', async () => {
      const r = await api(app, sn).get('/auth/me');
      expect(r.body.tenant).toEqual({ name: 'Dakar Fret Express', paysCode: 'SN', devise: 'XOF', fuseau: 'Africa/Dakar', langue: 'fr' });
    });
    it('les tenants existants restent ivoiriens par defaut', async () => {
      const r = await api(app, t.ownerA).get('/parametres');
      expect(r.body).toEqual(expect.objectContaining({ paysCode: 'CI', devise: 'XOF', fuseau: 'Africa/Abidjan' }));
    });
    it('GET /parametres/pays -> 54 pays', async () => {
      const r = await api(app, t.agentA).get('/parametres/pays');
      expect(r.status).toBe(200); expect(r.body).toHaveLength(54);
    });
    it('AGENT ne peut pas modifier -> 403', async () => {
      expect((await api(app, t.agentA).patch('/parametres', { paysCode: 'NG' })).status).toBe(403);
    });
    it('changer de pays reprend devise et fuseau du pays', async () => {
      const r = await api(app, t.ownerB).patch('/parametres', { paysCode: 'ng' });
      expect(r.status).toBe(200); expect(r.body).toEqual(expect.objectContaining({ paysCode: 'NG', devise: 'NGN', fuseau: 'Africa/Lagos' }));
    });
    it('devise et fuseau explicites priment', async () => {
      const r = await api(app, t.ownerB).patch('/parametres', { paysCode: 'ZW', devise: 'zar', fuseau: 'Africa/Harare' });
      expect(r.body).toEqual(expect.objectContaining({ paysCode: 'ZW', devise: 'ZAR', fuseau: 'Africa/Harare' }));
    });
    it.each([[{ paysCode: 'FR' }, 'paysCode'], [{ devise: 'XYZ' }, 'devise'], [{ fuseau: 'Afrique/Nulle_Part' }, 'fuseau']])('%p -> 400', async (body, champ) => {
      const r = await api(app, t.ownerB).patch('/parametres', body);
      expect(r.status).toBe(400); expect(r.body.champ).toBe(champ);
    });
    it('corps vide -> 400', async () => { expect((await api(app, t.ownerB).patch('/parametres', {})).status).toBe(400); });
    it('isolation : la modification ne touche que son tenant', async () => {
      expect((await api(app, t.ownerA).get('/parametres')).body.paysCode).toBe('CI');
    });
  });

  describe('telephone des clients', () => {
    it('numero local senegalais -> E.164 +221', async () => {
      const r = await api(app, sn).post('/clients', { fullName: 'Cheikh Ndiaye', phone: '76 555 44 33' });
      expect(r.status).toBe(201); expect(r.body.phone).toBe('+221765554433');
    });
    it('chez un transitaire senegalais, un numero ivoirien sans indicatif est refuse avec un exemple local', async () => {
      const r = await api(app, sn).post('/clients', { fullName: 'Sans indicatif', phone: '07 07 12 34 56' });
      expect(r.status).toBe(400); expect(r.body.champ).toBe('phone'); expect(String(r.body.message)).toContain('77 123 45 67');
    });
    it('avec indicatif, un client d\'un autre pays africain est accepte', async () => {
      const r = await api(app, t.ownerA).post('/clients', { fullName: 'Client a Lome', phone: '+228 90 12 34 56' });
      expect(r.status).toBe(201); expect(r.body.phone).toBe('+22890123456');
    });
    it('doublon detecte quelle que soit la forme de saisie', async () => {
      const r = await api(app, sn).post('/clients', { fullName: 'Doublon', phone: '00221 76 555 44 33' });
      expect(r.status).toBe(409);
    });
    it('PATCH valide aussi avec le pays du transitaire', async () => {
      const c = (await api(app, sn).get('/clients?q=Cheikh')).body[0];
      expect((await api(app, sn).patch(`/clients/${c.id}`, { phone: '0707123456' })).status).toBe(400);
      const ok = await api(app, sn).patch(`/clients/${c.id}`, { phone: '78 111 22 33' });
      expect(ok.status).toBe(200); expect(ok.body.phone).toBe('+221781112233');
    });
  });

  describe('suivi public', () => {
    it('le lot arrive a Dakar : statut generique, lieu Dakar, fuseau du transitaire', async () => {
      const tenant = await p.tenant.findUniqueOrThrow({ where: { slug: 'dakar-fret-express' } });
      const c = await p.colis.findFirstOrThrow({ where: { tenantId: tenant.id } });
      const r = await api(app).get(`/public/suivi/${c.trackingCode}`);
      expect(r.status).toBe(200);
      expect(r.body.statutActuel).toEqual({ statut: 'ARRIVE_DESTINATION', libelle: 'Arrivé dans le pays de destination' });
      expect(r.body.checkpoints.at(-1).lieu).toBe('Port autonome de Dakar');
      expect(r.body.transitaire).toEqual({ nom: 'Dakar Fret Express', telephone: '+221338000000', couleur: expect.any(String), pays: 'SN', fuseau: 'Africa/Dakar' });
    });
    it('les sites proposes dependent du pays', async () => {
      const noms = (await api(app, sn).get('/sites')).body.map((s: { nom: string }) => s.nom);
      expect(noms).toEqual(expect.arrayContaining(['Port autonome de Dakar', 'Entrepôt Guangzhou (Baiyun)']));
      expect(noms).not.toContain("Port autonome d'Abidjan");
    });
  });
});
