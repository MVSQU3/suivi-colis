import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { mergeHistory } from './history';
import { generateTrackingCode } from './tracking-code';
import { CheckpointDto, CreateColisDto } from './dto';

@Injectable()
export class ColisService {
  constructor(private prisma: PrismaService) {}

  /** Historique fusionné ; tenantId optionnel (null = accès public par code, déjà résolu). */
  async history(colisId: string) {
    const [own, affectations] = await Promise.all([
      this.prisma.checkpoint.findMany({ where: { colisId } }),
      this.prisma.affectationLot.findMany({ where: { colisId } }),
    ]);
    const lotIds = [...new Set(affectations.map((a) => a.lotId))];
    const lotCps = lotIds.length ? await this.prisma.checkpoint.findMany({ where: { lotId: { in: lotIds } } }) : [];
    return mergeHistory(own, affectations, lotCps);
  }

  async statutActuel(colisId: string) {
    const h = await this.history(colisId);
    return h.length ? h[h.length - 1].statut : null;
  }

  async getOwned(tenantId: string, id: string) {
    const c = await this.prisma.colis.findFirst({ where: { id, tenantId }, include: { client: true, affectations: { include: { lot: true }, orderBy: { debut: 'asc' } } } });
    if (!c) throw new NotFoundException('Colis introuvable');
    return c;
  }

  async create(tenantId: string, dto: CreateColisDto) {
    const client = await this.prisma.client.findFirst({ where: { id: dto.clientId, tenantId } });
    if (!client) throw new NotFoundException('Client introuvable');
    for (let i = 0; i < 5; i++) {
      try {
        return await this.prisma.colis.create({ data: { tenantId, clientId: client.id, description: dto.description, cartons: dto.cartons ?? 1, mode: dto.mode, trackingCode: generateTrackingCode() } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
    throw new ConflictException('Génération du code impossible');
  }

  async addCheckpoint(tenantId: string, userId: string, id: string, dto: CheckpointDto) {
    await this.getOwned(tenantId, id);
    if (dto.statut === 'EXCEPTION' && !dto.commentaire?.trim()) throw new BadRequestException('Un commentaire est obligatoire pour une exception');
    return this.prisma.checkpoint.create({ data: { tenantId, colisId: id, statut: dto.statut, lieu: dto.lieu, commentaire: dto.commentaire, date: dto.date ? new Date(dto.date) : new Date(), createdById: userId } });
  }

  /** Affecte (ou transfère) des colis au lot : ferme l'affectation ouverte puis en ouvre une nouvelle, en transaction. */
  async affecter(tenantId: string, lotId: string, colisIds: string[]) {
    const lot = await this.prisma.lot.findFirst({ where: { id: lotId, tenantId } });
    if (!lot) throw new NotFoundException('Lot introuvable');
    const colis = await this.prisma.colis.findMany({ where: { id: { in: colisIds }, tenantId } });
    if (colis.length !== new Set(colisIds).size) throw new NotFoundException('Colis introuvable');
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      let moved = 0;
      for (const c of colis) {
        const open = await tx.affectationLot.findFirst({ where: { colisId: c.id, fin: null } });
        if (open?.lotId === lotId) continue;
        if (open) await tx.affectationLot.update({ where: { id: open.id }, data: { fin: now } });
        await tx.affectationLot.create({ data: { tenantId, colisId: c.id, lotId, debut: now } });
        moved++;
      }
      return { affectes: moved };
    });
  }

  async retirer(tenantId: string, lotId: string, colisId: string) {
    const r = await this.prisma.affectationLot.updateMany({ where: { tenantId, lotId, colisId, fin: null }, data: { fin: new Date() } });
    if (!r.count) throw new NotFoundException('Affectation introuvable');
    return { retire: true };
  }

  /** Checkpoint groupé : un seul enregistrement ciblant le lot, hérité par tous les colis affectés à cette date. */
  async lotCheckpoint(tenantId: string, userId: string, lotId: string, dto: CheckpointDto) {
    const lot = await this.prisma.lot.findFirst({ where: { id: lotId, tenantId } });
    if (!lot) throw new NotFoundException('Lot introuvable');
    if (dto.statut === 'EXCEPTION') throw new BadRequestException('Une exception se déclare sur un colis, pas sur un lot');
    const date = dto.date ? new Date(dto.date) : new Date();
    const checkpoint = await this.prisma.checkpoint.create({ data: { tenantId, lotId, statut: dto.statut, lieu: dto.lieu, commentaire: dto.commentaire, date, createdById: userId } });
    const updatedCount = await this.prisma.affectationLot.count({ where: { lotId, debut: { lte: date }, OR: [{ fin: null }, { fin: { gt: date } }] } });
    return { checkpointId: checkpoint.id, updatedCount };
  }
}
