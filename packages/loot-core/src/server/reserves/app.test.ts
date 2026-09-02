import { describe, expect, it } from 'vitest';

import { monthsToFreeze } from './app';

// Changer le versement mensuel ne doit pas reecrire le passe : les mois deja
// ecoules sont inscrits en dur avec l'ancien montant, faute de quoi un solde
// deja lu changerait sous les yeux de l'utilisateur.

describe('freezing the months already gone', () => {
  it('covers the months between the opening figure and the change', () => {
    expect(monthsToFreeze('2026-04', '2026-09', ['2026-04'])).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
  });

  it('leaves the opening month alone', () => {
    expect(monthsToFreeze('2026-04', '2026-09', ['2026-04'])).not.toContain(
      '2026-04',
    );
  });

  it('skips the months already typed into', () => {
    expect(
      monthsToFreeze('2026-04', '2026-09', ['2026-04', '2026-06', '2026-07']),
    ).toEqual(['2026-05', '2026-08']);
  });

  it('freezes nothing when the reserve has not started', () => {
    expect(monthsToFreeze(null, '2026-09', [])).toEqual([]);
  });

  it('freezes nothing when the reserve starts this very month', () => {
    expect(monthsToFreeze('2026-09', '2026-09', ['2026-09'])).toEqual([]);
  });

  it('crosses the turn of the year', () => {
    expect(monthsToFreeze('2026-11', '2027-02', ['2026-11'])).toEqual([
      '2026-12',
      '2027-01',
    ]);
  });
});
