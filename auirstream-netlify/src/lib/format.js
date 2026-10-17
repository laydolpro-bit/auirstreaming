import { BACKDROP_SIZE, IMAGE_BASE, POSTER_SIZE } from './config.js';

/** URL d'affiche 2:3 (w500). Renvoie '' si aucune image. */
export function posterUrl(path, size = POSTER_SIZE) {
  if (!path) return '';
  return `${IMAGE_BASE}/${size}${path}`;
}

/** URL de fond 16:9 (w1280) pour le hero et les bandeaux. */
export function backdropUrl(path, size = BACKDROP_SIZE) {
  if (!path) return '';
  return `${IMAGE_BASE}/${size}${path}`;
}

export function releaseYear(item) {
  const raw = item?.release_date || item?.first_air_date || '';
  if (typeof raw === 'string' && raw.length >= 4) return raw.slice(0, 4);
  return '';
}

export function formatYear(item) {
  const year = releaseYear(item);
  return year || 'Date inconnue';
}

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatRating(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return '';
  return num.toFixed(1).replace('.', ',');
}

export function formatRuntime(minutes) {
  const num = Number(minutes);
  if (!Number.isFinite(num) || num <= 0) return '';
  const hours = Math.floor(num / 60);
  const rest = num % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** Coupe un texte long sans casser les mots, en ajoutant une ellipse. */
export function truncate(text, maxLength = 180) {
  if (!text) return '';
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).replace(/[\s,;:.]+\S*$/, '')}…`;
}

/** Initiales utilisees par l'affiche de secours. */
export function initials(title) {
  if (!title) return '?';
  const words = String(title).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function pluralize(count, singular, plural) {
  return `${count} ${count > 1 ? plural : singular}`;
}

/** Genres lisibles depuis les identifiants TMDB et la table des genres. */
export function genresFromIds(ids, genreMap) {
  if (!Array.isArray(ids) || !genreMap) return [];
  return ids.map((id) => genreMap.get(Number(id))).filter(Boolean);
}

/** Normalise un resultat TMDB en objet interne stable. */
export function normalizeItem(raw, fallbackType) {
  if (!raw || typeof raw !== 'object') return null;
  const type = raw.media_type === 'movie' || raw.media_type === 'tv' ? raw.media_type : fallbackType;
  if (type !== 'movie' && type !== 'tv') return null;
  const title = raw.title || raw.name || raw.original_title || raw.original_name || 'Sans titre';
  return {
    id: Number(raw.id),
    type,
    title,
    originalTitle: raw.original_title || raw.original_name || '',
    overview: raw.overview || '',
    posterPath: raw.poster_path || '',
    backdropPath: raw.backdrop_path || '',
    date: raw.release_date || raw.first_air_date || '',
    year: String(raw.release_date || raw.first_air_date || '').slice(0, 4),
    rating: Number(raw.vote_average) || 0,
    votes: Number(raw.vote_count) || 0,
    genreIds: Array.isArray(raw.genre_ids) ? raw.genre_ids : [],
    adult: Boolean(raw.adult),
  };
}

export function normalizeList(results, fallbackType) {
  if (!Array.isArray(results)) return [];
  return results.map((item) => normalizeItem(item, fallbackType)).filter(Boolean);
}

export function itemKey(item) {
  if (!item) return '';
  return `${item.type}:${item.id}`;
}
