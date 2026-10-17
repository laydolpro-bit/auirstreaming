import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { runCatalogRequest, cdnCacheHeaders } from './server/tmdb.mjs';

/**
 * Serveur local du catalogue.
 *
 * En production, /api/catalog est servi par la fonction Netlify
 * (netlify/functions/catalog.mjs). En developpement (`npm run dev`) et en
 * previsualisation du build (`npm run preview`), le meme module serveur est
 * monte dans Vite : le catalogue fonctionne donc immediatement en local,
 * sans attendre la publication du domaine.
 *
 * La cle TMDB vient de .env (variable non prefixee VITE_), elle reste dans le
 * processus Node : elle n'est jamais envoyee au navigateur ni incluse au bundle.
 */
function localApiPlugin(env) {
  const middleware = () => async (req, res, next) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return next();

    if (url.pathname === '/api/config') {
      const smartlink = sanitizeUrl(env.NETWORK_SMARTLINK_URL);
      sendJson(res, 200, {
        siteName: 'auirstream',
        smartlink: { enabled: Boolean(smartlink), url: smartlink },
        push: { zoneId: '3231865', enabled: true },
        player: { provider: 'fluxora', embedPath: '/embed/zenix', origin: 'https://fluxora.sbs' },
      });
      return;
    }

    if (url.pathname !== '/api/catalog') {
      sendJson(res, 404, { error: 'NOT_FOUND', message: 'Route API inconnue.' });
      return;
    }

    const params = Object.fromEntries(url.searchParams.entries());
    const path = params.path;
    delete params.path;

    const result = await runCatalogRequest({
      path,
      params,
      apiKey: env.TMDB_API_KEY || process.env.TMDB_API_KEY,
      clientKey: 'local-dev',
    });

    const headers = { 'X-Auirstream-Proxy': 'catalog', ...(result.headers || {}) };
    if (result.status === 200) {
      Object.assign(headers, cdnCacheHeaders(result.path, result.cacheTtlMs));
      headers['X-Catalog-Cache'] = result.cache || 'MISS';
    } else {
      headers['Cache-Control'] = 'no-store';
    }
    sendJson(res, result.status, result.body, headers);
  };

  return {
    name: 'auirstream-local-api',
    configureServer(server) {
      server.middlewares.use(middleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware());
    },
  };
}

function sendJson(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(body));
}

function sanitizeUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(trimmed)) return '';
  try {
    return new URL(trimmed).toString();
  } catch {
    return '';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), localApiPlugin(env)],
    base: '/',
    server: { port: 5173, open: false },
    preview: { port: 4173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'es2020',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    // Aucune variable non VITE_ n'est injectee dans le bundle client.
    envPrefix: 'VITE_',
  };
});
