'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { Plus } from 'lucide-react';
import { formatDate } from '@suivi-colis/shared';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckpointForm, messageErreur, statutSuivant, type CheckpointBody } from '@/components/CheckpointForm';
import { TimelineBO, type TimelineEntry } from '@/components/TimelineBO';

interface Affectation { id: string; debut: string; fin: string | null; lot: { id: string; reference: string; mode: string } }
interface Detail {
  id: string; trackingCode: string; description: string; cartons?: number; mode: string;
  client: { fullName: string; phone?: string | null; city?: string | null };
  affectations: Affectation[]; historique: TimelineEntry[]; statutActuel: string | null;
}

export default function ColisDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<'etape' | 'exception' | null>(null);

  const load = useCallback(() => { setErr(null); return api<Detail>(`/colis/${params.id}`).then(setD).catch((e) => setErr(messageErreur(e))); }, [params.id]);
  useEffect(() => { void load(); }, [load]);

  if (err) return <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={() => void load()}><RefreshCw aria-hidden /> Réessayer</Button></div>;
  if (!d) return <div className="space-y-4 animate-pulse"><div className="h-32 rounded-lg bg-white" /><div className="h-64 rounded-lg bg-white" /></div>;

  async function poster(body: CheckpointBody) {
    await api(`/colis/${params.id}/checkpoints`, { method: 'POST', body: JSON.stringify(body) });
    setOk(body.statut === 'EXCEPTION' ? 'Problème signalé : le client voit ton message.' : 'Étape enregistrée.'); setForm(null); await load();
  }
  const affs = [...d.affectations].sort((a, b) => +new Date(b.debut) - +new Date(a.debut));

  return (
    <div className="space-y-5">
      <Link href="/tableau-de-bord/colis" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les colis</Link>

      <Card className={d.statutActuel === 'EXCEPTION' ? 'border-2 border-alerte' : 'border-0'}>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-mono text-xl font-semibold">{d.trackingCode}</h1>
              <p className="text-sm text-gris-texte">{d.description}{d.cartons ? ` · ${d.cartons} carton${d.cartons > 1 ? 's' : ''}` : ''} · {d.mode === 'MER' ? 'Maritime' : 'Aérien'}</p>
            </div>
            <Badge statut={d.statutActuel} />
          </div>
          <p className="text-sm"><span className="font-semibold">{d.client.fullName}</span>{d.client.city ? ` · ${d.client.city}` : ''}{d.client.phone ? ` · ${d.client.phone}` : ''}</p>
          <a className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-fonce underline underline-offset-2" href={`/suivi/${d.trackingCode}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden /> Voir la page client
          </a>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-12 flex-1" onClick={() => { setForm('etape'); setOk(null); }}><Plus aria-hidden /> Ajouter une étape</Button>
            <Button size="lg" variant="destructive" className="h-12 flex-1" onClick={() => { setForm('exception'); setOk(null); }}><AlertTriangle aria-hidden /> Signaler un problème</Button>
          </div>
        </CardContent>
      </Card>

      {ok && <p className="rounded-md bg-succes/10 px-4 py-3 text-sm font-semibold text-succes-fonce" role="status">{ok}</p>}

      {form && (
        <Card className={form === 'exception' ? 'border-2 border-alerte' : 'border-2 border-primaire'}>
          <CardHeader><CardTitle className="text-base">{form === 'exception' ? 'Signaler un problème sur ce colis' : 'Ajouter une étape à ce colis'}</CardTitle></CardHeader>
          <CardContent>
            <CheckpointForm key={form} mode={form === 'exception' ? 'exception' : 'colis'} defaultStatut={statutSuivant(d.statutActuel)}
              submitLabel={form === 'exception' ? 'Signaler le problème' : 'Enregistrer l’étape'} onSubmit={poster} onCancel={() => setForm(null)} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="border-0 lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Historique</CardTitle></CardHeader>
          <CardContent><TimelineBO items={d.historique} /></CardContent>
        </Card>
        <Card className="border-0">
          <CardHeader><CardTitle className="text-base">Lots</CardTitle></CardHeader>
          <CardContent>
            {affs.length === 0 ? <p className="text-sm text-gris-texte">Ce colis n’est dans aucun lot.</p> : (
              <ul className="space-y-3">
                {affs.map((a) => (
                  <li key={a.id} className="rounded-md bg-fond p-3">
                    <Link href={`/tableau-de-bord/lots/${a.lot.id}`} className="font-semibold hover:underline">{a.lot.reference}</Link>
                    <p className="text-xs text-gris-texte">Depuis le {formatDate(a.debut)}{a.fin ? ` · jusqu’au ${formatDate(a.fin)}` : ' · en cours'}</p>
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
