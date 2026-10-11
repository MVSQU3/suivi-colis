'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge } from '@/components/statut';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pastille, Confirmer } from '@/components/Gestion';
import { useRole } from '@/lib/role';
import { messageErreur } from '@/components/CheckpointForm';

interface ColisRow { id: string; trackingCode: string; description: string; client: string; lot: string | null; statutActuel: string | null; mode?: string; archivedAt?: string | null }

export default function ColisPage() {
  const [colis, setColis] = useState<ColisRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [archives, setArchives] = useState(false);
  const [desarch, setDesarch] = useState<ColisRow | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const { responsable } = useRole();
  const charger = () => { setErr(null); setColis(null); api<ColisRow[]>(archives ? '/colis?archives=1' : '/colis').then(setColis).catch((e) => setErr(messageErreur(e))); };
  useEffect(charger, [archives]);
  const liste = useMemo(() => {
    const s = q.trim().toLowerCase();
    const l = (colis ?? []).filter((c) => !s || [c.trackingCode, c.description, c.client, c.lot ?? ''].some((v) => v.toLowerCase().includes(s)));
    return [...l].sort((a, b) => Number(b.statutActuel === 'EXCEPTION') - Number(a.statutActuel === 'EXCEPTION'));
  }, [colis, q]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold">Colis</h1><p className="text-sm text-gris-texte">Les colis avec un problème signalé apparaissent en premier.</p></div><Button asChild size="lg" className="h-11"><Link href="/tableau-de-bord/colis/nouveau"><Plus aria-hidden /> Nouveau colis</Link></Button></div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris-texte" aria-hidden />
        <input className="input h-11 !pl-10" placeholder="Rechercher un code, un client, un lot…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
      </label>
      <label className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={archives} onChange={(e) => setArchives(e.target.checked)} /> Voir les archivés</label>
      {ok && <p className="rounded-md bg-succes/10 px-4 py-3 text-sm font-semibold text-succes-fonce" role="status">{ok}</p>}
      {err ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={charger}><RefreshCw aria-hidden /> Réessayer</Button></div>
      ) : !colis ? <div className="h-64 animate-pulse rounded-lg bg-white" /> : liste.length === 0 ? (
        <p className="rounded-lg bg-white px-4 py-10 text-center text-gris-texte">{colis.length ? 'Aucun colis ne correspond.' : 'Aucun colis pour le moment.'}</p>
      ) : (
        <Card className="border-0"><CardContent className="p-0">
          <ul className="divide-y divide-gris/20">
            {liste.map((c) => (
              <li key={c.id} className={`flex flex-col sm:flex-row sm:items-center sm:gap-2 sm:pr-3 ${c.statutActuel === 'EXCEPTION' ? 'bg-alerte/5' : ''}`}>
                <Link href={`/tableau-de-bord/colis/${c.id}`} className="flex min-h-16 w-full flex-1 flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-fond/60">
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-nowrap font-mono font-semibold">{c.trackingCode}</span>
                    <span className="text-sm text-gris-texte">{c.description} · {c.client}{c.lot ? ` · ${c.lot}` : ''}</span>
                  </span>
                  {c.archivedAt ? <Pastille>Archivé</Pastille> : <Badge statut={c.statutActuel} />}
                </Link>
                {c.archivedAt && responsable && <Button variant="outline" className="mx-4 mb-3 h-11 self-start sm:m-0 sm:self-center" onClick={() => setDesarch(c)}>Désarchiver</Button>}
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
      {desarch && (
        <Confirmer titre={`Désarchiver ${desarch.trackingCode} ?`} texte="Le colis réapparaîtra dans la liste et sa page de suivi redeviendra active pour le client." libelle="Désarchiver"
          action={() => api(`/colis/${desarch.id}/desarchiver`, { method: 'POST' })} onClose={() => setDesarch(null)}
          onDone={() => { setOk(`${desarch.trackingCode} est désarchivé.`); setDesarch(null); charger(); }} />
      )}
    </div>
  );
}
