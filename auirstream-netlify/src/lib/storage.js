/**
 * auirstream - donnees locales (aucun compte, aucun serveur).
 *
 * Stocke dans localStorage, avec version de schema :
 *   - favoris ("Ma liste")
 *   - activite recente par titre (pour "Continuer à regarder")
 *   - episodes vus (par serie) pour proposer honnetement l'episode suivant
 *   - preferences : theme, langue de lecture (vf/vo)
 *
 * Aucun suivi, aucune donnee personnelle, rien n'est envoye a un tiers.
 */

const PREFIX = 'auirstream.v1.';
const KEYS = {
  favorites: `${PREFIX}favorites`,
  progress: `${PREFIX}progress`,
  watched: `${PREFIX}watched`,
  prefs: `${PREFIX}prefs`,
};

const MAX_PROGRESS = 40;
const MAX_WATCHED_SHOWS = 60;

function safeRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Mode navigation privee / quota : on continue sans persister.
    return false;
  }
}

/* ------------------------------ Favoris ------------------------------ */

export function readFavorites() {
  const value = safeRead(KEYS.favorites, []);
  return Array.isArray(value) ? value : [];
}

export function writeFavorites(items) {
  safeWrite(KEYS.favorites, items.slice(0, 200));
  notify();
}

function slim(item) {
  if (!item) return null;
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    posterPath: item.posterPath || '',
    backdropPath: item.backdropPath || '',
    year: item.year || '',
    rating: Number(item.rating) || 0,
    overview: item.overview || '',
  };
}

export function isFavorite(item) {
  if (!item) return false;
  return readFavorites().some((fav) => fav.type === item.type && fav.id === item.id);
}

export function toggleFavorite(item) {
  if (!item) return { added: false, favorites: readFavorites() };
  const current = readFavorites();
  const exists = current.some((fav) => fav.type === item.type && fav.id === item.id);
  const favorites = exists
    ? current.filter((fav) => !(fav.type === item.type && fav.id === item.id))
    : [slim(item), ...current];
  writeFavorites(favorites);
  return { added: !exists, favorites };
}

export function removeFavorite(item) {
  const favorites = readFavorites().filter((fav) => !(fav.type === item.type && fav.id === item.id));
  writeFavorites(favorites);
  return favorites;
}

/* --------------------------- Activite recente -------------------------- */

export function readProgress() {
  const value = safeRead(KEYS.progress, {});
  return value && typeof value === 'object' ? value : {};
}

/**
 * Enregistre l'ouverture d'une lecture.
 * On ne connait pas la position reelle dans une iframe distante : on ne
 * stocke donc PAS de faux pourcentage, seulement le dernier contenu lance.
 */
export function recordProgress(item, { lang = 'vf', season = null, episode = null } = {}) {
  if (!item) return;
  const key = `${item.type}:${item.id}`;
  const all = readProgress();
  all[key] = {
    ...slim(item),
    lang,
    season: season ?? null,
    episode: episode ?? null,
    updatedAt: Date.now(),
  };
  const entries = Object.entries(all)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
    .slice(0, MAX_PROGRESS);
  safeWrite(KEYS.progress, Object.fromEntries(entries));
  notify();
}

export function removeProgress(item) {
  const key = `${item.type}:${item.id}`;
  const all = readProgress();
  delete all[key];
  safeWrite(KEYS.progress, all);
  notify();
}

export function clearProgress() {
  safeWrite(KEYS.progress, {});
  notify();
}

/** Liste triee (plus recent d'abord), prete pour le rail "Continuer". */
export function listProgress() {
  return Object.entries(readProgress())
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/** Derniere activite connue pour un titre donne (ou null). */
export function findProgress(item) {
  if (!item) return null;
  return readProgress()[`${item.type}:${item.id}`] || null;
}

/* ------------------------- Episodes vus (series) ----------------------- */

export function readWatched() {
  const value = safeRead(KEYS.watched, {});
  return value && typeof value === 'object' ? value : {};
}

function watchedKey(type, id) {
  return `${type}:${id}`;
}

export function isEpisodeWatched(type, id, season, episode) {
  const show = readWatched()[watchedKey(type, id)];
  if (!show || !show.episodes) return false;
  return Boolean(show.episodes[`${season}:${episode}`]);
}

export function markEpisodeWatched(item, season, episode, watched = true) {
  if (!item) return;
  const all = readWatched();
  const key = watchedKey(item.type, item.id);
  const show = all[key] || { ...slim(item), episodes: {} };
  show.episodes = show.episodes || {};
  if (watched) show.episodes[`${season}:${episode}`] = Date.now();
  else delete show.episodes[`${season}:${episode}`];
  show.updatedAt = Date.now();
  all[key] = show;
  const entries = Object.entries(all)
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
    .slice(0, MAX_WATCHED_SHOWS);
  safeWrite(KEYS.watched, Object.fromEntries(entries));
  notify();
}

export function countWatchedEpisodes(type, id) {
  const show = readWatched()[watchedKey(type, id)];
  return show && show.episodes ? Object.keys(show.episodes).length : 0;
}

export function getWatchedEpisodes(type, id) {
  const show = readWatched()[watchedKey(type, id)];
  return show && show.episodes ? Object.keys(show.episodes) : [];
}

/**
 * Prochain episode a regarder, calcule a partir des episodes marques vus.
 * Renvoie null si la progression locale ne permet pas de savoir.
 */
export function nextEpisode(seasons, type, id, startSeason = 1) {
  if (!Array.isArray(seasons) || seasons.length === 0) return null;
  const watched = new Set(getWatchedEpisodes(type, id));
  for (const season of seasons.slice().sort((a, b) => a.seasonNumber - b.seasonNumber)) {
    if (season.seasonNumber < 1 || !season.episodeCount) continue;
    for (let ep = 1; ep <= season.episodeCount; ep += 1) {
      if (!watched.has(`${season.seasonNumber}:${ep}`)) {
        return { season: season.seasonNumber, episode: ep };
      }
    }
  }
  const fallback = seasons.find((s) => s.seasonNumber === startSeason && s.episodeCount) || seasons[0];
  return fallback ? { season: fallback.seasonNumber, episode: 1 } : null;
}

/* ----------------------------- Preferences ---------------------------- */

const DEFAULT_PREFS = { theme: 'dark', lang: 'vf' };

export function readPrefs() {
  const value = safeRead(KEYS.prefs, {});
  return { ...DEFAULT_PREFS, ...(value && typeof value === 'object' ? value : {}) };
}

export function writePrefs(patch) {
  const next = { ...readPrefs(), ...patch };
  safeWrite(KEYS.prefs, next);
  notify();
  return next;
}

/* -------------------------- Synchronisation UI ------------------------ */

const EVENT = 'auirstream:storage';

function notify() {
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function subscribeStorage(listener) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
