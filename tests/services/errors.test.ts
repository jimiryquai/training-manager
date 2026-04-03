import { describe, it, expect } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

describe('Error Handling - ServiceError & wrapDatabaseError', () => {
  describe('ServiceError class', () => {
    it('should have correct code and message', async () => {
      const result = await vitestInvoke<any>('test_createServiceError', {
        code: 'NOT_FOUND',
        message: 'Plan not found',
      });

      expect(result.name).toBe('ServiceError');
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Plan not found');
    });

    it('should support all error codes', async () => {
      const codes = ['NOT_FOUND', 'UNAUTHORIZED', 'VALIDATION_ERROR', 'DATABASE_ERROR'];
      for (const code of codes) {
        const result = await vitestInvoke<any>('test_createServiceError', {
          code,
          message: `Test ${code}`,
        });
        expect(result.code).toBe(code);
        expect(result.message).toBe(`Test ${code}`);
      }
    });

    it('should capture optional cause', async () => {
      const result = await vitestInvoke<any>('test_createServiceError', {
        code: 'DATABASE_ERROR',
        message: 'Query failed',
        cause: 'sqlite error',
      });

      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.cause).toBe('sqlite error');
    });

    it('should have undefined cause when not provided', async () => {
      const result = await vitestInvoke<any>('test_createServiceError', {
        code: 'NOT_FOUND',
        message: 'Not found',
      });

      expect(result.cause).toBeUndefined();
    });
  });

  describe('wrapDatabaseError', () => {
    it('should pass through successful operations unchanged', async () => {
      const result = await vitestInvoke<any>('test_wrapDatabaseError_success');
      expect(result).toBe(42);
    });

    it('should wrap unknown errors as DATABASE_ERROR ServiceError', async () => {
      const result = await vitestInvoke<any>('test_wrapDatabaseError_wrapsUnknown');

      expect(result.threw).toBe(true);
      expect(result.name).toBe('ServiceError');
      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.message).toBe('insertRecord failed');
      expect(result.causeMessage).toBe('sqlite: disk I/O error');
    });

    it('should pass through existing ServiceError unchanged', async () => {
      const result = await vitestInvoke<any>('test_wrapDatabaseError_passesThroughServiceError');

      expect(result.threw).toBe(true);
      expect(result.isSameObject).toBe(true);
      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Record not found');
    });

    it('should wrap non-Error throws as DATABASE_ERROR', async () => {
      const result = await vitestInvoke<any>('test_wrapDatabaseError_wrapsNonError');

      expect(result.threw).toBe(true);
      expect(result.code).toBe('DATABASE_ERROR');
      expect(result.cause).toBe('string error');
    });
  });

  describe('Service error behavior with real DB operations', () => {
    it('should return undefined for non-existent workout session', async () => {
      const result = await vitestInvoke<any>('test_getWorkoutSessionInvalid');
      expect(result).toBeUndefined();
    });
  });
});
