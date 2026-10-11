import type { Metadata } from 'next';
import { verifierLien, telWhatsApp } from '@/lib/client-lien';
import { VoirMesColis } from './voir-mes-colis';

export const dynamic = 'force-dynamic';

// Aperçu neutre (lien privé) : ni client ni transitaire dans les balises.
export const metadata: Metadata = {
  title: 'Accès à tes colis',
  description: 'Ouvre ce lien pour suivre tes colis.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
  openGraph: { title: 'Accès à tes colis', description: 'Ouvre ce lien pour suivre tes colis.', type: 'website' },
};

const carte = 'mx-auto max-w-md rounded-lg bg-white p-6 shadow-sm';

export default async function AccesPage({ params }: { params: { jeton: string } }) {
  const r = await verifierLien(params.jeton);
  if (!r.ok) {
    return (
      <section className={carte}>
        <h1 className="text-xl font-semibold">{r.kind === 'trop' ? 'Patiente un peu' : 'Oups, petit souci'}</h1>
        <p className="mt-2 text-gris-texte">{r.kind === 'trop' ? 'Trop de tentatives, réessaie dans une minute.' : 'Impossible d’ouvrir ton lien pour le moment. Vérifie ta connexion et réessaie.'}</p>
        <a href={`/acces/${encodeURIComponent(params.jeton)}`} className="mt-5 flex min-h-12 items-center justify-center rounded-md bg-fonce px-4 font-semibold text-white">Réessayer</a>
      </section>
    );
  }
  if (r.valide) {
    return (
      <section className={carte}>
        <p className="text-sm text-gris-texte">Lien envoyé par</p>
        <p className="text-lg font-semibold">{r.transitaire?.nom ?? 'ton transitaire'}</p>
        <h1 className="mt-4 text-xl font-semibold">Tes colis t’attendent</h1>
        <p className="mt-1 text-gris-texte">Retrouve tous tes colis et leur avancement au même endroit.</p>
        <div className="mt-5"><VoirMesColis jeton={params.jeton} /></div>
      </section>
    );
  }
  const tel = telWhatsApp(r.transitaire?.telephone);
  return (
    <section className={carte}>
      <h1 className="text-xl font-semibold">Lien expiré ou déjà utilisé</h1>
      <p className="mt-2 text-gris-texte">Demande un nouveau lien à ton transitaire.</p>
      {r.transitaire && tel && (
        <a className="mt-5 flex min-h-12 w-full items-center justify-center rounded-md bg-succes-fonce px-4 font-semibold text-white" href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer">
          Contacter {r.transitaire.nom} sur WhatsApp
        </a>
      )}
    </section>
  );
}
