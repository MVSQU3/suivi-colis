'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';
export default function Connexion() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [erreur, setErreur] = useState<string | null>(null); const router = useRouter();
  return (
    <form className="card mx-auto max-w-sm space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setErreur(null);
      try { const r = await api<{ accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); setToken(r.accessToken); router.push('/tableau-de-bord'); }
      catch { setErreur('Identifiants invalides ou compte verrouillé.'); }
    }}>
      <h1 className="text-xl font-bold">Connexion transitaire</h1>
      <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="input" type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {erreur && <p className="text-sm text-alerte">{erreur}</p>}
      <button className="btn w-full">Se connecter</button>
    </form>
  );
}
