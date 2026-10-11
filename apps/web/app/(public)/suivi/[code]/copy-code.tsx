'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

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
      {ok ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {ok ? 'Copié' : 'Copier'}
    </button>
  );
}
