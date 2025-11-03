import sodium from 'libsodium-wrappers';

let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await sodium.ready;
    initialized = true;
  }
}

// Encryption key from environment or KMS
function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY not configured');
  }
  
  // Convert hex string to Uint8Array
  const key = new Uint8Array(
    keyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );
  
  if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error(`ENCRYPTION_KEY must be ${sodium.crypto_secretbox_KEYBYTES} bytes`);
  }
  
  return key;
}

/**
 * Encrypt data using libsodium secretbox (authenticated encryption)
 */
export async function encrypt(plaintext: string): Promise<Buffer> {
  await ensureInitialized();
  
  const key = getEncryptionKey();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const message = sodium.from_string(plaintext);
  
  const ciphertext = sodium.crypto_secretbox_easy(message, nonce, key);
  
  // Concatenate nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce);
  combined.set(ciphertext, nonce.length);
  
  return Buffer.from(combined);
}

/**
 * Decrypt data using libsodium secretbox
 */
export async function decrypt(encryptedBuffer: Buffer): Promise<string> {
  await ensureInitialized();
  
  const key = getEncryptionKey();
  const combined = new Uint8Array(encryptedBuffer);
  
  // Extract nonce and ciphertext
  const nonce = combined.slice(0, sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = combined.slice(sodium.crypto_secretbox_NONCEBYTES);
  
  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
  
  if (!decrypted) {
    throw new Error('Decryption failed');
  }
  
  return sodium.to_string(decrypted);
}

/**
 * Hash password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  const argon2 = await import('argon2');
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  const argon2 = await import('argon2');
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generate random token for CSRF, unsubscribe links, etc.
 */
export function generateToken(bytes: number = 32): string {
  return Buffer.from(sodium.randombytes_buf(bytes)).toString('hex');
}

/**
 * Generate DKIM key pair
 */
export async function generateDkimKeyPair(): Promise<{
  privateKey: string;
  publicKey: string;
}> {
  await ensureInitialized();
  
  const keyPair = sodium.crypto_sign_keypair();
  
  return {
    privateKey: sodium.to_base64(keyPair.privateKey),
    publicKey: sodium.to_base64(keyPair.publicKey),
  };
}
