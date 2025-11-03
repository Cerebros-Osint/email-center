import { describe, it, expect } from 'vitest';
import { calculateBackoff } from '../../lib/routing';

describe('Routing Module', () => {
  describe('Backoff Calculation', () => {
    it('should calculate backoff with exponential growth', () => {
      const backoff0 = calculateBackoff(0, 1000);
      const backoff1 = calculateBackoff(1, 1000);
      const backoff2 = calculateBackoff(2, 1000);
      const backoff3 = calculateBackoff(3, 1000);
      
      // Should grow exponentially
      expect(backoff1).toBeGreaterThan(backoff0);
      expect(backoff2).toBeGreaterThan(backoff1);
      expect(backoff3).toBeGreaterThan(backoff2);
    });

    it('should include jitter (randomness)', () => {
      const delays = new Set();
      
      // Generate 10 delays for same attempt
      for (let i = 0; i < 10; i++) {
        delays.add(calculateBackoff(2, 1000));
      }
      
      // Should have multiple different values due to jitter
      expect(delays.size).toBeGreaterThan(1);
    });

    it('should respect maximum delay of 60s', () => {
      const backoff10 = calculateBackoff(10, 1000);
      const backoff20 = calculateBackoff(20, 1000);
      
      expect(backoff10).toBeLessThanOrEqual(60000);
      expect(backoff20).toBeLessThanOrEqual(60000);
    });

    it('should use custom base delay', () => {
      const backoff1_base100 = calculateBackoff(1, 100);
      const backoff1_base5000 = calculateBackoff(1, 5000);
      
      expect(backoff1_base5000).toBeGreaterThan(backoff1_base100);
    });

    it('should return reasonable delay for first attempt', () => {
      const backoff0 = calculateBackoff(0, 1000);
      
      // First attempt should be close to base (800-1200ms with jitter)
      expect(backoff0).toBeGreaterThanOrEqual(800);
      expect(backoff0).toBeLessThanOrEqual(1500);
    });

    it('should always return positive integer', () => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const backoff = calculateBackoff(attempt, 500);
        
        expect(backoff).toBeGreaterThan(0);
        expect(Number.isInteger(backoff)).toBe(true);
      }
    });
  });
});
