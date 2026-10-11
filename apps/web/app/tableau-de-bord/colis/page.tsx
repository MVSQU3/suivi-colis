'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { messageErreur } from '@/components/CheckpointForm';

interface ColisRow { id: string; trackingCode: string; description: string; client: string; lot: string | null; statutActuel: string | null; mode?: string }

export default function ColisPage() {
  const [colis, setColis] = useState<ColisRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const charger = () => { setErr(null); api<ColisRow[]>('/colis').then(setColis).catch((e) => setErr(messageErreur(e))); };
  useEffect(charger, []);
  const liste = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = (colis ?? []).filter((c) => !s || [c.trackingCode, c.description, c.client, c.lot ?? ''].some((v) => v.toLowerCase().includes(s)));
    return [...l].sort((a, b) => Number(b.statutActuel === 'EXCEPTION') - Number(a.statutActuel === 'EXCEPTION'));
  }, [colis, q]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Colis</h1><p className="text-sm text-gris-texte">Les colis avec un problème signalé apparaissent en premier.</p></div><Button asChild size="lg" className="h-11"><Link href="/tableau-de-bord/colis/nouveau"><Plus aria-hidden /> Nouveau colis</Link></Button></div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris-texte" aria-hidden />
        <input className="input h-11 !pl-10" placeholder="Rechercher un code, un client, un lot…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
      </label>
      {err ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={charger}><RefreshCw aria-hidden /> Réessayer</Button></div>
      ) : !colis ? <div className="h-64 animate-pulse rounded-lg bg-white" /> : liste.length === 0 ? (
        <p className="rounded-lg bg-white px-4 py-10 text-center text-gris-texte">{colis.length ? 'Aucun colis ne correspond.' : 'Aucun colis pour le moment.'}</p>
      ) : (
        <Card className="border-0"><CardContent className="p-0">
          <ul className="divide-y divide-gris/20">
            {liste.map((c) => (
              <li key={c.id} className={c.statutActuel === 'EXCEPTION' ? 'bg-alerte/5' : ''}>
                <Link href={`/tableau-de-bord/colis/${c.id}`} className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fond/60">
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono font-semibold">{c.trackingCode}</span>
                    <span className="text-sm text-gris-texte">{c.description} · {c.client}{c.lot ? ` · ${c.lot}` : ''}</span>
                  </span>
                  <Badge statut={c.statutActuel} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}
