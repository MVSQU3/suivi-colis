import { BadRequestException } from '@nestjs/common';
import { exempleTelephone, indicatifPays, normaliserTelephone, paysParCode } from '@suivi-colis/shared';

/**
 * Normalise le numero d'un client vers E.164. Sans indicatif, il est lu dans le pays du transitaire ;
 * avec indicatif, tout numero africain est accepte (client installe dans un autre pays).
 * Leve une 400 { champ: 'phone' } si le numero est invalide.
 */
export function telephoneClient(raw: string, paysTransitaire: string): string {
  const tel = normaliserTelephone(raw, paysTransitaire);
  if (tel) return tel;
  const pays = paysParCode(paysTransitaire);
  const message = pays
    ? `Numéro invalide : ex. ${exempleTelephone(pays.code)} (${pays.nom}), ou un numéro africain avec indicatif (+${indicatifPays(pays.code)}…)`
    : 'Numéro invalide';
  throw new BadRequestException({ statusCode: 400, message: [message], champ: 'phone' });
}
