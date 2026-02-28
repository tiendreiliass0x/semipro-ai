import { createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import type { Database } from '../data/database';
import { accountUploads } from '../data/drizzle-schema';

export const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

export const generateId = (): string => crypto.randomUUID();

export const getUploadFilenameFromUrl = (rawUrl: string): string | null => {
  if (!rawUrl.startsWith('/uploads/')) return null;
  const [withoutQuery] = rawUrl.split('?');
  const parts = withoutQuery.split('/').filter(Boolean);
  const filename = parts[parts.length - 1] || '';
  return filename.trim() ? filename : null;
};

type AuthHelperDeps = {
  adminAccessKey: string;
  getSessionByTokenHash: (hash: string) => Promise<any>;
  revokeSessionByTokenHash: (hash: string) => Promise<boolean>;
  touchSession: (id: string) => Promise<void>;
};

export const createAuthHelpers = (deps: AuthHelperDeps) => {
  const getAuthContext = async (req: Request) => {
    const authHeader = req.headers.get('authorization') || '';
    const pathname = new URL(req.url).pathname;
    let token = '';
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (pathname.startsWith('/uploads/')) {
      const tokenFromQuery = new URL(req.url).searchParams.get('token') || '';
      token = tokenFromQuery.trim();
    }
    if (!token) return null;

    const session = await deps.getSessionByTokenHash(hashToken(token));
    if (!session) return null;
    if (Number(session.expiresAt || 0) < Date.now()) {
      await deps.revokeSessionByTokenHash(hashToken(token));
      return null;
    }
    if (String(session.userStatus || '') !== 'active' || String(session.accountStatus || '') !== 'active') {
      return null;
    }

    await deps.touchSession(session.id);
    return {
      sessionId: String(session.id),
      userId: String(session.userId),
      accountId: String(session.accountId),
      email: String(session.email || ''),
      userName: String(session.userName || ''),
      accountName: String(session.accountName || ''),
      accountSlug: String(session.accountSlug || ''),
    };
  };

  const verifyAccessKey = async (req: Request): Promise<boolean> => {
    return Boolean(await getAuthContext(req));
  };

  const verifyAdminKey = (req: Request): boolean => {
    if (!deps.adminAccessKey) return false;
    const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('adminKey');
    return key === deps.adminAccessKey;
  };

  const getRequestAccountId = async (req: Request): Promise<string | null> => {
    const context = await getAuthContext(req);
    return context?.accountId || null;
  };

  return { getAuthContext, verifyAccessKey, verifyAdminKey, getRequestAccountId };
};

export const createUploadOwnershipHelpers = (db: Database) => {
  const registerUploadOwnership = async (args: { filename: string; accountId: string }) => {
    const filename = String(args.filename || '').trim();
    const accountId = String(args.accountId || '').trim();
    if (!filename || !accountId) return;
    const now = Date.now();
    await db
      .insert(accountUploads)
      .values({ filename, accountId, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: accountUploads.filename,
        set: { accountId, updatedAt: now },
      });
  };

  const getUploadOwnerAccountId = async (filename: string): Promise<string | null> => {
    const [row] = await db
      .select({ accountId: accountUploads.accountId })
      .from(accountUploads)
      .where(eq(accountUploads.filename, filename));
    return row?.accountId ? String(row.accountId) : null;
  };

  return { registerUploadOwnership, getUploadOwnerAccountId };
};
