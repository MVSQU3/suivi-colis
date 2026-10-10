import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { ColisService } from './colis.service';
import { AuthController, BackOfficeController, PublicController } from './controllers';
import { JwtAuthGuard } from './auth';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_ACCESS_SECRET, signOptions: { expiresIn: process.env.JWT_ACCESS_TTL ?? '15m' } }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [AuthController, BackOfficeController, PublicController],
  providers: [PrismaService, ColisService, JwtAuthGuard, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
