import { API_INTERNAL } from '@/lib/api';

/** Magic-link client, appels côté serveur (API_INTERNAL_URL). */
export interface Transitaire { nom: string; telephone?: string | null }
export type LienResult = { ok: true; valide: boolean; transitaire: Transitaire | null } | { ok: false; kind: 'trop' | 'reseau' };

/** GET /client/lien/:jeton : lecture seule, ne consomme jamais le jeton. */
export async function verifierLien(jeton: string): Promise<LienResult> {
  try {
    const res = await fetch(`${API_INTERNAL}/client/lien/${encodeURIComponent(jeton)}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (res.status === 429) return { ok: false, kind: 'trop' };
    if (res.status === 404 || res.status === 400 || res.status === 410) return { ok: true, valide: false, transitaire: null };
    if (!res.ok) return { ok: false, kind: 'reseau' };
    const b = (await res.json()) as { valide?: boolean; transitaire?: Transitaire | null };
    return { ok: true, valide: !!b.valide, transitaire: b.transitaire ?? null };
  } catch {
    return { ok: false, kind: 'reseau' };
  }
}

export interface MonColis {
  code: string; description?: string | null; mode?: string;
  statutActuel: { statut: string; libelle?: string } | string | null;
  checkpoints?: { date: string; statut: string }[];
}
export interface MesColis { client: { nom: string }; transitaire: Transitaire | null; colis: MonColis[] }
export type MesColisResult = { ok: true; data: MesColis } | { ok: false; kind: 'session' | 'reseau' };

/** GET /client/mes-colis en relayant le cookie de session du navigateur. */
export async function chargerMesColis(cookie: string): Promise<MesColisResult> {
  try {
    const res = await fetch(`${API_INTERNAL}/client/mes-colis`, { cache: 'no-store', headers: { Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) } });
    if (res.status === 401 || res.status === 403) return { ok: false, kind: 'session' };
    if (!res.ok) return { ok: false, kind: 'reseau' };
    const b = (await res.json()) as Partial<MesColis>;
    return { ok: true, data: { client: b.client ?? { nom: '' }, transitaire: b.transitaire ?? null, colis: b.colis ?? [] } };
  } catch {
    return { ok: false, kind: 'reseau' };
  }
}

export const telWhatsApp = (tel?: string | null) => (tel ?? '').replace(/\D/g, '');
