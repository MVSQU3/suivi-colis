import { Body, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import * as argon2 from 'argon2';
import { normalizeTrackingCode, libelleStatut } from '@suivi-colis/shared';
import { PrismaService } from './prisma.service';
import { ColisService } from './colis.service';
import { CurrentUser, JwtAuthGuard, JwtUser, TenantId } from './auth';
import { AffecterDto, CheckpointDto, CreateClientDto, CreateColisDto, CreateLotDto, LoginDto } from './dto';

@ApiTags('auth') @SkipThrottle() @Controller('auth')
export class AuthController {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}
  @Post('login') @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const u = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() }, include: { tenant: true } });
    const bad = () => new UnauthorizedException('Identifiants invalides');
    if (!u || !u.isActive) throw bad();
    if (u.lockedUntil && u.lockedUntil > new Date()) throw new UnauthorizedException('Compte verrouillé temporairement');
    if (!(await argon2.verify(u.passwordHash, dto.password))) {
      const failed = u.failedLogins + 1;
      await this.prisma.user.update({ where: { id: u.id }, data: failed >= 5 ? { failedLogins: 0, lockedUntil: new Date(Date.now() + 15 * 60_000) } : { failedLogins: failed } });
      throw bad();
    }
    await this.prisma.user.update({ where: { id: u.id }, data: { failedLogins: 0, lockedUntil: null } });
    const payload: JwtUser = { sub: u.id, tenantId: u.tenantId, role: u.role, email: u.email };
    return { accessToken: this.jwt.sign(payload), user: { email: u.email, fullName: u.fullName, role: u.role, tenant: { name: u.tenant.name } } };
  }
  @Get('me') @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  async me(@CurrentUser() u: JwtUser) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: u.sub }, include: { tenant: true } });
    return { email: user.email, fullName: user.fullName, role: user.role, tenant: { name: user.tenant.name } };
  }
}

@ApiTags('transitaire') @ApiBearerAuth() @SkipThrottle() @UseGuards(JwtAuthGuard) @Controller()
export class BackOfficeController {
  constructor(private prisma: PrismaService, private colis: ColisService) {}

  @Get('dashboard/stats')
  async stats(@TenantId() tenantId: string) {
    const [clients, lots, colis] = await Promise.all([
      this.prisma.client.count({ where: { tenantId } }), this.prisma.lot.count({ where: { tenantId } }),
      this.prisma.colis.findMany({ where: { tenantId }, select: { id: true } }),
    ]);
    const parStatut: Record<string, number> = {};
    const statuts = await this.colis.statutsActuels(colis.map((c) => c.id));
    for (const s0 of statuts.values()) { const s = s0 ?? 'AUCUN'; parStatut[s] = (parStatut[s] ?? 0) + 1; }
    return { clients, lots, colis: colis.length, parStatut };
  }

  @Get('clients') clients(@TenantId() tenantId: string, @Query('q') q?: string) {
    return this.prisma.client.findMany({ where: { tenantId, ...(q ? { OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}) }, orderBy: { fullName: 'asc' } });
  }
  @Post('clients') createClient(@TenantId() tenantId: string, @Body() dto: CreateClientDto) {
    return this.prisma.client.create({ data: { ...dto, tenantId } });
  }
  @Get('clients/:id') async client(@TenantId() tenantId: string, @Param('id') id: string) {
    const c = await this.prisma.client.findFirst({ where: { id, tenantId }, include: { colis: true } });
    if (!c) throw new NotFoundException('Client introuvable');
    return c;
  }

  @Get('colis') async listColis(@TenantId() tenantId: string) {
    const list = await this.prisma.colis.findMany({ where: { tenantId }, include: { client: true, affectations: { where: { fin: null }, include: { lot: true } } }, orderBy: { createdAt: 'desc' } });
    const statuts = await this.colis.statutsActuels(list.map((c) => c.id));
    return list.map((c) => ({ id: c.id, trackingCode: c.trackingCode, description: c.description, mode: c.mode, client: c.client.fullName, lot: c.affectations[0]?.lot.reference ?? null, statutActuel: statuts.get(c.id) ?? null }));
  }
  @Post('colis') createColis(@TenantId() tenantId: string, @Body() dto: CreateColisDto) { return this.colis.create(tenantId, dto); }
  @Get('colis/:id') async getColis(@TenantId() tenantId: string, @Param('id') id: string) {
    const c = await this.colis.getOwned(tenantId, id);
    const historique = await this.colis.history(id);
    return { ...c, historique, statutActuel: historique.at(-1)?.statut ?? null };
  }
  @Post('colis/:id/checkpoints') addCp(@CurrentUser() u: JwtUser, @Param('id') id: string, @Body() dto: CheckpointDto) {
    return this.colis.addCheckpoint(u.tenantId, u.sub, id, dto);
  }

  @Get('lots') async lots(@TenantId() tenantId: string) {
    const lots = await this.prisma.lot.findMany({ where: { tenantId }, include: { _count: { select: { affectations: { where: { fin: null } } } }, checkpoints: { orderBy: { date: 'desc' }, take: 1 } }, orderBy: { createdAt: 'desc' } });
    return lots.map((l) => ({ id: l.id, reference: l.reference, mode: l.mode, nbColis: l._count.affectations, dernierStatut: l.checkpoints[0]?.statut ?? null }));
  }
  @Post('lots') createLot(@TenantId() tenantId: string, @Body() dto: CreateLotDto) { return this.prisma.lot.create({ data: { ...dto, tenantId } }); }
  @Get('lots/:id') async lot(@TenantId() tenantId: string, @Param('id') id: string) {
    const l = await this.prisma.lot.findFirst({ where: { id, tenantId }, include: { checkpoints: { orderBy: { date: 'asc' } }, affectations: { where: { fin: null }, include: { colis: { include: { client: true } } } } } });
    if (!l) throw new NotFoundException('Lot introuvable');
    return { id: l.id, reference: l.reference, mode: l.mode, checkpoints: l.checkpoints.map((c) => ({ ...c, libelle: libelleStatut(c.statut) })),
      colis: await this.colis.statutsActuels(l.affectations.map((a) => a.colis.id)).then((st) => l.affectations.map((a) => ({ id: a.colis.id, trackingCode: a.colis.trackingCode, description: a.colis.description, client: a.colis.client.fullName, statutActuel: st.get(a.colis.id) ?? null }))) };
  }
  @Post('lots/:id/colis') affecter(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: AffecterDto) { return this.colis.affecter(tenantId, id, dto.colisIds); }
  @Delete('lots/:id/colis/:colisId') retirer(@TenantId() tenantId: string, @Param('id') id: string, @Param('colisId') colisId: string) { return this.colis.retirer(tenantId, id, colisId); }
  @Post('lots/:id/checkpoints') lotCp(@CurrentUser() u: JwtUser, @Param('id') id: string, @Body() dto: CheckpointDto) {
    return this.colis.lotCheckpoint(u.tenantId, u.sub, id, dto);
  }
}

/** Retire du lieu public toute reference de lot (prefixe « Lot XXX - » et references connues). */
export function lieuPublic(lieu: string, refs: string[]): string {
  let s = lieu.replace(/^\s*lot\s+\S+\s*[-\u2013\u2014:,]?\s*/i, '');
  for (const r of refs) for (const part of new Set([r, r.split('-')[0]])) if (part.length >= 4) s = s.split(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig')).join('');
  return s.replace(/^[\s\-\u2013\u2014:,]+|[\s\-\u2013\u2014:,]+$/g, '').replace(/\s{2,}/g, ' ') || 'En transit';
}

@ApiTags('public') @Controller()
export class PublicController {
  constructor(private prisma: PrismaService, private colis: ColisService) {}
  @SkipThrottle() @Get('health') async health() { await this.prisma.$queryRaw`SELECT 1`; return { status: 'ok', db: 'ok' }; }

  @Throttle({ default: { limit: Number(process.env.TRACKING_RATE_LIMIT_PER_MIN ?? 30), ttl: 60_000 } })
  @Get('public/suivi/:code')
  async suivi(@Param('code') raw: string) {
    const notFound = new NotFoundException('Code introuvable');
    const code = normalizeTrackingCode(raw);
    if (!code) throw notFound;
    const c = await this.prisma.colis.findUnique({ where: { trackingCode: code }, include: { tenant: true } });
    if (!c) throw notFound;
    const h = await this.colis.history(c.id);
    const lotIds = [...new Set(h.map((x) => x.lotId).filter((x): x is string => !!x))];
    const refs = lotIds.length ? (await this.prisma.lot.findMany({ where: { id: { in: lotIds } }, select: { reference: true } })).map((l) => l.reference) : [];
    return {
      code, description: c.description, mode: c.mode, cartons: c.cartons,
      transitaire: { nom: c.tenant.name, telephone: c.tenant.phone, couleur: c.tenant.primaryColor },
      statutActuel: h.length ? { statut: h.at(-1)!.statut, libelle: h.at(-1)!.libelle } : null,
      checkpoints: h.map((x) => ({ date: x.date, lieu: (x as { site?: { nom: string } | null }).site?.nom ?? lieuPublic(x.lieu, refs), statut: x.statut, libelle: x.libelle, ...(x.statut === 'EXCEPTION' ? { commentaire: x.commentaire } : {}) })),
    };
  }
}
