'use client';
import { useState } from 'react';
import { STATUTS_CHECKPOINT, libelleStatut } from '@suivi-colis/shared';
export interface CheckpointInput { statut: string; lieu: string; commentaire?: string; date?: string }
export function CheckpointForm({ onSubmit, allowException, label }: { onSubmit: (v: CheckpointInput) => Promise<void>; allowException: boolean; label: string }) {
  const [statut, setStatut] = useState<string>(allowException ? 'EXCEPTION' : 'ARRIVE_ABIDJAN');
  const [lieu, setLieu] = useState(''); const [commentaire, setCommentaire] = useState(''); const [date, setDate] = useState('');
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const statuts = STATUTS_CHECKPOINT.filter((s) => allowException || s !== 'EXCEPTION');
  return (
    <form className="space-y-2" onSubmit={async (e) => {
      e.preventDefault(); setMsg(null);
      if (statut === 'EXCEPTION' && !commentaire.trim()) { setMsg('Un commentaire est obligatoire pour une exception.'); return; }
      setBusy(true);
      try { await onSubmit({ statut, lieu, ...(commentaire.trim() ? { commentaire } : {}), ...(date ? { date: new Date(date).toISOString() } : {}) }); setLieu(''); setCommentaire(''); }
      catch (err) { setMsg(err instanceof Error ? err.message : 'Erreur'); } finally { setBusy(false); }
    }}>
      <select className="input" value={statut} onChange={(e) => setStatut(e.target.value)}>{statuts.map((s) => <option key={s} value={s}>{libelleStatut(s)}</option>)}</select>
      <input className="input" placeholder="Lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} required minLength={2} />
      <input className="input" placeholder={statut === 'EXCEPTION' ? 'Commentaire (obligatoire)' : 'Commentaire (facultatif)'} value={commentaire} onChange={(e) => setCommentaire(e.target.value)} />
      <input className="input" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date (par défaut : maintenant)" />
      {msg && <p className="text-sm text-alerte">{msg}</p>}
      <button className="btn w-full" disabled={busy}>{label}</button>
    </form>
  );
}
