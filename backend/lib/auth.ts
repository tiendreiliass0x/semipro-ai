import { createHash } from 'crypto';
import type { Database } from 'bun:sqlite';

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
  getSessionByTokenHash: (hash: string) => any;
  revokeSessionByTokenHash: (hash: string) => boolean;
  touchSession: (id: string) => void;
};

export const createAuthHelpers = (deps: AuthHelperDeps) => {
  const getAuthContext = (req: Request) => {
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

    const session = deps.getSessionByTokenHash(hashToken(token));
    if (!session) return null;
    if (Number(session.expiresAt || 0) < Date.now()) {
      deps.revokeSessionByTokenHash(hashToken(token));
      return null;
    }
    if (String(session.userStatus || '') !== 'active' || String(session.accountStatus || '') !== 'active') {
      return null;
    }

    deps.touchSession(session.id);
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

  const verifyAccessKey = (req: Request): boolean => {
    return Boolean(getAuthContext(req));
  };

  const verifyAdminKey = (req: Request): boolean => {
    if (!deps.adminAccessKey) return false;
    const key = req.headers.get('x-admin-key') || new URL(req.url).searchParams.get('adminKey');
    return key === deps.adminAccessKey;
  };

  const getRequestAccountId = (req: Request): string | null => {
    const context = getAuthContext(req);
    return context?.accountId || null;
  };

  return { getAuthContext, verifyAccessKey, verifyAdminKey, getRequestAccountId };
};

export const createUploadOwnershipHelpers = (db: Database) => {
  const registerUploadOwnership = (args: { filename: string; accountId: string }) => {
    const filename = String(args.filename || '').trim();
    const accountId = String(args.accountId || '').trim();
    if (!filename || !accountId) return;
    const now = Date.now();
    db.query(`
      INSERT INTO account_uploads (filename, accountId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(filename) DO UPDATE SET accountId = excluded.accountId, updatedAt = excluded.updatedAt
    `).run(filename, accountId, now, now);
  };

  const getUploadOwnerAccountId = (filename: string): string | null => {
    const row = db.query('SELECT accountId FROM account_uploads WHERE filename = ?').get(filename) as { accountId?: string } | null;
    return row?.accountId ? String(row.accountId) : null;
  };

  return { registerUploadOwnership, getUploadOwnerAccountId };
};
