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
import { Pastille, Confirmer, Supprimer, ModifierClient, ModifierColis, ModifierLot } from '@/components/Gestion';
import { useRole } from '@/lib/role';
import { Pencil } from 'lucide-react';
import { Archive } from 'lucide-react';
import { Trash } from 'lucide-react';
import { messageErreur } from '@/components/CheckpointForm';

interface Detail { id: string; fullName: string; phone: string; email?: string | null; city?: string | null; archivedAt?: string | null; colis: { id: string; trackingCode: string; description: string; mode: string; createdAt: string }[] }

export default function ClientDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dlg, setDlg] = useState<'modifier' | 'archiver' | 'desarchiver' | 'supprimer' | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { responsable } = useRole();
  const charger = () => { setErr(null); api<Detail>(`/clients/${params.id}`).then(setD).catch((e) => setErr(messageErreur(e))); };
  useEffect(charger, [params.id]);
  if (err) return <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={charger}><RefreshCw aria-hidden /> Réessayer</Button></div>;
  if (!d) return <div className="h-64 animate-pulse rounded-lg bg-white" />;
  const colis = [...d.colis].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return (
    <div className="space-y-5">
      <Link href="/tableau-de-bord/clients" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les clients</Link>
      <Card className="border-0"><CardContent className="space-y-1 p-5">
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{d.fullName}</h1>{d.archivedAt && <Pastille>Archivé</Pastille>}</div>
        <p className="text-sm text-gris-texte">{[formatTelephone(d.phone), d.email, d.city].filter(Boolean).join(' · ')}</p>
        <div className="pt-3"><Button asChild size="lg" className="h-11"><Link href={`/tableau-de-bord/colis/nouveau?client=${d.id}`}><Plus aria-hidden /> Nouveau colis pour ce client</Link></Button></div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" className="h-11" onClick={() => setDlg('modifier')}><Pencil aria-hidden /> Modifier</Button>
          {responsable && (d.archivedAt
            ? <Button variant="outline" className="h-11" onClick={() => setDlg('desarchiver')}><Archive aria-hidden /> Désarchiver</Button>
            : <Button variant="outline" className="h-11" onClick={() => setDlg('archiver')}><Archive aria-hidden /> Archiver</Button>)}
          {responsable && <Button variant="outline" className="h-11 text-alerte" onClick={() => setDlg('supprimer')}><Trash aria-hidden /> Supprimer</Button>}
        </div>
      </CardContent></Card>
      {ok && <p className="rounded-md bg-succes/10 px-4 py-3 text-sm font-semibold text-succes-fonce" role="status">{ok}</p>}
      {dlg === 'modifier' && <ModifierClient client={d} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setOk('Client modifié.'); charger(); }} />}
      {(dlg === 'archiver' || dlg === 'desarchiver') && (
        <Confirmer titre={dlg === 'archiver' ? `Archiver ${d.fullName} ?` : `Désarchiver ${d.fullName} ?`}
          texte={dlg === 'archiver' ? 'Le client disparaîtra de la liste des clients (filtre « Voir les archivés » pour le retrouver). Ses colis et leur historique sont conservés.' : 'Le client réapparaîtra dans la liste des clients.'}
          libelle={dlg === 'archiver' ? 'Archiver' : 'Désarchiver'} action={() => api(`/clients/${d.id}/${dlg}`, { method: 'POST' })}
          onClose={() => setDlg(null)} onDone={() => { setOk(dlg === 'archiver' ? 'Client archivé.' : 'Client désarchivé.'); setDlg(null); charger(); }} />
      )}
      {dlg === 'supprimer' && (
        <Supprimer entite="clients" id={d.id} nom={d.fullName} onClose={() => setDlg(null)}
          onDone={(r) => { if (r === 'supprime') { window.location.href = '/tableau-de-bord/clients'; return; } setDlg(null); setOk('Client archivé.'); charger(); }} />
      )}
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
