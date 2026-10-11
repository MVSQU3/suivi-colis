'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ship } from 'lucide-react';
import { Plane } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { messageErreur } from '@/components/CheckpointForm';

interface LotRow { id: string; reference: string; mode: string; nbColis: number; dernierStatut: string | null }

export default function LotsPage() {
  const [lots, setLots] = useState<LotRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const charger = () => { setErr(null); api<LotRow[]>('/lots').then(setLots).catch((e) => setErr(messageErreur(e))); };
  useEffect(charger, []);
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold">Lots</h1><p className="text-sm text-gris-texte">Conteneurs et LTA : mettez à jour tous leurs colis d’un coup.</p></div>
      {err ? <Erreur msg={err} retry={charger} /> : !lots ? <div className="h-64 animate-pulse rounded-lg bg-white" /> : lots.length === 0 ? (
        <p className="rounded-lg bg-white px-4 py-10 text-center text-gris-texte">Aucun lot pour le moment.</p>
      ) : (
        <Card className="border-0"><CardContent className="p-0">
          <ul className="divide-y divide-gris/20">
            {lots.map((l) => (
              <li key={l.id}>
                <Link href={`/tableau-de-bord/lots/${l.id}`} className="flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fond/60">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-fond">{l.mode === 'MER' ? <Ship className="h-5 w-5" aria-label="Maritime" /> : <Plane className="h-5 w-5" aria-label="Aérien" />}</span>
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{l.reference}</span><span className="text-sm text-gris-texte">{l.mode === 'MER' ? 'Maritime' : 'Aérien'} · {l.nbColis} colis</span></span>
                  <Badge statut={l.dernierStatut} />
                </Link>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
    </div>
  );
}

function Erreur({ msg, retry }: { msg: string; retry: () => void }) {
  return <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{msg}</p><Button className="h-11" onClick={retry}><RefreshCw aria-hidden /> Réessayer</Button></div>;
}
