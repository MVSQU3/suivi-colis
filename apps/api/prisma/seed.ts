import { loadEnv } from '../src/env';
loadEnv();
import { PrismaClient, StatutCheckpoint as S, ModeTransport } from '@prisma/client';
import * as argon2 from 'argon2';
import { generateTrackingCode } from '../src/tracking-code';

const prisma = new PrismaClient();
const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day);

async function main() {
  const userPwd = process.env.SEED_USER_PASSWORD!;
  if (!userPwd || userPwd.startsWith('CHANGE_ME')) throw new Error('SEED_USER_PASSWORD manquant dans apps/api/.env');
  const hash = await argon2.hash(userPwd);

  const tenantDefs = [
    { slug: 'abidjan-express-cargo', name: 'Abidjan Express Cargo', phone: '+2252720000000', users: [['owner@abidjan-express.local', 'Koffi Owner', 'OWNER'], ['agent@abidjan-express.local', 'Aya Agent', 'AGENT']] },
    { slug: 'treichville-fret-rapide', name: 'Treichville Fret Rapide', phone: '+2252721000000', users: [['owner@treichville-fret.local', 'Mariam Owner', 'OWNER']] },
  ] as const;

  const tenants: Record<string, string> = {};
  for (const t of tenantDefs) {
    const tenant = await prisma.tenant.upsert({ where: { slug: t.slug }, update: {}, create: { slug: t.slug, name: t.name, phone: t.phone } });
    tenants[t.slug] = tenant.id;
    for (const [email, fullName, role] of t.users) {
      await prisma.user.upsert({ where: { email }, update: { passwordHash: hash, failedLogins: 0, lockedUntil: null }, create: { email, fullName, role, passwordHash: hash, tenantId: tenant.id } });
    }
  }

  const A = tenants['abidjan-express-cargo'];
  const B = tenants['treichville-fret-rapide'];
  if ((await prisma.colis.count({ where: { tenantId: { in: [A, B] } } })) === 0) {
    const client = (tenantId: string, fullName: string, phone: string, email: string | null, city: string) =>
      prisma.client.create({ data: { tenantId, fullName, phone, email, city } });
    const awa = await client(A, 'Awa Koné', '+2250700000001', 'awa.kone@example.com', 'Abidjan – Adjamé');
    const yao = await client(A, 'Yao Kouassi', '+2250500000002', 'yao.kouassi@example.com', 'Abidjan – Treichville');
    const fatou = await client(A, 'Fatou Traoré', '+2250100000003', null, 'Bouaké');
    const ibra = await client(B, 'Ibrahim Diallo', '+2250700000099', null, 'Abidjan – Yopougon');

    const colis = async (tenantId: string, clientId: string, description: string, mode: ModeTransport, cartons = 1, d = 40) => {
      const c = await prisma.colis.create({ data: { tenantId, clientId, description, mode, cartons, trackingCode: generateTrackingCode(), createdAt: ago(d) } });
      await prisma.checkpoint.create({ data: { tenantId, colisId: c.id, statut: S.RECU_ENTREPOT_CHINE, lieu: 'Entrepôt Guangzhou (Baiyun)', date: ago(d) } });
      return c;
    };
    const lot = (tenantId: string, reference: string, mode: ModeTransport) => prisma.lot.create({ data: { tenantId, reference, mode } });
    const affect = (tenantId: string, colisId: string, lotId: string, debut: Date, fin: Date | null = null) =>
      prisma.affectationLot.create({ data: { tenantId, colisId, lotId, debut, fin } });
    const lotCp = (tenantId: string, lotId: string, statut: S, lieu: string, date: Date, commentaire?: string) =>
      prisma.checkpoint.create({ data: { tenantId, lotId, statut, lieu, date, commentaire } });

    // Lot maritime de 4 colis
    const msku = await lot(A, 'MSKU7788123', 'MER');
    const c1 = await colis(A, awa.id, 'Prêt-à-porter femme', 'MER', 3);
    const c2 = await colis(A, awa.id, 'Chaussures', 'MER', 2);
    const c3 = await colis(A, yao.id, 'Pièces moto', 'MER');
    const c4 = await colis(A, fatou.id, 'Ustensiles de cuisine', 'MER');
    for (const c of [c1, c2, c3, c4]) await affect(A, c.id, msku.id, ago(36));
    await lotCp(A, msku.id, S.CHARGE_DANS_LOT, 'Lot MSKU7788123 – Guangzhou', ago(35));
    await lotCp(A, msku.id, S.PARTI_DE_CHINE, 'Port de Nansha, Guangzhou', ago(33), 'NOTE INTERNE : connaissement chez le transitaire du port, solde a regler avant arrivee');

    // Colis transféré entre deux lots
    const mscu = await lot(A, 'MSCU5544210', 'MER');
    const ct = await colis(A, yao.id, 'Climatiseur split, 1 carton', 'MER', 1, 45);
    await affect(A, ct.id, msku.id, ago(36), ago(34)); // retiré de MSKU avant le départ
    await affect(A, ct.id, mscu.id, ago(34));
    await lotCp(A, mscu.id, S.CHARGE_DANS_LOT, 'Lot MSCU5544210 – Guangzhou (antidaté, non hérité)', ago(40));
    await lotCp(A, mscu.id, S.PARTI_DE_CHINE, 'Port de Nansha, Guangzhou', ago(25));
    await lotCp(A, mscu.id, S.ARRIVE_ABIDJAN, "Port autonome d'Abidjan", ago(3));

    // Lot aérien + colis en exception
    const air = await lot(A, 'ET-908-LTA-071-22334455', 'AIR');
    const c5 = await colis(A, yao.id, 'Téléphones et accessoires', 'AIR', 1, 8);
    const c6 = await colis(A, fatou.id, 'Perruques', 'AIR', 1, 8);
    for (const c of [c5, c6]) await affect(A, c.id, air.id, ago(7));
    await lotCp(A, air.id, S.CHARGE_DANS_LOT, 'Lot ET-908 – Guangzhou', ago(7));
    await lotCp(A, air.id, S.PARTI_DE_CHINE, 'Aéroport Guangzhou Baiyun (CAN)', ago(6));
    await lotCp(A, air.id, S.ARRIVE_ABIDJAN, "Aéroport FHB d'Abidjan", ago(2));
    await lotCp(A, air.id, S.EN_DEDOUANEMENT, 'Douane – Aéroport FHB', ago(1));
    const cx = await colis(A, awa.id, 'Cosmétiques', 'AIR', 1, 8);
    await prisma.checkpoint.create({ data: { tenantId: A, colisId: cx.id, statut: S.EXCEPTION, lieu: 'Entrepôt Guangzhou (Baiyun)', commentaire: 'Produits liquides refusés au fret aérien : en attente de consignes du client', date: ago(6) } });

    // Colis livré hors lot (historique complet)
    const c8 = await colis(A, yao.id, 'Écouteurs Bluetooth', 'AIR', 1, 20);
    const steps: [S, string, number][] = [[S.PARTI_DE_CHINE, 'Aéroport Guangzhou Baiyun (CAN)', 18], [S.ARRIVE_ABIDJAN, "Aéroport FHB d'Abidjan", 16], [S.EN_DEDOUANEMENT, 'Douane – Aéroport FHB', 15], [S.DISPONIBLE_AU_RETRAIT, 'Magasin Abidjan Express, Treichville', 14], [S.REMIS_AU_CLIENT, 'Remis au client – Treichville', 12]];
    for (const [statut, lieu, d] of steps) await prisma.checkpoint.create({ data: { tenantId: A, colisId: c8.id, statut, lieu, date: ago(d) } });

    // Lot maritime en cours de chargement (demo « mise a jour groupee ») : 5 colis, 5 clients
    const koua = await client(A, 'Kouamé N\'Guessan', '+2250707000004', null, 'Abidjan - Cocody');
    const mari = await client(A, 'Mariam Ouattara', '+2250505000005', 'mariam.ouattara@example.com', 'Abidjan - Marcory');
    const msc = await lot(A, 'MSCU9081726', 'MER');
    const chargement: [string, string, number][] = [[awa.id, 'Pagnes wax, 2 cartons', 2], [yao.id, 'Pneus moto, 4 pièces', 2], [fatou.id, 'Robes de soirée, 1 carton', 1], [koua.id, 'Téléphones, 1 carton', 1], [mari.id, 'Mèches et perruques, 1 carton', 1]];
    for (const [cid, desc, n] of chargement) { const c = await colis(A, cid, desc, 'MER', n, 6); await affect(A, c.id, msc.id, ago(5)); }
    await lotCp(A, msc.id, S.CHARGE_DANS_LOT, 'Entrepôt Guangzhou (Baiyun)', ago(4));

    // Lot arrive a Abidjan (demo « fin de vie ») : un colis deja disponible au retrait
    const disp = await colis(A, koua.id, 'Groupe électrogène, 1 caisse', 'MER', 1, 40);
    const autre = await colis(A, mari.id, 'Ustensiles et vaisselle, 3 cartons', 'MER', 3, 40);
    for (const c of [disp, autre]) await affect(A, c.id, mscu.id, ago(34));
    await prisma.checkpoint.create({ data: { tenantId: A, colisId: disp.id, statut: S.DISPONIBLE_AU_RETRAIT, lieu: 'Magasin Treichville', date: ago(1) } });
    // Tenant B
    const lb = await lot(B, 'CMAU3322110', 'MER');
    for (const desc of ['Tissus wax', 'Sacs à main']) {
      const c = await colis(B, ibra.id, desc, 'MER', 2, 20);
      await affect(B, c.id, lb.id, ago(19));
    }
    await lotCp(B, lb.id, S.CHARGE_DANS_LOT, 'Lot CMAU3322110 – Guangzhou', ago(18));
  }

  // Sites par defaut pour chaque tenant (idempotent, insensible a la casse)
  const SITES = ['Entrepôt Guangzhou (Baiyun)', 'Port de Nansha', "Port autonome d'Abidjan", 'Aéroport FHB'];
  for (const t of await prisma.tenant.findMany()) {
    const exist = new Set((await prisma.site.findMany({ where: { tenantId: t.id } })).map((s) => s.nom.trim().toLowerCase()));
    for (const nom of SITES) if (!exist.has(nom.toLowerCase())) await prisma.site.create({ data: { tenantId: t.id, nom } });
  }

  // Rattache les checkpoints de demo sans site a un site plausible (statut + mode de transport)
  const EXTRA = ['Aéroport Guangzhou Baiyun (CAN)', 'Magasin Treichville'];
  for (const t of await prisma.tenant.findMany()) {
    const exist = new Set((await prisma.site.findMany({ where: { tenantId: t.id } })).map((s) => s.nom.trim().toLowerCase()));
    for (const nom of EXTRA) if (!exist.has(nom.toLowerCase())) await prisma.site.create({ data: { tenantId: t.id, nom } });
    const sites = new Map((await prisma.site.findMany({ where: { tenantId: t.id } })).map((s) => [s.nom, s.id]));
    const cps = await prisma.checkpoint.findMany({ where: { tenantId: t.id, siteId: null }, include: { lot: true, colis: true } });
    for (const cp of cps) {
      const air = (cp.lot?.mode ?? cp.colis?.mode) === 'AIR';
      const nom = ({
        RECU_ENTREPOT_CHINE: 'Entrepôt Guangzhou (Baiyun)', CHARGE_DANS_LOT: 'Entrepôt Guangzhou (Baiyun)', EXCEPTION: 'Entrepôt Guangzhou (Baiyun)',
        PARTI_DE_CHINE: air ? 'Aéroport Guangzhou Baiyun (CAN)' : 'Port de Nansha',
        ARRIVE_ABIDJAN: air ? 'Aéroport FHB' : "Port autonome d'Abidjan", EN_DEDOUANEMENT: air ? 'Aéroport FHB' : "Port autonome d'Abidjan",
        DISPONIBLE_AU_RETRAIT: 'Magasin Treichville', REMIS_AU_CLIENT: 'Magasin Treichville',
      } as Record<string, string>)[cp.statut];
      if (nom && sites.get(nom)) await prisma.checkpoint.update({ where: { id: cp.id }, data: { siteId: sites.get(nom) } });
    }
  }
  const all = await prisma.colis.findMany({ include: { tenant: true }, orderBy: { createdAt: 'asc' } });
  console.log('\nCodes de suivi :');
  for (const c of all) console.log(`  ${c.trackingCode}  ${c.tenant.name.padEnd(24)} ${c.description}`);
  console.log('\nComptes : owner@abidjan-express.local, agent@abidjan-express.local, owner@treichville-fret.local (mot de passe : SEED_USER_PASSWORD dans apps/api/.env)');
}
main().finally(() => prisma.$disconnect());
