import { BadRequestException, Body, Controller, Get, HttpCode, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { IsOptional, IsString, Matches } from 'class-validator';
import { PAYS_AFRIQUE, deviseValide, fuseauValide, paysParCode } from '@suivi-colis/shared';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, Roles, TenantId } from './auth';

export class UpdateParametresDto {
  /** ISO 3166-1 alpha-2 d'un pays africain */
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{2}$/, { message: 'Code pays invalide (2 lettres)' }) paysCode?: string;
  /** ISO 4217 */
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{3}$/, { message: 'Code devise invalide (3 lettres)' }) devise?: string;
  /** Fuseau IANA, ex. Africa/Dakar */
  @IsOptional() @IsString() fuseau?: string;
}

const select = { name: true, paysCode: true, devise: true, fuseau: true, langue: true } as const;

/** Parametres pays du transitaire. Lecture : tout utilisateur du tenant ; modification : OWNER. */
@ApiTags('transitaire') @ApiBearerAuth() @SkipThrottle() @UseGuards(JwtAuthGuard) @Controller('parametres')
export class ParametresController {
  constructor(private prisma: PrismaService) {}

  @Get() get(@TenantId() tenantId: string) {
    return this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId }, select });
  }

  @Get('pays') pays() { return PAYS_AFRIQUE; }

  /** Changer de pays reprend la devise et le fuseau de ce pays, sauf s'ils sont fournis dans la meme requete. */
  @Patch() @HttpCode(200) @Roles('OWNER')
  async update(@TenantId() tenantId: string, @Body() dto: UpdateParametresDto) {
    if (dto.paysCode === undefined && dto.devise === undefined && dto.fuseau === undefined) throw new BadRequestException('Rien a modifier');
    const pays = dto.paysCode !== undefined ? paysParCode(dto.paysCode) : undefined;
    if (dto.paysCode !== undefined && !pays) throw new BadRequestException({ statusCode: 400, message: ['Pays non pris en charge : seuls les pays africains sont acceptés'], champ: 'paysCode' });
    const devise = dto.devise?.toUpperCase();
    if (devise && !deviseValide(devise)) throw new BadRequestException({ statusCode: 400, message: ['Devise inconnue'], champ: 'devise' });
    if (dto.fuseau !== undefined && !fuseauValide(dto.fuseau)) throw new BadRequestException({ statusCode: 400, message: ['Fuseau horaire inconnu'], champ: 'fuseau' });
    return this.prisma.tenant.update({
      where: { id: tenantId }, select,
      data: {
        ...(pays ? { paysCode: pays.code, devise: pays.devise, fuseau: pays.fuseau, langue: 'fr' } : {}),
        ...(devise ? { devise } : {}),
        ...(dto.fuseau !== undefined ? { fuseau: dto.fuseau } : {}),
      },
    });
  }
}
