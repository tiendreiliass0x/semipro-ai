import { eq, and, asc, lt, sql } from 'drizzle-orm';
import type { Database } from '../data/database';
import {
  users,
  accounts,
  accountMemberships,
  userSessions,
} from '../data/drizzle-schema';

type CreateAuthDbArgs = {
  db: Database;
  generateId: () => string;
};

export const createAuthDb = ({ db, generateId }: CreateAuthDbArgs) => {
  const getUserByEmail = async (email: string) => {
    const [row] = await db
      .select()
      .from(users)
      .where(and(eq(sql`lower(${users.email})`, email.toLowerCase()), eq(users.status, 'active')));
    return row ?? null;
  };

  const getUserById = async (id: string) => {
    const [row] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, id));
    return row ?? null;
  };

  const createUser = async (args: { email: string; passwordHash: string; name?: string }) => {
    const now = Date.now();
    const id = generateId();
    await db.insert(users).values({
      id,
      email: args.email.trim().toLowerCase(),
      passwordHash: args.passwordHash,
      name: String(args.name || '').trim(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return getUserById(id);
  };

  const getAccountById = async (id: string) => {
    const [row] = await db.select().from(accounts).where(eq(accounts.id, id));
    return row ?? null;
  };

  const getAccountBySlug = async (slug: string) => {
    const [row] = await db.select().from(accounts).where(eq(accounts.slug, slug));
    return row ?? null;
  };

  const createAccount = async (args: { name: string; slug: string; plan?: string }) => {
    const now = Date.now();
    const id = generateId();
    await db.insert(accounts).values({
      id,
      name: args.name.trim(),
      slug: args.slug.trim().toLowerCase(),
      plan: args.plan || 'free',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    return getAccountById(id);
  };

  const updateAccount = async (accountId: string, patch: { name?: string; slug?: string }) => {
    const existing = await getAccountById(accountId);
    if (!existing) return null;
    const now = Date.now();
    const nextName = typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : String(existing.name || '').trim();
    const nextSlug = typeof patch.slug === 'string' && patch.slug.trim() ? patch.slug.trim().toLowerCase() : String(existing.slug || '').trim().toLowerCase();
    await db
      .update(accounts)
      .set({ name: nextName, slug: nextSlug, updatedAt: now })
      .where(eq(accounts.id, accountId));
    return getAccountById(accountId);
  };

  const addMembership = async (args: { accountId: string; userId: string; role?: string }) => {
    const now = Date.now();
    const [existing] = await db
      .select()
      .from(accountMemberships)
      .where(and(eq(accountMemberships.accountId, args.accountId), eq(accountMemberships.userId, args.userId)));

    if (existing) {
      await db
        .update(accountMemberships)
        .set({ role: args.role || existing.role || 'member', status: 'active', updatedAt: now })
        .where(eq(accountMemberships.id, existing.id));
      const [updated] = await db.select().from(accountMemberships).where(eq(accountMemberships.id, existing.id));
      return updated ?? null;
    }

    const id = generateId();
    await db.insert(accountMemberships).values({
      id,
      accountId: args.accountId,
      userId: args.userId,
      role: args.role || 'member',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    const [row] = await db.select().from(accountMemberships).where(eq(accountMemberships.id, id));
    return row ?? null;
  };

  const listUserMemberships = async (userId: string) => {
    return db
      .select({
        id: accountMemberships.id,
        accountId: accountMemberships.accountId,
        userId: accountMemberships.userId,
        role: accountMemberships.role,
        status: accountMemberships.status,
        createdAt: accountMemberships.createdAt,
        updatedAt: accountMemberships.updatedAt,
        accountName: accounts.name,
        accountSlug: accounts.slug,
        accountPlan: accounts.plan,
      })
      .from(accountMemberships)
      .innerJoin(accounts, eq(accounts.id, accountMemberships.accountId))
      .where(
        and(
          eq(accountMemberships.userId, userId),
          eq(accountMemberships.status, 'active'),
          eq(accounts.status, 'active'),
        ),
      )
      .orderBy(asc(accountMemberships.createdAt));
  };

  const createSession = async (args: { userId: string; accountId: string; tokenHash: string; expiresAt: number }) => {
    const now = Date.now();
    const id = generateId();
    await db.insert(userSessions).values({
      id,
      userId: args.userId,
      accountId: args.accountId,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      createdAt: now,
      lastSeenAt: now,
    });
    const [row] = await db.select().from(userSessions).where(eq(userSessions.id, id));
    return row ?? null;
  };

  const getSessionByTokenHash = async (tokenHash: string) => {
    const [row] = await db
      .select({
        id: userSessions.id,
        userId: userSessions.userId,
        accountId: userSessions.accountId,
        tokenHash: userSessions.tokenHash,
        expiresAt: userSessions.expiresAt,
        createdAt: userSessions.createdAt,
        lastSeenAt: userSessions.lastSeenAt,
        email: users.email,
        userName: users.name,
        userStatus: users.status,
        accountName: accounts.name,
        accountSlug: accounts.slug,
        accountStatus: accounts.status,
      })
      .from(userSessions)
      .innerJoin(users, eq(users.id, userSessions.userId))
      .innerJoin(accounts, eq(accounts.id, userSessions.accountId))
      .where(eq(userSessions.tokenHash, tokenHash))
      .limit(1);
    return row ?? null;
  };

  const touchSession = async (id: string) => {
    await db
      .update(userSessions)
      .set({ lastSeenAt: Date.now() })
      .where(eq(userSessions.id, id));
  };

  const revokeSessionByTokenHash = async (tokenHash: string) => {
    const deleted = await db
      .delete(userSessions)
      .where(eq(userSessions.tokenHash, tokenHash))
      .returning();
    return deleted.length > 0;
  };

  const revokeExpiredSessions = async () => {
    const deleted = await db
      .delete(userSessions)
      .where(lt(userSessions.expiresAt, Date.now()))
      .returning();
    return deleted.length;
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
