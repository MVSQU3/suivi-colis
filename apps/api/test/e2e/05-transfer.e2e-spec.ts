import { INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { api, bootApp, ids, newColis, newLot, resetDb, sleep, tokens } from './helpers';

describe('5. Transfert de colis entre lots', () => {
  let app: INestApplication; const p = new PrismaClient(); let t: Awaited<ReturnType<typeof tokens>>; let I: Awaited<ReturnType<typeof ids>>;
  let L1: { id: string }, L2: { id: string }, C: { id: string };
  const cp: Record<string, string> = {};
  let transferAt: Date;
  let hist: string[];

  beforeAll(async () => {
    await resetDb(); app = await bootApp(); t = await tokens(app); I = await ids(p);
    L1 = await newLot(app, t.ownerA); L2 = await newLot(app, t.ownerA);
    C = await newColis(app, t.ownerA, { lotId: L1.id });
    await sleep(30);
    const a = api(app, t.ownerA);
    cp.l1Before = (await a.post(`/lots/${L1.id}/checkpoints`, { statut: 'CHARGE_DANS_LOT', siteId: I.siteA })).body.checkpointId;
    // checkpoint du lot cible antidate (avant le transfert) : ne doit jamais etre herite
    cp.l2Backdated = (await a.post(`/lots/${L2.id}/checkpoints`, { statut: 'CHARGE_DANS_LOT', siteId: I.siteA, date: new Date(Date.now() - 3600_000).toISOString() })).body.checkpointId;
    await sleep(30);
    const tr = await a.post(`/lots/${L2.id}/colis`, { colisIds: [C.id] });
    expect(tr.status).toBe(201);
    const open = await p.affectationLot.findFirstOrThrow({ where: { colisId: C.id, fin: null } });
    transferAt = open.debut;
    await sleep(30);
    cp.l1After = (await a.post(`/lots/${L1.id}/checkpoints`, { statut: 'PARTI_DE_CHINE', siteId: I.siteA })).body.checkpointId;
    cp.l2After = (await a.post(`/lots/${L2.id}/checkpoints`, { statut: 'PARTI_DE_CHINE', siteId: I.siteA })).body.checkpointId;
    // bornes exactes : debut inclusif (L2 @ transferAt herite), fin exclusive (L1 @ transferAt non herite)
    cp.l2AtBoundary = (await p.checkpoint.create({ data: { tenantId: I.tA, lotId: L2.id, siteId: I.siteA, statut: 'CHARGE_DANS_LOT', lieu: 'borne', date: transferAt } })).id;
    cp.l1AtBoundary = (await p.checkpoint.create({ data: { tenantId: I.tA, lotId: L1.id, siteId: I.siteA, statut: 'CHARGE_DANS_LOT', lieu: 'borne', date: transferAt } })).id;
    cp.l2JustBefore = (await p.checkpoint.create({ data: { tenantId: I.tA, lotId: L2.id, siteId: I.siteA, statut: 'CHARGE_DANS_LOT', lieu: 'borne-1ms', date: new Date(transferAt.getTime() - 1) } })).id;
    cp.l1JustBefore = (await p.checkpoint.create({ data: { tenantId: I.tA, lotId: L1.id, siteId: I.siteA, statut: 'CHARGE_DANS_LOT', lieu: 'borne-1ms', date: new Date(transferAt.getTime() - 1) } })).id;
    hist = (await a.get(`/colis/${C.id}`)).body.historique.map((h: { id: string }) => h.id);
  });
  afterAll(async () => { await app?.close(); await p.$disconnect(); });

  it('ancienne affectation fermee a la date du transfert, nouvelle ouverte a la meme date', async () => {
    const affs = await p.affectationLot.findMany({ where: { colisId: C.id }, orderBy: { debut: 'asc' } });
    expect(affs).toHaveLength(2);
    expect(affs[0].lotId).toBe(L1.id); expect(affs[0].fin?.getTime()).toBe(transferAt.getTime());
    expect(affs[1].lotId).toBe(L2.id); expect(affs[1].fin).toBeNull();
  });
  it('garde les checkpoints de l ancien lot anterieurs au transfert', () => { expect(hist).toContain(cp.l1Before); });
  it('ne recoit pas les checkpoints de l ancien lot posterieurs au transfert', () => { expect(hist).not.toContain(cp.l1After); });
  it('recoit les checkpoints du nouveau lot dates >= transfert', () => { expect(hist).toContain(cp.l2After); });
  it('ne recoit jamais les checkpoints antidates du nouveau lot', () => { expect(hist).not.toContain(cp.l2Backdated); });
  it('borne : debut inclusif (checkpoint nouveau lot a date = debut herite)', () => { expect(hist).toContain(cp.l2AtBoundary); });
  it('borne : fin exclusive (checkpoint ancien lot a date = fin non herite)', () => { expect(hist).not.toContain(cp.l1AtBoundary); });
  it('borne : 1 ms avant transfert -> ancien lot herite, nouveau lot non', () => {
    expect(hist).toContain(cp.l1JustBefore); expect(hist).not.toContain(cp.l2JustBefore);
  });
  it('le statut actuel suit le nouveau lot', async () => {
    expect((await api(app, t.ownerA).get(`/colis/${C.id}`)).body.statutActuel).toBe('PARTI_DE_CHINE');
  });
});
