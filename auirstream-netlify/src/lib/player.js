/**
 * auirstream - construction des URLs du lecteur Fluxora.
 *
 * Le lecteur reste intact : on ne fait que composer l'URL d'integration,
 * avec la cle publique `pk` conservee a l'identique, et les parametres
 * tmdb / type / lang / season / episode correspondant a la page ouverte.
 */
import { FLUXORA_EMBED_PATH, FLUXORA_ORIGIN, FLUXORA_PK } from './config.js';

/**
 * @param {object} target
 * @param {'movie'|'tv'} target.type
 * @param {number|string} target.tmdbId
 * @param {'vf'|'vo'} [target.lang]
 * @param {number} [target.season] requis pour les series
 * @param {number} [target.episode] requis pour les series
 */
export function buildPlayerUrl({ type, tmdbId, lang = 'vf', season, episode }) {
  if (!tmdbId) throw new Error('Identifiant TMDB manquant pour la lecture.');
  const params = new URLSearchParams();
  params.set('tmdb', String(tmdbId));
  params.set('type', type === 'tv' ? 'tv' : 'movie');
  params.set('lang', lang === 'vo' ? 'vo' : 'vf');
  if (type === 'tv') {
    params.set('season', String(Math.max(1, Number(season) || 1)));
    params.set('episode', String(Math.max(1, Number(episode) || 1)));
  }
  // Cle publique d'integration : TOUJOURS presente, jamais remplacee.
  params.set('pk', FLUXORA_PK);
  return `${FLUXORA_ORIGIN}${FLUXORA_EMBED_PATH}?${params.toString()}`;
}

/** Verifie qu'une URL de lecteur construite contient bien la cle d'integration. */
export function isPlayerUrlValid(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.origin === FLUXORA_ORIGIN &&
      parsed.pathname === FLUXORA_EMBED_PATH &&
      parsed.searchParams.get('pk') === FLUXORA_PK &&
      Boolean(parsed.searchParams.get('tmdb'))
    );
  } catch {
    return false;
  }
}

/** Cible de lecture par defaut pour un element de catalogue. */
export function playTargetFor(item, { lang = 'vf', season = 1, episode = 1 } = {}) {
  if (!item) return null;
  if (item.type === 'tv') {
    return { type: 'tv', tmdbId: item.id, lang, season, episode };
  }
  return { type: 'movie', tmdbId: item.id, lang };
}

export function playerLabel(item, { season, episode } = {}) {
  if (!item) return 'Lecture';
  if (item.type === 'tv' && season) {
    return `Lire ${item.title} — S${season} E${episode}`;
  }
  return `Lire ${item.title}`;
}
