
// Unit tests — ADR-023 Vitest
// Tests: calcul taxes localisées, transitions machine d'état réservations, utilitaires

import { describe, it, expect, vi } from 'vitest';

// ── Test 1: Calcul taxes localisées (NewReservationPage logic) ───────────────

const CANADA_TAX = 0.18475;  // QC 18.475%
const MOROCCO_TAX = 0.10;    // Maroc 10%

function calculateTotalAmount(params: {
  baseRate: number;
  nights: number;
  cleaningFee: number;
  country: string;
}): { baseRent: number; taxAmount: number; totalAmount: number } {
  const { baseRate, nights, cleaningFee, country } = params;
  const baseRent = Math.round(baseRate * nights * 100) / 100;
  const taxRate = country === 'Morocco' ? MOROCCO_TAX : CANADA_TAX;
  const taxAmount = Math.round((baseRent + cleaningFee) * taxRate * 100) / 100;
  const totalAmount = Math.round((baseRent + cleaningFee + taxAmount) * 100) / 100;
  return { baseRent, taxAmount, totalAmount };
}

describe('Calcul taxes localisées', () => {
  it('applique la taxe QC 18.475% pour le Canada', () => {
    const result = calculateTotalAmount({
      baseRate: 120,
      nights: 3,
      cleaningFee: 65,
      country: 'Canada',
    });
    expect(result.baseRent).toBe(360);
    expect(result.taxAmount).toBe(Math.round((360 + 65) * 0.18475 * 100) / 100);
    expect(result.totalAmount).toBe(result.baseRent + 65 + result.taxAmount);
  });

  it('applique la taxe Maroc 10%', () => {
    const result = calculateTotalAmount({
      baseRate: 100,
      nights: 5,
      cleaningFee: 50,
      country: 'Morocco',
    });
    expect(result.baseRent).toBe(500);
    expect(result.taxAmount).toBe(Math.round((500 + 50) * 0.10 * 100) / 100);
    expect(result.taxAmount).toBe(55);
    expect(result.totalAmount).toBe(605);
  });

  it('retourne 0 pour 0 nuits', () => {
    const result = calculateTotalAmount({ baseRate: 100, nights: 0, cleaningFee: 50, country: 'Canada' });
    expect(result.baseRent).toBe(0);
  });

  it('calcule correctement pour une nuit unique', () => {
    const result = calculateTotalAmount({
      baseRate: 150, nights: 1, cleaningFee: 60, country: 'Canada',
    });
    expect(result.baseRent).toBe(150);
    expect(result.taxAmount).toBe(Math.round((150 + 60) * 0.18475 * 100) / 100);
  });
});

// ── Test 2: Machine d'état réservation ────────────────────────────────────────

const RESERVATION_STATUS_TRANSITIONS: Record<string, string[]> = {
  inquiry:     ['pending', 'cancelled'],
  pending:     ['confirmed', 'cancelled'],
  confirmed:   ['checked_in', 'cancelled', 'no_show'],
  checked_in:  ['checked_out'],
  checked_out: [],
  cancelled:   [],
  no_show:     [],
};

function canTransition(from: string, to: string): boolean {
  return (RESERVATION_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

describe('Machine d\'état réservation — ADR-010', () => {
  it('autorise inquiry → confirmed', () => {
    expect(canTransition('inquiry', 'pending')).toBe(true);
    expect(canTransition('pending', 'confirmed')).toBe(true);
  });

  it('autorise confirmed → checked_in → checked_out (cycle complet)', () => {
    expect(canTransition('confirmed', 'checked_in')).toBe(true);
    expect(canTransition('checked_in', 'checked_out')).toBe(true);
  });

  it('interdit checked_out → tout autre statut (terminal)', () => {
    expect(canTransition('checked_out', 'confirmed')).toBe(false);
    expect(canTransition('checked_out', 'cancelled')).toBe(false);
    expect(canTransition('checked_out', 'checked_in')).toBe(false);
  });

  it('interdit cancelled → tout autre statut (terminal)', () => {
    expect(canTransition('cancelled', 'confirmed')).toBe(false);
    expect(canTransition('cancelled', 'pending')).toBe(false);
  });

  it('autorise confirmed → cancelled', () => {
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
  });

  it('autorise confirmed → no_show', () => {
    expect(canTransition('confirmed', 'no_show')).toBe(true);
  });

  it('interdit checked_in → cancelled (nécessite approbation ADR-020)', () => {
    // checked_in ne peut pas passer directement à cancelled — doit passer par approval
    expect(canTransition('checked_in', 'cancelled')).toBe(false);
  });
});

// ── Test 3: Idempotency key generation ────────────────────────────────────────

function generateIdempotencyKey(unitId: string, checkIn: string, checkOut: string, userId: string): string {
  return `${unitId}-${checkIn}-${checkOut}-${userId}`.toLowerCase();
}

describe('Génération clé idempotence — ADR-010', () => {
  it('génère une clé déterministe pour les mêmes paramètres', () => {
    const k1 = generateIdempotencyKey('unit-1', '2025-06-01', '2025-06-05', 'user-1');
    const k2 = generateIdempotencyKey('unit-1', '2025-06-01', '2025-06-05', 'user-1');
    expect(k1).toBe(k2);
  });

  it('génère des clés différentes pour des unités différentes', () => {
    const k1 = generateIdempotencyKey('unit-1', '2025-06-01', '2025-06-05', 'user-1');
    const k2 = generateIdempotencyKey('unit-2', '2025-06-01', '2025-06-05', 'user-1');
    expect(k1).not.toBe(k2);
  });

  it('est en minuscules (normalisation)', () => {
    const k = generateIdempotencyKey('UNIT-1', '2025-06-01', '2025-06-05', 'USER-1');
    expect(k).toBe('unit-1-2025-06-01-2025-06-05-user-1');
  });
});

// ── Test 4: Calcul nombre de nuits ─────────────────────────────────────────────

function calculateNights(checkIn: string, checkOut: string): number {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return Math.round((co.getTime() - ci.getTime()) / (1000 * 3600 * 24));
}

describe('Calcul nombre de nuits', () => {
  it('calcule 5 nuits pour du 1er au 6 juin', () => {
    expect(calculateNights('2025-06-01', '2025-06-06')).toBe(5);
  });

  it('calcule 1 nuit pour une nuitée simple', () => {
    expect(calculateNights('2025-06-01', '2025-06-02')).toBe(1);
  });

  it('retourne 0 pour dates identiques', () => {
    expect(calculateNights('2025-06-01', '2025-06-01')).toBe(0);
  });

  it('retourne négatif si checkout avant checkin', () => {
    expect(calculateNights('2025-06-05', '2025-06-01')).toBeLessThan(0);
  });
});
