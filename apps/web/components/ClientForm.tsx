'use client';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

export interface ClientLite { id: string; fullName: string; phone?: string; city?: string | null; email?: string | null }

/** Accepte « 07 07 12 34 56 », « 0707123456 », « +225 07… », « 00225… » (l'API normalise). */
export function telephoneValide(v: string) {
  const d = v.replace(/[\s.\-()]/g, '').replace(/^\+225|^00225/, '');
  return /^\d{10}$/.test(d);
}

interface Props { onCreated: (c: ClientLite) => void; onUseExisting?: (c: ClientLite) => void; onCancel?: () => void }

export function ClientForm({ onCreated, onUseExisting, onCancel }: Props) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+225 ');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [existant, setExistant] = useState<ClientLite | null>(null);
  const [busy, setBusy] = useState(false);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault(); setExistant(null);
    const er: Record<string, string> = {};
    if (fullName.trim().length < 2) er.fullName = 'Indiquez le nom du client (2 caractères minimum).';
    if (!telephoneValide(phone)) er.phone = 'Numéro invalide : 10 chiffres attendus, avec ou sans +225.';
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) er.email = 'Adresse e-mail invalide.';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const c = await api<ClientLite>('/clients', { method: 'POST', body: JSON.stringify({ fullName: fullName.trim(), phone, ...(email.trim() ? { email: email.trim() } : {}), ...(city.trim() ? { city: city.trim() } : {}) }) });
      onCreated(c);
    } catch (e) {
      if (e instanceof ApiError) {
        const b = (e.body ?? {}) as { champ?: string; clientExistant?: ClientLite };
        if (e.status === 409 && b.clientExistant) { setExistant(b.clientExistant); setErr({ phone: `Ce numéro existe déjà : ${b.clientExistant.fullName}` }); }
        else if (e.status === 409) setErr({ phone: 'Ce numéro existe déjà.' });
        else if (b.champ) setErr({ [b.champ]: e.message });
        else setErr({ global: e.message });
      } else setErr({ global: 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.' });
    } finally { setBusy(false); }
  }

  const lbl = 'mb-1 block text-sm font-semibold';
  const fe = (k: string) => err[k] && <p className="mt-1 text-sm font-semibold text-alerte" role="alert">{err[k]}</p>;
  return (
    <form className="space-y-4" onSubmit={envoyer} noValidate>
      <div><label className={lbl} htmlFor="cl-nom">Nom complet</label><input id="cl-nom" className="input h-11" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />{fe('fullName')}</div>
      <div>
        <label className={lbl} htmlFor="cl-tel">Téléphone (WhatsApp)</label>
        <input id="cl-tel" className="input h-11" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        <p className="mt-1 text-xs text-gris-texte">Ex. 07 07 12 34 56</p>
        {fe('phone')}
        {existant && onUseExisting && <Button type="button" variant="secondary" className="mt-2 h-11" onClick={() => onUseExisting(existant)}>Utiliser ce client</Button>}
      </div>
      <div><label className={lbl} htmlFor="cl-mail">E-mail (facultatif)</label><input id="cl-mail" className="input h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />{fe('email')}</div>
      <div><label className={lbl} htmlFor="cl-ville">Ville (facultatif)</label><input id="cl-ville" className="input h-11" value={city} onChange={(e) => setCity(e.target.value)} />{fe('city')}</div>
      {fe('global')}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" className="h-12 flex-1" disabled={busy}>{busy ? 'Enregistrement…' : 'Créer le client'}</Button>
        {onCancel && <Button type="button" size="lg" variant="outline" className="h-12 bg-white" onClick={onCancel}>Annuler</Button>}
      </div>
    </form>
  );
}
