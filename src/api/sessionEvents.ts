/**
 * Event bus pour signaler l'expiration de session depuis la couche API
 * (client.ts) vers l'UI (SessionExpiredModal). Même pattern que le
 * portail-client.
 */
type Listener = () => void;
const listeners = new Set<Listener>();

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitSessionExpired(): void {
  for (const listener of listeners) listener();
}
