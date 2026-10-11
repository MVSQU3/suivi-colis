'use client';
import { useState } from 'react';

/** Consomme le lien via le proxy same-origin (le cookie de session est posé par l'API) puis ouvre /mes-colis. */
export function VoirMesColis({ jeton }: { jeton: string }) {
  const [etat, setEtat] = useState<'repos' | 'envoi' | 'trop' | 'erreur'>('repos');
  const go = async () => {
    setEtat('envoi');
    try {
      const res = await fetch(`/api/v1/client/lien/${encodeURIComponent(jeton)}`, { method: 'POST', credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (res.ok) { window.location.assign('/mes-colis'); return; }
      if (res.status === 429) { setEtat('trop'); return; }
      // 410 (utilisé, remplacé, expiré) : la page se recharge et affiche l'écran « lien expiré » rendu côté serveur.
      if (res.status === 410 || res.status === 404 || res.status === 400) { window.location.reload(); return; }
      setEtat('erreur');
    } catch { setEtat('erreur'); }
  };
  return (
    <div>
      <button type="button" onClick={go} disabled={etat === 'envoi'} className="flex min-h-12 w-full items-center justify-center rounded-md bg-fonce px-4 text-base font-semibold text-white disabled:opacity-70">
        {etat === 'envoi' ? 'Ouverture…' : 'Voir mes colis'}
      </button>
      {etat === 'trop' && <p role="alert" className="mt-3 text-sm font-semibold text-alerte">Trop de tentatives, réessaie dans une minute.</p>}
      {etat === 'erreur' && <p role="alert" className="mt-3 text-sm font-semibold text-alerte">Petit souci de connexion. Réessaie dans un instant.</p>}
    </div>
  );
}
