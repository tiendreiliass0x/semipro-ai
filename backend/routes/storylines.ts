type StorylinesRouteArgs = {
  req: Request;
  pathname: string;
  method: string;
  url: URL;
  corsHeaders: Record<string, string>;
  verifyAccessKey: (req: Request) => boolean;
  getRequestAccountId: (req: Request) => string | null;
  loadStorylines: (accountId?: string) => any[];
  saveStorylines: (data: any, accountId?: string) => boolean;
  validateStorylinesPayload: (storylines: any) => string[];
  generateStoryPackage: (storyline: any, prompt: string) => Promise<any>;
  generateStoryboardScene: (storyline: any, scene: any, prompt: string) => Promise<any>;
  listStorylinePackages: (storylineId: string, accountId?: string) => any[];
  getLatestStorylinePackage: (storylineId: string, accountId?: string) => any;
  saveStorylinePackage: (storylineId: string, payload: any, prompt: string, status?: string, accountId?: string) => any;
};

const jsonHeaders = (corsHeaders: Record<string, string>) => ({
  ...corsHeaders,
  'Content-Type': 'application/json',
});

export const handleStorylinesRoutes = async (args: StorylinesRouteArgs): Promise<Response | null> => {
  const {
    req,
    pathname,
    method,
    url,
    corsHeaders,
    verifyAccessKey,
    getRequestAccountId,
    loadStorylines,
    saveStorylines,
    validateStorylinesPayload,
    generateStoryPackage,
    generateStoryboardScene,
    listStorylinePackages,
    getLatestStorylinePackage,
    saveStorylinePackage,
  } = args;

  const requestAccountId = await getRequestAccountId(req);
  const scopeAccountId = requestAccountId || undefined;
  const canWrite = Boolean(requestAccountId) && await verifyAccessKey(req);

  if (pathname.startsWith('/api/storylines') && !requestAccountId) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/storylines' && method === 'GET') {
    return new Response(JSON.stringify(await loadStorylines(scopeAccountId)), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/storylines/generate' && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    const storyline = body.storyline;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    if (!storyline || typeof storyline !== 'object' || !Array.isArray(storyline.beats) || !storyline.beats.length) {
      return new Response(JSON.stringify({ error: 'Valid storyline payload is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    try {
      const result = await generateStoryPackage(storyline, prompt);
      const storylineId = String(storyline.id || 'unknown-storyline');
      const saved = await saveStorylinePackage(storylineId, result, prompt, 'draft', scopeAccountId);
      return new Response(JSON.stringify({ success: true, result, package: saved }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate story package';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname === '/api/storylines/scene/regenerate' && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    const storyline = body.storyline;
    const scene = body.scene;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';

    if (!storyline || !scene || typeof scene !== 'object') {
      return new Response(JSON.stringify({ error: 'storyline and scene are required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    try {
      const regeneratedScene = await generateStoryboardScene(storyline, scene, prompt);
      return new Response(JSON.stringify({ success: true, scene: regeneratedScene }), { headers: jsonHeaders(corsHeaders) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate scene';
      return new Response(JSON.stringify({ error: message }), { status: 502, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname === '/api/storylines/packages' && method === 'GET') {
    const storylineId = url.searchParams.get('storylineId');
    if (!storylineId) return new Response(JSON.stringify({ error: 'storylineId is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ items: await listStorylinePackages(storylineId, scopeAccountId) }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/storylines/package' && method === 'GET') {
    const storylineId = url.searchParams.get('storylineId');
    if (!storylineId) return new Response(JSON.stringify({ error: 'storylineId is required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    const item = await getLatestStorylinePackage(storylineId, scopeAccountId);
    return new Response(JSON.stringify({ item }), { headers: jsonHeaders(corsHeaders) });
  }

  if (pathname === '/api/storylines/package' && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    const storylineId = String(body.storylineId || '');
    const payload = body.payload;
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const status = typeof body.status === 'string' ? body.status : 'draft';

    if (!storylineId || !payload || typeof payload !== 'object') {
      return new Response(JSON.stringify({ error: 'storylineId and payload are required' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }

    try {
      const item = await saveStorylinePackage(storylineId, payload, prompt, status, scopeAccountId);
      return new Response(JSON.stringify({ success: true, item }), { headers: jsonHeaders(corsHeaders) });
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to save storyline package' }), { status: 500, headers: jsonHeaders(corsHeaders) });
    }
  }

  if (pathname === '/api/storylines' && method === 'POST') {
    if (!canWrite) return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: jsonHeaders(corsHeaders) });
    const body = await req.json();
    const storylines = Array.isArray(body) ? body : body.storylines;
    if (!Array.isArray(storylines)) return new Response(JSON.stringify({ error: 'Invalid storylines payload' }), { status: 400, headers: jsonHeaders(corsHeaders) });
    const validationErrors = validateStorylinesPayload(storylines);
    if (validationErrors.length) {
      return new Response(JSON.stringify({ error: 'Malformed storyline data', details: validationErrors }), { status: 400, headers: jsonHeaders(corsHeaders) });
    }
    const success = await saveStorylines(storylines, scopeAccountId);
    if (!success) return new Response(JSON.stringify({ error: 'Failed to save storylines' }), { status: 500, headers: jsonHeaders(corsHeaders) });
    return new Response(JSON.stringify({ success: true, count: storylines.length }), { headers: jsonHeaders(corsHeaders) });
  }

  return null;
};
