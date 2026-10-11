'use client';
import { useState } from 'react';

export function CopyCode({ code }: { code: string }) {
  const [ok, setOk] = useState(false);
  async function copier() {
    try { await navigator.clipboard.writeText(code); } catch { window.prompt('Copie ce code :', code); return; }
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }
  return (
    <button type="button" onClick={copier} aria-label={ok ? 'Code copié' : 'Copier le code de suivi'}
      className="inline-flex h-11 min-w-11 items-center justify-center gap-1 rounded-md bg-white px-3 text-sm font-semibold text-fonce focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fonce">
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ok ? <path d="M20 6 9 17l-5-5" /> : <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>}
      </svg>
      {ok ? 'Copié' : 'Copier'}
    </button>
  );
}
