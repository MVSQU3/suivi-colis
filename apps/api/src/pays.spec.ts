import { PAYS_AFRIQUE, deviseValide, exempleTelephone, formatDate, formatMontant, formatTelephone, fuseauValide, indicatifPays, normaliserTelephone, paysDuTelephone, paysParCode, STATUTS_CHECKPOINT } from '@suivi-colis/shared';

describe('referentiel des pays africains', () => {
  it('54 pays, codes uniques', () => {
    expect(PAYS_AFRIQUE).toHaveLength(54);
    expect(new Set(PAYS_AFRIQUE.map((p) => p.code)).size).toBe(54);
  });
  it.each(PAYS_AFRIQUE.map((p) => [p.code, p]))('%s : fuseau, devise et indicatif reconnus', (_c, p) => {
    expect(fuseauValide(p.fuseau)).toBe(true);
    expect(deviseValide(p.devise)).toBe(true);
    expect(indicatifPays(p.code)).toMatch(/^\d{1,3}$/);
  });
  it.each(['CI', 'SN', 'CM', 'NG', 'GH', 'TG', 'BJ', 'ML', 'BF'])('exemple de saisie valide pour %s', (c) => {
    const tel = normaliserTelephone(exempleTelephone(c), c);
    expect(tel).not.toBeNull(); expect(paysDuTelephone(tel)).toBe(c);
  });
  it('paysParCode insensible a la casse, inconnu -> undefined', () => {
    expect(paysParCode('sn')?.nom).toBe('Sénégal'); expect(paysParCode('FR')).toBeUndefined();
  });
});

describe('normaliserTelephone', () => {
  it.each([
    ['07 07 12 34 56', 'CI', '+2250707123456'], ['00225-07.07.12.34.56', 'CI', '+2250707123456'],
    ['77 123 45 67', 'SN', '+221771234567'], ['+221 77 123 45 67', 'CI', '+221771234567'], ['0803 123 4567', 'NG', '+2348031234567'],
  ])('%p (pays %s) -> %s', (raw, pays, attendu) => expect(normaliserTelephone(raw, pays)).toBe(attendu));
  it.each([['+33612345678', 'CI'], ['07071234567', 'CI'], ['abcdefghij', 'CI'], ['', 'CI'], ['77 123 45', 'SN']])('%p (pays %s) -> null', (raw, pays) =>
    expect(normaliserTelephone(raw, pays)).toBeNull());
  it("un numero local est lu dans le pays du transitaire, pas en Cote d'Ivoire", () => {
    expect(normaliserTelephone('0707123456', 'SN')).toBeNull();
  });
});

describe('affichage', () => {
  it('telephone : paires pour la CI, format international ailleurs', () => {
    expect(formatTelephone('+2250707123456')).toBe('+225 07 07 12 34 56');
    expect(formatTelephone('+221771234567')).toBe('+221 77 123 45 67');
    expect(formatTelephone('n/a')).toBe('n/a');
  });
  it('date dans le fuseau du transitaire', () => {
    expect(formatDate('2026-01-01T12:00:00Z')).toBe('01/01/2026 12:00');
    expect(formatDate('2026-01-01T12:00:00Z', 'Africa/Nairobi')).toBe('01/01/2026 15:00');
  });
  it('montant : FCFA pour XOF/XAF, code devise sinon', () => {
    expect(formatMontant(12500)).toBe('12 500 FCFA'); expect(formatMontant(12500, 'XAF')).toBe('12 500 FCFA');
    expect(formatMontant(1500, 'NGN')).toContain('NGN');
  });
  it("plus de statut propre a Abidjan", () => {
    expect(STATUTS_CHECKPOINT).toContain('ARRIVE_DESTINATION'); expect(STATUTS_CHECKPOINT).not.toContain('ARRIVE_ABIDJAN' as never);
  });
});
