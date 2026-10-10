import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException, ForbiddenException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface JwtUser { sub: string; tenantId: string; role: 'SUPER_ADMIN' | 'OWNER' | 'AGENT'; email: string }
export const ROLES_KEY = 'roles';
export const Roles = (...r: JwtUser['role'][]) => SetMetadata(ROLES_KEY, r);
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user as JwtUser);
/** tenantId provenant UNIQUEMENT du JWT. */
export const TenantId = createParamDecorator((_: unknown, ctx: ExecutionContext) => (ctx.switchToHttp().getRequest().user as JwtUser).tenantId);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const h = req.headers.authorization ?? '';
    if (!h.startsWith('Bearer ')) throw new UnauthorizedException();
    try { req.user = this.jwt.verify<JwtUser>(h.slice(7)); } catch { throw new UnauthorizedException(); }
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(req.user.role)) throw new ForbiddenException();
    return true;
  }
}
