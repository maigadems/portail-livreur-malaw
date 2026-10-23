import { api } from './client';

/**
 * Avis reçus par le livreur.
 *
 * Les notes viennent des clients, après livraison. Le serveur n'expose que
 * le prénom de l'auteur : un livreur ne doit pas pouvoir remonter jusqu'au
 * client à partir de son évaluation.
 */

export type CourierReview = {
  id: string;
  rating: number;
  comment: string | null;
  /** Prénom seul de l'auteur, ou null si anonyme. */
  authorFirstName: string | null;
  createdAt: string;
};

export type ReviewsPage = {
  items: CourierReview[];
  nextCursor: string | null;
};

export type ReviewsSummary = {
  average: number | null;
  count: number;
  /** Nombre d'avis par note, de « 5 » à « 1 ». */
  breakdown: Record<string, number>;
  last30dAverage: number | null;
};

export async function listMyReviews(opts: { limit?: number; cursor?: string } = {}): Promise<ReviewsPage> {
  const qs = new URLSearchParams();
  if (opts.limit) qs.set('limit', String(opts.limit));
  if (opts.cursor) qs.set('cursor', opts.cursor);
  const suffix = qs.toString() ? `?${qs}` : '';

  const data = await api(`/couriers/me/reviews${suffix}`);
  if (Array.isArray(data)) return { items: data, nextCursor: null };
  return { items: data?.items ?? [], nextCursor: data?.nextCursor ?? null };
}

export function getReviewsSummary(): Promise<ReviewsSummary> {
  return api('/couriers/me/reviews/summary');
}
