import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isRoleEmail,
  extractDomain,
  loginSchema,
  identitySchema,
  messageSchema,
  smtpAccountSchema,
} from '../../lib/validator';

describe('Validator Module', () => {
  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true);
      expect(isValidEmail('admin@subdomain.example.com')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('missing@domain')).toBe(false);
      expect(isValidEmail('@nodomain.com')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });

  describe('Role Email Detection', () => {
    it('should detect role-based emails', () => {
      expect(isRoleEmail('admin@example.com')).toBe(true);
      expect(isRoleEmail('abuse@example.com')).toBe(true);
      expect(isRoleEmail('postmaster@example.com')).toBe(true);
      expect(isRoleEmail('noreply@example.com')).toBe(true);
      expect(isRoleEmail('support@example.com')).toBe(true);
      expect(isRoleEmail('info@example.com')).toBe(true);
    });

    it('should not flag normal emails as role-based', () => {
      expect(isRoleEmail('john.doe@example.com')).toBe(false);
      expect(isRoleEmail('contact.person@example.com')).toBe(false);
      expect(isRoleEmail('user123@example.com')).toBe(false);
    });
  });

  describe('Domain Extraction', () => {
    it('should extract domain from email', () => {
      expect(extractDomain('user@example.com')).toBe('example.com');
      expect(extractDomain('admin@subdomain.example.org')).toBe('subdomain.example.org');
      expect(extractDomain('test@localhost')).toBe('localhost');
    });

    it('should return empty for invalid emails', () => {
      expect(extractDomain('invalid')).toBe('');
      expect(extractDomain('@nodomain.com')).toBe('');
      expect(extractDomain('')).toBe('');
    });
  });

  describe('Login Schema', () => {
    it('should validate correct login data', () => {
      const result = loginSchema.safeParse({
        email: 'admin@acme.com',
        password: 'password123',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = loginSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        email: 'admin@acme.com',
        password: '',
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Identity Schema', () => {
    it('should validate correct identity data', () => {
      const result = identitySchema.safeParse({
        displayName: 'Support Team',
        fromEmail: 'support@acme.com',
        defaultSmtpAccountId: '123e4567-e89b-12d3-a456-426614174000',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = identitySchema.safeParse({
        displayName: 'Support Team',
        fromEmail: 'invalid',
        defaultSmtpAccountId: '123e4567-e89b-12d3-a456-426614174000',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const result = identitySchema.safeParse({
        displayName: 'Support Team',
        fromEmail: 'support@acme.com',
        defaultSmtpAccountId: 'not-a-uuid',
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('Message Schema', () => {
    it('should validate correct message data', () => {
      const result = messageSchema.safeParse({
        identityId: '123e4567-e89b-12d3-a456-426614174000',
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Test Subject',
        bodyHtml: '<p>Test body</p>',
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject empty recipients', () => {
      const result = messageSchema.safeParse({
        identityId: '123e4567-e89b-12d3-a456-426614174000',
        recipients: [],
        subject: 'Test Subject',
        bodyHtml: '<p>Test body</p>',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject empty subject', () => {
      const result = messageSchema.safeParse({
        identityId: '123e4567-e89b-12d3-a456-426614174000',
        recipients: ['user@example.com'],
        subject: '',
        bodyHtml: '<p>Test body</p>',
      });
      
      expect(result.success).toBe(false);
    });
  });

  describe('SMTP Account Schema', () => {
    it('should validate correct SMTP data', () => {
      const result = smtpAccountSchema.safeParse({
        provider: 'AWS SES',
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        username: 'AKIAIOSFODNN7EXAMPLE',
        password: 'secret-password',
        fromEmail: 'noreply@acme.com',
        rateLimitPerMin: 14,
      });
      
      expect(result.success).toBe(true);
    });

    it('should reject invalid port', () => {
      const result = smtpAccountSchema.safeParse({
        provider: 'AWS SES',
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 99999,
        username: 'AKIAIOSFODNN7EXAMPLE',
        password: 'secret-password',
        fromEmail: 'noreply@acme.com',
      });
      
      expect(result.success).toBe(false);
    });

    it('should reject negative rate limit', () => {
      const result = smtpAccountSchema.safeParse({
        provider: 'AWS SES',
        host: 'email-smtp.us-east-1.amazonaws.com',
        port: 587,
        username: 'AKIAIOSFODNN7EXAMPLE',
        password: 'secret-password',
        fromEmail: 'noreply@acme.com',
        rateLimitPerMin: -5,
      });
      
      expect(result.success).toBe(false);
    });
  });
});
