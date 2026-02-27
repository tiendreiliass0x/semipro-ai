import { describe, expect, test, beforeEach } from 'bun:test';
import { resolveCorsOrigin, buildCorsHeaders } from './cors';

describe('CORS origin resolution', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    delete process.env.NODE_ENV;
  });

  test('returns * in development when no env set', () => {
    process.env.NODE_ENV = 'development';
    expect(resolveCorsOrigin('https://example.com')).toBe('*');
  });

  test('returns empty string in production when no env set', () => {
    process.env.NODE_ENV = 'production';
    expect(resolveCorsOrigin('https://example.com')).toBe('');
  });

  test('matches exact origin from comma-separated list', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com, https://staging.example.com';
    expect(resolveCorsOrigin('https://app.example.com')).toBe('https://app.example.com');
    expect(resolveCorsOrigin('https://staging.example.com')).toBe('https://staging.example.com');
  });

  test('rejects origin not in list', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';
    expect(resolveCorsOrigin('https://evil.com')).toBe('');
    expect(resolveCorsOrigin(null)).toBe('');
  });

  test('wildcard in CORS_ALLOWED_ORIGINS allows all', () => {
    process.env.CORS_ALLOWED_ORIGINS = '*';
    expect(resolveCorsOrigin('https://anything.com')).toBe('*');
  });

  test('buildCorsHeaders adds Vary when origin is specific', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://app.example.com';
    const headers = buildCorsHeaders('https://app.example.com');
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.example.com');
    expect(headers['Vary']).toBe('Origin');
  });

  test('buildCorsHeaders does not add Vary for wildcard', () => {
    process.env.NODE_ENV = 'development';
    const headers = buildCorsHeaders(null);
    expect(headers['Access-Control-Allow-Origin']).toBe('*');
    expect(headers['Vary']).toBeUndefined();
  });
});
