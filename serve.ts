// Copper Fox — a tiny static server for local testing only. Serves game/ on
// port 8080 using the Node standard library, and nothing else.
// Run: node serve.ts   then open http://localhost:8080/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./game/', import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = createServer(async (request, response) => {
  const path = request.url === '/' ? 'index.html' : decodeURIComponent(request.url.split('?')[0]).replace(/^\/+/, '');
  try {
    const body = await readFile(join(root, path));
    response.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found\n');
  }
});

server.listen(8080, () => {
  console.log('Copper Fox serving game/ at http://localhost:8080/');
});
