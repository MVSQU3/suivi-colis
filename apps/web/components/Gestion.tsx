'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/Modal';
import { messageErreur } from '@/components/CheckpointForm';
import { telephoneValide } from '@/components/ClientForm';

export type Entite = 'clients' | 'colis' | 'lots';
const lbl = 'mb-1 block text-sm font-semibold';
const FieldErr = ({ m }: { m?: string }) => (m ? <p className="mt-1 text-sm font-semibold text-alerte" role="alert">{m}</p> : null);

export function Pastille({ children }: { children: string }) {
  return <span className="inline-flex items-center rounded-full bg-fonce px-2.5 py-0.5 text-xs font-semibold text-white">{children}</span>;
}

/** Confirmation générique d'une action (archiver, désarchiver, clôturer, rouvrir…). */
export function Confirmer({ titre, texte, libelle, danger, action, onClose, onDone }: {
  titre: string; texte: string; libelle: string; danger?: boolean; action: () => Promise<unknown>; onClose: () => void; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => { setBusy(true); setErr(null); try { await action(); onDone(); } catch (e) { setErr(messageErreur(e)); setBusy(false); } };
  return (
    <Modal titre={titre} onClose={onClose}>
      <p className="text-sm text-gris-texte">{texte}</p>
      {err && <p className="mt-3 text-sm font-semibold text-alerte" role="alert">{err}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="h-11" onClick={onClose}>Annuler</Button>
        <Button variant={danger ? 'destructive' : 'default'} className="h-11" disabled={busy} onClick={go}>{busy ? 'Un instant…' : libelle}</Button>
      </div>
    </Modal>
  );
}

const ALT = { archiver: { libelle: 'Archiver à la place', fait: 'archive' }, cloturer: { libelle: 'Clôturer à la place', fait: 'cloture' } } as const;

/** Suppression : si l'API refuse (409 + action), propose l'alternative dans la même boîte. */
export function Supprimer({ entite, id, nom, onClose, onDone }: {
  entite: Entite; id: string; nom: string; onClose: () => void; onDone: (r: 'supprime' | 'archive' | 'cloture') => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [alt, setAlt] = useState<'archiver' | 'cloturer' | null>(null);
  const supprimer = async () => {
    setBusy(true); setErr(null);
    try { await api(`/${entite}/${id}`, { method: 'DELETE' }); onDone('supprime'); }
    catch (e) {
      const action = e instanceof ApiError && e.status === 409 ? (e.body as { action?: string } | undefined)?.action : undefined;
      if (action === 'archiver' || action === 'cloturer') { setAlt(action); setErr(e instanceof ApiError ? e.message : null); }
      else setErr(messageErreur(e));
      setBusy(false);
    }
  };
  const alternative = async () => {
    if (!alt) return;
    setBusy(true); setErr(null);
    try { await api(`/${entite}/${id}/${alt}`, { method: 'POST' }); onDone(ALT[alt].fait); }
    catch (e) { setErr(messageErreur(e)); setBusy(false); }
  };
  return (
    <Modal titre={`Supprimer ${nom} ?`} onClose={onClose}>
      {!alt ? (
        <p className="text-sm text-gris-texte">La suppression est définitive. Elle n’est possible que si rien n’a encore été enregistré (aucun colis, aucune étape).</p>
      ) : (
        <p className="text-sm text-gris-texte">{alt === 'archiver'
          ? 'Impossible de supprimer : il y a déjà un historique. Vous pouvez l’archiver : il disparaîtra des listes mais son historique sera conservé.'
          : 'Impossible de supprimer : ce lot a déjà un historique. Vous pouvez le clôturer : plus aucune mise à jour groupée ni ajout de colis.'}</p>
      )}
      {err && <p className="mt-3 text-sm font-semibold text-alerte" role="alert">{err}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="outline" className="h-11" onClick={onClose}>Annuler</Button>
        {alt
          ? <Button className="h-11" disabled={busy} onClick={alternative}>{busy ? 'Un instant…' : ALT[alt].libelle}</Button>
          : <Button variant="destructive" className="h-11" disabled={busy} onClick={supprimer}>{busy ? 'Suppression…' : 'Supprimer définitivement'}</Button>}
      </div>
    </Modal>
  );
}

/** N'envoie que les champs modifiés (PATCH partiel). */
function diff<T extends Record<string, unknown>>(avant: T, apres: T) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(apres)) if (apres[k] !== avant[k]) out[k] = apres[k];
  return out;
}
function Actions({ busy, onClose }: { busy: boolean; onClose: () => void }) {
  return (
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" className="h-11" onClick={onClose}>Annuler</Button>
      <Button type="submit" className="h-11" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</Button>
    </div>
  );
}

export interface ClientEdit { id: string; fullName: string; phone: string; email?: string | null; city?: string | null }
export function ModifierClient({ client, onClose, onDone }: { client: ClientEdit; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ fullName: client.fullName, phone: client.phone, email: client.email ?? '', city: client.city ?? '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [existant, setExistant] = useState<{ id: string; fullName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });
  async function envoyer(e: React.FormEvent) {
    e.preventDefault(); setExistant(null);
    const er: Record<string, string> = {};
    if (v.fullName.trim().length < 2) er.fullName = 'Indiquez le nom du client (2 caractères minimum).';
    if (!telephoneValide(v.phone)) er.phone = 'Numéro invalide : 10 chiffres attendus, avec ou sans +225.';
    if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) er.email = 'Adresse e-mail invalide.';
    setErr(er); if (Object.keys(er).length) return;
    const body = diff({ fullName: client.fullName, phone: client.phone, email: client.email ?? '', city: client.city ?? '' },
      { fullName: v.fullName.trim(), phone: v.phone.trim(), email: v.email.trim(), city: v.city.trim() });
    if (body.email === '') delete body.email; // l'API exige un e-mail valide s'il est envoyé
    if (!Object.keys(body).length) { onClose(); return; }
    setBusy(true);
    try { await api(`/clients/${client.id}`, { method: 'PATCH', body: JSON.stringify(body) }); onDone(); }
    catch (e2) {
      if (e2 instanceof ApiError && e2.status === 409) { setExistant((e2.body as { clientExistant?: { id: string; fullName: string } })?.clientExistant ?? null); setErr({ phone: 'Ce numéro existe déjà.' }); }
      else if (e2 instanceof ApiError && e2.status === 400 && /num/i.test(e2.message)) setErr({ phone: 'Numéro invalide : 10 chiffres attendus, avec ou sans +225.' });
      else setErr({ global: messageErreur(e2) });
      setBusy(false);
    }
  }
  return (
    <Modal titre="Modifier le client" onClose={onClose}>
      <form onSubmit={envoyer} noValidate className="space-y-3">
        <div><label className={lbl} htmlFor="m-nom">Nom</label><input id="m-nom" className="input h-11" value={v.fullName} onChange={set('fullName')} /><FieldErr m={err.fullName} /></div>
        <div><label className={lbl} htmlFor="m-tel">Téléphone</label><input id="m-tel" className="input h-11" inputMode="tel" value={v.phone} onChange={set('phone')} /><FieldErr m={err.phone} />
          {existant && <Link href={`/tableau-de-bord/clients/${existant.id}`} className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold underline">Voir {existant.fullName}</Link>}</div>
        <div><label className={lbl} htmlFor="m-mail">E-mail (facultatif)</label><input id="m-mail" type="email" className="input h-11" value={v.email} onChange={set('email')} /><FieldErr m={err.email} /></div>
        <div><label className={lbl} htmlFor="m-ville">Ville (facultatif)</label><input id="m-ville" className="input h-11" value={v.city} onChange={set('city')} /></div>
        <FieldErr m={err.global} />
        <Actions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

export interface ColisEdit { id: string; description: string; cartons?: number | null; poidsKg?: number | null; mode: string }
export function ModifierColis({ colis, onClose, onDone }: { colis: ColisEdit; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState({ description: colis.description, cartons: colis.cartons ? String(colis.cartons) : '', poidsKg: colis.poidsKg != null ? String(colis.poidsKg) : '', mode: colis.mode });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    const cartons = v.cartons.trim() ? Number(v.cartons) : undefined;
    const poids = v.poidsKg.trim() ? Number(v.poidsKg.replace(',', '.')) : undefined;
    if (v.description.trim().length < 2) er.description = 'Décrivez le colis (2 caractères minimum).';
    if (cartons !== undefined && (!Number.isInteger(cartons) || cartons < 1)) er.cartons = 'Nombre entier, au moins 1.';
    if (poids !== undefined && (!(poids > 0) || Math.round(poids * 100) !== poids * 100)) er.poidsKg = 'Poids positif, 2 décimales maximum.';
    setErr(er); if (Object.keys(er).length) return;
    const body: Record<string, unknown> = {};
    if (v.description.trim() !== colis.description) body.description = v.description.trim();
    if (cartons !== undefined && cartons !== colis.cartons) body.cartons = cartons;
    if (poids !== undefined && poids !== colis.poidsKg) body.poidsKg = poids;
    if (v.mode !== colis.mode) body.mode = v.mode;
    if (!Object.keys(body).length) { onClose(); return; }
    setBusy(true);
    try { await api(`/colis/${colis.id}`, { method: 'PATCH', body: JSON.stringify(body) }); onDone(); }
    catch (e2) { setErr({ global: messageErreur(e2) }); setBusy(false); }
  }
  return (
    <Modal titre="Modifier le colis" onClose={onClose}>
      <form onSubmit={envoyer} noValidate className="space-y-3">
        <div><label className={lbl} htmlFor="m-desc">Description</label><input id="m-desc" className="input h-11" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /><FieldErr m={err.description} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={lbl} htmlFor="m-poids">Poids en kg (facultatif)</label><input id="m-poids" className="input h-11" inputMode="decimal" value={v.poidsKg} onChange={(e) => setV({ ...v, poidsKg: e.target.value })} /><FieldErr m={err.poidsKg} /></div>
          <div><label className={lbl} htmlFor="m-cartons">Cartons</label><input id="m-cartons" className="input h-11" inputMode="numeric" value={v.cartons} onChange={(e) => setV({ ...v, cartons: e.target.value })} /><FieldErr m={err.cartons} /></div>
        </div>
        <div><label className={lbl} htmlFor="m-mode">Mode</label>
          <select id="m-mode" className="input h-11" value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })}><option value="MER">Maritime</option><option value="AIR">Aérien</option></select></div>
        <FieldErr m={err.global} />
        <Actions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}

export interface LotEdit { id: string; reference: string; mode: string; departPrevu?: string | null }
export function ModifierLot({ lot, onClose, onDone }: { lot: LotEdit; onClose: () => void; onDone: () => void }) {
  const jour = lot.departPrevu ? lot.departPrevu.slice(0, 10) : '';
  const [v, setV] = useState({ reference: lot.reference, mode: lot.mode, departPrevu: jour });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (v.reference.trim().length < 2) { setErr({ reference: 'Indiquez la référence (2 caractères minimum).' }); return; }
    setErr({});
    const body: Record<string, unknown> = {};
    if (v.reference.trim() !== lot.reference) body.reference = v.reference.trim();
    if (v.mode !== lot.mode) body.mode = v.mode;
    if (v.departPrevu && v.departPrevu !== jour) body.departPrevu = new Date(`${v.departPrevu}T12:00:00`).toISOString();
    if (!Object.keys(body).length) { onClose(); return; }
    setBusy(true);
    try { await api(`/lots/${lot.id}`, { method: 'PATCH', body: JSON.stringify(body) }); onDone(); }
    catch (e2) {
      if (e2 instanceof ApiError && e2.status === 409) setErr({ reference: 'Un lot porte déjà cette référence.' });
      else setErr({ global: messageErreur(e2) });
      setBusy(false);
    }
  }
  return (
    <Modal titre="Modifier le lot" onClose={onClose}>
      <form onSubmit={envoyer} noValidate className="space-y-3">
        <div><label className={lbl} htmlFor="m-ref">Référence (conteneur ou n° de vol)</label><input id="m-ref" className="input h-11" value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} /><FieldErr m={err.reference} /></div>
        <div><label className={lbl} htmlFor="m-lmode">Mode</label>
          <select id="m-lmode" className="input h-11" value={v.mode} onChange={(e) => setV({ ...v, mode: e.target.value })}><option value="MER">Maritime</option><option value="AIR">Aérien</option></select></div>
        <div><label className={lbl} htmlFor="m-depart">Départ prévu (facultatif)</label><input id="m-depart" type="date" className="input h-11" value={v.departPrevu} onChange={(e) => setV({ ...v, departPrevu: e.target.value })} /></div>
        <FieldErr m={err.global} />
        <Actions busy={busy} onClose={onClose} />
      </form>
    </Modal>
  );
}
