import { describe, expect, test, beforeEach } from 'bun:test';
import { createTestDb, testGenerateId, resetIdCounter, type TestDb } from '../test-helpers/setupDb';
import { createAuthDb } from './auth';

describe('auth db', () => {
  let db: TestDb;
  let authDb: ReturnType<typeof createAuthDb>;

  beforeEach(async () => {
    resetIdCounter();
    db = await createTestDb();
    authDb = createAuthDb({ db: db as any, generateId: testGenerateId });
  });

  test('createUser and getUserByEmail', async () => {
    const user = await authDb.createUser({ email: 'alice@test.com', passwordHash: 'hash123', name: 'Alice' });
    expect(user.email).toBe('alice@test.com');
    expect(user.name).toBe('Alice');

    const found = await authDb.getUserByEmail('ALICE@test.com');
    expect(found?.id).toBe(user.id);
  });

  test('getUserByEmail returns null for non-existent email', async () => {
    expect(await authDb.getUserByEmail('nobody@test.com')).toBeNull();
  });

  test('createAccount and getAccountBySlug', async () => {
    const account = await authDb.createAccount({ name: 'Test Workspace', slug: 'test-ws' });
    expect(account.name).toBe('Test Workspace');
    expect(account.slug).toBe('test-ws');

    const found = await authDb.getAccountBySlug('test-ws');
    expect(found?.id).toBe(account.id);
  });

  test('addMembership creates and upserts', async () => {
    const user = await authDb.createUser({ email: 'bob@test.com', passwordHash: 'h' });
    const account = await authDb.createAccount({ name: 'WS', slug: 'ws' });

    const m1 = await authDb.addMembership({ accountId: account.id, userId: user.id, role: 'member' });
    expect(m1.role).toBe('member');

    const m2 = await authDb.addMembership({ accountId: account.id, userId: user.id, role: 'owner' });
    expect(m2.id).toBe(m1.id);
    expect(m2.role).toBe('owner');
  });

  test('listUserMemberships returns active memberships for active accounts', async () => {
    const user = await authDb.createUser({ email: 'carol@test.com', passwordHash: 'h' });
    const a1 = await authDb.createAccount({ name: 'A1', slug: 'a1' });
    const a2 = await authDb.createAccount({ name: 'A2', slug: 'a2' });
    await authDb.addMembership({ accountId: a1.id, userId: user.id });
    await authDb.addMembership({ accountId: a2.id, userId: user.id });

    const memberships = await authDb.listUserMemberships(user.id);
    expect(memberships.length).toBe(2);
    expect(memberships[0].accountName).toBe('A1');
  });

  test('createSession and getSessionByTokenHash', async () => {
    const user = await authDb.createUser({ email: 'dan@test.com', passwordHash: 'h' });
    const account = await authDb.createAccount({ name: 'WS', slug: 'ws2' });
    await authDb.addMembership({ accountId: account.id, userId: user.id });

    const session = await authDb.createSession({
      userId: user.id,
      accountId: account.id,
      tokenHash: 'abc123',
      expiresAt: Date.now() + 1000000,
    });
    expect(session.tokenHash).toBe('abc123');

    const found = await authDb.getSessionByTokenHash('abc123');
    expect(found?.userId).toBe(user.id);
    expect(found?.email).toBe('dan@test.com');
    expect(found?.accountName).toBe('WS');
  });

  test('touchSession updates lastSeenAt', async () => {
    const user = await authDb.createUser({ email: 'eve@test.com', passwordHash: 'h' });
    const account = await authDb.createAccount({ name: 'WS', slug: 'ws3' });
    const session = await authDb.createSession({
      userId: user.id,
      accountId: account.id,
      tokenHash: 'touch-test',
      expiresAt: Date.now() + 1000000,
    });

    const before = await authDb.getSessionByTokenHash('touch-test');
    await authDb.touchSession(session.id);
    const after = await authDb.getSessionByTokenHash('touch-test');
    expect(Number(after?.lastSeenAt)).toBeGreaterThanOrEqual(Number(before?.lastSeenAt));
  });

  test('revokeSessionByTokenHash deletes session', async () => {
    const user = await authDb.createUser({ email: 'frank@test.com', passwordHash: 'h' });
    const account = await authDb.createAccount({ name: 'WS', slug: 'ws4' });
    await authDb.createSession({
      userId: user.id,
      accountId: account.id,
      tokenHash: 'revoke-test',
      expiresAt: Date.now() + 1000000,
    });

    expect(await authDb.revokeSessionByTokenHash('revoke-test')).toBe(true);
    expect(await authDb.getSessionByTokenHash('revoke-test')).toBeNull();
    expect(await authDb.revokeSessionByTokenHash('nonexistent')).toBe(false);
  });

  test('revokeExpiredSessions removes only expired sessions', async () => {
    const user = await authDb.createUser({ email: 'grace@test.com', passwordHash: 'h' });
    const account = await authDb.createAccount({ name: 'WS', slug: 'ws5' });

    await authDb.createSession({
      userId: user.id,
      accountId: account.id,
      tokenHash: 'expired-one',
      expiresAt: Date.now() - 1000,
    });
    await authDb.createSession({
      userId: user.id,
      accountId: account.id,
      tokenHash: 'still-valid',
      expiresAt: Date.now() + 1000000,
    });

    const removed = await authDb.revokeExpiredSessions();
    expect(removed).toBe(1);
    expect(await authDb.getSessionByTokenHash('expired-one')).toBeNull();
    expect(await authDb.getSessionByTokenHash('still-valid')).not.toBeNull();
  });

  test('updateAccount changes name and slug', async () => {
    const account = await authDb.createAccount({ name: 'Old Name', slug: 'old-slug' });
    const updated = await authDb.updateAccount(account.id, { name: 'New Name', slug: 'new-slug' });
    expect(updated?.name).toBe('New Name');
    expect(updated?.slug).toBe('new-slug');
  });
});
