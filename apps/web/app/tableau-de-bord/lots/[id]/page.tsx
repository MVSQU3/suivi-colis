'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge, Timeline, type TimelineItem } from '@/components/statut';
import { CheckpointForm } from '@/components/CheckpointForm';
interface Detail { reference: string; mode: string; checkpoints: TimelineItem[]; colis: { id: string; trackingCode: string; description: string; client: string; statutActuel: string | null }[] }
export default function LotPage({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null); const [msg, setMsg] = useState<string | null>(null);
  const load = useCallback(() => api<Detail>(`/lots/${params.id}`).then(setD).catch(() => setMsg('Lot introuvable.')), [params.id]);
  useEffect(() => { void load(); }, [load]);
  if (!d) return <p className="text-gris-texte">{msg ?? 'Chargement…'}</p>;
  return (
    <div className="space-y-4">
      <div className="card"><h1 className="text-xl font-bold">Lot {d.reference}</h1><p>{d.mode === 'MER' ? '🚢 Maritime' : '✈️ Aérien'} · {d.colis.length} colis</p></div>
      <div className="card"><h2 className="mb-2 font-bold">Colis du lot</h2>
        <ul className="divide-y">{d.colis.map((c) => <li key={c.id} className="flex flex-wrap justify-between gap-2 py-2"><Link className="font-mono text-info" href={`/tableau-de-bord/colis/${c.id}`}>{c.trackingCode}</Link><span className="text-sm">{c.description} · {c.client}</span><Badge statut={c.statutActuel} /></li>)}</ul></div>
      <div className="card"><h2 className="mb-2 font-bold">Mettre à jour tous les colis</h2>
        <CheckpointForm allowException={false} label={`Appliquer aux ${d.colis.length} colis`} onSubmit={async (v) => {
          if (!window.confirm(`${d.colis.length} colis seront mis à jour. Confirmer ?`)) return;
          const r = await api<{ updatedCount: number }>(`/lots/${params.id}/checkpoints`, { method: 'POST', body: JSON.stringify(v) });
          setMsg(`${r.updatedCount} colis mis à jour.`); await load();
        }} />
        {msg && <p className="mt-2 text-sm text-succes">{msg}</p>}</div>
      <div className="card"><h2 className="mb-3 font-bold">Checkpoints du lot</h2><Timeline items={d.checkpoints} /></div>
    </div>
  );
}
