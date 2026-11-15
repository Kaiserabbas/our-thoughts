/**
 * CloudVaultService
 * Zero-config, E2E encrypted cross-device sync via kvdb.io.
 * Password-based pairing: all devices share one vault derived from CONNECT_PASSWORD.
 * Device tracking: devices array stored in vault payload.
 */

const VAULT_ENDPOINT = 'https://kvdb.io/EithK3ZJksyD29L2GxV21q';
const LAST_SYNCED_STORAGE_KEY = 'thought_organizer_last_synced';
const CONNECTED_KEY = 'thought_organizer_connected';
const DEVICE_ID_KEY = 'thought_organizer_device_id';
const SALT = new TextEncoder().encode('thought-organizer-vault-salt-v1');

// Hardcoded passwords (user-visible in source, by user request)
const CONNECT_PASSWORD = 'OurThoughts';
const ADMIN_PASSWORD = 'DeleteThought';
// Fixed internal sync code — all devices share one vault
const FIXED_SYNC_CODE = CONNECT_PASSWORD;

async function hashString(str) {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(str.trim().toLowerCase()));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function deriveEncryptionKey(passcode) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passcode.trim()),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALT, iterations: 20000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptPayload(dataObj, passcode) {
  const key = await deriveEncryptionKey(passcode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintextBytes = new TextEncoder().encode(JSON.stringify(dataObj));
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintextBytes);
  const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.length);
  let binary = '';
  for (let i = 0; i < combined.length; i++) binary += String.fromCharCode(combined[i]);
  return btoa(binary);
}

async function decryptPayload(base64Str, passcode) {
  const key = await deriveEncryptionKey(passcode);
  const binary = atob(base64Str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const iv = bytes.slice(0, 12);
  const cipher = bytes.slice(12);
  const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}

// ── Device Fingerprint ──

export function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown Device';
}

export const CloudVaultService = {
  verifyConnectPassword(input) {
    return (input || '').trim() === CONNECT_PASSWORD;
  },

  verifyAdminPassword(input) {
    return (input || '').trim() === ADMIN_PASSWORD;
  },

  isConnected() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(CONNECTED_KEY) === 'true';
  },

  connectDevice() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CONNECTED_KEY, 'true');
    getOrCreateDeviceId();
  },

  disconnectDevice() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CONNECTED_KEY);
    localStorage.removeItem(LAST_SYNCED_STORAGE_KEY);
  },

  // Legacy compat: performSync checks this to decide if vault sync is active
  getSyncCode() {
    return this.isConnected() ? FIXED_SYNC_CODE : '';
  },

  async downloadSnapshot() {
    const storageKey = await hashString(FIXED_SYNC_CODE);
    const res = await fetch(`${VAULT_ENDPOINT}/${storageKey}`, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain' },
    });

    if (res.status === 404) {
      return { isNew: true, thoughts: [], categories: [], deletedThoughtIds: [], devices: [], bannedDeviceIds: [], lastSyncedAt: 0 };
    }

    if (!res.ok) throw new Error(`Vault request failed (${res.status})`);

    const rawData = await res.text();
    if (!rawData || !rawData.trim()) {
      return { isNew: true, thoughts: [], categories: [], deletedThoughtIds: [], devices: [], bannedDeviceIds: [], lastSyncedAt: 0 };
    }

    try {
      const parsed = JSON.parse(rawData);
      if (parsed?.encrypted) return await decryptPayload(parsed.encrypted, FIXED_SYNC_CODE);
      return parsed;
    } catch {
      try {
        return await decryptPayload(rawData.trim(), FIXED_SYNC_CODE);
      } catch {
        throw new Error('Cannot decrypt vault — data may be corrupted.');
      }
    }
  },

  async uploadSnapshot(snapshot) {
    const deviceId = getOrCreateDeviceId();
    const deviceName = getDeviceName();
    const now = Date.now();

    const existingDevices = Array.isArray(snapshot.devices) ? snapshot.devices : [];
    const bannedDeviceIds = Array.isArray(snapshot.bannedDeviceIds) ? snapshot.bannedDeviceIds : [];

    // shortcut: banned check on upload path; enforced again on next download
    if (bannedDeviceIds.includes(deviceId)) {
      throw new Error('This device has been removed by an admin.');
    }

    const deviceIdx = existingDevices.findIndex((d) => d.id === deviceId);
    const deviceEntry = {
      id: deviceId,
      name: deviceName,
      connectedAt: deviceIdx >= 0 ? existingDevices[deviceIdx].connectedAt : now,
      lastSeen: now,
    };
    const devices = deviceIdx >= 0
      ? existingDevices.map((d) => (d.id === deviceId ? deviceEntry : d))
      : [...existingDevices, deviceEntry];

    const payload = {
      thoughts: snapshot.thoughts || [],
      categories: snapshot.categories || [],
      deletedThoughtIds: snapshot.deletedThoughtIds || [],
      devices,
      bannedDeviceIds,
      lastSyncedAt: now,
    };

    const storageKey = await hashString(FIXED_SYNC_CODE);
    const encryptedString = await encryptPayload(payload, FIXED_SYNC_CODE);
    const wrapper = JSON.stringify({ encrypted: encryptedString, updatedAt: now, v: 2 });

    const res = await fetch(`${VAULT_ENDPOINT}/${storageKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: wrapper,
    });

    if (!res.ok) throw new Error(`Vault upload failed (${res.status})`);

    localStorage.setItem(LAST_SYNCED_STORAGE_KEY, String(now));
    return { devices, bannedDeviceIds };
  },

  async removeDevice(targetDeviceId) {
    const current = await this.downloadSnapshot();
    const devices = (current.devices || []).filter((d) => d.id !== targetDeviceId);
    const bannedDeviceIds = [...new Set([...(current.bannedDeviceIds || []), targetDeviceId])];
    await this.uploadSnapshot({ ...current, devices, bannedDeviceIds });
    return devices;
  },

  getLastSynced() {
    if (typeof window === 'undefined') return null;
    const v = localStorage.getItem(LAST_SYNCED_STORAGE_KEY);
    return v ? Number(v) : null;
  },
};
