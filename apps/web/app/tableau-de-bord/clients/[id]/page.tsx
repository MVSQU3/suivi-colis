'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Plus } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { formatTelephone } from '@/lib/format';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { messageErreur } from '@/components/CheckpointForm';

interface Detail { id: string; fullName: string; phone: string; email?: string | null; city?: string | null; colis: { id: string; trackingCode: string; description: string; mode: string; createdAt: string }[] }

export default function ClientDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const charger = () => { setErr(null); api<Detail>(`/clients/${params.id}`).then(setD).catch((e) => setErr(messageErreur(e))); };
  useEffect(charger, [params.id]);
  if (err) return <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={charger}><RefreshCw aria-hidden /> Réessayer</Button></div>;
  if (!d) return <div className="h-64 animate-pulse rounded-lg bg-white" />;
  const colis = [...d.colis].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return (
    <div className="space-y-5">
      <Link href="/tableau-de-bord/clients" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les clients</Link>
      <Card className="border-0"><CardContent className="space-y-1 p-5">
        <h1 className="text-xl font-semibold">{d.fullName}</h1>
        <p className="text-sm text-gris-texte">{[formatTelephone(d.phone), d.email, d.city].filter(Boolean).join(' · ')}</p>
        <div className="pt-3"><Button asChild size="lg" className="h-11"><Link href={`/tableau-de-bord/colis/nouveau?client=${d.id}`}><Plus aria-hidden /> Nouveau colis pour ce client</Link></Button></div>
      </CardContent></Card>
      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Colis ({colis.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {colis.length === 0 ? <p className="mx-4 mb-4 rounded-md bg-fond px-4 py-6 text-center text-sm text-gris-texte">Aucun colis pour ce client.</p> : (
            <ul className="divide-y divide-gris/20">
              {colis.map((c) => (
                <li key={c.id}><Link href={`/tableau-de-bord/colis/${c.id}`} className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-fond/60">
                  <span className="font-mono font-semibold">{c.trackingCode}</span><span className="text-sm text-gris-texte">{c.description} · {c.mode === 'MER' ? 'Maritime' : 'Aérien'}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
