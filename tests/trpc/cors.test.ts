import { describe, it, expect } from 'vitest';
import { vitestInvoke } from 'rwsdk-community/test';

describe('CORS Handler Integration Tests', () => {
  describe('OPTIONS preflight', () => {
    it('should return 204 status for OPTIONS requests', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflight');

      expect(result.status).toBe(204);
    });

    it('should return Access-Control-Allow-Origin header', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflight');

      expect(result.headers['access-control-allow-origin']).toBe('*');
    });

    it('should return Access-Control-Allow-Methods header', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflight');

      expect(result.headers['access-control-allow-methods']).toBe('GET, POST');
    });

    it('should return Access-Control-Allow-Headers header', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflight');

      expect(result.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });

  describe('POST request CORS headers', () => {
    it('should return CORS headers on POST response', async () => {
      // POST to a tRPC procedure - using a simple healthcheck-style body
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsPostRequest', {
        body: JSON.stringify({}),
        contentType: 'application/json',
      });

      // Even if the procedure fails (401 unauthorized), CORS headers should be present
      expect(result.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include Access-Control-Allow-Methods on POST response', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsPostRequest', {
        body: JSON.stringify({}),
        contentType: 'application/json',
      });

      expect(result.headers['access-control-allow-methods']).toBe('GET, POST');
    });

    it('should include Access-Control-Allow-Headers on POST response', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsPostRequest', {
        body: JSON.stringify({}),
        contentType: 'application/json',
      });

      expect(result.headers['access-control-allow-headers']).toBe('Content-Type');
    });
  });

  describe('CORS header verification utility', () => {
    it('should validate correct CORS headers', async () => {
      const expectedHeaders = await vitestInvoke<Record<string, string>>('test_getExpectedCORSHeaders');
      
      const result = await vitestInvoke<{
        valid: boolean;
        errors: string[];
      }>('test_verifyCORSHeaders', {
        'access-control-allow-origin': expectedHeaders['Access-Control-Allow-Origin'],
        'access-control-allow-methods': expectedHeaders['Access-Control-Allow-Methods'],
        'access-control-allow-headers': expectedHeaders['Access-Control-Allow-Headers'],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing Access-Control-Allow-Origin', async () => {
      const result = await vitestInvoke<{
        valid: boolean;
        errors: string[];
      }>('test_verifyCORSHeaders', {
        'access-control-allow-methods': 'GET, POST',
        'access-control-allow-headers': 'Content-Type',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Access-Control-Allow-Origin');
    });

    it('should detect incorrect Access-Control-Allow-Methods', async () => {
      const result = await vitestInvoke<{
        valid: boolean;
        errors: string[];
      }>('test_verifyCORSHeaders', {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET', // Missing POST
        'access-control-allow-headers': 'Content-Type',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Access-Control-Allow-Methods'))).toBe(true);
    });
  });

  describe('Configurable CORS origin', () => {
    it('should use custom origin when allowedOrigin is provided', async () => {
      const customOrigin = 'https://example.com';
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflightWithCustomOrigin', {
        allowedOrigin: customOrigin,
      });

      expect(result.status).toBe(204);
      expect(result.headers['access-control-allow-origin']).toBe(customOrigin);
    });

    it('should support localhost origin for development', async () => {
      const localOrigin = 'http://localhost:3000';
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflightWithCustomOrigin', {
        allowedOrigin: localOrigin,
      });

      expect(result.headers['access-control-allow-origin']).toBe(localOrigin);
    });

    it('should return default * when no origin is specified', async () => {
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsOptionsPreflight');

      expect(result.headers['access-control-allow-origin']).toBe('*');
    });

    it('should include custom origin on POST response', async () => {
      const customOrigin = 'https://app.example.com';
      const result = await vitestInvoke<{
        status: number;
        headers: Record<string, string>;
      }>('test_corsPostRequest', {
        body: JSON.stringify({}),
        contentType: 'application/json',
        allowedOrigin: customOrigin,
      });

      expect(result.headers['access-control-allow-origin']).toBe(customOrigin);
    });
  });
});
