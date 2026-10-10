import { randomInt } from 'node:crypto';
import { TRACKING_ALPHABET } from '@suivi-colis/shared';
/** Code XXXX-XXXX-XXXX généré par CSPRNG (≈ 59 bits d'entropie). */
export function generateTrackingCode(): string {
  let s = '';
  for (let i = 0; i < 12; i++) s += TRACKING_ALPHABET[randomInt(TRACKING_ALPHABET.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
}
