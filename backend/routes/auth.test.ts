import { describe, expect, test, beforeEach } from 'bun:test';
import { createTestDb, testGenerateId, resetIdCounter, type TestDb } from '../test-helpers/setupDb';
import { createAuthDb } from '../db/auth';
import { createAuthHelpers, hashToken } from '../lib/auth';
import { handleAuthRoutes } from './auth';

const buildAuthDeps = (db: TestDb) => {
  const authDb = createAuthDb({ db: db as any, generateId: testGenerateId });
  const { getAuthContext } = createAuthHelpers({
    adminAccessKey: '',
    getSessionByTokenHash: authDb.getSessionByTokenHash,
    revokeSessionByTokenHash: authDb.revokeSessionByTokenHash,
    touchSession: authDb.touchSession,
  });
  return { ...authDb, getAuthContext };
};

const jsonReq = (method: string, pathname: string, body?: any, headers?: Record<string, string>) => {
  const url = `http://localhost${pathname}`;
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', ...headers } };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init);
};

const corsHeaders = { 'Access-Control-Allow-Origin': '*' };

describe('auth routes', () => {
  let db: TestDb;
  let deps: ReturnType<typeof buildAuthDeps>;

  beforeEach(async () => {
    resetIdCounter();
    db = await createTestDb();
    deps = buildAuthDeps(db);
  });

  test('POST /api/auth/register creates user and returns token', async () => {
    const req = jsonReq('POST', '/api/auth/register', { email: 'new@test.com', password: 'longpassword123' });
    const res = await handleAuthRoutes({ req, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });
    expect(res?.status).toBe(201);
    const data = await res!.json() as any;
    expect(data.success).toBe(true);
    expect(data.token).toBeTruthy();
    expect(data.user.email).toBe('new@test.com');
    expect(data.account).toBeTruthy();
  });

  test('POST /api/auth/register rejects short password', async () => {
    const req = jsonReq('POST', '/api/auth/register', { email: 'short@test.com', password: '123' });
    const res = await handleAuthRoutes({ req, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });
    expect(res?.status).toBe(400);
  });

  test('POST /api/auth/register rejects duplicate email', async () => {
    const req1 = jsonReq('POST', '/api/auth/register', { email: 'dup@test.com', password: 'longpassword123' });
    await handleAuthRoutes({ req: req1, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });

    const req2 = jsonReq('POST', '/api/auth/register', { email: 'dup@test.com', password: 'longpassword456' });
    const res = await handleAuthRoutes({ req: req2, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });
    expect(res?.status).toBe(409);
  });

  test('POST /api/auth/login with valid credentials returns token', async () => {
    const regReq = jsonReq('POST', '/api/auth/register', { email: 'login@test.com', password: 'longpassword123' });
    await handleAuthRoutes({ req: regReq, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });

    const loginReq = jsonReq('POST', '/api/auth/login', { email: 'login@test.com', password: 'longpassword123' });
    const res = await handleAuthRoutes({ req: loginReq, pathname: '/api/auth/login', method: 'POST', corsHeaders, ...deps });
    expect(res?.status).toBe(200);
    const data = await res!.json() as any;
    expect(data.success).toBe(true);
    expect(data.token).toBeTruthy();
  });

  test('POST /api/auth/login with wrong password returns 401', async () => {
    const regReq = jsonReq('POST', '/api/auth/register', { email: 'wrong@test.com', password: 'longpassword123' });
    await handleAuthRoutes({ req: regReq, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });

    const loginReq = jsonReq('POST', '/api/auth/login', { email: 'wrong@test.com', password: 'wrongpassword999' });
    const res = await handleAuthRoutes({ req: loginReq, pathname: '/api/auth/login', method: 'POST', corsHeaders, ...deps });
    expect(res?.status).toBe(401);
  });

  test('POST /api/auth/logout revokes session', async () => {
    const regReq = jsonReq('POST', '/api/auth/register', { email: 'logout@test.com', password: 'longpassword123' });
    const regRes = await handleAuthRoutes({ req: regReq, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });
    const { token } = await regRes!.json() as any;

    const logoutReq = jsonReq('POST', '/api/auth/logout', undefined, { authorization: `Bearer ${token}` });
    const res = await handleAuthRoutes({ req: logoutReq, pathname: '/api/auth/logout', method: 'POST', corsHeaders, ...deps });
    expect(res?.status).toBe(200);
    const data = await res!.json() as any;
    expect(data.success).toBe(true);

    // Verify session is gone
    const session = await deps.getSessionByTokenHash(hashToken(token));
    expect(session).toBeNull();
  });

  test('GET /api/auth/me returns user info for valid session', async () => {
    const regReq = jsonReq('POST', '/api/auth/register', { email: 'me@test.com', password: 'longpassword123' });
    const regRes = await handleAuthRoutes({ req: regReq, pathname: '/api/auth/register', method: 'POST', corsHeaders, ...deps });
    const { token } = await regRes!.json() as any;

    const meReq = jsonReq('GET', '/api/auth/me', undefined, { authorization: `Bearer ${token}` });
    const res = await handleAuthRoutes({ req: meReq, pathname: '/api/auth/me', method: 'GET', corsHeaders, ...deps });
    expect(res?.status).toBe(200);
    const data = await res!.json() as any;
    expect(data.user.email).toBe('me@test.com');
  });

  test('GET /api/auth/me returns 401 for invalid token', async () => {
    const meReq = jsonReq('GET', '/api/auth/me', undefined, { authorization: 'Bearer bad-token' });
    const res = await handleAuthRoutes({ req: meReq, pathname: '/api/auth/me', method: 'GET', corsHeaders, ...deps });
    expect(res?.status).toBe(401);
  });

  test('returns null for unmatched routes', async () => {
    const req = jsonReq('GET', '/api/something-else');
    const res = await handleAuthRoutes({ req, pathname: '/api/something-else', method: 'GET', corsHeaders, ...deps });
    expect(res).toBeNull();
  });
});
