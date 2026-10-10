import { mergeHistory, CheckpointLike } from './history';
const cp = (id: string, date: string, lotId: string | null, colisId: string | null = null): CheckpointLike =>
  ({ id, statut: 'PARTI_DE_CHINE', lieu: 'x', commentaire: null, date: new Date(date), lotId, colisId });
describe('mergeHistory', () => {
  const affs = [
    { lotId: 'A', debut: new Date('2026-01-01'), fin: new Date('2026-01-10') },
    { lotId: 'B', debut: new Date('2026-01-10'), fin: null },
  ];
  it('hérite des checkpoints de lot dans les périodes, debut inclus, fin exclue', () => {
    const h = mergeHistory([cp('own', '2026-01-05', null, 'c')], affs, [
      cp('a-in', '2026-01-01', 'A'), cp('a-fin', '2026-01-10', 'A'), cp('b-backdated', '2026-01-05', 'B'), cp('b-in', '2026-01-12', 'B'),
    ]);
    expect(h.map((x) => x.id)).toEqual(['a-in', 'own', 'b-in']);
  });
});
