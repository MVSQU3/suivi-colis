import { libelleStatut } from '@suivi-colis/shared';

export interface CheckpointLike { id: string; statut: string; lieu: string; commentaire: string | null; date: Date; lotId: string | null; colisId: string | null }
export interface AffectationLike { lotId: string; debut: Date; fin: Date | null }
export interface HistoryEntry extends CheckpointLike { libelle: string; source: 'COLIS' | 'LOT' }

/**
 * Historique fusionné d'un colis : ses propres checkpoints + les checkpoints des lots
 * dont la date tombe dans une période d'affectation [debut, fin[. Trié par date croissante.
 */
export function mergeHistory(own: CheckpointLike[], affectations: AffectationLike[], lotCheckpoints: CheckpointLike[]): HistoryEntry[] {
  const inherited = lotCheckpoints.filter((c) =>
    affectations.some((a) => a.lotId === c.lotId && c.date >= a.debut && (a.fin === null || c.date < a.fin)),
  );
  return [
    ...own.map((c) => ({ ...c, libelle: libelleStatut(c.statut), source: 'COLIS' as const })),
    ...inherited.map((c) => ({ ...c, libelle: libelleStatut(c.statut), source: 'LOT' as const })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());
}
