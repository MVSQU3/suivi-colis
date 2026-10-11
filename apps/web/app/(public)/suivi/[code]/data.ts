import { cache } from 'react';
import { API_INTERNAL } from '@/lib/api';

export interface SuiviCheckpoint { date: string; lieu: string | null; statut: string; libelle: string; commentaire?: string | null }
export interface Suivi { transitaire: { nom: string; telephone?: string | null }; statutActuel: string; checkpoints: SuiviCheckpoint[] }
export type SuiviResult = { ok: true; data: Suivi } | { ok: false; kind: 'introuvable' | 'trop' | 'reseau' } | { ok: false; kind: 'inactif'; transitaire: Suivi['transitaire'] };

/** Appel serveur à l'API publique, mutualisé entre generateMetadata et la page. */
export const getSuivi = cache(async (code: string): Promise<SuiviResult> => {
  try {
    const res = await fetch(`${API_INTERNAL}/public/suivi/${encodeURIComponent(code)}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    // Code mal formé et code inconnu sont traités pareil.
    if (res.status === 404 || res.status === 400) return { ok: false, kind: 'introuvable' };
    if (res.status === 429) return { ok: false, kind: 'trop' };
    if (!res.ok) return { ok: false, kind: 'reseau' };
    const brut = (await res.json()) as Omit<Suivi, 'statutActuel'> & { statutActuel: string | { statut: string }; statut?: string };
    // Colis archivé : l'API répond 200 { code, statut: 'inactif', transitaire }.
    if (brut.statut === 'inactif') return { ok: false, kind: 'inactif', transitaire: brut.transitaire };
    // L'API renvoie statutActuel sous forme { statut, libelle } : on garde le code statut.
    const statutActuel = typeof brut.statutActuel === 'string' ? brut.statutActuel : brut.statutActuel?.statut;
    return { ok: true, data: { transitaire: brut.transitaire, statutActuel, checkpoints: brut.checkpoints ?? [] } };
  } catch {
    return { ok: false, kind: 'reseau' };
  }
});
