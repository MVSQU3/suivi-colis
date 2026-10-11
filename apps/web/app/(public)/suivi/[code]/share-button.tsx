'use client';
import { useState } from 'react';

// Bouton léger : pas de shadcn ni lucide côté client, SVG intégré.
export function ShareButton({ title }: { title: string }) {
  const [copie, setCopie] = useState(false);
  async function partager() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* annulé : on tente la copie */ }
    }
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copie ce lien :', url); return; }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }
  return (
    <button type="button" onClick={partager}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-gris bg-white px-6 text-base font-semibold text-fonce hover:bg-fond focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info">
      <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {copie ? <path d="M20 6 9 17l-5-5" /> : <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>}
      </svg>
      {copie ? 'Lien copié !' : 'Partager le suivi'}
    </button>
  );
}
