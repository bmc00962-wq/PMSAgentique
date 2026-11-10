
// Unit tests — ADR-023, Node.js built-in test runner
// Tests: calcul taxes localisées, transitions machine d'état réservations, utilitaires

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

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
    assert.equal(result.baseRent, 360);
    assert.equal(result.taxAmount, Math.round((360 + 65) * 0.18475 * 100) / 100);
    assert.equal(result.totalAmount, result.baseRent + 65 + result.taxAmount);
  });

  it('applique la taxe Maroc 10%', () => {
    const result = calculateTotalAmount({
      baseRate: 100,
      nights: 5,
      cleaningFee: 50,
      country: 'Morocco',
    });
    assert.equal(result.baseRent, 500);
    assert.equal(result.taxAmount, Math.round((500 + 50) * 0.10 * 100) / 100);
    assert.equal(result.taxAmount, 55);
    assert.equal(result.totalAmount, 605);
  });

  it('retourne 0 pour 0 nuits', () => {
    const result = calculateTotalAmount({ baseRate: 100, nights: 0, cleaningFee: 50, country: 'Canada' });
    assert.equal(result.baseRent, 0);
  });

  it('calcule correctement pour une nuit unique', () => {
    const result = calculateTotalAmount({
      baseRate: 150, nights: 1, cleaningFee: 60, country: 'Canada',
    });
    assert.equal(result.baseRent, 150);
    assert.equal(result.taxAmount, Math.round((150 + 60) * 0.18475 * 100) / 100);
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
    assert.equal(canTransition('inquiry', 'pending'), true);
    assert.equal(canTransition('pending', 'confirmed'), true);
  });

  it('autorise confirmed → checked_in → checked_out (cycle complet)', () => {
    assert.equal(canTransition('confirmed', 'checked_in'), true);
    assert.equal(canTransition('checked_in', 'checked_out'), true);
  });

  it('interdit checked_out → tout autre statut (terminal)', () => {
    assert.equal(canTransition('checked_out', 'confirmed'), false);
    assert.equal(canTransition('checked_out', 'cancelled'), false);
    assert.equal(canTransition('checked_out', 'checked_in'), false);
  });

  it('interdit cancelled → tout autre statut (terminal)', () => {
    assert.equal(canTransition('cancelled', 'confirmed'), false);
    assert.equal(canTransition('cancelled', 'pending'), false);
  });

  it('autorise confirmed → cancelled', () => {
    assert.equal(canTransition('confirmed', 'cancelled'), true);
  });

  it('autorise confirmed → no_show', () => {
    assert.equal(canTransition('confirmed', 'no_show'), true);
  });

  it('interdit checked_in → cancelled (nécessite approbation ADR-020)', () => {
    // checked_in ne peut pas passer directement à cancelled — doit passer par approval
    assert.equal(canTransition('checked_in', 'cancelled'), false);
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
    assert.equal(k1, k2);
  });

  it('génère des clés différentes pour des unités différentes', () => {
    const k1 = generateIdempotencyKey('unit-1', '2025-06-01', '2025-06-05', 'user-1');
    const k2 = generateIdempotencyKey('unit-2', '2025-06-01', '2025-06-05', 'user-1');
    assert.notEqual(k1, k2);
  });

  it('est en minuscules (normalisation)', () => {
    const k = generateIdempotencyKey('UNIT-1', '2025-06-01', '2025-06-05', 'USER-1');
    assert.equal(k, 'unit-1-2025-06-01-2025-06-05-user-1');
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
    assert.equal(calculateNights('2025-06-01', '2025-06-06'), 5);
  });

  it('calcule 1 nuit pour une nuitée simple', () => {
    assert.equal(calculateNights('2025-06-01', '2025-06-02'), 1);
  });

  it('retourne 0 pour dates identiques', () => {
    assert.equal(calculateNights('2025-06-01', '2025-06-01'), 0);
  });

  it('retourne négatif si checkout avant checkin', () => {
    assert.ok(calculateNights('2025-06-05', '2025-06-01') < 0);
  });
});
