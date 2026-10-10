import { STATUT_META, formatDate, type StatutCheckpoint } from '@suivi-colis/shared';
export function Badge({ statut }: { statut: string | null }) {
  if (!statut) return <span className="text-gris">—</span>;
  const m = STATUT_META[statut as StatutCheckpoint];
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: m?.couleur ?? '#8D99AE' }}>{m?.libelle ?? statut}</span>;
}
export interface TimelineItem { date: string; lieu: string; statut: string; libelle: string; commentaire?: string | null }
export function Timeline({ items }: { items: TimelineItem[] }) {
  const sorted = [...items].reverse(); // plus récent en haut
  return (
    <ol className="relative ml-2 border-l-2 border-gris/40">
      {sorted.map((c, i) => (
        <li key={i} className="mb-5 ml-4">
          <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full" style={{ background: STATUT_META[c.statut as StatutCheckpoint]?.couleur ?? '#8D99AE' }} />
          <p className="font-semibold">{c.libelle}</p>
          <p className="text-sm text-gris">{formatDate(c.date)} · {c.lieu}</p>
          {c.commentaire && <p className="text-sm">{c.commentaire}</p>}
        </li>
      ))}
    </ol>
  );
}
