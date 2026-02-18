import type { Database } from 'bun:sqlite';

type CreateAuthDbArgs = {
  db: Database;
  generateId: () => string;
};

export const createAuthDb = ({ db, generateId }: CreateAuthDbArgs) => {
  const getUserByEmail = (email: string) => {
    return db.query('SELECT * FROM users WHERE lower(email) = lower(?) AND status = ?').get(email, 'active') as any;
  };

  const getUserById = (id: string) => {
    return db.query('SELECT id, email, name, status, createdAt, updatedAt FROM users WHERE id = ?').get(id) as any;
  };

  const createUser = (args: { email: string; passwordHash: string; name?: string }) => {
    const now = Date.now();
    const id = generateId();
    db.query(`
      INSERT INTO users (id, email, passwordHash, name, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, args.email.trim().toLowerCase(), args.passwordHash, String(args.name || '').trim(), 'active', now, now);
    return getUserById(id);
  };

  const getAccountById = (id: string) => {
    return db.query('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  };

  const getAccountBySlug = (slug: string) => {
    return db.query('SELECT * FROM accounts WHERE slug = ?').get(slug) as any;
  };

  const createAccount = (args: { name: string; slug: string; plan?: string }) => {
    const now = Date.now();
    const id = generateId();
    db.query(`
      INSERT INTO accounts (id, name, slug, plan, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, args.name.trim(), args.slug.trim().toLowerCase(), args.plan || 'free', 'active', now, now);
    return getAccountById(id);
  };

  const updateAccount = (accountId: string, patch: { name?: string; slug?: string }) => {
    const existing = getAccountById(accountId);
    if (!existing) return null;
    const now = Date.now();
    const nextName = typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : String(existing.name || '').trim();
    const nextSlug = typeof patch.slug === 'string' && patch.slug.trim() ? patch.slug.trim().toLowerCase() : String(existing.slug || '').trim().toLowerCase();
    db.query('UPDATE accounts SET name = ?, slug = ?, updatedAt = ? WHERE id = ?').run(nextName, nextSlug, now, accountId);
    return getAccountById(accountId);
  };

  const addMembership = (args: { accountId: string; userId: string; role?: string }) => {
    const now = Date.now();
    const existing = db.query('SELECT * FROM account_memberships WHERE accountId = ? AND userId = ?').get(args.accountId, args.userId) as any;
    if (existing) {
      db.query('UPDATE account_memberships SET role = ?, status = ?, updatedAt = ? WHERE id = ?').run(args.role || existing.role || 'member', 'active', now, existing.id);
      return db.query('SELECT * FROM account_memberships WHERE id = ?').get(existing.id) as any;
    }

    const id = generateId();
    db.query(`
      INSERT INTO account_memberships (id, accountId, userId, role, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, args.accountId, args.userId, args.role || 'member', 'active', now, now);
    return db.query('SELECT * FROM account_memberships WHERE id = ?').get(id) as any;
  };

  const listUserMemberships = (userId: string) => {
    return db.query(`
      SELECT m.id, m.accountId, m.userId, m.role, m.status, m.createdAt, m.updatedAt,
             a.name as accountName, a.slug as accountSlug, a.plan as accountPlan
      FROM account_memberships m
      JOIN accounts a ON a.id = m.accountId
      WHERE m.userId = ? AND m.status = 'active' AND a.status = 'active'
      ORDER BY m.createdAt ASC
    `).all(userId) as any[];
  };

  const createSession = (args: { userId: string; accountId: string; tokenHash: string; expiresAt: number }) => {
    const now = Date.now();
    const id = generateId();
    db.query(`
      INSERT INTO user_sessions (id, userId, accountId, tokenHash, expiresAt, createdAt, lastSeenAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, args.userId, args.accountId, args.tokenHash, args.expiresAt, now, now);
    return db.query('SELECT * FROM user_sessions WHERE id = ?').get(id) as any;
  };

  const getSessionByTokenHash = (tokenHash: string) => {
    return db.query(`
      SELECT s.*, u.email, u.name as userName, u.status as userStatus, a.name as accountName, a.slug as accountSlug, a.status as accountStatus
      FROM user_sessions s
      JOIN users u ON u.id = s.userId
      JOIN accounts a ON a.id = s.accountId
      WHERE s.tokenHash = ?
      LIMIT 1
    `).get(tokenHash) as any;
  };

  const touchSession = (id: string) => {
    db.query('UPDATE user_sessions SET lastSeenAt = ? WHERE id = ?').run(Date.now(), id);
  };

  const revokeSessionByTokenHash = (tokenHash: string) => {
    const result = db.query('DELETE FROM user_sessions WHERE tokenHash = ?').run(tokenHash) as { changes?: number };
    return Number(result?.changes || 0) > 0;
  };

  const revokeExpiredSessions = () => {
    const result = db.query('DELETE FROM user_sessions WHERE expiresAt < ?').run(Date.now()) as { changes?: number };
    return Number(result?.changes || 0);
  };

  return {
    getUserByEmail,
    getUserById,
    createUser,
    getAccountById,
    getAccountBySlug,
    createAccount,
    updateAccount,
    addMembership,
    listUserMemberships,
    createSession,
    getSessionByTokenHash,
    touchSession,
    revokeSessionByTokenHash,
    revokeExpiredSessions,
  };
};
