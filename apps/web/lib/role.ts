'use client';
import { useEffect, useState } from 'react';
import { FUSEAU_PAR_DEFAUT, PAYS_PAR_DEFAUT } from '@suivi-colis/shared';
import { api } from '@/lib/api';

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'AGENT';
export interface TenantInfo { name: string; paysCode: string; devise: string; fuseau: string; langue: string }
interface Me { role: Role; tenant: TenantInfo }
let cache: Promise<Me | null> | null = null;
const chargerMe = () => (cache ??= api<Me>('/auth/me').catch(() => { cache = null; return null; }));

/** Rôle de l'utilisateur connecté (via /auth/me, mis en cache pour la session de la page). */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => { void chargerMe().then((m) => setRole(m?.role ?? null)); }, []);
  // Archiver / supprimer / clôturer : réservé au responsable (l'API renvoie 403 sinon).
  return { role, responsable: role === 'OWNER' || role === 'SUPER_ADMIN' };
}

/** Pays et fuseau du transitaire connecté ; Côte d'Ivoire tant que /auth/me n'a pas répondu. */
export function useTenant() {
  const [t, setT] = useState<TenantInfo | null>(null);
  useEffect(() => { void chargerMe().then((m) => setT(m?.tenant ?? null)); }, []);
  return { paysCode: t?.paysCode ?? PAYS_PAR_DEFAUT, fuseau: t?.fuseau ?? FUSEAU_PAR_DEFAUT, devise: t?.devise ?? 'XOF' };
}
