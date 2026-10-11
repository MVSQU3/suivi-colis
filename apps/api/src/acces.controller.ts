import { Body, ConflictException, Controller, Get, GoneException, HttpCode, NotFoundException, Param, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { ColisService } from './colis.service';
import { JwtAuthGuard, TenantId } from './auth';

const LIEN_TTL_MS = 48 * 3600_000;
const SESSION_TTL_MS = 30 * 24 * 3600_000;
export const COOKIE_SESSION = 'sc_session';
const hash = (t: string) => createHash('sha256').update(t).digest('hex');
const jeton = () => randomBytes(32).toString('base64url');
const siteUrl = () => (process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');

function lireCookie(req: Request, nom: string): string | null {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === nom) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** Cote transitaire : generer un lien, deconnecter un client. */
@ApiTags('transitaire') @ApiBearerAuth() @SkipThrottle() @UseGuards(JwtAuthGuard) @Controller('clients')
export class AccesTransitaireController {
  constructor(private prisma: PrismaService) {}

  @Post(':id/lien-acces') async genererLien(@TenantId() tenantId: string, @Param('id') id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Client introuvable');
    if (client.archivedAt) throw new ConflictException('Ce client est archivé : désarchivez-le pour lui envoyer un lien');
    const t = jeton(); const expireLe = new Date(Date.now() + LIEN_TTL_MS);
    await this.prisma.$transaction([
      this.prisma.lienAcces.updateMany({ where: { clientId: id, usedAt: null, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.lienAcces.create({ data: { tenantId, clientId: id, tokenHash: hash(t), expiresAt: expireLe } }),
    ]);
    return { url: `${siteUrl()}/acces/${t}`, expireLe };
  }

  @Post(':id/deconnecter') @HttpCode(200) async deconnecter(@TenantId() tenantId: string, @Param('id') id: string) {
    const client = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!client) throw new NotFoundException('Client introuvable');
    const r = await this.prisma.sessionClient.updateMany({ where: { clientId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    return { sessionsRevoquees: r.count };
  }
}

/** Cote client final : ouverture du lien et "mes colis". */
@ApiTags('client') @Controller('client')
export class AccesClientController {
  constructor(private prisma: PrismaService, private colis: ColisService) {}

  /** Lecture seule : ne consomme jamais le jeton (apercus WhatsApp). Aucun nom de client expose. */
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('lien/:jeton') async lireLien(@Param('jeton') t: string) {
    const l = await this.prisma.lienAcces.findUnique({ where: { tokenHash: hash(t) }, include: { client: { include: { tenant: true } } } });
    if (!l) return { valide: false, transitaire: null };
    const valide = !l.usedAt && !l.revokedAt && l.expiresAt > new Date() && !l.client.archivedAt;
    return { valide, transitaire: { nom: l.client.tenant.name, telephone: l.client.tenant.phone } };
  }

  /** Consomme le jeton de facon atomique et ouvre une session de 30 jours. */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('lien/:jeton') @HttpCode(200) async utiliserLien(@Param('jeton') t: string, @Res({ passthrough: true }) res: Response) {
    const now = new Date(); const h = hash(t);
    const l = await this.prisma.lienAcces.findUnique({ where: { tokenHash: h }, include: { client: true } });
    const gone = new GoneException('Lien expiré ou déjà utilisé : demandez-en un nouveau à votre transitaire');
    if (!l || l.client.archivedAt) throw gone;
    const r = await this.prisma.lienAcces.updateMany({ where: { tokenHash: h, usedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (r.count !== 1) throw gone;
    const s = jeton();
    await this.prisma.sessionClient.create({ data: { tenantId: l.tenantId, clientId: l.clientId, tokenHash: hash(s), expiresAt: new Date(now.getTime() + SESSION_TTL_MS) } });
    res.cookie(COOKIE_SESSION, s, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: SESSION_TTL_MS });
    return { ok: true };
  }

  private async session(req: Request) {
    const s = lireCookie(req, COOKIE_SESSION);
    const sess = s ? await this.prisma.sessionClient.findUnique({ where: { tokenHash: hash(s) }, include: { client: { include: { tenant: true } } } }) : null;
    if (!sess || sess.revokedAt || sess.expiresAt <= new Date() || sess.client.archivedAt) throw new UnauthorizedException('Session expirée');
    return sess;
  }

  @SkipThrottle() @Get('mes-colis') async mesColis(@Req() req: Request) {
    const sess = await this.session(req);
    await this.prisma.sessionClient.update({ where: { id: sess.id }, data: { lastSeenAt: new Date() } });
    const list = await this.prisma.colis.findMany({ where: { clientId: sess.clientId, tenantId: sess.tenantId, archivedAt: null }, orderBy: { createdAt: 'desc' } });
    const colis = await Promise.all(list.map(async (c) => {
      const h = await this.colis.history(c.id);
      return {
        code: c.trackingCode, description: c.description, mode: c.mode, cartons: c.cartons,
        statutActuel: h.length ? { statut: h.at(-1)!.statut, libelle: h.at(-1)!.libelle } : null,
        checkpoints: h.map((x) => ({ date: x.date, lieu: (x as { site?: { nom: string } | null }).site?.nom ?? null, statut: x.statut, libelle: x.libelle, ...(x.statut === 'EXCEPTION' ? { commentaire: x.commentaire } : {}) })),
      };
    }));
    const t = sess.client.tenant;
    return { client: { nom: sess.client.fullName }, transitaire: { nom: t.name, telephone: t.phone, couleur: t.primaryColor }, colis };
  }

  @SkipThrottle() @Post('deconnexion') @HttpCode(200) async deconnexion(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const s = lireCookie(req, COOKIE_SESSION);
    if (s) await this.prisma.sessionClient.updateMany({ where: { tokenHash: hash(s), revokedAt: null }, data: { revokedAt: new Date() } });
    res.clearCookie(COOKIE_SESSION, { path: '/' });
    return { ok: true };
  }
}