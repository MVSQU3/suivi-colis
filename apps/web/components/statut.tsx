import { STATUT_META, formatDate, type StatutCheckpoint } from '@suivi-colis/shared';
export function Badge({ statut, label }: { statut: string | null; label?: string }) {
  if (!statut) return <span className="text-gris-texte">—</span>;
  const m = STATUT_META[statut as StatutCheckpoint];
  const s = badgeStyle(m?.couleur);
  // Back-office : l'exception s'affiche « Problème signalé » (shared inchangé).
  const lib = label ?? (statut === 'EXCEPTION' ? 'Problème signalé' : m?.libelle ?? statut);
  return <span className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold" style={s}>{lib}</span>;
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
          <p className="text-sm text-gris-texte">{formatDate(c.date)} · {c.lieu}</p>
          {c.commentaire && <p className="text-sm">{c.commentaire}</p>}
        </li>
      ))}
    </ol>
  );
}

// Contraste AA (>= 4,5:1) : texte fonce sur orange/bleu, vert assombri pour texte blanc, blanc sur fonce/rouge.
function badgeStyle(couleur?: string): { background: string; color: string } {
  const c = (couleur ?? '').toUpperCase();
  if (c === '#009E60') return { background: '#007A4A', color: '#FFFFFF' };
  if (c === '#0B2545' || c === '#D62828') return { background: c, color: '#FFFFFF' };
  return { background: couleur ?? '#8D99AE', color: '#0B2545' };
}
