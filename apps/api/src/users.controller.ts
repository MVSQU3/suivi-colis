import { BadRequestException, Body, ConflictException, Controller, Get, HttpCode, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from './prisma.service';
import { CurrentUser, JwtAuthGuard, JwtUser, Roles, TenantId } from './auth';
import { InviteUserDto } from './dto';

const publicUser = { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true } as const;

/** Gestion des utilisateurs du tenant : reservee a OWNER, toujours scopee au tenant du JWT. */
@ApiTags('utilisateurs') @ApiBearerAuth() @SkipThrottle() @UseGuards(JwtAuthGuard) @Roles('OWNER') @Controller('users')
export class UsersController {
  constructor(private prisma: PrismaService) {}

  @Get() list(@TenantId() tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId }, select: publicUser, orderBy: { fullName: 'asc' } });
  }

  @Post() async invite(@TenantId() tenantId: string, @Body() dto: InviteUserDto) {
    try {
      return await this.prisma.user.create({ data: { tenantId, email: dto.email.toLowerCase(), fullName: dto.fullName, role: dto.role, passwordHash: await argon2.hash(dto.password) }, select: publicUser });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('E-mail deja utilise');
      throw e;
    }
  }

  @Patch(':id/desactiver') @HttpCode(200) async deactivate(@CurrentUser() me: JwtUser, @Param('id') id: string) {
    if (id === me.sub) throw new BadRequestException('Impossible de vous desactiver vous-meme');
    const r = await this.prisma.user.updateMany({ where: { id, tenantId: me.tenantId }, data: { isActive: false } });
    if (!r.count) throw new NotFoundException('Utilisateur introuvable');
    return { desactive: true };
  }

  @Patch(':id/reactiver') @HttpCode(200) async reactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    const r = await this.prisma.user.updateMany({ where: { id, tenantId }, data: { isActive: true, failedLogins: 0, lockedUntil: null } });
    if (!r.count) throw new NotFoundException('Utilisateur introuvable');
    return { reactive: true };
  }
}