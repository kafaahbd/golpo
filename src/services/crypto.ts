import type { EncryptedMessage, KeyPair } from '@/types';

// ─── Key Generation ─────────────────────────────────────────────────────────
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true,
    ['encrypt', 'decrypt'],
  );
}

export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('spki', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPublicKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'spki', raw.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['encrypt'],
  );
}

export async function exportPrivateKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('pkcs8', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importPrivateKey(b64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8', raw.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false, ['decrypt'],
  );
}

// ─── AES key ───────────────────────────────────────────────────────────────
async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

// ─── Encrypt Message ────────────────────────────────────────────────────────
export async function encryptMessage(
  plaintext: string,
  recipientPublicKey: CryptoKey,
): Promise<string> {
  try {
    const aesKey = await generateAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt plaintext with AES
    const encoder = new TextEncoder();
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encoder.encode(plaintext),
    );

    // Export + encrypt AES key with recipient's RSA public key
    const rawAes = await crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      recipientPublicKey,
      rawAes,
    );

    const payload: EncryptedMessage = {
      encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
      iv: btoa(String.fromCharCode(...iv)),
      ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    };

    return JSON.stringify(payload);
  } catch {
    // Fallback: store as plaintext marker if crypto fails (e.g., recipient has no public key)
    return JSON.stringify({ plaintext });
  }
}

// ─── Decrypt Message ────────────────────────────────────────────────────────
export async function decryptMessage(
  encryptedJson: string,
  privateKey?: CryptoKey,
): Promise<string> {
  if (!encryptedJson) return '';

  // Plain text (no JSON) — return as-is
  if (!encryptedJson.startsWith('{')) return encryptedJson;

  try {
    const parsed = JSON.parse(encryptedJson);

    // ✅ Plaintext format — always readable by everyone
    if (parsed.plaintext !== undefined) return parsed.plaintext;

    // RSA+AES encrypted format — needs private key
    if (parsed.encryptedKey && parsed.iv && parsed.ciphertext) {
      if (!privateKey) {
        return '🔒 Encrypted message (key not available)';
      }
      try {
        const encKeyBuf   = Uint8Array.from(atob(parsed.encryptedKey), (c) => c.charCodeAt(0));
        const ivBuf       = Uint8Array.from(atob(parsed.iv),           (c) => c.charCodeAt(0));
        const cipherBuf   = Uint8Array.from(atob(parsed.ciphertext),   (c) => c.charCodeAt(0));

        const rawAes = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encKeyBuf);
        const aesKey = await crypto.subtle.importKey('raw', rawAes, { name: 'AES-GCM' }, false, ['decrypt']);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: ivBuf }, aesKey, cipherBuf);
        return new TextDecoder().decode(decrypted);
      } catch {
        // Decryption failed — key mismatch (message sent before key rotation)
        return '🔒 Encrypted (old message)';
      }
    }

    // Unknown format — show raw if short, otherwise generic label
    return encryptedJson.length < 100 ? encryptedJson : '🔒 Encrypted message';
  } catch {
    // JSON parse failed
    return encryptedJson.length < 200 ? encryptedJson : '🔒 Encrypted message';
  }
}

// ─── Key Storage (IndexedDB) ────────────────────────────────────────────────
const DB_NAME = 'golpo_crypto';
const STORE = 'keys';

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function storeKeyPair(userId: string, keyPair: CryptoKeyPair): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ publicKey: keyPair.publicKey, privateKey: keyPair.privateKey }, userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadKeyPair(userId: string): Promise<CryptoKeyPair | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(userId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearKeyPair(userId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(userId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Init user crypto ───────────────────────────────────────────────────────
export async function initUserCrypto(userId: string): Promise<{ publicKeyB64: string; keyPair: CryptoKeyPair }> {
  // Try to load existing keys
  let keyPair = await loadKeyPair(userId);

  if (!keyPair) {
    keyPair = await generateKeyPair();
    await storeKeyPair(userId, keyPair);
  }

  const publicKeyB64 = await exportPublicKey(keyPair.publicKey);
  return { publicKeyB64, keyPair };
}
