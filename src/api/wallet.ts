import { api } from './client';

/**
 * Portefeuille du livreur : solde réel, relevé d'écritures et retraits.
 *
 * Remplace l'ancienne simulation locale : le solde et l'historique vivent
 * désormais côté serveur, donc ils survivent à une réinstallation et
 * correspondent à ce que voit l'administration.
 *
 * Un retrait n'est pas un virement instantané : il est immobilisé, validé
 * par un administrateur, puis marqué payé. L'interface doit refléter cette
 * attente plutôt que d'annoncer un versement immédiat.
 */

export type PayoutMethod = 'WAVE' | 'ORANGE_MONEY' | 'BANK_TRANSFER';

export type PayoutStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'PROCESSING'
  | 'PAID'
  | 'REJECTED'
  | 'FAILED'
  | 'CANCELLED';

export type LedgerEntryType =
  | 'DELIVERY_EARNING'
  | 'ORDER_SALE'
  | 'PLATFORM_COMMISSION'
  | 'CASH_COLLECTED'
  | 'WITHDRAWAL'
  | 'WITHDRAWAL_REVERSAL'
  | 'ADJUSTMENT';

export type Wallet = {
  balanceXof: number;
  pendingXof: number;
  lifetimeEarnedXof: number;
  currency: string;
  minWithdrawalXof: number;
  fees: Record<PayoutMethod, number>;
  payoutMethod: PayoutMethod | null;
  payoutNumber: string | null;
  pendingPayoutCount: number;
};

export type LedgerEntry = {
  id: string;
  type: LedgerEntryType;
  /** Signé : positif pour un crédit, négatif pour un débit. */
  amountXof: number;
  balanceAfterXof: number;
  orderId: string | null;
  deliveryId: string | null;
  payoutId: string | null;
  label: string;
  createdAt: string;
};

export type Payout = {
  id: string;
  amountXof: number;
  feeXof: number;
  netXof: number;
  method: PayoutMethod;
  destination: string;
  status: PayoutStatus;
  reference: string | null;
  rejectionReason: string | null;
  paidAt: string | null;
  createdAt: string;
};

/** Libellés affichés, du point de vue du livreur. */
export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  REQUESTED: 'En attente de validation',
  APPROVED: 'Validé, virement en préparation',
  PROCESSING: 'Virement en cours',
  PAID: 'Versé',
  REJECTED: 'Refusé',
  FAILED: 'Échec du virement',
  CANCELLED: 'Annulé',
};

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  WAVE: 'Wave',
  ORANGE_MONEY: 'Orange Money',
  BANK_TRANSFER: 'Virement bancaire',
};

/** Vrai tant que la demande peut encore être annulée par le livreur. */
export function isCancellable(status: PayoutStatus): boolean {
  return status === 'REQUESTED';
}

/** Vrai quand la demande est close, quelle qu'en soit l'issue. */
export function isSettled(status: PayoutStatus): boolean {
  return ['PAID', 'REJECTED', 'FAILED', 'CANCELLED'].includes(status);
}

export function getWallet(): Promise<Wallet> {
  return api('/couriers/me/wallet');
}

export async function listEntries(
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ items: LedgerEntry[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set('limit', String(opts.limit));
  if (opts.cursor) qs.set('cursor', opts.cursor);
  const data = await api(`/couriers/me/wallet/entries${qs.toString() ? `?${qs}` : ''}`);
  return { items: data?.items ?? [], nextCursor: data?.nextCursor ?? null };
}

export function requestPayout(input: {
  amountXof: number;
  method: PayoutMethod;
  destination: string;
}): Promise<Payout> {
  return api('/couriers/me/payouts', { method: 'POST', body: input });
}

export async function listPayouts(
  opts: { limit?: number; cursor?: string } = {},
): Promise<{ items: Payout[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set('limit', String(opts.limit));
  if (opts.cursor) qs.set('cursor', opts.cursor);
  const data = await api(`/couriers/me/payouts${qs.toString() ? `?${qs}` : ''}`);
  return { items: data?.items ?? [], nextCursor: data?.nextCursor ?? null };
}

export function cancelPayout(id: string): Promise<Payout> {
  return api(`/couriers/me/payouts/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function savePayoutMethod(input: { method: PayoutMethod; destination: string }) {
  return api('/couriers/me/payout-method', { method: 'PUT', body: input });
}
