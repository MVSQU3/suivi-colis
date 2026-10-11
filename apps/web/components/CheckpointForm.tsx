'use client';
import { useEffect, useState } from 'react';
import { STATUTS_CHECKPOINT, STATUT_META, type StatutCheckpoint } from '@suivi-colis/shared';
import { Plus } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

export interface Site { id: string; nom: string; actif: boolean }
export interface CheckpointBody { statut: string; siteId: string; date: string; commentaire?: string }

/** Libellé back-office (« Problème signalé » côté back-office ; le public voit « Ton colis est bloqué »). */
export const libelleBO = (s: string) => (s === 'EXCEPTION' ? 'Problème signalé' : STATUT_META[s as StatutCheckpoint]?.libelle ?? s);

/** Statut suivant dans la liste ordonnée (étape + 1), à partir du statut actuel. */
export function statutSuivant(actuel: string | null | undefined): string {
  const e = actuel ? STATUT_META[actuel as StatutCheckpoint]?.etape ?? 0 : 0;
  const ordre = STATUTS_CHECKPOINT.filter((s) => s !== 'EXCEPTION');
  return ordre.find((s) => STATUT_META[s].etape === e + 1) ?? ordre.find((s) => STATUT_META[s].etape === Math.max(e, 1)) ?? ordre[0];
}

/** Messages d'erreur API lisibles. */
export function messageErreur(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.';
  const m = e.message.toLowerCase();
  if (m.includes('futur')) return 'La date ne peut pas être dans le futur.';
  if (m.includes('desactive') || m.includes('désactivé')) return 'Ce site est désactivé : choisissez un site actif.';
  if (e.status === 404 && m.includes('site')) return 'Ce site n’existe pas (ou plus). Rechargez la page et choisissez un autre site.';
  if (m.includes('siteid')) return 'Choisissez un site.';
  if (m.includes('commentaire')) return 'Un message pour le client est obligatoire pour une exception.';
  if (e.status === 409) return 'Un site porte déjà ce nom (même avec une casse ou des espaces différents).';
  if (m.includes('exception se déclare') || m.includes('exception se declare')) return 'Une exception se déclare sur un colis, pas sur un lot.';
  return e.message || 'Erreur inattendue.';
}

const pad = (n: number) => String(n).padStart(2, '0');
const localNow = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

interface Props {
  mode: 'lot' | 'colis' | 'exception';
  defaultStatut?: string;
  submitLabel: string;
  confirmText?: string;
  onSubmit: (body: CheckpointBody) => Promise<void>;
  onCancel?: () => void;
}

export function CheckpointForm({ mode, defaultStatut, submitLabel, confirmText, onSubmit, onCancel }: Props) {
  const [sites, setSites] = useState<Site[] | null>(null);
  const [statut, setStatut] = useState<string>(mode === 'exception' ? 'EXCEPTION' : defaultStatut ?? 'ARRIVE_ABIDJAN');
  const [siteId, setSiteId] = useState('');
  const [date, setDate] = useState(localNow());
  const [texte, setTexte] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ajout, setAjout] = useState(false);
  const [nouveau, setNouveau] = useState('');
  const [msgSite, setMsgSite] = useState<string | null>(null);

  useEffect(() => { api<Site[]>('/sites').then(setSites).catch((e) => setMsg(messageErreur(e))); }, []);
  const actifs = (sites ?? []).filter((s) => s.actif);
  const exception = statut === 'EXCEPTION';
  const statuts = STATUTS_CHECKPOINT.filter((s) => (mode === 'lot' ? s !== 'EXCEPTION' : true));

  async function ajouterSite() {
    setMsgSite(null);
    const nom = nouveau.trim();
    if (nom.length < 2) { setMsgSite('Nom de site trop court.'); return; }
    try {
      const s = await api<Site>('/sites', { method: 'POST', body: JSON.stringify({ nom }) });
      setSites((l) => [...(l ?? []), s]); setSiteId(s.id); setNouveau(''); setAjout(false);
    } catch (e) { setMsgSite(messageErreur(e)); }
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault(); setMsg(null);
    if (!siteId) { setMsg('Choisissez un site.'); return; }
    if (exception && !texte.trim()) { setMsg('Écrivez le message affiché au client.'); return; }
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) { setMsg('Date invalide.'); return; }
    if (d.getTime() > Date.now() + 60_000) { setMsg('La date ne peut pas être dans le futur.'); return; }
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await onSubmit({ statut, siteId, date: d.toISOString(), ...(texte.trim() ? { commentaire: texte.trim() } : {}) });
      setTexte(''); setDate(localNow());
    } catch (err) { setMsg(messageErreur(err)); } finally { setBusy(false); }
  }

  const lbl = 'mb-1 block text-sm font-semibold';
  return (
    <form className="space-y-4" onSubmit={envoyer}>
      {mode !== 'exception' && (
        <div>
          <label className={lbl} htmlFor="cp-statut">Statut</label>
          <select id="cp-statut" className="input h-11" value={statut} onChange={(e) => setStatut(e.target.value)}>
            {statuts.map((s) => <option key={s} value={s}>{libelleBO(s)}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className={lbl} htmlFor="cp-site">Site</label>
        <select id="cp-site" className="input h-11" value={siteId} onChange={(e) => setSiteId(e.target.value)} required disabled={!sites}>
          <option value="">{sites ? 'Choisissez un site…' : 'Chargement des sites…'}</option>
          {actifs.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
        </select>
        <p className="mt-1 text-xs text-gris-texte">Visible par le client : choisissez la ville ou le site.</p>
        {!ajout ? (
          <button type="button" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-fonce underline underline-offset-2" onClick={() => setAjout(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Ajouter un site
          </button>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="input h-11 flex-1" placeholder="Nom du site (ex. Port de Nansha)" value={nouveau} onChange={(e) => setNouveau(e.target.value)} aria-label="Nom du nouveau site" />
            <Button type="button" variant="secondary" className="h-11" onClick={ajouterSite}>Ajouter</Button>
            <Button type="button" variant="ghost" className="h-11" onClick={() => { setAjout(false); setMsgSite(null); }}>Annuler</Button>
            {msgSite && <p className="w-full text-sm font-semibold text-alerte" role="alert">{msgSite}</p>}
          </div>
        )}
      </div>
      <div>
        <label className={lbl} htmlFor="cp-date">Date</label>
        <input id="cp-date" className="input h-11" type="datetime-local" value={date} max={localNow()} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <div>
        <label className={lbl} htmlFor="cp-texte">{exception ? 'Message affiché au client (obligatoire)' : 'Note interne (facultatif, non visible par le client)'}</label>
        <textarea id="cp-texte" className="input min-h-[80px]" value={texte} onChange={(e) => setTexte(e.target.value)} required={exception}
          placeholder={exception ? 'Ex. : produits liquides refusés au fret aérien, nous attendons vos consignes.' : '(facultatif)'} />
      </div>
      {msg && <p className="rounded-md bg-alerte/10 px-3 py-2 text-sm font-semibold text-alerte" role="alert">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" variant={exception ? 'destructive' : 'default'} className="h-12 flex-1" disabled={busy}>{busy ? 'Envoi…' : submitLabel}</Button>
        {onCancel && <Button type="button" size="lg" variant="outline" className="h-12 bg-white" onClick={onCancel}>Annuler</Button>}
      </div>
    </form>
  );
}
