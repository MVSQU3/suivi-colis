/** Affichage seulement : « +2250700000001 » → « +225 07 00 00 00 01 ». Laisse tel quel si format inattendu. */
export function formatTelephone(tel?: string | null): string {
  if (!tel) return '';
  const d = tel.replace(/\D/g, '');
  const local = d.startsWith('225') && d.length === 13 ? d.slice(3) : d.length === 10 ? d : null;
  if (!local) return tel;
  return `+225 ${local.replace(/(\d{2})(?=\d)/g, '$1 ')}`;
}

/** URL publique du site (NEXT_PUBLIC_SITE_URL sans slash final), repli sur l'origine courante. */
export function siteUrl(): string {
  const env = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().replace(/\/+$/, '');
  if (env) return env;
  return typeof window !== 'undefined' ? window.location.origin : '';
}
