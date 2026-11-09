import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

/** Langue principale d'usage administratif ; l'interface reste en francais tant qu'aucune traduction n'existe. */
export type Langue = 'fr' | 'en' | 'pt' | 'ar' | 'es';

export interface Pays {
  /** ISO 3166-1 alpha-2 */
  code: string;
  nom: string;
  /** ISO 4217 */
  devise: string;
  /** Fuseau IANA de la capitale economique */
  fuseau: string;
  langue: Langue;
}

const p = (code: string, nom: string, devise: string, fuseau: string, langue: Langue): Pays => ({ code, nom, devise, fuseau, langue });

/** Les 54 Etats africains membres de l'ONU, tries par nom. */
export const PAYS_AFRIQUE: readonly Pays[] = [
  p('ZA', 'Afrique du Sud', 'ZAR', 'Africa/Johannesburg', 'en'),
  p('DZ', 'Algérie', 'DZD', 'Africa/Algiers', 'ar'),
  p('AO', 'Angola', 'AOA', 'Africa/Luanda', 'pt'),
  p('BJ', 'Bénin', 'XOF', 'Africa/Porto-Novo', 'fr'),
  p('BW', 'Botswana', 'BWP', 'Africa/Gaborone', 'en'),
  p('BF', 'Burkina Faso', 'XOF', 'Africa/Ouagadougou', 'fr'),
  p('BI', 'Burundi', 'BIF', 'Africa/Bujumbura', 'fr'),
  p('CM', 'Cameroun', 'XAF', 'Africa/Douala', 'fr'),
  p('CV', 'Cap-Vert', 'CVE', 'Atlantic/Cape_Verde', 'pt'),
  p('CF', 'Centrafrique', 'XAF', 'Africa/Bangui', 'fr'),
  p('KM', 'Comores', 'KMF', 'Indian/Comoro', 'fr'),
  p('CG', 'Congo', 'XAF', 'Africa/Brazzaville', 'fr'),
  p('CD', 'Congo (RDC)', 'CDF', 'Africa/Kinshasa', 'fr'),
  p('CI', "Côte d'Ivoire", 'XOF', 'Africa/Abidjan', 'fr'),
  p('DJ', 'Djibouti', 'DJF', 'Africa/Djibouti', 'fr'),
  p('EG', 'Égypte', 'EGP', 'Africa/Cairo', 'ar'),
  p('ER', 'Érythrée', 'ERN', 'Africa/Asmara', 'en'),
  p('SZ', 'Eswatini', 'SZL', 'Africa/Mbabane', 'en'),
  p('ET', 'Éthiopie', 'ETB', 'Africa/Addis_Ababa', 'en'),
  p('GA', 'Gabon', 'XAF', 'Africa/Libreville', 'fr'),
  p('GM', 'Gambie', 'GMD', 'Africa/Banjul', 'en'),
  p('GH', 'Ghana', 'GHS', 'Africa/Accra', 'en'),
  p('GN', 'Guinée', 'GNF', 'Africa/Conakry', 'fr'),
  p('GQ', 'Guinée équatoriale', 'XAF', 'Africa/Malabo', 'es'),
  p('GW', 'Guinée-Bissau', 'XOF', 'Africa/Bissau', 'pt'),
  p('KE', 'Kenya', 'KES', 'Africa/Nairobi', 'en'),
  p('LS', 'Lesotho', 'LSL', 'Africa/Maseru', 'en'),
  p('LR', 'Liberia', 'LRD', 'Africa/Monrovia', 'en'),
  p('LY', 'Libye', 'LYD', 'Africa/Tripoli', 'ar'),
  p('MG', 'Madagascar', 'MGA', 'Indian/Antananarivo', 'fr'),
  p('MW', 'Malawi', 'MWK', 'Africa/Blantyre', 'en'),
  p('ML', 'Mali', 'XOF', 'Africa/Bamako', 'fr'),
  p('MA', 'Maroc', 'MAD', 'Africa/Casablanca', 'ar'),
  p('MU', 'Maurice', 'MUR', 'Indian/Mauritius', 'en'),
  p('MR', 'Mauritanie', 'MRU', 'Africa/Nouakchott', 'ar'),
  p('MZ', 'Mozambique', 'MZN', 'Africa/Maputo', 'pt'),
  p('NA', 'Namibie', 'NAD', 'Africa/Windhoek', 'en'),
  p('NE', 'Niger', 'XOF', 'Africa/Niamey', 'fr'),
  p('NG', 'Nigeria', 'NGN', 'Africa/Lagos', 'en'),
  p('UG', 'Ouganda', 'UGX', 'Africa/Kampala', 'en'),
  p('RW', 'Rwanda', 'RWF', 'Africa/Kigali', 'en'),
  p('ST', 'Sao Tomé-et-Principe', 'STN', 'Africa/Sao_Tome', 'pt'),
  p('SN', 'Sénégal', 'XOF', 'Africa/Dakar', 'fr'),
  p('SC', 'Seychelles', 'SCR', 'Indian/Mahe', 'en'),
  p('SL', 'Sierra Leone', 'SLE', 'Africa/Freetown', 'en'),
  p('SO', 'Somalie', 'SOS', 'Africa/Mogadishu', 'ar'),
  p('SD', 'Soudan', 'SDG', 'Africa/Khartoum', 'ar'),
  p('SS', 'Soudan du Sud', 'SSP', 'Africa/Juba', 'en'),
  p('TZ', 'Tanzanie', 'TZS', 'Africa/Dar_es_Salaam', 'en'),
  p('TD', 'Tchad', 'XAF', 'Africa/Ndjamena', 'fr'),
  p('TG', 'Togo', 'XOF', 'Africa/Lome', 'fr'),
  p('TN', 'Tunisie', 'TND', 'Africa/Tunis', 'ar'),
  p('ZM', 'Zambie', 'ZMW', 'Africa/Lusaka', 'en'),
  // Le dollar americain reste la monnaie d'usage courante au Zimbabwe.
  p('ZW', 'Zimbabwe', 'USD', 'Africa/Harare', 'en'),
];

export const PAYS_PAR_DEFAUT = 'CI';
const PAR_CODE = new Map(PAYS_AFRIQUE.map((x) => [x.code, x]));
export const paysParCode = (code?: string | null): Pays | undefined => (code ? PAR_CODE.get(code.toUpperCase()) : undefined);
export const estPaysAfricain = (code?: string | null) => !!paysParCode(code);

/** Indicatif international sans « + » (ex. CI -> « 225 »). */
export const indicatifPays = (code: string) => getCountryCallingCode(code.toUpperCase() as CountryCode);

/**
 * Normalise un numero vers E.164 (+XXX…). Un numero sans indicatif est lu comme un numero du pays par defaut
 * (celui du transitaire) ; un numero avec indicatif (+221…, 00221…) peut etre celui d'un autre pays africain.
 * Validation par longueur (isPossible), comme avant : on ne rejette pas un prefixe recent absent des metadonnees.
 * Retourne null si le numero est invalide ou n'est pas africain.
 */
export function normaliserTelephone(raw: string, paysDefaut: string = PAYS_PAR_DEFAUT): string | null {
  const s = (raw ?? '').trim();
  if (!s || /[a-z]/i.test(s)) return null;
  const pays = paysParCode(paysDefaut)?.code ?? PAYS_PAR_DEFAUT;
  const n = parsePhoneNumberFromString(s, pays as CountryCode);
  if (!n || !n.isPossible() || !n.country || !estPaysAfricain(n.country)) return null;
  return n.number;
}

/** Pays (ISO alpha-2) d'un numero E.164, ou null. */
export function paysDuTelephone(e164?: string | null): string | null {
  return (e164 && parsePhoneNumberFromString(e164)?.country) || null;
}

/** Affichage : « +2250700000001 » -> « +225 07 00 00 00 01 ». Laisse tel quel si le format est inattendu. */
export function formatTelephone(tel?: string | null): string {
  if (!tel) return '';
  const n = parsePhoneNumberFromString(tel);
  if (!n) return tel;
  // Usage ivoirien : 5 paires de chiffres (les metadonnees groupent autrement).
  if (n.countryCallingCode === '225' && n.nationalNumber.length === 10) return `+225 ${n.nationalNumber.replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  return n.formatInternational();
}

/** Exemple de saisie locale affiche sous le champ telephone. */
const EXEMPLES: Record<string, string> = { CI: '07 07 12 34 56', SN: '77 123 45 67', CM: '6 71 23 45 67', NG: '0803 123 4567', GH: '024 123 4567', TG: '90 12 34 56', BJ: '01 90 12 34 56', ML: '65 01 23 45', BF: '70 12 34 56' };
export const exempleTelephone = (code: string) => EXEMPLES[code.toUpperCase()] ?? `+${indicatifPays(code)} …`;
