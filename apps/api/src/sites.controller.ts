import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, TenantId } from './auth';
import { CreateSiteDto, UpdateSiteDto } from './dto';

/** Sites cote Chine, communs a tous les transitaires. */
export const SITES_CHINE = ['Entrepôt Guangzhou (Baiyun)', 'Port de Nansha'];
/** Sites d'arrivee proposes par pays ; ailleurs, le transitaire cree les siens. */
const SITES_DESTINATION: Record<string, string[]> = {
  CI: ["Port autonome d'Abidjan", 'Aéroport FHB'],
  SN: ['Port autonome de Dakar', 'Aéroport AIBD (Dakar)'],
};
/** Sites courants crees pour chaque nouveau tenant, selon son pays. */
export const sitesParDefaut = (paysCode: string) => [...SITES_CHINE, ...(SITES_DESTINATION[paysCode] ?? [])];

const conflit = (e: unknown) => {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return new ConflictException('Un site porte deja ce nom');
  return e;
};

/** Lieux publics du transitaire. Pas de suppression : un site utilise se desactive. */
@ApiTags('sites') @ApiBearerAuth() @SkipThrottle() @UseGuards(JwtAuthGuard) @Controller('sites')
export class SitesController {
  constructor(private prisma: PrismaService) {}

  @Get() list(@TenantId() tenantId: string) {
    return this.prisma.site.findMany({ where: { tenantId }, select: { id: true, nom: true, actif: true }, orderBy: [{ actif: 'desc' }, { nom: 'asc' }] });
  }

  @Post() async create(@TenantId() tenantId: string, @Body() dto: CreateSiteDto) {
    try { return await this.prisma.site.create({ data: { tenantId, nom: dto.nom.trim() }, select: { id: true, nom: true, actif: true } }); }
    catch (e) { throw conflit(e); }
  }

  @Patch(':id') @HttpCode(200) async update(@TenantId() tenantId: string, @Param('id') id: string, @Body() dto: UpdateSiteDto) {
    if (dto.nom === undefined && dto.actif === undefined) throw new BadRequestException('Rien a modifier');
    const site = await this.prisma.site.findFirst({ where: { id, tenantId } });
    if (!site) throw new NotFoundException('Site introuvable');
    try { return await this.prisma.site.update({ where: { id }, data: { ...(dto.nom !== undefined ? { nom: dto.nom.trim() } : {}), ...(dto.actif !== undefined ? { actif: dto.actif } : {}) }, select: { id: true, nom: true, actif: true } }); }
    catch (e) { throw conflit(e); }
  }
}