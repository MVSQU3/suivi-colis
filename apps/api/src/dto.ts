import { IsEmail, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Matches, Min, MinLength, ValidateIf, IsArray, ArrayNotEmpty, IsIn, IsBoolean, IsNumber, IsPositive } from 'class-validator';
import { StatutCheckpoint, ModeTransport } from '@prisma/client';

export class LoginDto { @IsEmail() email: string; @IsString() @MinLength(1) password: string }
export class CreateClientDto {
  @IsString() @MinLength(2) fullName: string;
  /** Normalise cote serveur vers +225XXXXXXXXXX (voir phone.ts). */
  @IsString() phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() city?: string;
}
export class CreateLotDto { @IsString() @MinLength(2) reference: string; @IsEnum(ModeTransport) mode: ModeTransport; @IsOptional() @IsISO8601() departPrevu?: string }
export class CreateColisDto {
  @IsString() clientId: string;
  @IsString() @MinLength(2) description: string;
  @IsOptional() @IsInt() @Min(1) cartons?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() poidsKg?: number;
  @IsEnum(ModeTransport) mode: ModeTransport;
  @IsOptional() @IsString() lotId?: string;
}
export class CheckpointDto {
  @IsEnum(StatutCheckpoint) statut: StatutCheckpoint;
  /** Lieu public : site du tenant (obligatoire pour tout nouveau checkpoint). */
  @IsString() siteId: string;
  /** Ancien champ texte libre : conserve comme note interne, jamais expose publiquement. */
  @IsOptional() @IsString() lieu?: string;
  /** Note interne ; message affiche au client uniquement pour EXCEPTION (alors obligatoire). */
  @ValidateIf((o: CheckpointDto) => o.statut === 'EXCEPTION' || o.commentaire !== undefined)
  @IsString() @Matches(/\S/, { message: 'Un commentaire est obligatoire pour une exception' }) commentaire?: string;
  @IsOptional() @IsISO8601() date?: string;
}
export class AffecterDto { @IsArray() @ArrayNotEmpty() @IsString({ each: true }) colisIds: string[] }

export class InviteUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(2) fullName: string;
  @IsIn(['OWNER', 'AGENT']) role: 'OWNER' | 'AGENT';
  @IsString() @MinLength(12) password: string;
}
export class CreateSiteDto { @IsString() @Matches(/\S.*\S/, { message: 'Nom de site trop court' }) nom: string }
export class UpdateSiteDto { @IsOptional() @IsString() @Matches(/\S.*\S/, { message: 'Nom de site trop court' }) nom?: string; @IsOptional() @IsBoolean() actif?: boolean }

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() city?: string;
}
export class UpdateColisDto {
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() @MinLength(2) description?: string;
  @IsOptional() @IsInt() @Min(1) cartons?: number;
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() poidsKg?: number;
  @IsOptional() @IsEnum(ModeTransport) mode?: ModeTransport;
}
export class UpdateLotDto {
  @IsOptional() @IsString() @MinLength(2) reference?: string;
  @IsOptional() @IsEnum(ModeTransport) mode?: ModeTransport;
  @IsOptional() @IsISO8601() departPrevu?: string;
}
