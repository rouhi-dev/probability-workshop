#!/usr/bin/env node
/**
 * Dependency-free static server for docs/, used for local development and by the
 * browser tests. Rebuilds on request when --watch is passed, so editing src/ and
 * reloading is the whole dev loop.
 *
 * Usage: node tools/serve.mjs [--port=8080] [--watch] [--root=docs]
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `=${d}`).split('=')[1];
const PORT = Number(arg('port', 8080));
const DIR = join(ROOT, arg('root', 'docs'));
const WATCH = process.argv.includes('--watch');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

export function serve(port = PORT, dir = DIR, watch = WATCH) {
  const server = createServer(async (req, res) => {
    if (watch && req.url === '/') {
      try { execFileSync(process.execPath, [join(ROOT, 'tools/build.mjs'), '--quiet'], { cwd: ROOT }); }
      catch (e) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('build failed\n' + e); }
    }
    const url = decodeURIComponent((req.url || '/').split('?')[0]);
    let rel = normalize(url).replace(/^(\.\.[/\\])+/, '');
    if (rel.endsWith('/')) rel += 'index.html';
    const file = join(dir, rel);
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end('forbidden'); }
    try {
      const s = await stat(file);
      if (!s.isFile()) throw new Error('not a file');
      const body = await readFile(file);
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] || 'application/octet-stream',
        'content-length': body.length,
        'cache-control': 'no-cache',
      });
      res.end(body);
    } catch {
      try {
        const body = await readFile(join(dir, '404.html'));
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end(body);
      } catch { res.writeHead(404); res.end('not found'); }
    }
  });
  return new Promise(resolve => server.listen(port, '127.0.0.1', () => resolve(server)));
}

if (import.meta.url === pathToFileURLSafe(process.argv[1])) {
  await serve();
  console.log(`serving ${DIR} on http://127.0.0.1:${PORT}${WATCH ? '  (rebuilds on /)' : ''}`);
}
function pathToFileURLSafe(p) { try { return new URL(`file://${p}`).href; } catch { return ''; } }
