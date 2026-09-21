import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Retraits — TEMPORAIRE : stockés localement (AsyncStorage) en attendant une
 * vraie API de paiement/virement. Le solde disponible = gains totaux
 * (earnings.allTime, source serveur) − somme des retraits déjà effectués.
 *
 * À remplacer par un endpoint backend une fois le PSP intégré.
 */
const KEY = '@malaw-livreur/withdrawals';

export type Withdrawal = {
  id: string;
  amount: number;
  method: string; // 'wave' | 'orange'
  phone?: string;
  createdAt: string;
};

export async function listWithdrawals(): Promise<Withdrawal[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function totalWithdrawn(): Promise<number> {
  const list = await listWithdrawals();
  return list.reduce((sum, w) => sum + w.amount, 0);
}

/** Solde disponible = gains totaux serveur − retraits déjà effectués. */
export async function availableBalance(allTimeEarnings: number): Promise<number> {
  return Math.max(0, allTimeEarnings - (await totalWithdrawn()));
}

export async function addWithdrawal(w: Omit<Withdrawal, 'id' | 'createdAt'>): Promise<Withdrawal> {
  const list = await listWithdrawals();
  const created: Withdrawal = {
    ...w,
    id: `wd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify([created, ...list]));
  return created;
}
