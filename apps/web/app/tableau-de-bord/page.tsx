'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { libelleStatut } from '@suivi-colis/shared';
import { api, getToken, setToken } from '@/lib/api';
import { Badge } from '@/components/ui';
interface Stats { clients: number; lots: number; colis: number; parStatut: Record<string, number> }
interface ColisRow { id: string; trackingCode: string; description: string; client: string; lot: string | null; statutActuel: string | null }
interface LotRow { id: string; reference: string; mode: string; nbColis: number; dernierStatut: string | null }
export default function Dashboard() {
  const [me, setMe] = useState<{ fullName: string; tenant: { name: string } } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null); const [colis, setColis] = useState<ColisRow[]>([]); const [lots, setLots] = useState<LotRow[]>([]);
  useEffect(() => {
    if (!getToken()) { window.location.href = '/connexion'; return; }
    void api<typeof me>('/auth/me').then(setMe); void api<Stats>('/dashboard/stats').then(setStats);
    void api<ColisRow[]>('/colis').then(setColis); void api<LotRow[]>('/lots').then(setLots);
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-xl font-bold">{me?.tenant.name ?? 'Tableau de bord'}</h1>
        <button className="text-sm text-alerte" onClick={() => { setToken(null); window.location.href = '/connexion'; }}>Déconnexion</button></div>
      {stats && <div className="grid grid-cols-3 gap-2">{[['Colis', stats.colis], ['Lots', stats.lots], ['Clients', stats.clients]].map(([k, v]) => <div key={k} className="card text-center"><p className="text-2xl font-bold">{v}</p><p className="text-sm text-gris">{k}</p></div>)}</div>}
      {stats && <div className="card text-sm">{Object.entries(stats.parStatut).map(([s, n]) => <span key={s} className="mr-3">{libelleStatut(s)} : <b>{n}</b></span>)}</div>}
      <div className="card"><h2 className="mb-2 font-bold">Lots</h2>
        <ul className="divide-y">{lots.map((l) => <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link className="text-info" href={`/tableau-de-bord/lots/${l.id}`}>{l.reference}</Link><span className="text-sm">{l.mode === 'MER' ? '🚢' : '✈️'} {l.nbColis} colis</span><Badge statut={l.dernierStatut} /></li>)}</ul></div>
      <div className="card"><h2 className="mb-2 font-bold">Colis</h2>
        <ul className="divide-y">{colis.map((c) => <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><Link className="font-mono text-info" href={`/tableau-de-bord/colis/${c.id}`}>{c.trackingCode}</Link><span className="text-sm">{c.description} · {c.client}{c.lot ? ` · ${c.lot}` : ''}</span><Badge statut={c.statutActuel} /></li>)}</ul></div>
    </div>
  );
}
