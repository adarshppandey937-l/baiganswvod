import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const UPSTREAM_BASE = 'https://sw-studybison.space-z.ai';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createApp() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isDevLifecycle =
    process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'dev';

  const distCandidates = [
    path.resolve(__dirname, 'dist'),
    path.resolve(process.cwd(), 'dist'),
  ];
  const distDir = distCandidates.find((dir) =>
    fs.existsSync(path.join(dir, 'index.html'))
  );

  app.use('/api', async (req, res) => {
    try {
      const targetUrl = `${UPSTREAM_BASE}/api${req.url}`;
      const headers: Record<string, string> = {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        accept: req.headers.accept || '*/*',
      };
      if (req.headers.range) {
        headers['range'] = String(req.headers.range);
      }

      const upstream = await fetch(targetUrl, {
        method: req.method === 'HEAD' ? 'GET' : req.method,
        headers,
      });

      res.status(upstream.status);

      const passthroughHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'content-disposition',
        'cache-control',
      ];
      for (const h of passthroughHeaders) {
        const val = upstream.headers.get(h);
        if (val) res.setHeader(h, val);
      }
      res.setHeader('access-control-allow-origin', '*');

      if (!upstream.body || req.method === 'HEAD') {
        res.end();
        return;
      }

      const nodeStream = Readable.fromWeb(
        upstream.body as Parameters<typeof Readable.fromWeb>[0]
      );
      nodeStream.on('error', () => {
        if (!res.headersSent) res.status(502);
        res.end();
      });
      nodeStream.pipe(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upstream proxy error';
      res.status(502).json({ state: 'error', message });
    }
  });

  if (!isDevLifecycle && distDir) {
    app.use(express.static(distDir, { index: 'index.html' }));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PANDEY JI server listening on http://0.0.0.0:${port}`);
  });
}

createApp();
