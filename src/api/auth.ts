import { api, apiPublic, saveSession, clearSession, getStoredUser } from './client';

/**
 * Auth livreur :
 * - Connexion : téléphone + PIN (POST /auth/login).
 * - Inscription : téléphone → OTP (POST /auth/send-otp), puis nom + PIN +
 *   véhicule → POST /auth/register-courier (crée un compte role=COURIER).
 *
 * L'envoi de SMS réel n'est pas actif (SMS_PROVIDER=stub, choix volontaire) :
 * send-otp renvoie devOtp dans la réponse, affiché à l'écran.
 *
 * Après register-courier, le compte existe mais le dossier KYC est BLOQUANT :
 * l'inscription enchaîne sur le dépôt des pièces (voir documents.ts), et le
 * serveur refuse le passage en ligne et l'acceptation de course tant que le
 * dossier n'est pas APPROVED.
 */

export type CourierUser = {
  id: string;
  phone: string;
  name: string | null;
  role: string;
  vehicleType?: string | null;
  vehicleBrand?: string | null;
  vehicleColor?: string | null;
  vehiclePlate?: string | null;
};

type AuthResponse = { token: string; refreshToken: string; user: CourierUser };

export async function login(phone: string, pin: string) {
  // role=COURIER : on authentifie le compte LIVREUR de ce numéro (distinct
  // d'un éventuel compte client avec le même téléphone).
  const data = await apiPublic('/auth/login', { method: 'POST', body: { phone, pin, role: 'COURIER' } });
  await saveSession(data);
  return data as AuthResponse;
}

/** Envoie un OTP au numéro. En mode stub, devOtp est renvoyé pour affichage. */
export function sendOtp(phone: string): Promise<{ success: boolean; devOtp?: string }> {
  return apiPublic('/auth/send-otp', { method: 'POST', body: { phone } });
}

/** Vérifie (avant le PIN) qu'un compte livreur existe pour ce numéro. */
export function courierExists(phone: string): Promise<{ exists: boolean }> {
  return apiPublic('/auth/courier-exists', { method: 'POST', body: { phone } });
}

export type CourierSignup = {
  phone: string;
  otp: string;
  name: string;
  pin: string;
  vehicleType: string;
  vehicleBrand?: string;
  vehicleColor?: string;
  vehiclePlate?: string;
  avatarUrl?: string;
};

/** Inscription livreur (après OTP vérifié) : crée le compte COURIER + véhicule. */
export async function registerCourier(input: CourierSignup) {
  const data = await apiPublic('/auth/register-courier', { method: 'POST', body: input });
  await saveSession(data);
  return data as AuthResponse;
}

export function me() {
  return api('/auth/me') as Promise<CourierUser>;
}

/**
 * Met à jour le profil ({ name?, avatarUrl? }) via PUT /users/me et
 * re-persiste la session locale à jour. Identique au portail-client.
 */
export async function updateProfile(fields: { name?: string; avatarUrl?: string }) {
  const user = await api('/users/me', { method: 'PUT', body: fields });
  const current = await getStoredUser<CourierUser>().catch(() => null);
  await saveSession({ user: { ...(current ?? {}), ...user } });
  return user as CourierUser;
}

/**
 * Déconnexion : la session locale doit être effacée même si l'appel serveur
 * échoue (token expiré/absent, hors-ligne...) — jamais bloquer un logout sur
 * un problème réseau ou d'auth. Même correctif que portail-client.
 */
export async function logout() {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // Ignoré : le logout local doit réussir quoi qu'il arrive.
  } finally {
    await clearSession();
  }
}
