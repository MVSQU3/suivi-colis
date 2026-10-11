'use client';
/** Déconnexion du client (efface le cookie de session via le proxy). */
export function Deconnexion() {
  const go = async () => {
    try { await fetch('/api/v1/client/deconnexion', { method: 'POST', credentials: 'same-origin' }); } catch { /* on recharge quand même */ }
    window.location.assign('/mes-colis');
  };
  return <button type="button" onClick={go} className="min-h-11 px-3 text-sm text-gris-texte underline underline-offset-2">Se déconnecter</button>;
}
