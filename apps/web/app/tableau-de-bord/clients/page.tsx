'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Plus } from 'lucide-react';
import { RefreshCw } from 'lucide-react';
import { formatTelephone } from '@/lib/format';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/Modal';
import { ClientForm, type ClientLite } from '@/components/ClientForm';
import { messageErreur } from '@/components/CheckpointForm';

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientLite[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const charger = () => { setErr(null); api<ClientLite[]>('/clients').then(setClients).catch((e) => setErr(messageErreur(e))); };
  useEffect(charger, []);
  const liste = useMemo(() => {
    const s = q.trim().toLowerCase(); const sd = s.replace(/\D/g, '');
    return (clients ?? []).filter((c) => !s || c.fullName.toLowerCase().includes(s) || (sd.length >= 2 && (c.phone ?? '').replace(/\D/g, '').includes(sd)));
  }, [clients, q]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold">Clients</h1><p className="text-sm text-gris-texte">Les destinataires de vos colis.</p></div>
        <Button size="lg" className="h-11" onClick={() => { setModal(true); setOk(null); }}><Plus aria-hidden /> Nouveau client</Button>
      </div>
      {ok && <p className="rounded-md bg-succes/10 px-4 py-3 text-sm font-semibold text-succes-fonce" role="status">{ok}</p>}
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gris-texte" aria-hidden />
        <input className="input h-11 !pl-10" placeholder="Rechercher par nom ou téléphone…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un client" />
      </label>
      {err ? (
        <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6"><p className="font-semibold text-alerte">{err}</p><Button className="h-11" onClick={charger}><RefreshCw aria-hidden /> Réessayer</Button></div>
      ) : !clients ? <div className="h-64 animate-pulse rounded-lg bg-white" /> : liste.length === 0 ? (
        <p className="rounded-lg bg-white px-4 py-10 text-center text-gris-texte">{clients.length ? 'Aucun client ne correspond.' : 'Aucun client pour le moment.'}</p>
      ) : (
        <Card className="border-0"><CardContent className="p-0">
          <ul className="divide-y divide-gris/20">
            {liste.map((c) => (
              <li key={c.id}>
                <Link href={`/tableau-de-bord/clients/${c.id}`} className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-fond/60">
                  <span className="font-semibold">{c.fullName}</span>
                  <span className="text-sm text-gris-texte">{[c.city, formatTelephone(c.phone)].filter(Boolean).join(' · ')}</span>
                </Link>
              </li>
            ))}
          </ul>
        </CardContent></Card>
      )}
      {modal && (
        <Modal titre="Nouveau client" onClose={() => setModal(false)}>
          <ClientForm onCancel={() => setModal(false)}
            onCreated={(c) => { setModal(false); setOk(`Client « ${c.fullName} » créé.`); charger(); }}
            onUseExisting={(c) => { window.location.href = `/tableau-de-bord/clients/${c.id}`; }} />
        </Modal>
      )}
    </div>
  );
}
