import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import request = require('supertest');
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma.service';

export const API = '/api/v1';
export const EMAILS = {
  ownerA: 'owner@abidjan-express.local',
  agentA: 'agent@abidjan-express.local',
  ownerB: 'owner@treichville-fret.local',
} as const;

export function assertE2eDb() {
  if (!/\/suivicolis_e2e(\?.*)?$/.test(process.env.DATABASE_URL ?? '')) throw new Error('DATABASE_URL ne pointe pas sur suivicolis_e2e : arret');
}

/** Vide toutes les tables metier puis rejoue prisma/seed.ts sur suivicolis_e2e. */
export async function resetDb() {
  assertE2eDb();
  const p = new PrismaClient();
  try {
    await p.$executeRawUnsafe('TRUNCATE "Checkpoint","AffectationLot","Colis","Lot","Client","Site","User","Tenant" CASCADE');
  } finally { await p.$disconnect(); }
  const apiDir = path.resolve(__dirname, '..', '..');
  execFileSync(process.execPath, [require.resolve('ts-node/dist/bin.js', { paths: [apiDir] }), '--transpile-only', 'prisma/seed.ts'], {
    cwd: apiDir, env: { ...process.env }, stdio: 'pipe',
  });
}

export async function bootApp(prismaOverride?: PrismaClient): Promise<INestApplication> {
  assertE2eDb();
  let b = Test.createTestingModule({ imports: [AppModule] });
  if (prismaOverride) b = b.overrideProvider(PrismaService).useValue(prismaOverride);
  const m = await b.compile();
  const app = m.createNestApplication({ logger: false });
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export function pwd(email: string): string {
  // seed.ts utilise SEED_USER_PASSWORD pour tous les comptes de demo
  const v = email.startsWith('admin') ? process.env.SEED_ADMIN_PASSWORD : process.env.SEED_USER_PASSWORD;
  if (!v) throw new Error('SEED_USER_PASSWORD manquant dans apps/api/.env');
  return v;
}

export async function login(app: INestApplication, email: string): Promise<string> {
  const r = await request(app.getHttpServer()).post(`${API}/auth/login`).send({ email, password: pwd(email) });
  if (r.status !== 200) throw new Error(`login ${email} -> ${r.status}`);
  return r.body.accessToken;
}

export async function tokens(app: INestApplication) {
  return { ownerA: await login(app, EMAILS.ownerA), agentA: await login(app, EMAILS.agentA), ownerB: await login(app, EMAILS.ownerB) };
}

/** Raccourcis HTTP authentifies. */
export function api(app: INestApplication, token?: string) {
  const s = () => request(app.getHttpServer());
  const auth = (t: request.Test) => (token ? t.set('Authorization', `Bearer ${token}`) : t);
  return {
    get: (u: string) => auth(s().get(API + u)),
    post: (u: string, body?: object) => auth(s().post(API + u)).send(body ?? {}),
    patch: (u: string, body?: object) => auth(s().patch(API + u)).send(body ?? {}),
    del: (u: string) => auth(s().delete(API + u)),
  };
}

export async function ids(p: PrismaClient) {
  const tA = await p.tenant.findUniqueOrThrow({ where: { slug: 'abidjan-express-cargo' } });
  const tB = await p.tenant.findUniqueOrThrow({ where: { slug: 'treichville-fret-rapide' } });
  const siteA = await p.site.findFirstOrThrow({ where: { tenantId: tA.id, actif: true }, orderBy: { nom: 'asc' } });
  const siteB = await p.site.findFirstOrThrow({ where: { tenantId: tB.id, actif: true }, orderBy: { nom: 'asc' } });
  return { tA: tA.id, tB: tB.id, siteA: siteA.id, siteB: siteB.id };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cree un client + un colis via l'API (tenant du token). */
export async function newColis(app: INestApplication, token: string, opts: { lotId?: string; phone?: string } = {}) {
  const a = api(app, token);
  const phone = opts.phone ?? '07' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0');
  const c = await a.post('/clients', { fullName: 'Client Test e2e', phone });
  if (c.status !== 201) throw new Error(`client -> ${c.status} ${JSON.stringify(c.body)}`);
  const x = await a.post('/colis', { clientId: c.body.id, description: 'Colis e2e', mode: 'MER', ...(opts.lotId ? { lotId: opts.lotId } : {}) });
  if (x.status !== 201) throw new Error(`colis -> ${x.status} ${JSON.stringify(x.body)}`);
  return x.body as { id: string; trackingCode: string };
}

export async function newLot(app: INestApplication, token: string, reference?: string) {
  const r = await api(app, token).post('/lots', { reference: reference ?? 'E2E-' + Math.random().toString(36).slice(2, 10).toUpperCase(), mode: 'MER' });
  if (r.status !== 201) throw new Error(`lot -> ${r.status}`);
  return r.body as { id: string; reference: string };
}
