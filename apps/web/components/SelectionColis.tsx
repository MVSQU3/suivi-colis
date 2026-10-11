'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { messageErreur } from '@/components/CheckpointForm';

export interface ColisRow { id: string; trackingCode: string; description: string; client: string; lot: string | null; statutActuel: string | null }

/** Sélection multiple de colis non archivés (GET /colis), hors lot `exclureLot` (référence). Les colis déjà dans un autre lot y seront transférés. */
export function SelectionColis({ exclureLot, sel, onChange }: { exclureLot?: string; sel: Set<string>; onChange: (s: Set<string>) => void }) {
  const [colis, setColis] = useState<ColisRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api<ColisRow[]>('/colis').then(setColis).catch((e) => setErr(messageErreur(e))); }, []);
  if (err) return <p className="mx-4 mb-4 text-sm font-semibold text-alerte" role="alert">{err}</p>;
  if (!colis) return <div className="mx-4 mb-4 h-40 animate-pulse rounded bg-fond" />;
  const liste = colis.filter((c) => !exclureLot || c.lot !== exclureLot).sort((a, b) => Number(!!a.lot) - Number(!!b.lot));
  if (liste.length === 0) return <p className="mx-4 mb-4 rounded-md bg-fond px-4 py-6 text-center text-sm text-gris-texte">Aucun colis à ajouter.</p>;
  const nTransferts = liste.filter((c) => c.lot && sel.has(c.id)).length;
  return (
    <>
      <ul className="divide-y divide-gris/20">
        {liste.map((c) => (
          <li key={c.id}>
            <label className="flex min-h-14 cursor-pointer flex-wrap items-center gap-3 px-4 py-2 hover:bg-fond/60">
              <input type="checkbox" className="h-5 w-5 accent-fonce" checked={sel.has(c.id)} onChange={(e) => { const n = new Set(sel); if (e.target.checked) n.add(c.id); else n.delete(c.id); onChange(n); }} />
              <span className="min-w-0 flex-1">
                <span className="block whitespace-nowrap font-mono font-semibold">{c.trackingCode}</span>
                <span className="text-sm text-gris-texte">{c.description} · {c.client}</span>
                {c.lot && <span className="block text-sm font-semibold text-fonce">Dans le lot {c.lot} : sera transféré</span>}
              </span>
              <Badge statut={c.statutActuel} />
            </label>
          </li>
        ))}
      </ul>
      {nTransferts > 0 && <p className="mx-4 my-3 rounded-md bg-fond px-3 py-2 text-sm">{nTransferts === 1 ? '1 colis sélectionné quittera son lot actuel (transfert).' : `${nTransferts} colis sélectionnés quitteront leur lot actuel (transfert).`}</p>}
    </>
  );
}

export const colisAjoutes = (n: number) => (n === 1 ? '1 colis ajouté' : `${n} colis ajoutés`);
