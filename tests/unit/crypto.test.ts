import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword, generateToken, encrypt, decrypt } from '../../lib/crypto';

describe('Crypto Module', () => {
  beforeAll(() => {
    // Set encryption key for tests
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  describe('Password Hashing', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, password);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(hash, 'WrongPassword');
      
      expect(isValid).toBe(false);
    });

    it('should create different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Token Generation', () => {
    it('should generate token of correct length', () => {
      const token = generateToken(32);
      
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateToken(16);
      const token2 = generateToken(16);
      
      expect(token1).not.toBe(token2);
    });

    it('should generate token with custom length', () => {
      const token8 = generateToken(8);
      const token16 = generateToken(16);
      
      expect(token8.length).toBe(16); // 8 bytes = 16 hex
      expect(token16.length).toBe(32); // 16 bytes = 32 hex
    });
  });

  describe('Encryption/Decryption', () => {
    it('should encrypt and decrypt text', async () => {
      const plaintext = 'Secret SMTP password 123!';
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext each time', async () => {
      const plaintext = 'Same secret';
      const encrypted1 = await encrypt(plaintext);
      const encrypted2 = await encrypt(plaintext);
      
      expect(encrypted1).not.toEqual(encrypted2);
    });

    it('should handle special characters', async () => {
      const plaintext = 'Password with émojis 🔒 and spëcial chârs!';
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', async () => {
      const plaintext = '';
      const encrypted = await encrypt(plaintext);
      const decrypted = await decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should fail with tampered ciphertext', async () => {
      const plaintext = 'Secret data';
      const encrypted = await encrypt(plaintext);
      
      // Tamper with the encrypted data
      const tampered = Buffer.from(encrypted);
      tampered[20] = tampered[20] ^ 0xFF; // Flip bits
      
      await expect(decrypt(tampered)).rejects.toThrow();
    });
  });
});
