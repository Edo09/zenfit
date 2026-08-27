import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AsyncStorage keys, and the one-time move off the pre-rename "hokage-" prefix.
 *
 * Renaming a key outright would orphan whatever is already on an installed
 * device. For the React Query cache that only costs a cold start, but the
 * OUTBOX holds writes the user made offline and has not synced yet — dropping
 * that key silently discards their data. So every read falls back to the
 * legacy key once, adopts the value under the new key, and deletes the old one.
 *
 * Safe to delete this shim (and the LEGACY_* constants) after a release or two,
 * once no install can still be carrying the old keys.
 */

export const OUTBOX_KEY = "zyron-outbox-v1";
export const RQ_CACHE_KEY = "zyron-rq-cache-v1";
export const onboardedKey = (userId: string) => `zyron-onboarded-${userId}`;

const LEGACY_OUTBOX_KEY = "hokage-outbox-v1";
const LEGACY_RQ_CACHE_KEY = "hokage-rq-cache-v1";
const legacyOnboardedKey = (userId: string) => `hokage-onboarded-${userId}`;

/**
 * Reads `key`; on a miss, adopts `legacyKey`'s value under the new name and
 * clears the old one. Returns null when neither exists.
 *
 * The adopt-and-clear is best-effort: if the write fails we still return the
 * value, so a storage hiccup degrades to "migrates again next launch" rather
 * than to data loss.
 */
async function readMigrating(key: string, legacyKey: string): Promise<string | null> {
  const current = await AsyncStorage.getItem(key);
  if (current != null) return current;

  const legacy = await AsyncStorage.getItem(legacyKey);
  if (legacy == null) return null;

  try {
    await AsyncStorage.setItem(key, legacy);
    await AsyncStorage.removeItem(legacyKey);
  } catch {}
  return legacy;
}

export const readOutbox = () => readMigrating(OUTBOX_KEY, LEGACY_OUTBOX_KEY);

export const readRqCache = () => readMigrating(RQ_CACHE_KEY, LEGACY_RQ_CACHE_KEY);

export const readOnboarded = (userId: string) =>
  readMigrating(onboardedKey(userId), legacyOnboardedKey(userId));

/**
 * AsyncStorage as the query persister expects it, with the legacy-key fallback
 * spliced into getItem. createAsyncStoragePersister takes a storage object
 * rather than exposing a migration hook, so this is where it has to go.
 */
export const persistStorage = {
  getItem: (key: string) =>
    key === RQ_CACHE_KEY ? readRqCache() : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};
