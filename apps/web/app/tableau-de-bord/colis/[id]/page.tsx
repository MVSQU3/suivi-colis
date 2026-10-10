'use client';
import { useCallback, useEffect, useState } from 'react';
import { formatDate } from '@suivi-colis/shared';
import { api } from '@/lib/api';
import { Badge, Timeline, type TimelineItem } from '@/components/ui';
import { CheckpointForm } from '@/components/CheckpointForm';
interface Detail { trackingCode: string; description: string; mode: string; cartons: number; client: { fullName: string; phone: string }; statutActuel: string | null; historique: TimelineItem[]; affectations: { debut: string; fin: string | null; lot: { reference: string } }[] }
export default function ColisPage({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null); const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => api<Detail>(`/colis/${params.id}`).then(setD).catch(() => setErr('Colis introuvable.')), [params.id]);
  useEffect(() => { void load(); }, [load]);
  if (err) return <p className="card">{err}</p>;
  if (!d) return <p className="text-gris">Chargement…</p>;
  return (
    <div className="space-y-4">
      <div className="card"><h1 className="font-mono text-xl font-bold">{d.trackingCode}</h1>
        <p>{d.description} · {d.mode === 'MER' ? '🚢' : '✈️'} · {d.cartons} carton(s)</p><p className="text-sm text-gris">{d.client.fullName} · {d.client.phone}</p>
        <div className="mt-2"><Badge statut={d.statutActuel} /></div>
        <p className="mt-2 text-sm">Lien public : <a className="text-info" href={`/suivi/${d.trackingCode}`}>/suivi/{d.trackingCode}</a></p>
        {d.affectations.length > 0 && <ul className="mt-2 text-sm text-gris">{d.affectations.map((a, i) => <li key={i}>Lot {a.lot.reference} : du {formatDate(a.debut)} {a.fin ? `au ${formatDate(a.fin)}` : '(en cours)'}</li>)}</ul>}
      </div>
      <div className="card"><h2 className="mb-3 font-bold">Historique</h2><Timeline items={d.historique} /></div>
      <div className="card"><h2 className="mb-2 font-bold">Ajouter un checkpoint sur ce colis</h2>
        <CheckpointForm allowException label="Enregistrer" onSubmit={async (v) => { await api(`/colis/${params.id}/checkpoints`, { method: 'POST', body: JSON.stringify(v) }); await load(); }} /></div>
    </div>
  );
}
