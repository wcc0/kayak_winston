const http = require('http');
const { URL } = require('url');

const TARGET = process.env.LLM_TARGET || 'http://host.docker.internal:11434';
const PORT = Number(process.env.PORT || 8002);

const server = http.createServer((req, res) => {
  try {
    const targetBase = new URL(TARGET);
    const targetUrl = new URL(req.url, targetBase);

    const options = {
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: req.headers,
    };

    const proxyLib = targetUrl.protocol === 'https:' ? require('https') : require('http');
    const proxyReq = proxyLib.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Proxy error: ' + err.message);
    });

    req.pipe(proxyReq, { end: true });
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy internal error: ' + err.message);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LLM proxy listening on http://0.0.0.0:${PORT} -> ${TARGET}`);
});

process.on('SIGINT', () => process.exit());
