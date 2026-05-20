// Simple local static server. Run: node serve.js
// Open http://localhost:8000
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ico':  'image/x-icon',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8'
};

http.createServer((req, res) => {
  let pathname = decodeURIComponent(url.parse(req.url).pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(ROOT, pathname);

  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const total = stat.size;
    const range = req.headers.range;

    // Range requests (needed for <video> seeking)
    if (range && (ext === '.mp4' || ext === '.webm' || ext === '.mp3')) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      const start = m && m[1] ? parseInt(m[1], 10) : 0;
      const end = m && m[2] ? parseInt(m[2], 10) : total - 1;
      const chunk = end - start + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunk,
        'Content-Type': type
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': total,
        'Content-Type': type,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}).listen(PORT, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`Open  http://localhost:${PORT}`);
});
