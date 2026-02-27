import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { BullMqQueueHandle } from './queueWorker';

type StartBullBoardArgs = {
  adminAccessKey: string;
  port: number;
  basePath?: string;
  queues: BullMqQueueHandle[];
  onLog?: (message: string) => void;
};

const DARK_CSS = `
  :root { color-scheme: dark; }
  html, body, #root { background: #0b1220 !important; color: #e5e7eb !important; }
  a { color: #93c5fd !important; }
  button, input, select, textarea {
    background: #111827 !important;
    color: #e5e7eb !important;
    border-color: #334155 !important;
  }
  table, th, td, thead, tbody, tr {
    background: #0f172a !important;
    color: #e5e7eb !important;
    border-color: #334155 !important;
  }
  div, section, aside, main, article, header, nav, footer {
    border-color: #334155 !important;
  }
`;

const injectDarkModeHtml = (basePath: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const originalSend = res.send.bind(res);
  res.send = ((body?: any) => {
    const contentType = String(res.getHeader('content-type') || '');
    const acceptsHtml = req.path === '/' || req.path === '' || req.path.endsWith('.html');
    if (typeof body === 'string' && (contentType.includes('text/html') || acceptsHtml)) {
      body = body.includes('</head>')
        ? body.replace('</head>', `<style>${DARK_CSS}</style></head>`)
        : `<style>${DARK_CSS}</style>${body}`;
    }
    return originalSend(body);
  }) as express.Response['send'];
  next();
};

const requireAdminKey = (adminAccessKey: string) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const keyFromHeader = String(req.headers['x-admin-key'] || '').trim();
  const keyFromQuery = String(req.query.adminKey || '').trim();
  const key = keyFromHeader || keyFromQuery;
  if (!adminAccessKey || key !== adminAccessKey) {
    res.status(401).json({ error: 'Admin key required' });
    return;
  }
  next();
};

export const startBullBoard = (args: StartBullBoardArgs) => {
  const log = args.onLog ?? (() => null);
  if (!args.adminAccessKey) {
    log('[queue] Bull Board disabled: ADMIN_ACCESS_KEY is not configured');
    return null;
  }

  const basePath = String(args.basePath || '/admin/queues/board').trim() || '/admin/queues/board';
  const app = express();
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(basePath);

  createBullBoard({
    queues: args.queues.map(queue => new BullMQAdapter(queue)),
    serverAdapter,
    options: {
      uiConfig: {
        boardTitle: 'YenengaLabs BullMQ Dashboard',
        environment: {
          label: 'Dark Mode',
          color: '#111827',
        },
      },
    },
  });

  app.use(basePath, requireAdminKey(args.adminAccessKey));
  app.use(basePath, injectDarkModeHtml(basePath));
  app.use(basePath, serverAdapter.getRouter());

  const server = app.listen(args.port, () => {
    log(`[queue] Bull Board listening on http://localhost:${args.port}${basePath}`);
  });

  server.on('error', error => {
    const message = error instanceof Error ? error.message : 'unknown error';
    log(`[queue] Bull Board failed to start: ${message}`);
  });

  return {
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close(error => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
};

