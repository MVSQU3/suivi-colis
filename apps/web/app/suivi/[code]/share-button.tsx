'use client';
import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ShareButton({ title }: { title: string }) {
  const [copie, setCopie] = useState(false);
  async function partager() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch { /* annulé : on tente la copie */ }
    }
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copie ce lien :', url);
      return;
    }
    setCopie(true);
    setTimeout(() => setCopie(false), 2500);
  }
  return (
    <Button variant="outline" size="lg" className="w-full bg-white" onClick={partager}>
      {copie ? <Check aria-hidden /> : <Share2 aria-hidden />}
      {copie ? 'Lien copié !' : 'Partager le suivi'}
    </Button>
  );
}
