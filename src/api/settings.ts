import { api } from './client';

/**
 * Préférences du compte.
 *
 * Elles vivent côté serveur : un livreur qui change de téléphone doit
 * retrouver ses réglages, et le serveur doit les connaître pour décider
 * s'il a le droit de lui envoyer une notification.
 *
 * Ce qui relève de l'appareil et non du compte (permission de localisation,
 * par exemple) n'a rien à faire ici : cela se lit auprès du système.
 */

export type UserSettings = {
  preferredLanguage: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  promoOptIn: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

export function getSettings(): Promise<UserSettings> {
  return api('/users/me/settings');
}

export function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  return api('/users/me/settings', { method: 'PUT', body: patch });
}

/**
 * Suppression définitive du compte. Le serveur refuse tant qu'une course est
 * en cours ou qu'il reste de l'argent sur le portefeuille — le message
 * d'erreur renvoyé explique le motif et doit être montré tel quel.
 */
export function deleteAccount(input: { pin: string; reason?: string }) {
  return api('/users/me', { method: 'DELETE', body: input });
}

/** Changement du code PIN. Le code actuel est exigé. */
export function changePin(input: { currentPin: string; newPin: string }) {
  return api('/users/me/pin', { method: 'PATCH', body: input });
}
