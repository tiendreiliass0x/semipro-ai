type AuthenticatedContext = {
  userId: string;
  accountId: string;
  sessionId: string;
  email: string;
  userName: string;
  accountName: string;
  accountSlug: string;
};

type AccountRouteArgs = {
  req: Request;
  pathname: string;
  method: string;
  corsHeaders: Record<string, string>;
  getAuthContext: (req: Request) => AuthenticatedContext | null;
  getAccountById: (id: string) => any;
  getAccountBySlug: (slug: string) => any;
  updateAccount: (accountId: string, patch: { name?: string; slug?: string }) => any;
};

const jsonHeaders = (corsHeaders: Record<string, string>) => ({ ...corsHeaders, 'Content-Type': 'application/json' });

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

const uniqueSlug = (desired: string, getAccountBySlug: (slug: string) => any, currentAccountId?: string) => {
  let base = toSlug(desired);
  if (!base) base = `workspace-${Date.now()}`;

  let candidate = base;
  let counter = 2;
  while (true) {
    const existing = getAccountBySlug(candidate);
    if (!existing || (currentAccountId && String(existing.id) === String(currentAccountId))) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
};

export const handleAccountRoutes = async (args: AccountRouteArgs): Promise<Response | null> => {
  const { req, pathname, method, corsHeaders, getAuthContext, getAccountById, getAccountBySlug, updateAccount } = args;

  if (pathname !== '/api/account') return null;

  const auth = getAuthContext(req);
  if (!auth?.accountId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
  }

  if (method === 'GET') {
    const account = getAccountById(auth.accountId);
    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }
    return new Response(JSON.stringify({
      account: {
        id: account.id,
        name: account.name,
        slug: account.slug,
        plan: account.plan,
        status: account.status,
      },
    }), { headers: jsonHeaders(corsHeaders) });
  }

  if (method === 'PATCH') {
    const account = getAccountById(auth.accountId);
    if (!account) {
      return new Response(JSON.stringify({ error: 'Account not found' }), { status: 404, headers: jsonHeaders(corsHeaders) });
    }

    const body = await req.json().catch(() => ({}));
    const nextName = typeof body?.name === 'string' ? body.name.trim() : '';
    const requestedSlug = typeof body?.slug === 'string' ? body.slug.trim() : '';

    if (!nextName) {
      return new Response(JSON.stringify({ error: 'name is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    const nextSlug = uniqueSlug(requestedSlug || nextName, getAccountBySlug, account.id);
    const updated = updateAccount(account.id, { name: nextName, slug: nextSlug });
    return new Response(JSON.stringify({
      success: true,
      account: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        plan: updated.plan,
        status: updated.status,
      },
    }), { headers: jsonHeaders(corsHeaders) });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders(corsHeaders) });
};
