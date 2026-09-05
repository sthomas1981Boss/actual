import { describe, expect, it } from 'vitest';

import { monthsToFreeze, reorderedIds } from './app';

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

// Remonter ou descendre une reserve renumerote toute la liste : les reserves
// creees avant cette fonctionnalite peuvent partager un meme `sort_order`, et
// un simple echange de valeurs ne les deplacerait pas.

describe('moving a reserve a step', () => {
  const liste = ['vacances', 'anniversaire', 'noel'];

  it('swaps it with the one above', () => {
    expect(reorderedIds(liste, 'anniversaire', -1)).toEqual([
      'anniversaire',
      'vacances',
      'noel',
    ]);
  });

  it('swaps it with the one below', () => {
    expect(reorderedIds(liste, 'anniversaire', 1)).toEqual([
      'vacances',
      'noel',
      'anniversaire',
    ]);
  });

  it('leaves the list alone at the top', () => {
    expect(reorderedIds(liste, 'vacances', -1)).toBe(liste);
  });

  it('leaves the list alone at the bottom', () => {
    expect(reorderedIds(liste, 'noel', 1)).toBe(liste);
  });

  it('leaves the list alone for a reserve it does not hold', () => {
    expect(reorderedIds(liste, 'maison', -1)).toBe(liste);
  });

  it('handles a single reserve', () => {
    expect(reorderedIds(['vacances'], 'vacances', 1)).toEqual(['vacances']);
  });
});
