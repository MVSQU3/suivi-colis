'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { messageErreur } from '@/components/CheckpointForm';
import { SelectionColis } from '@/components/SelectionColis';

interface Lot { id: string; reference: string }

export default function NouveauLot() {
  const router = useRouter();
  const [reference, setReference] = useState('');
  const [mode, setMode] = useState<'MER' | 'AIR'>('MER');
  const [depart, setDepart] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [lot, setLot] = useState<Lot | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());


  async function creer(e: React.FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (reference.trim().length < 2) er.reference = 'Indiquez la référence (n° de conteneur ou de vol).';
    setErr(er); if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const l = await api<Lot>('/lots', { method: 'POST', body: JSON.stringify({ reference: reference.trim(), mode, ...(depart ? { departPrevu: new Date(`${depart}T00:00:00`).toISOString() } : {}) }) });
      setLot(l);
    } catch (e) { setErr({ global: e instanceof ApiError && e.status === 409 ? 'Un lot porte déjà cette référence.' : messageErreur(e) }); }
    finally { setBusy(false); }
  }
  async function ajouter() {
    if (!lot) return;
    if (sel.size === 0) { router.push(`/tableau-de-bord/lots/${lot.id}`); return; }
    setBusy(true);
    try { await api(`/lots/${lot.id}/colis`, { method: 'POST', body: JSON.stringify({ colisIds: [...sel] }) }); router.push(`/tableau-de-bord/lots/${lot.id}`); }
    catch (e) { setErr({ global: messageErreur(e) }); setBusy(false); }
  }

  const lbl = 'mb-1 block text-sm font-semibold';
  const fe = (k: string) => err[k] && <p className="mt-1 text-sm font-semibold text-alerte" role="alert">{err[k]}</p>;

  if (lot) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Lot {lot.reference} créé</h1>
        <Card className="border-0">
          <CardHeader><CardTitle className="text-base">Ajouter des colis existants</CardTitle><p className="text-sm text-gris-texte">Sélectionnez les colis à charger. Un colis déjà dans un autre lot y sera transféré.</p></CardHeader>
          <CardContent className="p-0">
            <SelectionColis sel={sel} onChange={setSel} />
          </CardContent>
        </Card>
        {fe('global')}
        <Button size="lg" className="h-12 w-full" disabled={busy} onClick={ajouter}>{sel.size === 0 ? 'Terminer sans ajouter de colis' : sel.size === 1 ? 'Ajouter 1 colis au lot' : `Ajouter ${sel.size} colis au lot`}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link href="/tableau-de-bord/lots" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gris-texte hover:text-fonce"><ChevronLeft className="h-4 w-4" aria-hidden /> Tous les lots</Link>
      <h1 className="text-2xl font-semibold">Nouveau lot</h1>
      <Card className="border-0"><CardContent className="p-5">
        <form className="space-y-4" onSubmit={creer} noValidate>
          <div><label className={lbl} htmlFor="l-ref">Référence (conteneur ou n° de vol)</label><input id="l-ref" className="input h-11" placeholder="Ex. : MSKU1234567 ou ET-908" value={reference} onChange={(e) => setReference(e.target.value)} />{fe('reference')}</div>
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
          <div><label className={lbl} htmlFor="l-dep">Départ prévu (facultatif)</label><input id="l-dep" className="input h-11" type="date" value={depart} onChange={(e) => setDepart(e.target.value)} /></div>
          {fe('global')}
          <Button type="submit" size="lg" className="h-12 w-full" disabled={busy}>{busy ? 'Création…' : 'Créer le lot'}</Button>
        </form>
      </CardContent></Card>
    </div>
  );
}
