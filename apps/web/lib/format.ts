/** Affichage des numéros : logique partagée avec l'API (E.164 -> format lisible, paires de chiffres en Côte d'Ivoire). */
export { formatTelephone } from '@suivi-colis/shared';

/** URL publique du site (NEXT_PUBLIC_SITE_URL sans slash final), repli sur l'origine courante. */
export function siteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (env) return env;
  return typeof window !== 'undefined' ? window.location.origin : '';
}
