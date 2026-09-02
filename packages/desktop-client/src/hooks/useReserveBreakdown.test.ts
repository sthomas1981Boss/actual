import { describe, expect, it } from 'vitest';

import {
  firstFundedMonth,
  reserveBalanceAt,
  reservePaymentIn,
} from './useReserveBreakdown';

// Le solde d'une reserve n'est stocke nulle part : il se recalcule a partir des
// versements de chaque mois. Un mois porte soit ce qui y a ete tape, soit le
// versement recurrent — jamais les deux, faute de quoi une saisie enregistre en
// coulisse un ajustement que personne ne peut relire.

const vacances = { id: 'vacances', monthly_amount: 20000 }; // 200 EUR par mois
const ligne = (month: string, amount: number, n = month) => ({
  id: n,
  reserve_id: 'vacances',
  month,
  amount,
});

describe('the month a reserve starts', () => {
  it('is the earliest month carrying a figure', () => {
    expect(
      firstFundedMonth('vacances', [
        ligne('2026-06', 5000),
        ligne('2026-04', 10000),
      ]),
    ).toBe('2026-04');
  });

  it('does not exist while nothing has been typed', () => {
    expect(firstFundedMonth('vacances', [])).toBeNull();
  });

  it('ignores the other reserves', () => {
    const entries = [
      { id: '1', reserve_id: 'maison', month: '2026-01', amount: 10000 },
    ];
    expect(firstFundedMonth('vacances', entries)).toBeNull();
  });
});

describe('what a month pays in', () => {
  const avril = [ligne('2026-04', 10000)];

  it('is the figure typed, when there is one', () => {
    expect(reservePaymentIn(vacances, avril, '2026-04')).toBe(10000);
  });

  it('is the standing order on the months left alone', () => {
    expect(reservePaymentIn(vacances, avril, '2026-05')).toBe(20000);
  });

  it('is nothing before the reserve started', () => {
    expect(reservePaymentIn(vacances, avril, '2026-03')).toBe(0);
  });

  it('replaces the standing order rather than adding to it', () => {
    const entries = [...avril, ligne('2026-06', 5000)];
    expect(reservePaymentIn(vacances, entries, '2026-06')).toBe(5000);
  });
});

describe('balance of a reserve', () => {
  // Le cas decrit par l'utilisateur : 100 EUR poses en avril, 200 EUR par mois.
  const avril = [ligne('2026-04', 10000)];

  it('is the first figure typed, on its own month', () => {
    expect(reserveBalanceAt(vacances, avril, '2026-04')).toBe(10000);
  });

  it('adds the standing order from the following month on', () => {
    expect(reserveBalanceAt(vacances, avril, '2026-05')).toBe(30000);
    expect(reserveBalanceAt(vacances, avril, '2026-06')).toBe(50000);
    expect(reserveBalanceAt(vacances, avril, '2026-08')).toBe(90000);
  });

  it('holds nothing before it started', () => {
    expect(reserveBalanceAt(vacances, avril, '2026-03')).toBe(0);
  });

  it('stays empty while nothing has been typed, whatever the standing order', () => {
    expect(reserveBalanceAt(vacances, [], '2026-12')).toBe(0);
  });

  it('takes a withdrawal into account from its month onwards', () => {
    // Juillet paye -650 au lieu des 200 habituels
    const entries = [...avril, ligne('2026-07', -65000)];
    // avril 100, mai 300, juin 500, juillet 500 - 650
    expect(reserveBalanceAt(vacances, entries, '2026-06')).toBe(50000);
    expect(reserveBalanceAt(vacances, entries, '2026-07')).toBe(-15000);
    expect(reserveBalanceAt(vacances, entries, '2026-08')).toBe(5000);
  });

  it('ignores what has not happened yet', () => {
    const entries = [...avril, ligne('2026-09', -50000)];
    expect(reserveBalanceAt(vacances, entries, '2026-08')).toBe(90000);
  });

  it('ignores entries belonging to another reserve', () => {
    const entries = [
      ...avril,
      { id: 'x', reserve_id: 'maison', month: '2026-05', amount: 99999 },
    ];
    expect(reserveBalanceAt(vacances, entries, '2026-05')).toBe(30000);
  });
});

// Le defaut qui avait echappe aux tests precedents : ils partaient tous d'une
// reserve vierge, alors qu'on saisit mois apres mois, en revenant sur ses pas.
describe('typing month after month', () => {
  it('keeps each figure exactly as it was entered', () => {
    const entries = [ligne('2026-02', 10000), ligne('2026-05', 50000)];
    expect(reservePaymentIn(vacances, entries, '2026-02')).toBe(10000);
    expect(reservePaymentIn(vacances, entries, '2026-05')).toBe(50000);
    // fevrier 100, mars 300, avril 500, mai 500 + 500 tapes
    expect(reserveBalanceAt(vacances, entries, '2026-04')).toBe(50000);
    expect(reserveBalanceAt(vacances, entries, '2026-05')).toBe(100000);
  });

  it('does not drift when the same month is typed again', () => {
    const once = [ligne('2026-02', 10000)];
    const twice = [ligne('2026-02', 30000)]; // le serveur remplace la ligne
    expect(reserveBalanceAt(vacances, once, '2026-03')).toBe(30000);
    expect(reserveBalanceAt(vacances, twice, '2026-03')).toBe(50000);
  });

  it('hands the month back to the standing order when cleared', () => {
    // Une saisie a zero supprime la ligne cote serveur
    const entries = [ligne('2026-02', 10000)];
    expect(reserveBalanceAt(vacances, entries, '2026-05')).toBe(70000);
  });

  it('moves the origin when an earlier month is typed into', () => {
    const entries = [ligne('2026-04', 10000), ligne('2026-02', 10000)];
    expect(firstFundedMonth('vacances', entries)).toBe('2026-02');
    // fevrier 100, mars 200, avril 100 tapes
    expect(reserveBalanceAt(vacances, entries, '2026-04')).toBe(40000);
  });
});

describe('a reserve with no standing order', () => {
  const noel = { id: 'noel', monthly_amount: 0 };

  it('holds only what was typed into it', () => {
    const entries = [
      { id: '1', reserve_id: 'noel', month: '2026-03', amount: 30000 },
      { id: '2', reserve_id: 'noel', month: '2026-06', amount: 20000 },
    ];
    expect(reserveBalanceAt(noel, entries, '2026-05')).toBe(30000);
    expect(reserveBalanceAt(noel, entries, '2026-08')).toBe(50000);
  });
});
