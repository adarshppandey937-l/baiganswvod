import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

const UPSTREAM_BASE = 'https://sw-studybison.space-z.ai';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    const subPath = reqUrl.searchParams.get('__path') || '';
    reqUrl.searchParams.delete('__path');

    const queryString = reqUrl.searchParams.toString();
    const cleanSubPath = subPath.replace(/^\/+/, '');
    const targetUrl = `${UPSTREAM_BASE}/api/${cleanSubPath}${queryString ? `?${queryString}` : ''}`;

    const headers: Record<string, string> = {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      accept: String(req.headers.accept || '*/*'),
    };
    if (req.headers.range) {
      headers['range'] = String(req.headers.range);
    }

    const upstream = await fetch(targetUrl, {
      method: req.method === 'HEAD' ? 'GET' : req.method || 'GET',
      headers,
    });

    res.statusCode = upstream.status;

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
      if (!res.headersSent) res.statusCode = 502;
      res.end();
    });
    nodeStream.pipe(res);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        state: 'error',
        message: err instanceof Error ? err.message : 'Upstream proxy error',
      })
    );
  }
}
