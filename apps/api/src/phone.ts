/**
 * Normalise un numero ivoirien vers +225XXXXXXXXXX (10 chiffres).
 * Accepte espaces, points, tirets, parentheses, prefixe 00225 ou +225, ou 10 chiffres nus.
 * Retourne null si le numero reste invalide.
 */
export function normaliserTelephoneCI(raw: string): string | null {
  let s = (raw ?? '').replace(/[\s.\-()]/g, '');
  if (s.startsWith('00225')) s = '+225' + s.slice(5);
  else if (/^225\d{10}$/.test(s)) s = '+' + s;
  else if (/^\d{10}$/.test(s)) s = '+225' + s;
  return /^\+225\d{10}$/.test(s) ? s : null;
}