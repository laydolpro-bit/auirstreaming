/**
 * auirstream - fonction Netlify : GET /api/catalog
 *
 * Le navigateur n'appelle JAMAIS TMDB directement : il passe par ce proxy.
 * La cle TMDB (TMDB_API_KEY) reste dans les variables privees de l'hebergeur.
 *
 * Exemple d'appel client :
 *   /api/catalog?path=/movie/550&language=fr-FR
 *   /api/catalog?path=/search/multi&query=dune&language=fr-FR&page=1
 *
 * La fonction est branchee sur /api/catalog par une redirection netlify.toml
 * (aucune redirection forcee : les fichiers statiques gardent la priorite).
 */
import { runCatalogRequest, cdnCacheHeaders } from '../../server/tmdb.mjs';

export const handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return json(405, { error: 'METHOD_NOT_ALLOWED', message: 'Seule la methode GET est autorisee.' }, { Allow: 'GET, HEAD' });
  }

  const params = event.queryStringParameters || {};
  const path = params.path;
  const forwarded = { ...params };
  delete forwarded.path;

  const clientIp =
    (event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'])) || 'anonymous';

  let result;
  try {
    result = await runCatalogRequest({
      path,
      params: forwarded,
      apiKey: process.env.TMDB_API_KEY,
      clientKey: String(clientIp).split(',')[0].trim(),
    });
  } catch (err) {
    result = {
      status: 500,
      body: {
        error: 'PROXY_FAILURE',
        message: 'Erreur interne du proxy catalogue. Reessayez dans un instant.',
      },
    };
  }

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Auirstream-Proxy': 'catalog',
    ...(result.headers || {}),
  };
  if (result.status === 200) {
    Object.assign(headers, cdnCacheHeaders(result.path, result.cacheTtlMs));
    headers['X-Catalog-Cache'] = result.cache || 'MISS';
  } else {
    headers['Cache-Control'] = 'no-store';
  }

  return json(result.status, result.body, headers);
};

function json(status, body, extraHeaders) {
  return {
    statusCode: status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(extraHeaders || {}) },
    body: JSON.stringify(body),
  };
}
