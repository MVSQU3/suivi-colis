'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Boxes } from 'lucide-react';
import { Users } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { Truck } from 'lucide-react';
import { Plus } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Ship } from 'lucide-react';
import { Plane } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Stats { clients: number; lots: number; colis: number; parStatut: Record<string, number> }
interface ColisRow { id: string; trackingCode: string; description: string; client: string; lot: string | null; statutActuel: string | null; mode?: string }
interface LotRow { id: string; reference: string; mode: string; nbColis: number; dernierStatut: string | null }
interface ClientRow { id: string; fullName: string; phone: string; city?: string | null }
interface Data { stats: Stats; colis: ColisRow[]; lots: LotRow[]; clients: ClientRow[] }

// Colis en route entre le départ de Chine et la mise à disposition.
const EN_TRANSIT = ['PARTI_DE_CHINE', 'ARRIVE_ABIDJAN', 'EN_DEDOUANEMENT'];

export default function Dashboard() {
  const [data, setData] = useState<Data | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  function charger() {
    setErreur(null);
    Promise.all([api<Stats>('/dashboard/stats'), api<ColisRow[]>('/colis'), api<LotRow[]>('/lots'), api<ClientRow[]>('/clients')])
      .then(([stats, colis, lots, clients]) => setData({ stats, colis, lots, clients }))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 401) return; // api() redirige vers /connexion
        setErreur('Impossible de charger le tableau de bord. Vérifiez votre connexion et réessayez.');
      });
  }
  useEffect(charger, []);

  if (erreur) {
    return (
      <Card className="border-alerte/40"><CardContent className="flex flex-col items-start gap-3 p-6">
        <p className="flex items-center gap-2 font-semibold text-alerte"><AlertTriangle className="h-5 w-5" aria-hidden /> {erreur}</p>
        <Button size="lg" className="h-11" onClick={charger}><RefreshCw aria-hidden /> Réessayer</Button>
      </CardContent></Card>
    );
  }
  if (!data) return <Squelette />;

  const { stats, colis, lots, clients } = data;
  const exception = stats.parStatut.EXCEPTION ?? 0;
  const transit = EN_TRANSIT.reduce((n, s) => n + (stats.parStatut[s] ?? 0), 0);
  const cartes = [
    { label: 'Colis', valeur: stats.colis, icon: Package, ton: 'bg-info/15 text-fonce' },
    { label: 'Lots', valeur: stats.lots, icon: Boxes, ton: 'bg-primaire/15 text-fonce' },
    { label: 'Clients', valeur: stats.clients, icon: Users, ton: 'bg-succes/15 text-succes-fonce' },
    { label: 'En transit', valeur: transit, icon: Truck, ton: 'bg-fonce/10 text-fonce' },
    { label: 'Problèmes signalés', valeur: exception, icon: AlertTriangle, ton: 'bg-alerte/10 text-alerte' },
  ];
  const lotRecent = lots[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tableau de bord</h1>
          <p className="text-sm text-gris-texte">Vue d’ensemble de vos expéditions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" className="h-11"><Link href="/tableau-de-bord/lots/nouveau"><Plus aria-hidden /> Nouveau lot</Link></Button>
          <Button asChild size="lg" variant="outline" className="h-11 bg-white"><Link href="/tableau-de-bord/colis/nouveau"><Plus aria-hidden /> Nouveau colis</Link></Button>
          <Button asChild size="lg" variant="secondary" className="h-11">
            <Link href={lotRecent ? `/tableau-de-bord/lots/${lotRecent.id}` : '#lots'}><RefreshCw aria-hidden /> Mise à jour groupée</Link>
          </Button>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5" aria-label="Statistiques">
        {cartes.map(({ label, valeur, icon: Icon, ton }) => (
          <Card key={label} className="border-0">
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ton}`}><Icon className="h-5 w-5" aria-hidden /></span>
              <div><p className="text-2xl font-semibold leading-none">{valeur}</p><p className="mt-1 text-sm text-gris-texte">{label}</p></div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card id="colis" className="scroll-mt-20 border-0">
        <CardHeader><CardTitle className="text-base">Expéditions récentes</CardTitle></CardHeader>
        <CardContent>
          {colis.length === 0 ? <Vide texte="Aucun colis pour le moment." /> : (
            <div className="-mx-4 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase text-gris-texte">
                  <tr><th className="px-4 py-2 font-semibold">Code</th><th className="px-4 py-2 font-semibold">Contenu</th><th className="px-4 py-2 font-semibold">Client</th><th className="px-4 py-2 font-semibold">Lot</th><th className="px-4 py-2 font-semibold">Statut</th></tr>
                </thead>
                <tbody className="divide-y divide-gris/20">
                  {colis.slice(0, 10).map((c) => (
                    <tr key={c.id} className="hover:bg-fond/60">
                      <td className="px-4 py-3"><Link className="font-mono font-semibold text-fonce underline-offset-2 hover:underline" href={`/tableau-de-bord/colis/${c.id}`}>{c.trackingCode}</Link></td>
                      <td className="px-4 py-3">{c.description}</td>
                      <td className="px-4 py-3">{c.client}</td>
                      <td className="px-4 py-3 text-gris-texte">{c.lot ?? '—'}</td>
                      <td className="px-4 py-3"><Badge statut={c.statutActuel} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card id="lots" className="scroll-mt-20 border-0">
          <CardHeader><CardTitle className="text-base">Lots</CardTitle></CardHeader>
          <CardContent>
            {lots.length === 0 ? <Vide texte="Aucun lot pour le moment." /> : (
              <ul className="divide-y divide-gris/20">
                {lots.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <Link className="flex min-h-11 items-center gap-2 font-semibold text-fonce hover:underline" href={`/tableau-de-bord/lots/${l.id}`}>
                      {l.mode === 'MER' ? <Ship className="h-4 w-4 text-gris-texte" aria-label="Maritime" /> : <Plane className="h-4 w-4 text-gris-texte" aria-label="Aérien" />}
                      {l.reference}
                    </Link>
                    <span className="text-sm text-gris-texte">{l.nbColis} colis</span>
                    <Badge statut={l.dernierStatut} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card id="clients" className="scroll-mt-20 border-0">
          <CardHeader><CardTitle className="text-base">Clients</CardTitle></CardHeader>
          <CardContent>
            {clients.length === 0 ? <Vide texte="Aucun client pour le moment." /> : (
              <ul className="divide-y divide-gris/20">
                {clients.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <span className="font-semibold">{c.fullName}</span>
                    <span className="text-sm text-gris-texte">{[c.city, c.phone].filter(Boolean).join(' · ')}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Vide({ texte }: { texte: string }) {
  return <p className="rounded-md bg-fond px-4 py-6 text-center text-sm text-gris-texte">{texte}</p>;
}

function Squelette() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="h-8 w-56 rounded bg-gris/30" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white" />)}</div>
      <div className="h-72 rounded-lg bg-white" />
    </div>
  );
}
