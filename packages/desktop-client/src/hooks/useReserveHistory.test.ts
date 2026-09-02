import { describe, expect, it } from 'vitest';

import { envelopesOverMonths } from './useReserveHistory';

// La ligne « non affecte » se deduit de l'enveloppe. Laisser l'enveloppe figee
// au-dela du mois en cours la vidait mois apres mois jusqu'a passer sous zero,
// alors qu'un versement mensuel vient du compte courant : il alimente le
// livret, donc l'enveloppe monte avec les reserves.

const months = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
// Le compte porte 5 000 fin juin, 4 000 fin juillet, 4 348,49 aujourd'hui (aout)
const soldes: Record<string, number> = {
  '2026-06': 500000,
  '2026-07': 400000,
  '2026-08': 434849,
};
const balanceAt = (month: string) => soldes[month] ?? 0;

describe('the envelope over the months', () => {
  // Vacances : 900 fin juin, 1 100 fin juillet, 1 300 aujourd'hui, puis +200
  const balancesByMonth = [90000, 110000, 130000, 150000, 170000];
  const commun = {
    months,
    balancesByMonth,
    firstProjectedIndex: 3, // septembre et octobre sont projetes
    balanceAt,
    balanceNow: 434849,
    setAsideNow: 130000,
  };

  it('reads the accounts for the months already gone', () => {
    const e = envelopesOverMonths(commun);
    expect(e[0]).toBe(500000);
    expect(e[1]).toBe(400000);
    expect(e[2]).toBe(434849);
  });

  it('grows by what the reserves gain once projected', () => {
    const e = envelopesOverMonths(commun);
    expect(e[3]).toBe(434849 + 20000);
    expect(e[4]).toBe(434849 + 40000);
  });

  it('keeps the leftover steady across projected months', () => {
    const e = envelopesOverMonths(commun);
    const restant = e.map((env, i) => env - balancesByMonth[i]);
    expect(restant[3]).toBe(restant[2]);
    expect(restant[4]).toBe(restant[2]);
  });

  it('counts the months between today and a year shown entirely ahead', () => {
    // Janvier 2027 : la reserve porte deja 1 900, contre 1 300 aujourd'hui
    const e = envelopesOverMonths({
      ...commun,
      months: ['2027-01', '2027-02'],
      balancesByMonth: [190000, 210000],
      firstProjectedIndex: 0,
    });
    expect(e[0]).toBe(434849 + 60000);
    expect(e[1]).toBe(434849 + 80000);
  });

  it('lets the leftover fall when a reserve is drawn on, not when it is fed', () => {
    // Une ponction en septembre : la reserve baisse, l'enveloppe suit
    const e = envelopesOverMonths({
      ...commun,
      balancesByMonth: [90000, 110000, 130000, 65000, 85000],
    });
    expect(e[3]).toBe(434849 - 65000);
  });
});
