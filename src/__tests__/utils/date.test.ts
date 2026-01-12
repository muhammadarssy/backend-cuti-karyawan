import { describe, it, expect } from '@jest/globals';
import { calculateWorkingDays, calculateTotalDays, validateDateRange } from '../../utils/date.js';

describe('Date Utils', () => {
  describe('calculateWorkingDays', () => {
    it('should calculate working days correctly (Mon-Fri)', () => {
      const start = new Date('2026-02-02'); // Monday
      const end = new Date('2026-02-06'); // Friday

      const workingDays = calculateWorkingDays(start, end);

      expect(workingDays).toBe(5); // Mon, Tue, Wed, Thu, Fri
    });

    it('should exclude weekends', () => {
      const start = new Date('2026-02-02'); // Monday
      const end = new Date('2026-02-08'); // Sunday

      const workingDays = calculateWorkingDays(start, end);

      expect(workingDays).toBe(5); // Mon-Fri only
    });

    it('should return 1 for same day', () => {
      const start = new Date('2026-02-02'); // Monday
      const end = new Date('2026-02-02');

      const workingDays = calculateWorkingDays(start, end);

      expect(workingDays).toBe(1);
    });
  });

  describe('calculateTotalDays', () => {
    it('should calculate total days including weekends', () => {
      const start = new Date('2026-02-02');
      const end = new Date('2026-02-08');

      const totalDays = calculateTotalDays(start, end);

      expect(totalDays).toBe(7);
    });

    it('should return 1 for same day', () => {
      const start = new Date('2026-02-02');
      const end = new Date('2026-02-02');

      const totalDays = calculateTotalDays(start, end);

      expect(totalDays).toBe(1);
    });
  });

  describe('validateDateRange', () => {
    it('should return true for valid range', () => {
      const start = new Date('2026-02-01');
      const end = new Date('2026-02-05');

      expect(validateDateRange(start, end)).toBe(true);
    });

    it('should return true for same date', () => {
      const date = new Date('2026-02-01');

      expect(validateDateRange(date, date)).toBe(true);
    });

    it('should return false for invalid range', () => {
      const start = new Date('2026-02-05');
      const end = new Date('2026-02-01');

      expect(validateDateRange(start, end)).toBe(false);
    });
  });
});
