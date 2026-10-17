/**
 * auirstream - client du catalogue.
 *
 * Le navigateur n'appelle QUE /api/catalog (proxy serveur). Aucune cle n'est
 * presente ici : la cle TMDB vit uniquement dans les variables privees du
 * serveur (fonction Netlify en production, middleware Vite en local).
 */
import { TMDB_LANGUAGE } from './config.js';
import { normalizeItem, normalizeList } from './format.js';

const API_PATH = '/api/catalog';
const DEFAULT_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', hint = '', retryable = true, path = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.hint = hint;
    this.retryable = retryable;
    this.path = path;
  }
}

/** Traduit une erreur technique en message actionnable pour le visiteur. */
export function describeError(error) {
  if (error instanceof ApiError) {
    return {
      title: 'Le catalogue n’a pas pu être chargé',
      message: error.message,
      hint: error.hint,
      retryable: error.retryable,
      code: error.code,
      status: error.status,
    };
  }
  return {
    title: 'Erreur inattendue',
    message: error?.message || 'Une erreur inconnue est survenue.',
    hint: 'Rechargez la page. Si le problème persiste, réessayez dans quelques minutes.',
    retryable: true,
    code: 'UNEXPECTED',
    status: 0,
  };
}

const memoryCache = new Map();
const inflight = new Map();
const CACHE_LIMIT = 200;

function cacheKey(path, params) {
  const search = new URLSearchParams();
  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
    });
  return `${path}?${search.toString()}`;
}

function readCache(key) {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key, value, ttlMs) {
  if (memoryCache.size >= CACHE_LIMIT) {
    const oldest = memoryCache.keys().next().value;
    if (oldest !== undefined) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { value, expires: Date.now() + ttlMs });
}

/**
 * Appel brut au proxy catalogue.
 * @param {string} path chemin TMDB (ex. "/movie/550")
 * @param {object} params parametres TMDB autorises (ex. { language: "fr-FR" })
 */
export async function catalogRequest(path, params = {}, { signal, ttlMs = 5 * 60 * 1000, force = false } = {}) {
  const key = cacheKey(path, params);
  if (!force) {
    const cached = readCache(key);
    if (cached) return cached;
    if (inflight.has(key)) return inflight.get(key);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }

  const query = new URLSearchParams({ path });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });

  const promise = (async () => {
    let response;
    try {
      response = await fetch(`${API_PATH}?${query.toString()}`, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw new ApiError('Requête annulée.', { code: 'ABORTED', retryable: true, path });
      }
      throw new ApiError(
        'Connexion au catalogue impossible. Vérifiez votre réseau puis réessayez.',
        { code: 'NETWORK', retryable: true, path },
      );
    } finally {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener('abort', onAbort);
    }

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const code = payload?.error || `HTTP_${response.status}`;
      const retryAfter = Number(response.headers.get('retry-after')) || 0;
      const message =
        payload?.message ||
        (response.status === 404
          ? 'Contenu introuvable dans le catalogue.'
          : `Le catalogue a renvoyé une erreur (${response.status}).`);
      throw new ApiError(message, {
        status: response.status,
        code,
        retryable: response.status !== 404 && response.status !== 400 && response.status !== 403,
        hint: errorHint(code, response.status, retryAfter, payload?.hint),
        path,
      });
    }

    return payload;
  })();

  inflight.set(key, promise);
  try {
    const result = await promise;
    writeCache(key, result, ttlMs);
    return result;
  } finally {
    inflight.delete(key);
  }
}

function errorHint(code, status, retryAfter, serverHint) {
  if (serverHint) return serverHint;
  if (code === 'TMDB_KEY_MISSING') {
    return 'Configuration serveur incomplète : ajoutez TMDB_API_KEY dans les variables privées, puis redéployez.';
  }
  if (code === 'TMDB_UNAUTHORIZED') {
    return 'La clé TMDB configurée côté serveur est refusée par TMDB. Corrigez TMDB_API_KEY puis redéployez.';
  }
  if (code === 'RATE_LIMITED') {
    return retryAfter ? `Trop de requêtes : patientez ${retryAfter} s puis réessayez.` : 'Patientez quelques secondes puis réessayez.';
  }
  if (code === 'UPSTREAM_UNAVAILABLE' || status === 503) {
    return 'TMDB est momentanément indisponible. Réessayez dans un instant.';
  }
  if (code === 'NOT_FOUND' || status === 404) {
    return 'Ce titre n’existe pas dans le catalogue TMDB.';
  }
  return 'Réessayez ; si l’erreur persiste, vérifiez la configuration du proxy catalogue.';
}

/* ------------------------------------------------------------------ */
/* Configuration publique du site (Smartlink, zone push)               */
/* ------------------------------------------------------------------ */

let siteConfigPromise = null;

export function getSiteConfig() {
  if (!siteConfigPromise) {
    siteConfigPromise = fetch('/api/config', { headers: { accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return siteConfigPromise;
}

/* ------------------------------------------------------------------ */
/* Points d'entree catalogue utilises par les pages                     */
/* ------------------------------------------------------------------ */

export async function fetchTrending(mediaType = 'all', window = 'week', opts = {}) {
  const data = await catalogRequest(`/trending/${mediaType}/${window}`, { language: TMDB_LANGUAGE }, opts);
  return normalizeList(data?.results, mediaType === 'movie' ? 'movie' : mediaType === 'tv' ? 'tv' : undefined);
}

export async function fetchDiscover(type, params = {}, opts = {}) {
  const data = await catalogRequest(`/discover/${type}`, { language: TMDB_LANGUAGE, ...params }, opts);
  return {
    items: normalizeList(data?.results, type),
    page: Number(data?.page) || 1,
    totalPages: Math.min(Number(data?.total_pages) || 1, 500),
    totalResults: Number(data?.total_results) || 0,
  };
}

/** Recherche : /search/multi (tout), /search/movie, /search/tv. */
export async function fetchSearch(query, { mediaType = 'multi', year = '', page = 1 } = {}, opts = {}) {
  const params = { language: TMDB_LANGUAGE, query, include_adult: 'false', page };
  if (year && mediaType === 'movie') params.primary_release_year = year;
  if (year && mediaType === 'tv') params.first_air_date_year = year;
  const fallbackType = mediaType === 'movie' ? 'movie' : mediaType === 'tv' ? 'tv' : undefined;
  const data = await catalogRequest(`/search/${mediaType}`, params, { ttlMs: 60 * 1000, ...opts });
  return {
    items: normalizeList(data?.results, fallbackType).filter((item) => item.type === 'movie' || item.type === 'tv'),
    page: Number(data?.page) || 1,
    totalPages: Math.min(Number(data?.total_pages) || 1, 500),
    totalResults: Number(data?.total_results) || 0,
  };
}

export async function fetchMovie(id, opts = {}) {
  const data = await catalogRequest(`/movie/${id}`, { language: TMDB_LANGUAGE }, opts);
  return normalizeDetail(data, 'movie');
}

export async function fetchTv(id, opts = {}) {
  const data = await catalogRequest(`/tv/${id}`, { language: TMDB_LANGUAGE }, opts);
  return normalizeDetail(data, 'tv');
}

export async function fetchSeason(tvId, seasonNumber, opts = {}) {
  const data = await catalogRequest(`/tv/${tvId}/season/${seasonNumber}`, { language: TMDB_LANGUAGE }, opts);
  const episodes = Array.isArray(data?.episodes)
    ? data.episodes.map((ep) => ({
        id: Number(ep.id),
        episodeNumber: Number(ep.episode_number) || 0,
        seasonNumber: Number(ep.season_number) || seasonNumber,
        name: ep.name || `Épisode ${ep.episode_number}`,
        overview: ep.overview || '',
        stillPath: ep.still_path || '',
        airDate: ep.air_date || '',
        runtime: Number(ep.runtime) || 0,
        rating: Number(ep.vote_average) || 0,
      }))
    : [];
  return {
    id: Number(data?.id) || 0,
    name: data?.name || `Saison ${seasonNumber}`,
    overview: data?.overview || '',
    seasonNumber: Number(data?.season_number) || seasonNumber,
    airDate: data?.air_date || '',
    posterPath: data?.poster_path || '',
    episodes,
  };
}

export async function fetchRecommendations(item, opts = {}) {
  if (!item) return [];
  const data = await catalogRequest(`/${item.type}/${item.id}/recommendations`, { language: TMDB_LANGUAGE }, opts);
  return normalizeList(data?.results, item.type).filter((rec) => rec.id !== item.id);
}

function normalizeDetail(raw, type) {
  const base = normalizeItem({ ...raw, media_type: type }, type);
  if (!base) return null;
  return {
    ...base,
    tagline: raw.tagline || '',
    status: raw.status || '',
    runtime: Number(raw.runtime) || 0,
    episodeRuntime: Array.isArray(raw.episode_run_time) ? raw.episode_run_time[0] || 0 : 0,
    numberOfSeasons: Number(raw.number_of_seasons) || 0,
    numberOfEpisodes: Number(raw.number_of_episodes) || 0,
    genres: Array.isArray(raw.genres) ? raw.genres.map((g) => g.name).filter(Boolean) : [],
    countries: Array.isArray(raw.production_countries) ? raw.production_countries.map((c) => c.name) : [],
    spokenLanguages: Array.isArray(raw.spoken_languages)
      ? raw.spoken_languages.map((l) => l.french_name || l.english_name || l.name).filter(Boolean)
      : [],
    seasons: Array.isArray(raw.seasons)
      ? raw.seasons
          .filter((s) => s && s.season_number >= 0)
          .map((s) => ({
            id: Number(s.id) || 0,
            seasonNumber: Number(s.season_number) || 0,
            name: s.name || `Saison ${s.season_number}`,
            overview: s.overview || '',
            posterPath: s.poster_path || '',
            episodeCount: Number(s.episode_count) || 0,
            airDate: s.air_date || '',
          }))
      : [],
    lastAirDate: raw.last_air_date || '',
    homepage: raw.homepage || '',
    budget: Number(raw.budget) || 0,
    revenue: Number(raw.revenue) || 0,
  };
}

/* --------------------------------------------- */
/* Genres (table de correspondance id -> libelle) */
/* --------------------------------------------- */

export async function fetchGenres(type, opts = {}) {
  const data = await catalogRequest(`/genre/${type}/list`, { language: TMDB_LANGUAGE }, { ttlMs: 24 * 60 * 60 * 1000, ...opts });
  const list = Array.isArray(data?.genres) ? data.genres : [];
  return list.map((g) => ({ id: Number(g.id), name: g.name }));
}

/** Table de genres fusionnee (films + series) pour le hero et les fiches. */
let genreTablesPromise = null;
export function getGenreTables() {
  if (!genreTablesPromise) {
    genreTablesPromise = Promise.all([fetchGenres('movie'), fetchGenres('tv')])
      .then(([movies, tv]) => {
        const movieMap = new Map(movies.map((g) => [g.id, g.name]));
        const tvMap = new Map(tv.map((g) => [g.id, g.name]));
        const merged = new Map([...movieMap, ...tvMap]);
        return { movies, tv, movieMap, tvMap, merged };
      })
      .catch((err) => {
        genreTablesPromise = null;
        throw err;
      });
  }
  return genreTablesPromise;
}

/** Les animés sont detectes via le genre Animation + langue originale japonaise. */
export const ANIME_FILTER = { with_genres: '16', with_original_language: 'ja' };

export async function animesAvailable() {
  try {
    const { totalResults } = await fetchDiscover('tv', { ...ANIME_FILTER, page: 1, sort_by: 'popularity.desc' });
    return totalResults > 0;
  } catch {
    return true; // en cas d'erreur reseau on garde l'entree de navigation
  }
}
