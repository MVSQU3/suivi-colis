import { formatDate } from '@suivi-colis/shared';
import { cn } from '@/lib/utils';
import { libelleBO } from '@/components/CheckpointForm';

export interface TimelineEntry { id?: string; date: string; statut: string; site?: { nom: string } | null; lieu?: string | null; commentaire?: string | null; source?: string }

/** Timeline verticale back-office (plus récent en haut). */
export function TimelineBO({ items }: { items: TimelineEntry[] }) {
  const tries = [...items].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  if (!tries.length) return <p className="rounded-md bg-fond px-4 py-6 text-center text-sm text-gris-texte">Aucune étape pour le moment.</p>;
  return (
    <ol className="relative">
      {tries.map((c, i) => {
        const ex = c.statut === 'EXCEPTION';
        return (
          <li key={c.id ?? i} className="relative flex gap-3 pb-5">
            {i < tries.length - 1 && <span className="absolute left-[9px] top-5 h-full w-0.5 bg-gris/30" aria-hidden />}
            <span className={cn('z-10 mt-1 h-5 w-5 shrink-0 rounded-full border-4 border-white shadow', ex ? 'bg-alerte' : i === 0 ? 'bg-primaire' : 'bg-succes-fonce')} />
            <div className="min-w-0">
              <p className={cn('font-semibold', ex && 'text-alerte')}>{libelleBO(c.statut)}</p>
              <p className="text-sm text-gris-texte">
                {formatDate(c.date)} · {c.site?.nom ?? <span title="Ancien lieu libre (interne)">{c.lieu || 'Site non renseigné'}</span>}
                {c.source === 'LOT' && ' · via le lot'}
              </p>
              {c.commentaire && <p className="mt-1 text-sm">{ex ? 'Message client : ' : 'Note interne : '}{c.commentaire}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
