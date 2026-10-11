'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { UserPlus } from 'lucide-react';
import { Check } from 'lucide-react';
import { Copy } from 'lucide-react';
import { MessageCircle } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/Modal';
import { ClientForm, type ClientLite } from '@/components/ClientForm';
import { messageErreur } from '@/components/CheckpointForm';

interface LotRow { id: string; reference: string; mode: string }
interface Cree { id: string; trackingCode: string }

export default function Page() { return <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-white" />}><NouveauColis /></Suspense>; }

function NouveauColis() {
  const sp = useSearchParams();
  const [clients, setClients] = useState<ClientLite[] | null>(null);
  const [lots, setLots] = useState<LotRow[]>([]);
  const [chargeErr, setChargeErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [client, setClient] = useState<ClientLite | null>(null);
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'MER' | 'AIR'>('MER');
  const [poids, setPoids] = useState('');
  const [cartons, setCartons] = useState('');
  const [lotId, setLotId] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [cree, setCree] = useState<{ colis: Cree; client: ClientLite } | null>(null);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    Promise.all([api<ClientLite[]>('/clients'), api<LotRow[]>('/lots')]).then(([c, l]) => {
      setClients(c); setLots(l);
      const pre = sp.get('client'); if (pre) setClient(c.find((x) => x.id === pre) ?? null);
    }).catch((e) => setChargeErr(messageErreur(e)));
  }, [sp]);

  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase(); const sd = s.replace(/\D/g, '');
    if (!s) return [];
    return (clients ?? []).filter((c) => c.fullName.toLowerCase().includes(s) || (sd.length >= 2 && (c.phone ?? '').replace(/\D/g, '').includes(sd))).slice(0, 6);
  }, [clients, q]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!client) er.client = 'Choisissez un client (ou créez-en un).';
    if (description.trim().length < 2) er.description = 'Décrivez le contenu en quelques mots.';
    const p = poids.trim() ? Number(poids.replace(',', '.')) : undefined;
    if (p !== undefined && (!(p > 0) || Math.round(p * 100) / 100 !== p)) er.poids = 'Poids invalide (nombre positif, 2 décimales max).';
    const ca = cartons.trim() ? Number(cartons) : undefined;
    if (ca !== undefined && (!Number.isInteger(ca) || ca < 1)) er.cartons = 'Nombre de cartons invalide (entier ≥ 1).';
    setErr(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const c = await api<Cree>('/colis', { method: 'POST', body: JSON.stringify({ clientId: client!.id, description: description.trim(), mode, ...(p !== undefined ? { poidsKg: p } : {}), ...(ca !== undefined ? { cartons: ca } : {}), ...(lotId ? { lotId } : {}) }) });
      setCree({ colis: c, client: client! });
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setErr({ global: e.message.includes('Lot') ? 'Ce lot n’existe pas (ou plus). Choisissez-en un autre.' : 'Ce client n’existe pas (ou plus).' });
      else setErr({ global: messageErreur(e) });
    } finally { setBusy(false); }
  }

  if (cree) {
    const url = `${window.location.origin}/suivi/${cree.colis.trackingCode}`;
    const tel = (cree.client.phone ?? '').replace(/\D/g, '');
    const texte = `Bonjour ${cree.client.fullName}, votre colis est enregistré. Suivez-le ici : ${url}`;
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <Card className="border-2 border-succes-fonce"><CardContent className="space-y-4 p-6 text-center">
          <p className="text-sm font-semibold text-succes-fonce">Colis créé pour {cree.client.fullName}</p>
          <p className="text-sm text-gris-texte">Code de suivi</p>
          <p className="break-all font-mono text-3xl font-semibold tracking-wider">{cree.colis.trackingCode}</p>
          <p className="break-all text-sm text-gris-texte">{url}</p>
          <div className="flex flex-col gap-2">
            <Button size="lg" variant="outline" className="h-12 bg-white" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { window.prompt('Copiez ce lien :', url); } }}>
              {copie ? <Check aria-hidden /> : <Copy aria-hidden />} {copie ? 'Lien copié' : 'Copier le lien de suivi'}
            </Button>
            {tel && <Button asChild size="lg" variant="success" className="h-12"><a href={`https://wa.me/${tel}?text=${encodeURIComponent(texte)}`} target="_blank" rel="noopener noreferrer"><MessageCircle aria-hidden /> Envoyer sur WhatsApp</a></Button>}
          </div>
        </CardContent></Card>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="lg" className="h-11 flex-1"><Link href={`/tableau-de-bord/colis/${cree.colis.id}`}>Voir le colis</Link></Button>
          <Button size="lg" variant="secondary" className="h-11 flex-1" onClick={() => { setCree(null); setDescription(''); setPoids(''); setCartons(''); setLotId(''); }}>Créer un autre colis</Button>
        </div>
      </div>
    );
  }

  const lbl = 'mb-1 block text-sm font-semibold';
  const fe = (k: string) => err[k] && <p className="mt-1 text-sm font-semibold text-alerte" role="alert">{err[k]}</p>;
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/tableau-de-bord/colis" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les colis</Link>
      <h1 className="text-2xl font-semibold">Nouveau colis</h1>
      {chargeErr && <p className="rounded-md bg-alerte/10 px-3 py-2 text-sm font-semibold text-alerte">{chargeErr}</p>}
      <Card className="border-0"><CardHeader><CardTitle className="text-base">Le colis</CardTitle></CardHeader><CardContent>
        <form className="space-y-4" onSubmit={envoyer} noValidate>
          <div>
            <label className={lbl} htmlFor="c-client">Client</label>
            {client ? (
              <div className="flex items-center justify-between gap-2 rounded-md border border-gris/50 bg-fond px-3 py-2">
                <span><span className="font-semibold">{client.fullName}</span><span className="block text-sm text-gris-texte">{client.phone}</span></span>
                <Button type="button" variant="ghost" className="h-11" onClick={() => { setClient(null); setQ(''); }}>Changer</Button>
              </div>
            ) : (
              <>
                <input id="c-client" className="input h-11" placeholder={clients ? 'Nom ou téléphone…' : 'Chargement…'} value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" disabled={!clients} />
                {suggestions.length > 0 && (
                  <ul className="mt-1 divide-y divide-gris/20 rounded-md border border-gris/40 bg-white">
                    {suggestions.map((c) => <li key={c.id}><button type="button" className="flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-fond" onClick={() => { setClient(c); setErr((x) => ({ ...x, client: '' })); }}><span className="font-semibold">{c.fullName}</span><span className="text-sm text-gris-texte">{c.phone}</span></button></li>)}
                  </ul>
                )}
                {q.trim() && clients && suggestions.length === 0 && <p className="mt-1 text-sm text-gris-texte">Aucun client trouvé.</p>}
                <button type="button" className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-fonce underline underline-offset-2" onClick={() => setModal(true)}><UserPlus className="h-4 w-4" aria-hidden /> Nouveau client</button>
              </>
            )}
            {fe('client')}
          </div>
          <div><label className={lbl} htmlFor="c-desc">Description</label><input id="c-desc" className="input h-11" placeholder="Ex. : chaussures, pièces moto…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120} />{fe('description')}</div>
          <fieldset>
            <legend className={lbl}>Mode de transport</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['MER', 'AIR'] as const).map((m) => (
                <label key={m} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border px-3 text-sm font-semibold ${mode === m ? 'border-fonce bg-fonce text-white' : 'border-gris/50 bg-white text-fonce'}`}>
                  <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />{m === 'MER' ? 'Maritime' : 'Aérien'}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl} htmlFor="c-poids">Poids en kg (facultatif)</label><input id="c-poids" className="input h-11" inputMode="decimal" value={poids} onChange={(e) => setPoids(e.target.value)} />{fe('poids')}</div>
            <div><label className={lbl} htmlFor="c-cartons">Cartons (facultatif)</label><input id="c-cartons" className="input h-11" inputMode="numeric" placeholder="1" value={cartons} onChange={(e) => setCartons(e.target.value)} />{fe('cartons')}</div>
          </div>
          <div>
            <label className={lbl} htmlFor="c-lot">Lot (facultatif)</label>
            <select id="c-lot" className="input h-11" value={lotId} onChange={(e) => setLotId(e.target.value)}>
              <option value="">Aucun pour l’instant</option>
              {lots.map((l) => <option key={l.id} value={l.id}>{l.reference} · {l.mode === 'MER' ? 'Maritime' : 'Aérien'}</option>)}
            </select>
          </div>
          {fe('global')}
          <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>{busy ? 'Création…' : 'Créer le colis'}</Button>
          <p className="text-center text-xs text-gris-texte">Le code de suivi est généré automatiquement.</p>
        </form>
      </CardContent></Card>
      {modal && (
        <Modal titre="Nouveau client" onClose={() => setModal(false)}>
          <ClientForm onCancel={() => setModal(false)}
            onCreated={(c) => { setClients((l) => [...(l ?? []), c]); setClient(c); setModal(false); }}
            onUseExisting={(c) => { setClient((clients ?? []).find((x) => x.id === c.id) ?? c); setModal(false); }} />
        </Modal>
      )}
    </div>
  );
}
