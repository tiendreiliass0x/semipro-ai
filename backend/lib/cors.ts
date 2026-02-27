export const resolveCorsOrigin = (requestOrigin: string | null): string => {
  const allowedOriginsEnv = process.env.CORS_ALLOWED_ORIGINS || '';
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (!allowedOriginsEnv.trim()) {
    return nodeEnv === 'production' ? '' : '*';
  }

  const allowedOrigins = allowedOriginsEnv
    .split(',')
    .map(o => o.trim().toLowerCase())
    .filter(Boolean);

  if (allowedOrigins.includes('*')) return '*';

  if (requestOrigin && allowedOrigins.includes(requestOrigin.toLowerCase())) {
    return requestOrigin;
  }

  return '';
};

export const buildCorsHeaders = (requestOrigin: string | null): Record<string, string> => {
  const origin = resolveCorsOrigin(requestOrigin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key',
  };
  if (origin && origin !== '*') {
    headers['Vary'] = 'Origin';
  }
  return headers;
};
