'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Ship } from 'lucide-react';
import { Plane } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { AlertTriangle } from 'lucide-react';
import { ArrowRightLeft } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pastille, Confirmer, Supprimer, ModifierClient, ModifierColis, ModifierLot } from '@/components/Gestion';
import { useRole } from '@/lib/role';
import { Pencil } from 'lucide-react';
import { Archive } from 'lucide-react';
import { Trash } from 'lucide-react';
import { formatDate } from '@suivi-colis/shared';
import { CheckpointForm, messageErreur, statutSuivant, type CheckpointBody } from '@/components/CheckpointForm';
import { TimelineBO, type TimelineEntry } from '@/components/TimelineBO';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/utils';

interface ColisLot { id: string; trackingCode: string; description: string; client: string; statutActuel: string | null }
interface Detail { id: string; reference: string; mode: string; departPrevu?: string | null; clotureLe?: string | null; checkpoints: TimelineEntry[]; colis: ColisLot[] }
interface LotRow { id: string; reference: string; clotureLe?: string | null }

export default function LotDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<Detail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [form, setForm] = useState(false);
  const [probleme, setProbleme] = useState<ColisLot | null>(null);
  const [transfert, setTransfert] = useState<ColisLot | null>(null);
  const [autres, setAutres] = useState<LotRow[]>([]);
  const [cible, setCible] = useState('');
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [dlg, setDlg] = useState<'modifier' | 'cloturer' | 'rouvrir' | 'supprimer' | null>(null);
  const { responsable } = useRole();

  const load = useCallback(() => {
    setErr(null);
    return api<Detail>(`/lots/${params.id}`).then(setD).catch((e) => setErr(messageErreur(e)));
  }, [params.id]);
  useEffect(() => { void load(); }, [load]);

  if (err) return <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={() => void load()}><RefreshCw aria-hidden /> Réessayer</Button></div>;
  if (!d) return <div className="space-y-4 animate-pulse"><div className="h-32 rounded-lg bg-white" /><div className="h-64 rounded-lg bg-white" /></div>;

  const actuel = [...d.checkpoints].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0]?.statut ?? null;
  const n = d.colis.length;
  const cloture = !!d.clotureLe;
  const colis = [...d.colis].sort((a, b) => Number(b.statutActuel === 'EXCEPTION') - Number(a.statutActuel === 'EXCEPTION'));

  async function majLot(body: CheckpointBody) {
    const r = await api<{ updatedCount: number }>(`/lots/${params.id}/checkpoints`, { method: 'POST', body: JSON.stringify(body) });
    setOk(`Mise à jour appliquée à ${r.updatedCount} colis.`); setForm(false); await load();
  }
  async function signaler(body: CheckpointBody) {
    if (!probleme) return;
    await api(`/colis/${probleme.id}/checkpoints`, { method: 'POST', body: JSON.stringify(body) });
    setOk(`Problème signalé sur ${probleme.trackingCode}.`); setProbleme(null); await load();
  }
  async function ouvrirTransfert(c: ColisLot) {
    setActionErr(null); setCible(''); setTransfert(c);
    try { setAutres((await api<LotRow[]>('/lots')).filter((l) => l.id !== params.id && !l.clotureLe)); } catch (e) { setActionErr(messageErreur(e)); }
  }
  async function transferer() {
    if (!transfert || !cible) return;
    const ref = autres.find((l) => l.id === cible)?.reference;
    if (!window.confirm(`Transférer ${transfert.trackingCode} vers le lot ${ref} ?`)) return;
    try { await api(`/lots/${cible}/colis`, { method: 'POST', body: JSON.stringify({ colisIds: [transfert.id] }) }); setOk(`${transfert.trackingCode} transféré vers ${ref}.`); setTransfert(null); await load(); }
    catch (e) { setActionErr(messageErreur(e)); }
  }
  async function retirer(c: ColisLot) {
    if (!window.confirm(`Retirer ${c.trackingCode} du lot ${d!.reference} ? Le colis gardera son historique.`)) return;
    try { await api(`/lots/${params.id}/colis/${c.id}`, { method: 'DELETE' }); setOk(`${c.trackingCode} retiré du lot.`); await load(); }
    catch (e) { setOk(null); setErr(messageErreur(e)); }
  }

  const boutonMaj = (
    <Button size="lg" className="h-12 w-full text-base sm:w-auto" onClick={() => { setForm(true); setOk(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }} disabled={n === 0}>
      <RefreshCw aria-hidden /> Mettre à jour tout le lot
    </Button>
  );

  return (
    <div className="space-y-5 pb-24 sm:pb-0">
      <Link href="/tableau-de-bord/lots" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les lots</Link>

      <Card className="border-0">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-fond">{d.mode === 'MER' ? <Ship className="h-6 w-6" aria-hidden /> : <Plane className="h-6 w-6" aria-hidden />}</span>
          <div className="min-w-0 flex-1">
            <h1 className="break-all text-xl font-semibold">{d.reference}</h1>
            <p className="text-sm text-gris-texte">{d.mode === 'MER' ? 'Maritime' : 'Aérien'} · {n} colis{d.departPrevu ? ` · départ prévu le ${formatDate(d.departPrevu).slice(0, 10)}` : ''}</p>
            <div className="mt-2 flex flex-wrap gap-2">{cloture && <Pastille>Clôturé</Pastille>}{(actuel || !cloture) && <Badge statut={actuel} />}</div>
          </div>
          {!cloture && <div className="hidden sm:block">{boutonMaj}</div>}
          <div className="flex w-full flex-wrap gap-2">
            <Button variant="outline" className="h-11" onClick={() => setDlg('modifier')}><Pencil aria-hidden /> Modifier</Button>
            {responsable && (cloture
              ? <Button variant="outline" className="h-11" onClick={() => setDlg('rouvrir')}><Archive aria-hidden /> Rouvrir</Button>
              : <Button variant="outline" className="h-11" onClick={() => setDlg('cloturer')}><Archive aria-hidden /> Clôturer</Button>)}
            {responsable && <Button variant="outline" className="h-11 text-alerte" onClick={() => setDlg('supprimer')}><Trash aria-hidden /> Supprimer</Button>}
          </div>
        </CardContent>
      </Card>

      {cloture && <p className="rounded-md border-l-4 border-fonce bg-white px-4 py-3 text-sm font-semibold" role="note">Lot clôturé{d.clotureLe ? ` le ${formatDate(d.clotureLe).slice(0, 10)}` : ''} : mettez à jour les colis un par un.</p>}
      {dlg === 'modifier' && <ModifierLot lot={d} onClose={() => setDlg(null)} onDone={() => { setDlg(null); setOk('Lot modifié.'); void load(); }} />}
      {(dlg === 'cloturer' || dlg === 'rouvrir') && (
        <Confirmer titre={dlg === 'cloturer' ? `Clôturer le lot ${d.reference} ?` : `Rouvrir le lot ${d.reference} ?`}
          texte={dlg === 'cloturer' ? 'Plus de mise à jour groupée ni d’ajout de colis dans ce lot. Les colis restent modifiables un par un.' : 'La mise à jour groupée et l’ajout de colis seront de nouveau possibles.'}
          libelle={dlg === 'cloturer' ? 'Clôturer' : 'Rouvrir'} action={() => api(`/lots/${d.id}/${dlg}`, { method: 'POST' })}
          onClose={() => setDlg(null)} onDone={() => { setOk(dlg === 'cloturer' ? 'Lot clôturé.' : 'Lot rouvert.'); setDlg(null); setForm(false); void load(); }} />
      )}
      {dlg === 'supprimer' && (
        <Supprimer entite="lots" id={d.id} nom={`le lot ${d.reference}`} onClose={() => setDlg(null)}
          onDone={(r) => { if (r === 'supprime') { window.location.href = '/tableau-de-bord/lots'; return; } setDlg(null); setForm(false); setOk('Lot clôturé.'); void load(); }} />
      )}
      {ok && <p className="rounded-md bg-succes/10 px-4 py-3 text-sm font-semibold text-succes-fonce" role="status">{ok}</p>}

      {form && !cloture && (
        <Card className="border-2 border-primaire">
          <CardHeader><CardTitle className="text-base">Mettre à jour tout le lot</CardTitle><p className="text-sm text-gris-texte">{n === 1 ? '1 colis concerné' : `${n} colis concernés`} · Visible par {n === 1 ? 'le client' : `les ${n} clients`} de ce lot</p></CardHeader>
          <CardContent>
            <CheckpointForm mode="lot" defaultStatut={statutSuivant(actuel)} submitLabel={n === 1 ? 'Appliquer au colis' : `Appliquer aux ${n} colis`}
              confirmText={`Cette mise à jour sera visible par ${n === 1 ? 'le client' : `les ${n} clients`} de ce lot. Confirmer ?`} onSubmit={majLot} onCancel={() => setForm(false)} />
          </CardContent>
        </Card>
      )}

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Colis du lot ({n})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {n === 0 ? <p className="mx-4 mb-4 rounded-md bg-fond px-4 py-6 text-center text-sm text-gris-texte">Aucun colis dans ce lot.</p> : (
            <ul className="divide-y divide-gris/20">
              {colis.map((c) => {
                const ex = c.statutActuel === 'EXCEPTION';
                return (
                  <li key={c.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3', ex && 'border-l-4 border-alerte bg-alerte/5')}>
                    <div className="min-w-0 flex-1">
                      <Link href={`/tableau-de-bord/colis/${c.id}`} className="font-mono font-semibold hover:underline">{c.trackingCode}</Link>
                      <p className="text-sm text-gris-texte">{c.description} · {c.client}</p>
                    </div>
                    <Badge statut={c.statutActuel} />
                    <div className="flex w-full gap-1 sm:w-auto">
                      <Button variant="ghost" className="h-11 text-alerte hover:bg-alerte/10" onClick={() => setProbleme(c)}><AlertTriangle aria-hidden /> Signaler un problème</Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Transférer ${c.trackingCode} vers un autre lot`} title="Transférer vers un autre lot" onClick={() => void ouvrirTransfert(c)}><ArrowRightLeft aria-hidden /></Button>
                      <Button variant="ghost" size="icon" className="h-11 w-11" aria-label={`Retirer ${c.trackingCode} du lot`} title="Retirer du lot" onClick={() => void retirer(c)}><Trash2 aria-hidden /></Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-0">
        <CardHeader><CardTitle className="text-base">Historique du lot</CardTitle></CardHeader>
        <CardContent><TimelineBO items={d.checkpoints} /></CardContent>
      </Card>

      {/* Bouton fixé en bas sur mobile */}
      {!form && !cloture && <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gris/30 bg-white p-3 sm:hidden">{boutonMaj}</div>}

      {probleme && (
        <Modal titre={`Signaler un problème · ${probleme.trackingCode}`} onClose={() => setProbleme(null)}>
          <p className="mb-4 text-sm text-gris-texte">Une exception sur ce seul colis. Le message sera affiché à {probleme.client}.</p>
          <CheckpointForm mode="exception" submitLabel="Signaler le problème" onSubmit={signaler} onCancel={() => setProbleme(null)} />
        </Modal>
      )}
      {transfert && (
        <Modal titre={`Transférer ${transfert.trackingCode}`} onClose={() => setTransfert(null)}>
          <label className="mb-1 block text-sm font-semibold" htmlFor="cible">Lot de destination</label>
          <select id="cible" className="input h-11" value={cible} onChange={(e) => setCible(e.target.value)}>
            <option value="">Choisissez un lot…</option>
            {autres.map((l) => <option key={l.id} value={l.id}>{l.reference}</option>)}
          </select>
          {actionErr && <p className="mt-2 text-sm font-semibold text-alerte" role="alert">{actionErr}</p>}
          <div className="mt-4 flex gap-2">
            <Button size="lg" className="h-12 flex-1" disabled={!cible} onClick={() => void transferer()}>Transférer</Button>
            <Button size="lg" variant="outline" className="h-12 bg-white" onClick={() => setTransfert(null)}>Annuler</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
