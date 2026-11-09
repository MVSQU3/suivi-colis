import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, resetDb, tokens } from './helpers';

const FORBIDDEN_KEYS = ['id', 'tenantId', 'lotId', 'colisId', 'siteId', 'createdById', 'clientId'];
function keysDeep(o: unknown, acc: string[] = []): string[] {
  if (Array.isArray(o)) o.forEach((x) => keysDeep(x, acc));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { acc.push(k); keysDeep(v, acc); }
  return acc;
}

describe('8. Suivi public GET /public/suivi/:code', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let lotCode: string, exceptionCode: string;
  const lotRefs: string[] = [];
  const pub = (code: string) => api(app).get(`/public/suivi/${encodeURIComponent(code)}`);

  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    lotCode = (await p.colis.findFirstOrThrow({ where: { tenantId: I.tA, description: { contains: 'porter' } } })).trackingCode; // lot MSKU7788123 (note interne)
    exceptionCode = (await p.colis.findFirstOrThrow({ where: { tenantId: I.tA, description: { startsWith: 'Cosm' } } })).trackingCode;
    lotRefs.push(...(await p.lot.findMany()).map((l) => l.reference));
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  it('forme : {transitaire, statutActuel, checkpoints[{date,lieu,statut,libelle}]}', async () => {
    const r = await pub(lotCode);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty('transitaire'); expect(r.body).toHaveProperty('statutActuel');
    expect(Array.isArray(r.body.checkpoints)).toBe(true); expect(r.body.checkpoints.length).toBeGreaterThan(0);
    for (const c of r.body.checkpoints) {
      for (const k of ['date', 'lieu', 'statut', 'libelle']) expect(c).toHaveProperty(k);
      expect(Number.isNaN(new Date(c.date).getTime())).toBe(false);
    }
  });
  it.each([['colis en lot'], ['colis en exception']])('aucun identifiant interne (%s)', async (w) => {
    const r = await pub(w === 'colis en lot' ? lotCode : exceptionCode);
    const keys = keysDeep(r.body);
    for (const k of FORBIDDEN_KEYS) expect(keys).not.toContain(k);
  });
  it('aucune reference de lot dans la reponse', async () => {
    const s = JSON.stringify((await pub(lotCode)).body).toUpperCase();
    for (const ref of lotRefs) expect(s).not.toContain(ref.toUpperCase());
  });
  it('code inconnu et code malforme : meme 404, meme corps', async () => {
    const unknown = await pub('ABCD-EFGH-JKMN');
    const malformed = await pub('xx!!');
    expect(unknown.status).toBe(404); expect(malformed.status).toBe(404);
    expect(unknown.body).toEqual(malformed.body);
  });
  it('commentaire present sur les checkpoints EXCEPTION', async () => {
    const r = await pub(exceptionCode);
    const ex = r.body.checkpoints.filter((c: { statut: string }) => c.statut === 'EXCEPTION');
    expect(ex.length).toBeGreaterThan(0);
    for (const c of ex) expect(typeof c.commentaire).toBe('string');
  });
  it('commentaire absent des checkpoints non-EXCEPTION ; note interne de lot jamais exposee (seed)', async () => {
    const r = await pub(lotCode);
    for (const c of r.body.checkpoints) if (c.statut !== 'EXCEPTION') expect(c).not.toHaveProperty('commentaire');
    expect(JSON.stringify(r.body)).not.toMatch(/NOTE INTERNE|connaissement/i);
  });
  it('note interne posee via API sur un checkpoint de lot jamais exposee', async () => {
    const lot = (await p.lot.findFirstOrThrow({ where: { tenantId: I.tA, reference: 'MSKU7788123' } })).id;
    const r = await api(app, t.ownerA).post(`/lots/${lot}/checkpoints`, { statut: 'ARRIVE_DESTINATION', siteId: I.siteA, commentaire: 'SECRET-DOUANE-4242', lieu: 'quai interne 7' });
    expect(r.status).toBe(201);
    const s = JSON.stringify((await pub(lotCode)).body);
    expect(s).not.toContain('SECRET-DOUANE-4242'); expect(s).not.toContain('quai interne 7');
  });

  describe('lieux texte libre historiques (siteId null) contenant la reference du lot', () => {
    const variants: [string, string][] = [
      ['MSKU7788123', 'conteneur MSKU 7788123'],
      ['MSKU7788123', 'Lot MSKU7788123 \u2013 Guangzhou'],
      ['MSKU7788123', 'Lot MSKU7788123 - Guangzhou'],
      ['MSKU7788123', 'Conteneur MSKU7788123 charge'],
      ['MSKU7788123', 'conteneur msku7788123'],
      ['MSKU7788123', 'Conteneur MSKU-7788123'],
      ['MSKU7788123', 'Conteneur n\u00b0 7788123'],
      ['MSKU7788123', 'Guangzhou (lot MSKU7788123)'],
      ['ET-908-LTA-071-22334455', 'Lot ET-908 \u2013 Guangzhou'],
      ['ET-908-LTA-071-22334455', 'Vol ET-908 vers Abidjan'],
      ['ET-908-LTA-071-22334455', 'LTA 071-22334455 Baiyun'],
    ];
    const results = new Map<string, string>();
    beforeAll(async () => {
      const codes = new Map<string, string>();
      const base = Date.now() - 60 * 60_000;
      let i = 0;
      for (const ref of new Set(variants.map((v) => v[0]))) {
        const lot = await p.lot.findFirstOrThrow({ where: { tenantId: I.tA, reference: ref } });
        const c = await newColis(app, t.ownerA);
        await p.affectationLot.updateMany({ where: { colisId: c.id, fin: null }, data: { fin: new Date(base - 1000) } });
        await p.affectationLot.create({ data: { tenantId: I.tA, colisId: c.id, lotId: lot.id, debut: new Date(base - 500) } });
        codes.set(ref, c.trackingCode);
      }
      const dates = new Map<string, string>();
      for (const [ref, lieu] of variants) {
        const lot = await p.lot.findFirstOrThrow({ where: { tenantId: I.tA, reference: ref } });
        const d = new Date(base + 1000 * ++i);
        await p.checkpoint.create({ data: { tenantId: I.tA, lotId: lot.id, statut: 'CHARGE_DANS_LOT', lieu, date: d } });
        dates.set(`${ref}|${lieu}`, d.toISOString());
      }
      for (const [ref, code] of codes) {
        const r = await pub(code);
        for (const [vr, lieu] of variants) if (vr === ref) {
          const cp = r.body.checkpoints.find((c: { date: string }) => c.date === dates.get(`${ref}|${lieu}`));
          results.set(`${ref}|${lieu}`, cp ? (cp.lieu ?? '') : '<absent>');
        }
      }
      // eslint-disable-next-line no-console
      console.log('Lieux publics affiches :\n' + [...results].map(([k, v]) => `  ${JSON.stringify(k.split('|')[1])} -> ${JSON.stringify(v)}`).join('\n'));
    });
    it.each(variants)('lot %s, lieu %p : aucune fuite de reference', (ref, lieu) => {
      const shown = results.get(`${ref}|${lieu}`)!;
      expect(shown).not.toBe('<absent>');
      const fragments = [ref, ...ref.split('-'), ...ref.split(/(?<=[A-Z])(?=\d)/)].filter((f) => f.length >= 3 && !/^(LTA)$/.test(f));
      for (const f of fragments) expect(shown.toUpperCase().replace(/[\s-]/g, '')).not.toContain(f.toUpperCase());
    });
  });
});
