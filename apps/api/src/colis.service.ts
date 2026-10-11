import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { mergeHistory } from './history';
import { generateTrackingCode } from './tracking-code';
import { CheckpointDto, CreateColisDto } from './dto';

/** Tolerance d'horloge : une date de checkpoint ne peut pas depasser maintenant + 2 min. */
const TOLERANCE_FUTUR_MS = 2 * 60_000;
function dateCheckpoint(raw?: string): Date {
  const d = raw ? new Date(raw) : new Date();
  if (Number.isNaN(d.getTime())) throw new BadRequestException('Date invalide');
  if (d.getTime() > Date.now() + TOLERANCE_FUTUR_MS) throw new BadRequestException('La date du checkpoint ne peut pas etre dans le futur');
  return d;
}

@Injectable()
export class ColisService {
  constructor(private prisma: PrismaService) {}

  /** Historique fusionné ; tenantId optionnel (null = accès public par code, déjà résolu). */
  async history(colisId: string) {
    const [own, affectations] = await Promise.all([
      this.prisma.checkpoint.findMany({ where: { colisId }, include: { site: { select: { nom: true } } } }),
      this.prisma.affectationLot.findMany({ where: { colisId } }),
    ]);
    const lotIds = [...new Set(affectations.map((a) => a.lotId))];
    const lotCps = lotIds.length ? await this.prisma.checkpoint.findMany({ where: { lotId: { in: lotIds } }, include: { site: { select: { nom: true } } } }) : [];
    return mergeHistory(own, affectations, lotCps);
  }

  async statutActuel(colisId: string) {
    return (await this.statutsActuels([colisId])).get(colisId) ?? null;
  }

  /** Statut courant de plusieurs colis en 3 requetes au total, quel que soit leur nombre. */
  async statutsActuels(colisIds: string[]): Promise<Map<string, string | null>> {
    const res = new Map<string, string | null>(colisIds.map((id) => [id, null]));
    if (!colisIds.length) return res;
    const [own, affectations] = await Promise.all([
      this.prisma.checkpoint.findMany({ where: { colisId: { in: colisIds } } }),
      this.prisma.affectationLot.findMany({ where: { colisId: { in: colisIds } } }),
    ]);
    const lotIds = [...new Set(affectations.map((a) => a.lotId))];
    const lotCps = lotIds.length ? await this.prisma.checkpoint.findMany({ where: { lotId: { in: lotIds } } }) : [];
    const group = <T,>(xs: T[], k: (x: T) => string | null) => { const m = new Map<string, T[]>(); for (const x of xs) { const key = k(x); if (key) m.set(key, [...(m.get(key) ?? []), x]); } return m; };
    const ownBy = group(own, (c) => c.colisId), affBy = group(affectations, (a) => a.colisId), lotBy = group(lotCps, (c) => c.lotId);
    for (const id of colisIds) {
      const affs = affBy.get(id) ?? [];
      const h = mergeHistory(ownBy.get(id) ?? [], affs, [...new Set(affs.map((a) => a.lotId))].flatMap((l) => lotBy.get(l) ?? []));
      res.set(id, h.length ? h[h.length - 1].statut : null);
    }
    return res;
  }
  /** Site actif du tenant ; meme 404 pour un site inexistant ou d'un autre tenant. */
  private async siteActif(tenantId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundException('Site introuvable');
    if (!site.actif) throw new BadRequestException('Ce site est desactive');
    return site;
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
    const site = await this.siteActif(tenantId, dto.siteId);
    if (dto.statut === 'EXCEPTION' && !dto.commentaire?.trim()) throw new BadRequestException('Un commentaire est obligatoire pour une exception');
    return this.prisma.checkpoint.create({ data: { tenantId, colisId: id, siteId: site.id, statut: dto.statut, lieu: dto.lieu?.trim() || site.nom, commentaire: dto.commentaire, date: dateCheckpoint(dto.date), createdById: userId } });
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
    const site = await this.siteActif(tenantId, dto.siteId);
    if (dto.statut === 'EXCEPTION') throw new BadRequestException('Une exception se déclare sur un colis, pas sur un lot');
    const date = dateCheckpoint(dto.date);
    const checkpoint = await this.prisma.checkpoint.create({ data: { tenantId, lotId, siteId: site.id, statut: dto.statut, lieu: dto.lieu?.trim() || site.nom, commentaire: dto.commentaire, date, createdById: userId } });
    const updatedCount = await this.prisma.affectationLot.count({ where: { lotId, debut: { lte: date }, OR: [{ fin: null }, { fin: { gt: date } }] } });
    return { checkpointId: checkpoint.id, updatedCount };
  }
}
