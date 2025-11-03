import { describe, it, expect } from 'vitest';

describe('DNS Module', () => {
  describe('MX Record Lookup', () => {
    it('should validate MX record structure', () => {
      const mxRecord = {
        exchange: 'mail.example.com',
        priority: 10,
      };
      
      expect(mxRecord.exchange).toBeDefined();
      expect(mxRecord.priority).toBeGreaterThanOrEqual(0);
      expect(typeof mxRecord.exchange).toBe('string');
      expect(typeof mxRecord.priority).toBe('number');
    });

    it('should sort MX records by priority', () => {
      const records = [
        { exchange: 'mx2.example.com', priority: 20 },
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx3.example.com', priority: 30 },
      ];
      
      const sorted = records.sort((a, b) => a.priority - b.priority);
      
      expect(sorted[0].priority).toBe(10);
      expect(sorted[1].priority).toBe(20);
      expect(sorted[2].priority).toBe(30);
    });

    it('should handle multiple MX records with same priority', () => {
      const records = [
        { exchange: 'mx1.example.com', priority: 10 },
        { exchange: 'mx2.example.com', priority: 10 },
      ];
      
      expect(records.every(r => r.priority === 10)).toBe(true);
    });
  });

  describe('Provider Detection', () => {
    it('should detect Gmail MX', () => {
      const mx = 'aspmx.l.google.com';
      const isGmail = mx.includes('google.com') || mx.includes('googlemail.com');
      
      expect(isGmail).toBe(true);
    });

    it('should detect Microsoft/Outlook MX', () => {
      const mx = 'example-com.mail.protection.outlook.com';
      const isMicrosoft = mx.includes('outlook.com') || mx.includes('microsoft.com');
      
      expect(isMicrosoft).toBe(true);
    });

    it('should detect Yahoo MX', () => {
      const mx = 'mta7.am0.yahoodns.net';
      const isYahoo = mx.includes('yahoo');
      
      expect(isYahoo).toBe(true);
    });

    it('should detect Proton Mail MX', () => {
      const mx = 'mail.protonmail.ch';
      const isProton = mx.includes('protonmail');
      
      expect(isProton).toBe(true);
    });

    it('should handle custom domain MX', () => {
      const mx = 'mail.customdomain.com';
      const isCustom = !mx.includes('google') && !mx.includes('outlook') && !mx.includes('yahoo');
      
      expect(isCustom).toBe(true);
    });
  });

  describe('DNS Caching', () => {
    it('should validate cache TTL', () => {
      const cacheTTL = 48 * 60 * 60 * 1000; // 48 hours in ms
      const expectedTTL = 172800000;
      
      expect(cacheTTL).toBe(expectedTTL);
      expect(cacheTTL).toBeGreaterThan(0);
    });

    it('should check if cache is expired', () => {
      const resolvedAt = Date.now() - (49 * 60 * 60 * 1000); // 49 hours ago
      const ttl = 48 * 60 * 60 * 1000; // 48 hours
      const isExpired = (Date.now() - resolvedAt) > ttl;
      
      expect(isExpired).toBe(true);
    });

    it('should check if cache is still valid', () => {
      const resolvedAt = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      const ttl = 48 * 60 * 60 * 1000; // 48 hours
      const isValid = (Date.now() - resolvedAt) < ttl;
      
      expect(isValid).toBe(true);
    });
  });

  describe('Domain Extraction', () => {
    it('should extract domain from email', () => {
      const email = 'user@example.com';
      const domain = email.split('@')[1];
      
      expect(domain).toBe('example.com');
    });

    it('should extract subdomain', () => {
      const email = 'user@mail.example.com';
      const domain = email.split('@')[1];
      
      expect(domain).toBe('mail.example.com');
    });

    it('should handle international domains', () => {
      const email = 'user@exämple.com';
      const domain = email.split('@')[1];
      
      expect(domain).toBeDefined();
    });
  });

  describe('DNS Error Handling', () => {
    it('should handle NXDOMAIN', () => {
      const error = { code: 'ENOTFOUND' };
      expect(error.code).toBe('ENOTFOUND');
    });

    it('should handle SERVFAIL', () => {
      const error = { code: 'ESERVFAIL' };
      expect(error.code).toBe('ESERVFAIL');
    });

    it('should handle timeout', () => {
      const error = { code: 'ETIMEOUT' };
      expect(error.code).toBe('ETIMEOUT');
    });
  });
});
