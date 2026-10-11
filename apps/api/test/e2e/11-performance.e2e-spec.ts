import { INestApplication } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { api, bootApp, ids, resetDb, sleep, tokens } from './helpers';

describe('11. Performance : nombre de requetes SQL independant de N', () => {
  let app: INestApplication; let t: Awaited<ReturnType<typeof tokens>>;
  const logged = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
  let n = 0;
  (logged as unknown as { $on: (e: 'query', cb: (ev: Prisma.QueryEvent) => void) => void }).$on('query', () => { n++; });
  const routes = ['/dashboard/stats', '/colis', '/lots', '/clients'];
  const measure = async () => {
    const res: Record<string, number> = {};
    for (const r of routes) {
      await sleep(50); n = 0;
      const resp = await api(app, t.ownerA).get(r);
      expect(resp.status).toBe(200);
      await sleep(50); res[r] = n;
    }
    return res;
  };
  let small: Record<string, number>, big: Record<string, number>;

  beforeAll(async () => {
    await resetDb();
    app = await bootApp(logged); t = await tokens(app);
    small = await measure();
    const I = await ids(logged);
    const client = await logged.client.findFirstOrThrow({ where: { tenantId: I.tA } });
    const lot = await logged.lot.create({ data: { tenantId: I.tA, reference: 'PERF-300', mode: 'MER' } });
    const rows = Array.from({ length: 300 }, (_, i) => ({ id: `perf-colis-${i}`, tenantId: I.tA, clientId: client.id, description: `Perf ${i}`, mode: 'MER' as const, trackingCode: `PERF-${String(i).padStart(4, '0')}-XXXX` }));
    await logged.colis.createMany({ data: rows });
    const debut = new Date(Date.now() - 3600_000);
    await logged.affectationLot.createMany({ data: rows.map((r) => ({ tenantId: I.tA, colisId: r.id, lotId: lot.id, debut })) });
    await logged.checkpoint.createMany({ data: rows.map((r) => ({ tenantId: I.tA, colisId: r.id, siteId: I.siteA, statut: 'RECU_ENTREPOT_CHINE' as const, lieu: 'x', date: debut })) });
    await logged.checkpoint.create({ data: { tenantId: I.tA, lotId: lot.id, siteId: I.siteA, statut: 'CHARGE_DANS_LOT', lieu: 'x', date: new Date() } });
    big = await measure();
    // eslint-disable-next-line no-console
    console.log('Requetes SQL par route (seed -> +300 colis) : ' + JSON.stringify({ small, big }));
  });
  afterAll(async () => { await app?.close(); await logged.$disconnect(); });

  it.each(routes)('%s : meme nombre de requetes avec 300 colis de plus', (r) => {
    expect(big[r]).toBeGreaterThan(0);
    expect(big[r]).toBe(small[r]);
  });
  it('dashboard/stats compte bien les 300 colis supplementaires', async () => {
    const s = await api(app, t.ownerA).get('/dashboard/stats');
    expect(s.body.colis).toBeGreaterThanOrEqual(300);
  });
});
