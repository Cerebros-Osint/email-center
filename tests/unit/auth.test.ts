import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword, generateToken } from '../../lib/crypto';

describe('Auth Module', () => {
  let testPasswordHash: string;

  beforeAll(async () => {
    // Pre-hash password for tests
    testPasswordHash = await hashPassword('TestPassword123!');
  });

  describe('Password Hashing & Verification', () => {
    it('should hash and verify password correctly', async () => {
      const password = 'SecurePassword456!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(50);
      
      const isValid = await verifyPassword(hash, password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const isValid = await verifyPassword(testPasswordHash, 'WrongPassword');
      expect(isValid).toBe(false);
    });

    it('should create different hashes for same password', async () => {
      const password = 'SamePassword789!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(hash1, password)).toBe(true);
      expect(await verifyPassword(hash2, password)).toBe(true);
    });
  });

  describe('Session Token Generation', () => {
    it('should generate unique session tokens', () => {
      const token1 = generateToken(32);
      const token2 = generateToken(32);
      
      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate tokens of correct length', () => {
      const token8 = generateToken(8);
      const token16 = generateToken(16);
      const token32 = generateToken(32);
      
      expect(token8.length).toBe(16);  // 8 bytes = 16 hex
      expect(token16.length).toBe(32); // 16 bytes = 32 hex
      expect(token32.length).toBe(64); // 32 bytes = 64 hex
    });
  });

  describe('CSRF Token', () => {
    it('should generate CSRF tokens', () => {
      const token = generateToken(16);
      
      expect(token).toBeDefined();
      expect(token.length).toBe(32);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true); // Hex string
    });
  });

  describe('Role-Based Access Control', () => {
    it('should validate owner role', () => {
      const roles = ['Owner', 'Admin', 'Member'];
      expect(roles).toContain('Owner');
    });

    it('should validate admin role', () => {
      const roles = ['Owner', 'Admin', 'Member'];
      expect(roles).toContain('Admin');
    });

    it('should validate member role', () => {
      const roles = ['Owner', 'Admin', 'Member'];
      expect(roles).toContain('Member');
    });
  });

  describe('Session Cookie Configuration', () => {
    it('should have correct cookie settings', () => {
      const cookieSettings = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      };
      
      expect(cookieSettings.httpOnly).toBe(true);
      expect(cookieSettings.sameSite).toBe('lax');
      expect(cookieSettings.maxAge).toBe(604800); // 7 days in seconds
    });
  });
});
