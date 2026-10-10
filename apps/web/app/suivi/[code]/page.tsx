'use client';
import { useEffect, useState } from 'react';
import { STATUT_META, type StatutCheckpoint } from '@suivi-colis/shared';
import { api, ApiError } from '@/lib/api';
import { Badge, Timeline, type TimelineItem } from '@/components/ui';

interface Suivi { code: string; description: string; mode: 'MER' | 'AIR'; cartons: number; transitaire: { nom: string; telephone: string | null; couleur: string | null }; statutActuel: { statut: string; libelle: string } | null; checkpoints: TimelineItem[] }

export default function PageSuivi({ params }: { params: { code: string } }) {
  const [data, setData] = useState<Suivi | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  useEffect(() => {
    api<Suivi>(`/public/suivi/${encodeURIComponent(decodeURIComponent(params.code))}`)
      .then(setData)
      .catch((e: unknown) => setErreur(e instanceof ApiError && e.status === 429
        ? 'Trop de recherches en peu de temps. Merci de réessayer dans une minute.'
        : 'Code introuvable. Vérifie le code de suivi transmis par ton transitaire.'));
  }, [params.code]);
  if (erreur) return <div className="card text-center"><p className="font-semibold">{erreur}</p><a className="mt-3 inline-block text-info" href="/">Nouvelle recherche</a></div>;
  if (!data) return <p className="text-gris-texte">Chargement…</p>;
  const etape = data.statutActuel ? STATUT_META[data.statutActuel.statut as StatutCheckpoint]?.etape ?? 0 : 0;
  const partage = `https://wa.me/?text=${encodeURIComponent(`Suivi de mon colis ${data.code} : ${typeof window !== 'undefined' ? window.location.href : ''}`)}`;
  return (
    <div className="space-y-4">
      <div className="card" style={{ borderTop: `6px solid ${data.transitaire.couleur ?? '#F77F00'}` }}>
        <p className="text-sm text-gris-texte">{data.transitaire.nom}</p>
        <h1 className="text-xl font-bold">Colis {data.code}</h1>
        <p className="mb-2">{data.mode === 'MER' ? '🚢 Maritime' : '✈️ Aérien'} · {data.cartons} carton(s) · {data.description}</p>
        <div className="text-lg"><Badge statut={data.statutActuel?.statut ?? null} /></div>
        <div className="mt-3 h-2 rounded bg-fond"><div className="h-2 rounded bg-succes" style={{ width: `${(etape / 7) * 100}%` }} /></div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn" href={partage} target="_blank" rel="noreferrer">Partager sur WhatsApp</a>
          {data.transitaire.telephone && <a className="btn bg-fonce" href={`tel:${data.transitaire.telephone}`}>Contacter le transitaire</a>}
        </div>
      </div>
      <div className="card"><h2 className="mb-3 font-bold">Parcours du colis</h2><Timeline items={data.checkpoints} /></div>
    </div>
  );
}
