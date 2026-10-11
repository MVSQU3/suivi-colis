'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'AGENT';
let cache: Promise<Role | null> | null = null;

/** Rôle de l'utilisateur connecté (via /auth/me, mis en cache pour la session de la page). */
export function useRole() {
  const [role, setRole] = useState<Role | null>(null);
  useEffect(() => {
    cache ??= api<{ role: Role }>('/auth/me').then((m) => m.role).catch(() => { cache = null; return null; });
    void cache.then(setRole);
  }, []);
  // Archiver / supprimer / clôturer : réservé au responsable (l'API renvoie 403 sinon).
  return { role, responsable: role === 'OWNER' || role === 'SUPER_ADMIN' };
}
