import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Capture d'une pièce justificative (CNI, permis, carte grise, assurance).
 *
 * Contrairement à pickAvatar, on ne recadre pas en carré et on garde une
 * largeur de 1600 px : un agent support doit pouvoir lire un numéro de permis
 * sur la photo. Compression 0.6 → ~150-400 KB en base64, largement sous la
 * limite de 4 Mo imposée par l'API.
 */
const MAX_WIDTH = 1600;
const QUALITY = 0.6;

async function toDataUrl(uri: string): Promise<string> {
  const { base64 } = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
  );
  return `data:image/jpeg;base64,${base64}`;
}

/** Choisit une pièce dans la galerie. Renvoie null si l'utilisateur annule. */
export async function pickDocumentFromLibrary(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Autorisez l'accès à vos photos pour joindre un document.");
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  return toDataUrl(picked.assets[0].uri);
}

/** Photographie la pièce directement. Renvoie null si l'utilisateur annule. */
export async function captureDocument(): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    throw new Error("Autorisez l'accès à l'appareil photo pour prendre le document en photo.");
  }

  const picked = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.length) return null;

  return toDataUrl(picked.assets[0].uri);
}
