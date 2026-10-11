'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { Plus } from 'lucide-react';
import { formatDate } from '@suivi-colis/shared';
import { formatTelephone } from '@/lib/format';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pastille, Confirmer, Supprimer, ModifierClient, ModifierColis, ModifierLot } from '@/components/Gestion';
import { useRole } from '@/lib/role';
import { Modal } from '@/components/Modal';
import { PackagePlus } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
import { Pencil } from 'lucide-react';
import { Archive } from 'lucide-react';
import { Trash } from 'lucide-react';
import { CheckpointForm, messageErreur, statutSuivant, type CheckpointBody } from '@/components/CheckpointForm';
import { TimelineBO, type TimelineEntry } from '@/components/TimelineBO';

interface Affectation { id: string; debut: string; fin: string | null; lot: { id: string; reference: string; mode: string } }
interface Detail {
  id: string; trackingCode: string; description: string; cartons?: number; poidsKg?: number | null; mode: string; archivedAt?: string | null;
  client: { fullName: string; phone?: string | null; city?: string | null };
  affectations: Affectation[]; historique: TimelineEntry[]; statutActuel: string | null;
}

export default function ColisDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState<'etape' | 'exception' | null>(null);
  const [dlg, setDlg] = useState<'modifier' | 'archiver' | 'desarchiver' | 'supprimer' | null>(null);
  const { responsable } = useRole();
  const [choixLot, setChoixLot] = useState(false);
  const [lots, setLots] = useState<{ id: string; reference: string; mode: string; clotureLe?: string | null }[] | null>(null);
  const [cible, setCible] = useState('');
  const [lotErr, setLotErr] = useState<string | null>(null);
  const [lotBusy, setLotBusy] = useState(false);

  const load = useCallback(() => { setErr(null); return api<Detail>(`/colis/${params.id}`).then(setD).catch((e) => setErr(messageErreur(e))); }, [params.id]);
  useEffect(() => { void load(); }, [load]);

  if (err) return <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={() => void load()}><RefreshCw aria-hidden /> Réessayer</Button></div>;
  if (!d) return <div className="space-y-4 animate-pulse"><div className="h-32 rounded-lg bg-white" /><div className="h-64 rounded-lg bg-white" /></div>;

  async function poster(body: CheckpointBody) {
    await api(`/colis/${params.id}/checkpoints`, { method: 'POST', body: JSON.stringify(body) });
    setOk(body.statut === 'EXCEPTION' ? 'Problème signalé : le client voit votre message.' : 'Étape enregistrée.'); setForm(null); await load();
  }
  const affs = [...d.affectations].sort((a, b) => +new Date(b.debut) - +new Date(a.debut));
  const lotActuel = affs.find((a) => !a.fin)?.lot ?? null;
  async function ouvrirChoixLot() {
    setChoixLot(true); setCible(''); setLotErr(null); setLots(null);
    try { setLots((await api<{ id: string; reference: string; mode: string; clotureLe?: string | null }[]>('/lots')).filter((l) => !l.clotureLe && l.id !== lotActuel?.id)); }
    catch (e) { setLotErr(messageErreur(e)); }
  }
  async function affecter() {
    if (!cible) return;
    const ref = lots?.find((l) => l.id === cible)?.reference;
    setLotBusy(true); setLotErr(null);
    try {
      const r = await api<{ affectes: number }>(`/lots/${cible}/colis`, { method: 'POST', body: JSON.stringify({ colisIds: [d!.id] }) });
      setOk(lotActuel ? `Colis transféré vers le lot ${ref}.` : `${r.affectes === 1 ? '1 colis ajouté' : `${r.affectes} colis ajoutés`} au lot ${ref}.`);
      setChoixLot(false); await load();
    } catch (e) { setLotErr(messageErreur(e)); } finally { setLotBusy(false); }
  }

  return (
    <div className="space-y-5">
      <Link href="/tableau-de-bord/colis" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les colis</Link>

      <Card className={d.statutActuel === 'EXCEPTION' ? 'border-2 border-alerte' : 'border-0'}>
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-mono text-xl font-semibold">{d.trackingCode}</h1>
              <p className="text-sm text-gris-texte">{d.description}{d.cartons ? ` · ${d.cartons} carton${d.cartons > 1 ? 's' : ''}` : ''}{d.poidsKg != null ? ` · ${String(d.poidsKg).replace('.', ',')} kg` : ''} · {d.mode === 'MER' ? 'Maritime' : 'Aérien'}</p>
            </div>
            <div className="flex flex-wrap gap-2">{d.archivedAt && <Pastille>Archivé</Pastille>}<Badge statut={d.statutActuel} /></div>
          </div>
          <p className="text-sm"><span className="font-semibold">{d.client.fullName}</span>{d.client.city ? ` · ${d.client.city}` : ''}{d.client.phone ? ` · ${formatTelephone(d.client.phone)}` : ''}</p>
          <a className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-fonce underline underline-offset-2" href={`/suivi/${d.trackingCode}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden /> Voir la page client
          </a>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-12 flex-1" onClick={() => { setForm('etape'); setOk(null); }}><Plus aria-hidden /> Ajouter une étape</Button>
            <Button size="lg" variant="destructive" className="h-12 flex-1" onClick={() => { setForm('exception'); setOk(null); }}><AlertTriangle aria-hidden /> Signaler un problème</Button>
          </div>
          {d.archivedAt && <p className="rounded-md bg-fond px-3 py-2 text-sm">Colis archivé : sa page de suivi affiche « plus actif » au client.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={() => setDlg('modifier')}><Pencil aria-hidden /> Modifier</Button>
            {responsable && (d.archivedAt
              ? <Button variant="outline" className="h-11" onClick={() => setDlg('desarchiver')}><Archive aria-hidden /> Désarchiver</Button>
              : <Button variant="outline" className="h-11" onClick={() => setDlg('archiver')}><Archive aria-hidden /> Archiver</Button>)}
            {responsable && <Button variant="outline" className="h-11 text-alerte" onClick={() => setDlg('supprimer')}><Trash aria-hidden /> Supprimer</Button>}
          </div>
        </CardContent>
      </Card>

      {dlg === 'modifier' && <ModifierColis colis={d} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setOk('Colis modifié.'); void load(); }} />}
      {(dlg === 'archiver' || dlg === 'desarchiver') && (
        <Confirmer titre={dlg === 'archiver' ? `Archiver ${d.trackingCode} ?` : `Désarchiver ${d.trackingCode} ?`}
          texte={dlg === 'archiver' ? 'Le colis disparaîtra des listes et sa page de suivi indiquera au client que le suivi n’est plus actif. Son historique est conservé.' : 'Le colis réapparaîtra dans la liste et sa page de suivi redeviendra active.'}
          libelle={dlg === 'archiver' ? 'Archiver' : 'Désarchiver'} action={() => api(`/colis/${d.id}/${dlg}`, { method: 'POST' })}
          onClose={() => setDlg(null)} onDone={() => { setOk(dlg === 'archiver' ? 'Colis archivé.' : 'Colis désarchivé.'); setDlg(null); void load(); }} />
      )}
      {dlg === 'supprimer' && (
        <Supprimer entite="colis" id={d.id} nom={d.trackingCode} onClose={() => setDlg(null)}
          onDone={(r) => { if (r === 'supprime') { window.location.href = '/tableau-de-bord/colis'; return; } setDlg(null); setOk('Colis archivé.'); void load(); }} />
      )}
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
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-base">Lots</CardTitle>
            {!d.archivedAt && (lotActuel
              ? <Button variant="outline" className="h-11" onClick={() => void ouvrirChoixLot()}><ArrowRightLeft aria-hidden /> Transférer</Button>
              : <Button variant="outline" className="h-11" onClick={() => void ouvrirChoixLot()}><PackagePlus aria-hidden /> Ajouter au lot</Button>)}
          </CardHeader>
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
      {choixLot && (
        <Modal titre={lotActuel ? `Transférer ${d.trackingCode}` : `Ajouter ${d.trackingCode} à un lot`} onClose={() => setChoixLot(false)}>
          {lotActuel && <p className="mb-3 text-sm text-gris-texte">Le colis quittera le lot {lotActuel.reference}.</p>}
          <label className="mb-1 block text-sm font-semibold" htmlFor="choix-lot">Lot</label>
          <select id="choix-lot" className="input h-11" value={cible} onChange={(e) => setCible(e.target.value)} disabled={!lots}>
            <option value="">{lots ? (lots.length ? 'Choisissez un lot…' : 'Aucun lot ouvert disponible') : 'Chargement…'}</option>
            {(lots ?? []).map((l) => <option key={l.id} value={l.id}>{l.reference} · {l.mode === 'MER' ? 'Maritime' : 'Aérien'}</option>)}
          </select>
          <p className="mt-1 text-xs text-gris-texte">Les lots clôturés ne sont pas proposés.</p>
          {lotErr && <p className="mt-2 text-sm font-semibold text-alerte" role="alert">{lotErr}</p>}
          <div className="mt-4 flex gap-2">
            <Button size="lg" className="h-12 flex-1" disabled={!cible || lotBusy} onClick={() => void affecter()}>{lotBusy ? 'Un instant…' : lotActuel ? 'Transférer' : 'Ajouter au lot'}</Button>
            <Button size="lg" variant="outline" className="h-12 bg-white" onClick={() => setChoixLot(false)}>Annuler</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
