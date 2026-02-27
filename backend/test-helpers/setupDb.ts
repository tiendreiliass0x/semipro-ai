import { Database } from 'bun:sqlite';
import { initializeSchema } from '../data/schema';
import { createAuthDb } from '../db/auth';
import { createHash } from 'crypto';

export const createTestDb = () => {
  const db = new Database(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  initializeSchema(db);
  return db;
};

let idCounter = 0;

export const resetIdCounter = () => { idCounter = 0; };

export const testGenerateId = () => `test-id-${++idCounter}`;

export const seedTestUser = (db: Database, overrides?: { email?: string; password?: string }) => {
  const email = overrides?.email || 'test@example.com';
  const password = overrides?.password || 'test-password-123';
  const authDb = createAuthDb({ db, generateId: testGenerateId });

  const passwordHash = `hashed-${password}`;
  const user = authDb.createUser({ email, passwordHash, name: email.split('@')[0] });
  const account = authDb.createAccount({ name: 'Test Workspace', slug: 'test-workspace' });
  authDb.addMembership({ accountId: account.id, userId: user.id, role: 'owner' });

  const token = 'test-token-' + Date.now();
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  authDb.createSession({ userId: user.id, accountId: account.id, tokenHash, expiresAt });

  return { user, account, token, tokenHash, authDb };
};
