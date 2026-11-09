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
import { useRole, useTenant } from '@/lib/role';
import { Pencil } from 'lucide-react';
import { Archive } from 'lucide-react';
import { Trash } from 'lucide-react';
import { Send } from 'lucide-react';
import { LogOut } from 'lucide-react';
import { MessageCircle } from 'lucide-react';
import { formatDate } from '@suivi-colis/shared';
import { ApiError } from '@/lib/api';
import { messageErreur } from '@/components/CheckpointForm';

interface Detail { id: string; fullName: string; phone: string; email?: string | null; city?: string | null; archivedAt?: string | null; colis: { id: string; trackingCode: string; description: string; mode: string; createdAt: string }[] }

export default function ClientDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [dlg, setDlg] = useState<'modifier' | 'archiver' | 'desarchiver' | 'supprimer' | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { responsable } = useRole();
  const { fuseau } = useTenant();
  const [lien, setLien] = useState<{ url: string; expireLe: string } | null>(null);
  const [lienErr, setLienErr] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [confDeco, setConfDeco] = useState(false);
  const envoyerLien = async () => {
    setEnvoi(true); setLienErr(null); setLien(null);
    try { setLien(await api<{ url: string; expireLe: string }>(`/clients/${params.id}/lien-acces`, { method: 'POST' })); }
    catch (e) { setLienErr(e instanceof ApiError && e.status === 409 ? 'Désarchivez ce client pour lui envoyer un lien.' : messageErreur(e)); }
    finally { setEnvoi(false); }
  };
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
        {!d.archivedAt && (
          <div className="mt-3 space-y-2 border-t border-gris/20 pt-3">
            <p className="text-sm font-semibold">Accès « Mes colis » du client</p>
            <div className="flex flex-wrap gap-2">
              <Button size="lg" variant="secondary" className="h-11" onClick={envoyerLien} disabled={envoi}><Send aria-hidden /> {envoi ? 'Création du lien…' : 'Envoyer le lien d’accès'}</Button>
              <Button size="lg" variant="outline" className="h-11" onClick={() => setConfDeco(true)}><LogOut aria-hidden /> Déconnecter ce client</Button>
            </div>
            {lienErr && <p role="alert" className="text-sm font-semibold text-alerte">{lienErr}</p>}
            {lien && (() => {
              const msg = `Bonjour ${d.fullName}, voici votre lien pour suivre tous vos colis : ${lien.url}\nIl est valable 48 h (jusqu’au ${formatDate(lien.expireLe, fuseau)}) et ne fonctionne qu’une seule fois.`;
              return (
                <div className="space-y-2 rounded-md bg-fond p-4">
                  <p className="text-sm">Lien créé, valable 48 h (jusqu’au <strong>{formatDate(lien.expireLe, fuseau)}</strong>). Un nouveau lien remplace le précédent.</p>
                  <p className="break-all font-mono text-xs text-gris-texte">{lien.url}</p>
                  <Button asChild size="lg" variant="success" className="h-11"><a href={`https://wa.me/${d.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> Envoyer sur WhatsApp</a></Button>
                </div>
              );
            })()}
          </div>
        )}
      </CardContent></Card>
      {ok && <p className="rounded-md bg-succes/10 px-4 py-3 text-sm font-semibold text-succes-fonce" role="status">{ok}</p>}
      {dlg === 'modifier' && <ModifierClient client={d} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setOk('Client modifié.'); charger(); }} />}
      {(dlg === 'archiver' || dlg === 'desarchiver') && (
        <Confirmer titre={dlg === 'archiver' ? `Archiver ${d.fullName} ?` : `Désarchiver ${d.fullName} ?`}
          texte={dlg === 'archiver' ? 'Le client disparaîtra de la liste des clients (filtre « Voir les archivés » pour le retrouver). Ses suivis de colis restent actifs ; il ne pourra plus accéder à « Mes colis ».' : 'Le client réapparaîtra dans la liste des clients.'}
          libelle={dlg === 'archiver' ? 'Archiver' : 'Désarchiver'} action={() => api(`/clients/${d.id}/${dlg}`, { method: 'POST' })}
          onClose={() => setDlg(null)} onDone={() => { setOk(dlg === 'archiver' ? 'Client archivé.' : 'Client désarchivé.'); setDlg(null); charger(); }} />
      )}
      {confDeco && (
        <Confirmer titre={`Déconnecter ${d.fullName} ?`} texte="Le client n’aura plus accès à « Mes colis » sur ses appareils. Ses suivis de colis restent actifs ; il faudra lui envoyer un nouveau lien."
          libelle="Déconnecter" danger action={async () => { const r = await api<{ sessionsRevoquees: number }>(`/clients/${d.id}/deconnecter`, { method: 'POST' }); const n = r.sessionsRevoquees ?? 0; setOk(n === 0 ? 'Aucune session ouverte : le client n’était pas connecté.' : `Client déconnecté (${n} session${n > 1 ? 's' : ''} fermée${n > 1 ? 's' : ''}).`); }}
          onClose={() => setConfDeco(false)} onDone={() => setConfDeco(false)} />
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
