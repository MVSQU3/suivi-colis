import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { formatDate } from '@suivi-colis/shared';
import { Badge } from '@/components/statut';
import { chargerMesColis, telWhatsApp, type MonColis } from '@/lib/client-lien';
import { Deconnexion } from './deconnexion';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Mes colis', description: 'Le suivi de tes colis.', robots: { index: false, follow: false }, openGraph: { title: 'Mes colis', description: 'Le suivi de tes colis.' } };

const statutDe = (c: MonColis) => (typeof c.statutActuel === 'string' ? c.statutActuel : c.statutActuel?.statut ?? null);
const derniereMaj = (c: MonColis) => (c.checkpoints?.length ? Math.max(...c.checkpoints.map((x) => +new Date(x.date))) : 0);
const rang = (s: string | null) => (s === 'EXCEPTION' ? 0 : s === 'DISPONIBLE_AU_RETRAIT' ? 1 : 2);

function Carte({ c }: { c: MonColis }) {
  const s = statutDe(c);
  const maj = derniereMaj(c);
  const bloque = s === 'EXCEPTION', dispo = s === 'DISPONIBLE_AU_RETRAIT';
  return (
    <li>
      <a href={`/suivi/${encodeURIComponent(c.code)}`} className={`block min-h-12 rounded-lg bg-white p-4 shadow-sm ${bloque ? 'border-l-4 border-alerte' : dispo ? 'border-l-4 border-succes-fonce' : ''}`}>
        <span className="flex items-start justify-between gap-2">
          <span className={`font-semibold ${bloque ? 'text-alerte' : ''}`}>{c.description || 'Colis'}</span>
          {s ? <Badge statut={s} label={bloque ? 'Bloqué' : undefined} /> : <span className="text-xs text-gris-texte">En préparation</span>}
        </span>
        {dispo && <span className="mt-1 block text-sm font-semibold text-succes-fonce">Prêt : tu peux venir le récupérer.</span>}
        <span className="mt-1 flex flex-wrap justify-between gap-2 text-sm text-gris-texte">
          <span className="whitespace-nowrap font-mono">{c.code}</span>
          {maj > 0 && <span>Mis à jour le {formatDate(new Date(maj).toISOString())}</span>}
        </span>
      </a>
    </li>
  );
}

export default async function MesColisPage() {
  const r = await chargerMesColis(cookies().toString());
  if (!r.ok) {
    return (
      <section className="mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{r.kind === 'session' ? 'Mes colis' : 'Oups, petit souci'}</h1>
        <p className="mt-2 text-gris-texte">{r.kind === 'session' ? 'Demande un lien à ton transitaire pour voir tes colis.' : 'Impossible d’afficher tes colis pour le moment. Réessaie dans un instant.'}</p>
        {r.kind === 'reseau' && <a href="/mes-colis" className="mt-5 flex min-h-12 items-center justify-center rounded-md bg-fonce px-4 font-semibold text-white">Réessayer</a>}
      </section>
    );
  }
  const { client, transitaire, colis } = r.data;
  const prenom = client.nom.trim().split(/\s+/)[0] || '';
  const tel = telWhatsApp(transitaire?.telephone);
  const recuperes = colis.filter((c) => statutDe(c) === 'REMIS_AU_CLIENT').sort((a, b) => derniereMaj(b) - derniereMaj(a));
  const enCours = colis.filter((c) => statutDe(c) !== 'REMIS_AU_CLIENT')
    .sort((a, b) => rang(statutDe(a)) - rang(statutDe(b)) || derniereMaj(b) - derniereMaj(a));
  return (
    <section className="mx-auto max-w-md space-y-4">
      <header className="rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Salut{prenom ? ` ${prenom}` : ''}</h1>
        {transitaire && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gris-texte">Tes colis chez <span className="font-semibold text-fonce">{transitaire.nom}</span></p>
            {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md bg-succes-fonce px-4 text-sm font-semibold text-white">WhatsApp</a>}
          </div>
        )}
      </header>
      {enCours.length === 0 ? (
        <p className="rounded-lg bg-white p-6 text-center text-gris-texte">Aucun colis en cours chez {transitaire?.nom ?? 'ton transitaire'} pour le moment.</p>
      ) : (
        <ul className="space-y-3">{enCours.map((c) => <Carte key={c.code} c={c} />)}</ul>
      )}
      {recuperes.length > 0 && (
        <details className="rounded-lg bg-white p-4 shadow-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-semibold">Colis déjà récupérés ({recuperes.length})</summary>
          <ul className="mt-3 space-y-3">{recuperes.map((c) => <Carte key={c.code} c={c} />)}</ul>
        </details>
      )}
      <div className="pt-2 text-center"><Deconnexion /></div>
    </section>
  );
}
