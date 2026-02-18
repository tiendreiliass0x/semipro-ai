import { createHash } from 'crypto';

type AuthenticatedContext = {
  userId: string;
  accountId: string;
  sessionId: string;
  email: string;
  userName: string;
  accountName: string;
  accountSlug: string;
};

type AuthRouteArgs = {
  req: Request;
  pathname: string;
  method: string;
  corsHeaders: Record<string, string>;
  getUserByEmail: (email: string) => any;
  createUser: (args: { email: string; passwordHash: string; name?: string }) => any;
  getAccountBySlug: (slug: string) => any;
  createAccount: (args: { name: string; slug: string; plan?: string }) => any;
  addMembership: (args: { accountId: string; userId: string; role?: string }) => any;
  listUserMemberships: (userId: string) => any[];
  createSession: (args: { userId: string; accountId: string; tokenHash: string; expiresAt: number }) => any;
  revokeSessionByTokenHash: (tokenHash: string) => boolean;
  getAuthContext: (req: Request) => AuthenticatedContext | null;
};

const jsonHeaders = (corsHeaders: Record<string, string>) => ({ ...corsHeaders, 'Content-Type': 'application/json' });
const sessionTtlMs = 30 * 24 * 60 * 60 * 1000;

const toSlug = (input: string) => {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
};

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const issueSession = (args: {
  userId: string;
  accountId: string;
  createSession: (args: { userId: string; accountId: string; tokenHash: string; expiresAt: number }) => any;
}) => {
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  const tokenHash = hashToken(token);
  const expiresAt = Date.now() + sessionTtlMs;
  args.createSession({ userId: args.userId, accountId: args.accountId, tokenHash, expiresAt });
  return { token, expiresAt };
};

const toMembershipPayload = (memberships: any[]) => memberships.map(item => ({
  accountId: item.accountId,
  accountName: item.accountName,
  accountSlug: item.accountSlug,
  accountPlan: item.accountPlan,
  role: item.role,
}));

const resolveMembershipForLogin = (memberships: any[], accountSlug: string) => {
  if (!memberships.length) return null;
  if (!accountSlug) return memberships[0];
  return memberships.find(item => String(item.accountSlug).toLowerCase() === accountSlug) || null;
};

export const handleAuthRoutes = async (args: AuthRouteArgs): Promise<Response | null> => {
  const {
    req,
    pathname,
    method,
    corsHeaders,
    getUserByEmail,
    createUser,
    getAccountBySlug,
    createAccount,
    addMembership,
    listUserMemberships,
    createSession,
    revokeSessionByTokenHash,
    getAuthContext,
  } = args;

  if (pathname === '/api/auth/register' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const name = String(body?.name || '').trim();
    const accountName = String(body?.accountName || '').trim();

    if (!email || !password || !accountName) {
      return new Response(JSON.stringify({ error: 'email, password, and accountName are required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }
    if (password.length < 10) {
      return new Response(JSON.stringify({ error: 'password must be at least 10 characters' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const existingUser = getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'email already in use' }), { status: 409, headers: jsonHeaders(corsHeaders) });
    }

    let slug = toSlug(String(body?.accountSlug || accountName));
    if (!slug) slug = `team-${Date.now()}`;
    if (getAccountBySlug(slug)) {
      return new Response(JSON.stringify({ error: 'account slug already in use' }), { status: 409, headers: jsonHeaders(corsHeaders) });
    }

    const passwordHash = await Bun.password.hash(password);
    const user = createUser({ email, passwordHash, name: name || email.split('@')[0] });
    const account = createAccount({ name: accountName, slug, plan: 'free' });
    addMembership({ accountId: account.id, userId: user.id, role: 'owner' });

    const { token, expiresAt } = issueSession({ userId: user.id, accountId: account.id, createSession });
    return new Response(JSON.stringify({
      success: true,
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
      account: { id: account.id, name: account.name, slug: account.slug, plan: account.plan },
    }), { status: 201, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/auth/login' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    const accountSlug = String(body?.accountSlug || '').trim().toLowerCase();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email and password are required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const user = getUserByEmail(email);
    if (!user?.passwordHash) {
      return new Response(JSON.stringify({ error: 'invalid credentials' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    }

    const isValid = await Bun.password.verify(password, user.passwordHash);
    if (!isValid) {
      return new Response(JSON.stringify({ error: 'invalid credentials' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    }

    const memberships = listUserMemberships(user.id);
    if (!memberships.length) {
      return new Response(JSON.stringify({ error: 'no active account membership' }), { status: 403, headers: jsonHeaders(corsHeaders) });
    }

    const membership = resolveMembershipForLogin(memberships, accountSlug);

    if (!membership) {
      return new Response(JSON.stringify({ error: 'account not found for this user' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    const { token, expiresAt } = issueSession({ userId: user.id, accountId: membership.accountId, createSession });
    return new Response(JSON.stringify({
      success: true,
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
      account: { id: membership.accountId, name: membership.accountName, slug: membership.accountSlug, plan: membership.accountPlan },
      memberships: toMembershipPayload(memberships),
    }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/auth/google' && method === 'POST') {
    const body = await req.json().catch(() => ({}));
    const idToken = String(body?.idToken || '').trim();
    const requestedAccountSlug = toSlug(String(body?.accountSlug || ''));
    const requestedAccountName = String(body?.accountName || '').trim();

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'idToken is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const verifyResponse = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyResponse.ok) {
      return new Response(JSON.stringify({ error: 'Unable to verify Google token' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    }

    const tokenInfo = await verifyResponse.json() as any;
    const aud = String(tokenInfo?.aud || '');
    const email = String(tokenInfo?.email || '').trim().toLowerCase();
    const emailVerified = String(tokenInfo?.email_verified || '').toLowerCase() === 'true';
    const name = String(tokenInfo?.name || '').trim();

    if (!email || !emailVerified) {
      return new Response(JSON.stringify({ error: 'Google account email is not verified' }), { status: 403, headers: jsonHeaders(corsHeaders) });
    }
    if (GOOGLE_CLIENT_ID && aud !== GOOGLE_CLIENT_ID) {
      return new Response(JSON.stringify({ error: 'Google token audience mismatch' }), { status: 403, headers: jsonHeaders(corsHeaders) });
    }

    let user = getUserByEmail(email);
    if (!user) {
      const randomPasswordHash = await Bun.password.hash(crypto.randomUUID());
      user = createUser({ email, passwordHash: randomPasswordHash, name: name || email.split('@')[0] });
    }

    const memberships = listUserMemberships(user.id);
    let chosenMembership = resolveMembershipForLogin(memberships, requestedAccountSlug);

    if (!chosenMembership && requestedAccountSlug) {
      const account = getAccountBySlug(requestedAccountSlug);
      if (account) {
        return new Response(JSON.stringify({ error: 'You are not a member of that account' }), { status: 403, headers: jsonHeaders(corsHeaders) });
      }
    }

    if (!chosenMembership) {
      const accountName = requestedAccountName || `${name || email.split('@')[0]}'s workspace`;
      const slug = requestedAccountSlug || toSlug(accountName) || `team-${Date.now()}`;
      if (getAccountBySlug(slug)) {
        return new Response(JSON.stringify({ error: 'account slug already in use; choose another' }), { status: 409, headers: jsonHeaders(corsHeaders) });
      }
      const account = createAccount({ name: accountName, slug, plan: 'free' });
      addMembership({ accountId: account.id, userId: user.id, role: 'owner' });
      const reloadedMemberships = listUserMemberships(user.id);
      chosenMembership = resolveMembershipForLogin(reloadedMemberships, slug) || reloadedMemberships[0];
    }

    if (!chosenMembership) {
      return new Response(JSON.stringify({ error: 'No active account membership available' }), { status: 403, headers: jsonHeaders(corsHeaders) });
    }

    const finalMemberships = listUserMemberships(user.id);
    const { token, expiresAt } = issueSession({ userId: user.id, accountId: chosenMembership.accountId, createSession });
    return new Response(JSON.stringify({
      success: true,
      token,
      expiresAt,
      user: { id: user.id, email: user.email, name: user.name },
      account: {
        id: chosenMembership.accountId,
        name: chosenMembership.accountName,
        slug: chosenMembership.accountSlug,
        plan: chosenMembership.accountPlan,
      },
      memberships: toMembershipPayload(finalMemberships),
    }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/auth/logout' && method === 'POST') {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'bearer token required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    }
    const success = revokeSessionByTokenHash(hashToken(token));
    return new Response(JSON.stringify({ success }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const context = getAuthContext(req);
    if (!context) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    }

    const memberships = listUserMemberships(context.userId);
    return new Response(JSON.stringify({
      user: {
        id: context.userId,
        email: context.email,
        name: context.userName,
      },
      account: {
        id: context.accountId,
        name: context.accountName,
        slug: context.accountSlug,
      },
      memberships: toMembershipPayload(memberships),
    }), { headers: jsonHeaders(corsHeaders) });
  }

  return null;
};
