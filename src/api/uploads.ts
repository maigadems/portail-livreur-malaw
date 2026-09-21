import { api } from './client';

/**
 * Dépôt d'images.
 *
 * L'image transite par l'API Malaw, jamais directement par le service
 * d'hébergement : la clé secrète reste côté serveur et chaque dépôt est
 * rattaché à un compte dont les droits sont vérifiés.
 *
 * `kyc` est traité à part : les pièces d'identité sont déposées en accès
 * restreint et ne sont consultables que via une URL signée à durée limitée,
 * jamais par un lien public.
 */

export type UploadKind = 'avatar' | 'kyc';

export type UploadResult = {
  url: string;
  publicId: string;
  width: number;
  height: number;
  thumbUrl: string | null;
};

/** @param file data-URL base64, telle que produite par expo-image-manipulator. */
export function uploadImage(file: string, kind: UploadKind = 'avatar') {
  return api('/uploads/image', { method: 'POST', body: { file, kind } }) as Promise<UploadResult>;
}

/** Dépose une photo de profil et renvoie son URL. */
export async function uploadAvatar(dataUrl: string): Promise<string> {
  const { url } = await uploadImage(dataUrl, 'avatar');
  return url;
}

/**
 * Dépose une pièce justificative et renvoie son URL.
 *
 * Le service de documents accepte déjà une URL distante : en passant par
 * ici, la pièce n'est plus stockée en base64 dans la base de données.
 */
export async function uploadDocument(dataUrl: string): Promise<string> {
  const { url } = await uploadImage(dataUrl, 'kyc');
  return url;
}
