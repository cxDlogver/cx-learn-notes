import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import type { LocalCache, LocalMediaMetadata } from "../data/localCache";
import type { LocalStore } from "../data/localStore";

export async function choosePrivatePhotos(
  accountId: string,
  operationId: string,
  remaining: number,
  store: LocalStore,
  cache: LocalCache,
): Promise<LocalMediaMetadata[]> {
  if (remaining < 1) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("请在系统设置中允许访问照片后重试");
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    orderedSelection: true,
    exif: false,
    quality: 1,
  });
  if (picked.canceled) return [];
  const root = await store.mediaRoot(accountId);
  const staged: LocalMediaMetadata[] = [];
  try {
    for (const asset of picked.assets.slice(0, remaining)) {
      const id = Crypto.randomUUID();
      const target = new File(root, `${id}.jpg`);
      try {
        const longest = Math.max(asset.width, asset.height);
        const resize =
          longest > 1600
            ? asset.width >= asset.height
              ? [{ resize: { width: 1600 } }]
              : [{ resize: { height: 1600 } }]
            : [];
        // Re-encoding omits source EXIF and keeps only an app-owned JPEG copy.
        const result = await ImageManipulator.manipulateAsync(
          asset.uri,
          resize,
          {
            format: ImageManipulator.SaveFormat.JPEG,
            compress: 0.82,
          },
        );
        await new File(result.uri).copy(target);
        if (!target.size || target.size > 20 * 1024 * 1024)
          throw new Error("照片超过 20 MB，请选择较小的照片");
        const digest = await Crypto.digest(
          Crypto.CryptoDigestAlgorithm.SHA256,
          await target.bytes(),
        );
        const media: LocalMediaMetadata = {
          id,
          operationId,
          fileUri: target.uri,
          mimeType: "image/jpeg",
          byteSize: target.size,
          sha256: Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join(""),
          status: "staged",
          remoteId: null,
          createdAt: new Date().toISOString(),
        };
        await cache.putMedia(accountId, media);
        staged.push(media);
      } catch (error) {
        if (target.exists) target.delete();
        throw error;
      }
    }
    return staged;
  } catch (error) {
    for (const media of staged) {
      await cache.removeStagedMedia(accountId, media.id).catch(() => {});
      const file = new File(media.fileUri);
      if (file.exists) file.delete();
    }
    throw error;
  }
}
