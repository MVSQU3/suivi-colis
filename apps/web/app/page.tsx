'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
export default function Accueil() {
  const [code, setCode] = useState('');
  const router = useRouter();
  return (
    <section className="py-10 text-center">
      <h1 className="mb-3 text-3xl font-bold">Ton colis, de la Chine à chez toi.</h1>
      <p className="mb-6 text-gris-texte">Saisis ton code de suivi pour voir où se trouve ton colis.</p>
      <form className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) router.push(`/suivi/${encodeURIComponent(code.trim())}`); }}>
        <input className="input" placeholder="Code de suivi (ex. ABCD-EFGH-JKMN)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Code de suivi" />
        <button className="btn" type="submit">Suivre</button>
      </form>
    </section>
  );
}
