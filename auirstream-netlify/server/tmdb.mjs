/**
 * auirstream - logique du proxy catalogue TMDB (cote serveur uniquement).
 *
 * Ce module est partage par :
 *   - la fonction Netlify  netlify/functions/catalog.mjs  (production)
 *   - le middleware de dev Vite (vite.config.js)          (npm run dev)
 *
 * Regles de securite appliquees ici :
 *   - la cle TMDB n'est JAMAIS renvoyee au navigateur ni journalisee ;
 *   - seuls les chemins de l'API TMDB "metadonnees" sont autorises ;
 *   - les URLs arbitraires, les traversees de chemin et les parametres
 *     inconnus sont refuses avant tout appel reseau ;
 *   - cache memoire limite + cache CDN, limitation de debit, gestion 429/503.
 */

/** Racines de chemins TMDB autorisees (et leurs sous-chemins de metadonnees). */
export const ALLOWED_PATH_ROOTS = [
  'movie',
  'tv',
  'search',
  'discover',
  'trending',
  'genre',
  'configuration',
];

/** Sous-ressources explicitement autorisees (sous-chemins de metadonnees). */
const ALLOWED_TAILS = [
  'credits',
  'videos',
  'images',
  'similar',
  'recommendations',
  'external_ids',
  'translations',
  'release_dates',
  'content_ratings',
  'keywords',
  'reviews',
  'watch',
  'providers',
  'season',
  'episode',
  'list',
  'languages',
  'countries',
  'jobs',
  'timezones',
  'primary_translations',
  'all',
  'day',
  'week',
  'movie',
  'tv',
  'multi',
  'person',
  'company',
  'network',
  'collection',
  'popular',
  'top_rated',
  'now_playing',
  'upcoming',
  'airing_today',
  'on_the_air',
  'latest',
];

/**
 * Parametres de requete autorises vers TMDB.
 * Toute autre cle => 400 (aucun parametre inconnu transmis a TMDB).
 */
export const ALLOWED_QUERY_PARAMS = {
  language: { pattern: /^[a-zA-Z]{2}(-[a-zA-Z]{2})?$/, maxLength: 8 },
  page: { pattern: /^\d{1,4}$/, maxLength: 4 },
  query: { pattern: /^[\s\S]{1,120}$/, maxLength: 120 },
  region: { pattern: /^[A-Za-z]{2}$/, maxLength: 2 },
  year: { pattern: /^\d{4}$/, maxLength: 4 },
  primary_release_year: { pattern: /^\d{4}$/, maxLength: 4 },
  first_air_date_year: { pattern: /^\d{4}$/, maxLength: 4 },
  include_adult: { pattern: /^(true|false)$/, maxLength: 5 },
  sort_by: { pattern: /^[a-zA-Z0-9_.]{1,40}$/, maxLength: 40 },
  with_genres: { pattern: /^[\d|,]{1,40}$/, maxLength: 40 },
  without_genres: { pattern: /^[\d|,]{1,40}$/, maxLength: 40 },
  with_original_language: { pattern: /^[a-zA-Z]{2}$/, maxLength: 2 },
  with_networks: { pattern: /^[\d|,]{1,40}$/, maxLength: 40 },
  with_companies: { pattern: /^[\d|,]{1,40}$/, maxLength: 40 },
  with_keywords: { pattern: /^[\d|,]{1,40}$/, maxLength: 40 },
  vote_average_gte: { tmdb: 'vote_average.gte', pattern: /^\d{1,3}(\.\d{1,2})?$/, maxLength: 6 },
  vote_count_gte: { tmdb: 'vote_count.gte', pattern: /^\d{1,7}$/, maxLength: 7 },
  'vote_average.gte': { pattern: /^\d{1,3}(\.\d{1,2})?$/, maxLength: 6 },
  'vote_count.gte': { pattern: /^\d{1,7}$/, maxLength: 7 },
  'primary_release_date.gte': { pattern: /^\d{4}-\d{2}-\d{2}$/, maxLength: 10 },
  'primary_release_date.lte': { pattern: /^\d{4}-\d{2}-\d{2}$/, maxLength: 10 },
  'first_air_date.gte': { pattern: /^\d{4}-\d{2}-\d{2}$/, maxLength: 10 },
  'first_air_date.lte': { pattern: /^\d{4}-\d{2}-\d{2}$/, maxLength: 10 },
  time_window: { pattern: /^(day|week)$/, maxLength: 4 },
  media_type: { pattern: /^(all|movie|tv|person)$/, maxLength: 6 },
  append_to_response: { pattern: /^[a-z_]{1,60}(,[a-z_]{1,60})*$/, maxLength: 120 },
  watch_region: { pattern: /^[A-Za-z]{2}$/, maxLength: 2 },
};

export class ProxyError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Valide le chemin TMDB demande.
 * Refuse : URLs absolues, schema, traversee de chemin, double slash,
 * caracteres encodes, segments exotiques, profondeur excessive.
 */
export function validateTmdbPath(rawPath) {
  if (typeof rawPath !== 'string' || rawPath.length === 0) {
    throw new ProxyError(400, 'MISSING_PATH', "Le parametre « path » est obligatoire.");
  }
  if (rawPath.length > 160) {
    throw new ProxyError(400, 'PATH_TOO_LONG', 'Chemin trop long.');
  }
  if (rawPath.includes('%') || rawPath.includes('\\') || rawPath.includes('://') || rawPath.includes('..')) {
    throw new ProxyError(400, 'PATH_REJECTED', 'Chemin refuse (URL absolue, traversee ou encodage non autorise).');
  }
  if (!rawPath.startsWith('/')) {
    throw new ProxyError(400, 'PATH_REJECTED', 'Le chemin doit commencer par « / ».');
  }
  if (rawPath.endsWith('/')) {
    rawPath = rawPath.slice(0, -1);
  }
  const segments = rawPath.split('/').slice(1);
  if (segments.length === 0 || segments.length > 6) {
    throw new ProxyError(400, 'PATH_REJECTED', 'Profondeur de chemin refusee.');
  }
  for (const segment of segments) {
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(segment)) {
      throw new ProxyError(400, 'PATH_REJECTED', 'Segment de chemin non autorise.');
    }
  }
  const root = segments[0].toLowerCase();
  if (!ALLOWED_PATH_ROOTS.includes(root)) {
    throw new ProxyError(
      403,
      'PATH_NOT_ALLOWED',
      `Chemin non autorise. Racines acceptees : ${ALLOWED_PATH_ROOTS.map((r) => '/' + r).join(', ')}.`,
    );
  }
  // Les sous-chemins (au-dela de l'identifiant) doivent etre connus.
  for (let i = 1; i < segments.length; i += 1) {
    const seg = segments[i].toLowerCase();
    const isId = /^\d{1,12}$/.test(seg);
    const isTail = ALLOWED_TAILS.includes(seg);
    const isSequelNumber = /^(season|episode)$/i.test(segments[i - 1] || '') && /^\d{1,4}$/.test(seg);
    if (!isId && !isTail && !isSequelNumber) {
      throw new ProxyError(400, 'PATH_REJECTED', `Sous-chemin non autorise : « ${segmentOf(segments, i)} ».`);
    }
  }
  if (segments.length === 1 && root !== 'trending' && root !== 'discover') {
    throw new ProxyError(400, 'PATH_INCOMPLETE', 'Chemin incomplet.');
  }
  return '/' + segments.join('/');
}

function segmentOf(segments, i) {
  return segments.slice(0, i + 1).join('/');
}

/** Valide et normalise les parametres de requete autorises. */
export function validateQueryParams(params = {}) {
  const out = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(params)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue;
    const expectedKey = key;
    const spec = ALLOWED_QUERY_PARAMS[expectedKey];
    if (!spec) {
      throw new ProxyError(400, 'PARAM_NOT_ALLOWED', `Parametre non autorise : « ${key} ».`);
    }
    const value = String(rawValue).trim();
    if (value.length > (spec.maxLength || 120)) {
      throw new ProxyError(400, 'PARAM_INVALID', `Valeur trop longue pour « ${key} ».`);
    }
    if (!spec.pattern.test(value)) {
      throw new ProxyError(400, 'PARAM_INVALID', `Valeur invalide pour « ${key} ».`);
    }
    out.set(spec.tmdb || key, value);
  }
  // Bornes de securite sur la pagination (TMDB plafonne a 500).
  const page = Number(out.get('page') || '1');
  if (!Number.isFinite(page) || page < 1 || page > 500) {
    throw new ProxyError(400, 'PARAM_INVALID', 'Le parametre « page » doit etre compris entre 1 et 500.');
  }
  if (out.get('page')) out.set('page', String(Math.trunc(page)));
  return out;
}

/** Construit l'URL TMDB finale. La cle est ajoutee ici et n'en sort jamais. */
export function buildTmdbUrl(rawPath, params, apiKey) {
  const path = validateTmdbPath(rawPath);
  const search = validateQueryParams(params);
  if (path.startsWith('/search') && !search.get('query')) {
    throw new ProxyError(400, 'QUERY_REQUIRED', 'Le parametre « query » est obligatoire pour /search.');
  }
  const base = (process.env.TMDB_BASE || 'https://api.themoviedb.org/3').replace(/\/+$/, '');
  const url = new URL(base + path);
  for (const [k, v] of search.entries()) url.searchParams.set(k, v);
  url.searchParams.set('api_key', apiKey || '');
  return { url, path, normalizedParams: search };
}

/* ------------------------------------------------------------------ */
/* Cache memoire (best effort : les fonctions serverless sont ephemere) */
/* ------------------------------------------------------------------ */

const MEMORY_CACHE = new Map();
const CACHE_LIMIT = 400;

function cacheTtlFor(path, params) {
  if (path.startsWith('/configuration') || path.startsWith('/genre') || path.startsWith('/trending')) {
    return 30 * 60 * 1000;
  }
  if (path.startsWith('/search')) return 60 * 1000;
  if (params.get('query')) return 60 * 1000;
  return 10 * 60 * 1000;
}

function readCache(key) {
  const hit = MEMORY_CACHE.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    MEMORY_CACHE.delete(key);
    return null;
  }
  // Reinsertion pour un eviction approximativement LRU.
  MEMORY_CACHE.delete(key);
  MEMORY_CACHE.set(key, hit);
  return hit.value;
}

function writeCache(key, value, ttl) {
  if (MEMORY_CACHE.size >= CACHE_LIMIT) {
    const oldest = MEMORY_CACHE.keys().next().value;
    if (oldest !== undefined) MEMORY_CACHE.delete(oldest);
  }
  MEMORY_CACHE.set(key, { value, expires: Date.now() + ttl });
}

/* ------------------------------------------------------- */
/* Limitation de debit (par instance de fonction, par IP)   */
/* ------------------------------------------------------- */

const RATE_STATE = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX = 90;

export function checkRateLimit(clientKey) {
  const key = clientKey || 'anonymous';
  const now = Date.now();
  const entry = RATE_STATE.get(key);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    RATE_STATE.set(key, { start: now, count: 1 });
    if (RATE_STATE.size > 5000) {
      for (const [k, v] of RATE_STATE) if (now - v.start > RATE_WINDOW_MS) RATE_STATE.delete(k);
    }
    return { allowed: true, remaining: RATE_MAX - 1, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((entry.start + RATE_WINDOW_MS - now) / 1000)),
    };
  }
  return { allowed: true, remaining: RATE_MAX - entry.count, retryAfter: 0 };
}

/* ----------------------------------- */
/* Appel TMDB avec gestion 429/503/5xx  */
/* ----------------------------------- */

const UPSTREAM_TIMEOUT_MS = 12000;

async function fetchUpstream(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Executeur principal partage : renvoie { status, body, cache, upstreamStatus }.
 * Ne leve jamais : toutes les erreurs sont traduites en reponses actionnables.
 */
export async function runCatalogRequest({ path, params, apiKey, clientKey }) {
  if (!apiKey) {
    return {
      status: 503,
      body: {
        error: 'TMDB_KEY_MISSING',
        message:
          "Catalogue indisponible : la cle TMDB n'est pas configuree sur le serveur (TMDB_API_KEY).",
        hint: 'Ajoutez TMDB_API_KEY aux variables privees de l\'hebergeur, puis redeployez.',
      },
    };
  }

  let built;
  try {
    built = buildTmdbUrl(path, params, apiKey);
  } catch (err) {
    if (err instanceof ProxyError) {
      return { status: err.status, body: { error: err.code, message: err.message, details: err.details } };
    }
    throw err;
  }

  const rate = checkRateLimit(clientKey);
  if (!rate.allowed) {
    return {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfter) },
      body: {
        error: 'RATE_LIMITED',
        message: `Trop de requetes catalogue. Reessayez dans ${rate.retryAfter} s.`,
      },
    };
  }

  const cacheKey = built.url.toString();
  const cached = readCache(cacheKey);
  if (cached) {
    return { status: 200, body: cached, cache: 'HIT', path: built.path, params: built.normalizedParams };
  }

  let attempt = 0;
  let lastStatus = 0;
  while (attempt < 3) {
    attempt += 1;
    let res;
    try {
      res = await fetchUpstream(built.url);
    } catch (err) {
      lastStatus = 0;
      if (attempt < 3) {
        await delay(200 * attempt);
        continue;
      }
      return {
        status: 504,
        body: {
          error: 'UPSTREAM_TIMEOUT',
          message: 'TMDB ne repond pas (delai depasse). Le catalogue sera reessaye automatiquement.',
        },
      };
    }
    lastStatus = res.status;
    if (res.ok) {
      let json;
      try {
        json = await res.json();
      } catch {
        return {
          status: 502,
          body: { error: 'UPSTREAM_INVALID', message: 'Reponse TMDB illisible.' },
        };
      }
      const ttl = cacheTtlFor(built.path, built.normalizedParams);
      writeCache(cacheKey, json, ttl);
      return {
        status: 200,
        body: json,
        cache: 'MISS',
        path: built.path,
        params: built.normalizedParams,
        cacheTtlMs: ttl,
      };
    }

    if (res.status === 401 || res.status === 403) {
      return {
        status: 502,
        body: {
          error: 'TMDB_UNAUTHORIZED',
          message: 'TMDB a refuse la cle serveur. Verifiez TMDB_API_KEY dans les variables privees.',
        },
      };
    }
    if (res.status === 404) {
      return {
        status: 404,
        body: { error: 'NOT_FOUND', message: 'Contenu introuvable dans le catalogue TMDB.' },
      };
    }
    if (res.status === 429 || res.status === 503 || res.status >= 500) {
      const retryAfter = Number(res.headers.get('retry-after')) || 0;
      if (attempt < 3) {
        await delay(Math.min(Math.max(retryAfter * 1000, 300 * attempt), 4000));
        continue;
      }
      return {
        status: 503,
        headers: { 'Retry-After': String(Math.min(Math.max(retryAfter, 5), 60)) },
        body: {
          error: 'UPSTREAM_UNAVAILABLE',
          message: 'TMDB est temporairement indisponible (429/503). Reessayez dans un instant.',
          upstreamStatus: res.status,
        },
      };
    }

    return {
      status: 502,
      body: {
        error: 'UPSTREAM_ERROR',
        message: `Erreur TMDB inattendue (${res.status}).`,
        upstreamStatus: res.status,
      },
    };
  }

  return {
    status: 503,
    body: { error: 'UPSTREAM_UNAVAILABLE', message: 'TMDB est indisponible.', upstreamStatus: lastStatus },
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** En-tetes de cache CDN : mis en cache sauf pour les recherches. */
export function cdnCacheHeaders(path, ttlMs) {
  const isSearch = String(path || '').startsWith('/search');
  const publicTtl = isSearch ? 30 : Math.max(60, Math.round((ttlMs || 600000) / 1000));
  return {
    'Cache-Control': `public, max-age=${publicTtl}, s-maxage=${publicTtl}, stale-while-revalidate=120`,
  };
}
