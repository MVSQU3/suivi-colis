import { BadRequestException, Body, ConflictException, Controller, Delete, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, Roles, TenantId } from './auth';
import { normaliserTelephoneCI } from './phone';
import { UpdateClientDto, UpdateColisDto, UpdateLotDto } from './dto';

const vide = (o: object) => { if (!Object.values(o).some((v) => v !== undefined)) throw new BadRequestException('Rien a modifier'); };

/**
 * Modification (OWNER, AGENT), archivage et suppression (OWNER uniquement).
 * Regle produit : on ne supprime vraiment que ce qui n'a aucun historique ; sinon on archive (colis, client) ou on cloture (lot).
 */
@ApiTags('transitaire') @ApiBearerAuth() @SkipThrottle() @UseGuards(JwtAuthGuard) @Controller()
export class GestionController {
  constructor(private prisma: PrismaService) {}

  private async client(tenantId: string, id: string) {
    const c = await this.prisma.client.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Client introuvable');
    return c;
  }
  private async colis(tenantId: string, id: string) {
    const c = await this.prisma.colis.findFirst({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Colis introuvable');
    return c;
  }
  private async lot(tenantId: string, id: string) {
    const l = await this.prisma.lot.findFirst({ where: { id, tenantId } });
    if (!l) throw new NotFoundException('Lot introuvable');
    return l;
  }

  // ---- Clients
  @Patch('clients/:id') async updateClient(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateClientDto) {
    vide(dto); await this.client(tenantId, id);
    let phone: string | undefined;
    if (dto.phone !== undefined) {
      phone = normaliserTelephoneCI(dto.phone) ?? undefined;
      if (!phone) throw new BadRequestException({ statusCode: 400, message: ['Numéro invalide : 10 chiffres attendus, avec ou sans +225'], champ: 'phone' });
      const existant = await this.prisma.client.findFirst({ where: { tenantId, phone, NOT: { id } }, select: { id: true, fullName: true } });
      if (existant) throw new ConflictException({ statusCode: 409, message: 'Ce numéro correspond déjà à un client', clientExistant: existant });
    }
    try { return await this.prisma.client.update({ where: { id }, data: { ...dto, ...(phone ? { phone } : {}) } }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Ce numéro correspond déjà à un client'); throw e; }
  }
  @Post('clients/:id/archiver') @HttpCode(200) @Roles('OWNER') async archiverClient(@TenantId() t: string, @Param('id') id: string) {
    await this.client(t, id);
    const now = new Date();
    const [c] = await this.prisma.$transaction([
      this.prisma.client.update({ where: { id }, data: { archivedAt: now }, select: { id: true, archivedAt: true } }),
      this.prisma.sessionClient.updateMany({ where: { clientId: id, revokedAt: null }, data: { revokedAt: now } }),
      this.prisma.lienAcces.updateMany({ where: { clientId: id, usedAt: null, revokedAt: null }, data: { revokedAt: now } }),
    ]);
    return c;
  }
  @Post('clients/:id/desarchiver') @HttpCode(200) @Roles('OWNER') async desarchiverClient(@TenantId() t: string, @Param('id') id: string) {
    await this.client(t, id); return this.prisma.client.update({ where: { id }, data: { archivedAt: null }, select: { id: true, archivedAt: true } });
  }
  @Delete('clients/:id') @Roles('OWNER') async deleteClient(@TenantId() t: string, @Param('id') id: string) {
    await this.client(t, id);
    if (await this.prisma.colis.count({ where: { clientId: id } })) throw new ConflictException({ statusCode: 409, message: 'Ce client a des colis : archivez-le à la place', action: 'archiver' });
    await this.prisma.client.delete({ where: { id } }); return { supprime: true };
  }

  // ---- Colis
  @Patch('colis/:id') async updateColis(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateColisDto) {
    vide(dto); await this.colis(tenantId, id);
    if (dto.clientId) await this.client(tenantId, dto.clientId);
    return this.prisma.colis.update({ where: { id }, data: dto });
  }
  @Post('colis/:id/archiver') @HttpCode(200) @Roles('OWNER') async archiverColis(@TenantId() t: string, @Param('id') id: string) {
    await this.colis(t, id); return this.prisma.colis.update({ where: { id }, data: { archivedAt: new Date() }, select: { id: true, archivedAt: true } });
  }
  @Post('colis/:id/desarchiver') @HttpCode(200) @Roles('OWNER') async desarchiverColis(@TenantId() t: string, @Param('id') id: string) {
    await this.colis(t, id); return this.prisma.colis.update({ where: { id }, data: { archivedAt: null }, select: { id: true, archivedAt: true } });
  }
  /** Vraie suppression seulement sans aucun checkpoint propre ni herite (erreur de saisie). */
  @Delete('colis/:id') @Roles('OWNER') async deleteColis(@TenantId() t: string, @Param('id') id: string) {
    await this.colis(t, id);
    const affs = await this.prisma.affectationLot.findMany({ where: { colisId: id } });
    const propres = await this.prisma.checkpoint.count({ where: { colisId: id } });
    const herites = affs.length ? await this.prisma.checkpoint.count({ where: { OR: affs.map((a) => ({ lotId: a.lotId, date: { gte: a.debut, ...(a.fin ? { lt: a.fin } : {}) } })) } }) : 0;
    if (propres + herites) throw new ConflictException({ statusCode: 409, message: 'Ce colis a déjà un historique : archivez-le à la place', action: 'archiver' });
    await this.prisma.$transaction([this.prisma.affectationLot.deleteMany({ where: { colisId: id } }), this.prisma.colis.delete({ where: { id } })]);
    return { supprime: true };
  }

  // ---- Lots
  @Patch('lots/:id') async updateLot(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateLotDto) {
    vide(dto); await this.lot(tenantId, id);
    try { return await this.prisma.lot.update({ where: { id }, data: { ...dto, ...(dto.departPrevu !== undefined ? { departPrevu: dto.departPrevu ? new Date(dto.departPrevu) : null } : {}) } }); }
    catch (e) { if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('Un lot porte déjà cette référence'); throw e; }
  }
  @Post('lots/:id/cloturer') @HttpCode(200) @Roles('OWNER') async cloturer(@TenantId() t: string, @Param('id') id: string) {
    await this.lot(t, id); return this.prisma.lot.update({ where: { id }, data: { clotureLe: new Date() }, select: { id: true, clotureLe: true } });
  }
  @Post('lots/:id/rouvrir') @HttpCode(200) @Roles('OWNER') async rouvrir(@TenantId() t: string, @Param('id') id: string) {
    await this.lot(t, id); return this.prisma.lot.update({ where: { id }, data: { clotureLe: null }, select: { id: true, clotureLe: true } });
  }
  /** Vraie suppression seulement si le lot n'a jamais contenu de colis ni recu de checkpoint. */
  @Delete('lots/:id') @Roles('OWNER') async deleteLot(@TenantId() t: string, @Param('id') id: string) {
    await this.lot(t, id);
    const [a, c] = await Promise.all([this.prisma.affectationLot.count({ where: { lotId: id } }), this.prisma.checkpoint.count({ where: { lotId: id } })]);
    if (a + c) throw new ConflictException({ statusCode: 409, message: 'Ce lot a déjà un historique : clôturez-le à la place', action: 'cloturer' });
    await this.prisma.lot.delete({ where: { id } }); return { supprime: true };
  }
}