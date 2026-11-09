export const STATUTS_CHECKPOINT = [
  'RECU_ENTREPOT_CHINE', 'CHARGE_DANS_LOT', 'PARTI_DE_CHINE', 'ARRIVE_DESTINATION',
  'EN_DEDOUANEMENT', 'DISPONIBLE_AU_RETRAIT', 'REMIS_AU_CLIENT', 'EXCEPTION',
] as const;
export type StatutCheckpoint = (typeof STATUTS_CHECKPOINT)[number];

export const STATUT_META: Record<StatutCheckpoint, { libelle: string; couleur: string; etape: number }> = {
  RECU_ENTREPOT_CHINE: { libelle: "Reçu à l'entrepôt en Chine", couleur: '#3A86FF', etape: 1 },
  CHARGE_DANS_LOT: { libelle: 'Chargé dans le lot', couleur: '#3A86FF', etape: 2 },
  PARTI_DE_CHINE: { libelle: 'Parti de Chine', couleur: '#3A86FF', etape: 3 },
  // Le lieu precis (port, aeroport, ville) est porte par le site du checkpoint.
  ARRIVE_DESTINATION: { libelle: 'Arrivé dans le pays de destination', couleur: '#F77F00', etape: 4 },
  EN_DEDOUANEMENT: { libelle: 'En dédouanement', couleur: '#F77F00', etape: 5 },
  DISPONIBLE_AU_RETRAIT: { libelle: 'Disponible au retrait', couleur: '#009E60', etape: 6 },
  REMIS_AU_CLIENT: { libelle: 'Remis au client', couleur: '#009E60', etape: 7 },
  EXCEPTION: { libelle: 'Incident / exception', couleur: '#D62828', etape: 0 },
};
export const libelleStatut = (s: string) => STATUT_META[s as StatutCheckpoint]?.libelle ?? s;

/** Alphabet sans caractères ambigus (pas de 0/O, 1/I/L, U). */
export const TRACKING_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_RE = new RegExp(`^[${TRACKING_ALPHABET}]{12}$`);
/** Normalise un code saisi (casse, tirets, espaces) → XXXX-XXXX-XXXX, ou null si malformé. */
export function normalizeTrackingCode(input: string): string | null {
  const raw = (input ?? '').toUpperCase().replace(/[\s-]/g, '');
  if (!CODE_RE.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}
/** Montant dans la devise du transitaire. XOF et XAF s'affichent « FCFA », comme sur le terrain. */
export function formatMontant(n: number, devise = 'XOF'): string {
  const d = devise.toUpperCase();
  if (d === 'XOF' || d === 'XAF') return `${new Intl.NumberFormat('fr-FR').format(n).replace(/\u202f|\u00a0/g, ' ')} FCFA`;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: d }).format(n).replace(/\u202f|\u00a0/g, ' ');
}
export const formatXof = (n: number) => formatMontant(n, 'XOF');

export const FUSEAU_PAR_DEFAUT = 'Africa/Abidjan';
/** jj/mm/aaaa hh:mm dans le fuseau du transitaire (Abidjan par defaut). */
export function formatDate(d: string | Date, fuseau: string = FUSEAU_PAR_DEFAUT): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: fuseau || FUSEAU_PAR_DEFAUT, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(d));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${g('day')}/${g('month')}/${g('year')} ${g('hour')}:${g('minute')}`;
}
/** Vrai si le fuseau IANA est reconnu par le moteur Intl. */
export function fuseauValide(fuseau: string): boolean {
  try { new Intl.DateTimeFormat('fr-FR', { timeZone: fuseau }); return true; } catch { return false; }
}

/** Vrai si le code ISO 4217 est connu du moteur Intl (repli : format a 3 lettres). */
export function deviseValide(devise: string): boolean {
  const liste = (Intl as unknown as { supportedValuesOf?: (k: 'currency') => string[] }).supportedValuesOf;
  return liste ? liste('currency').includes(devise.toUpperCase()) : /^[A-Za-z]{3}$/.test(devise);
}

export * from './pays';
