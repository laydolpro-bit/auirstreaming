import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../components/Card.jsx';
import { IconChevronDown, IconFilter, IconRefresh } from '../components/Icons.jsx';
import { EmptyState, ErrorState, GridSkeleton, LoadingBar } from '../components/Skeleton.jsx';
import { ANIME_FILTER, fetchDiscover } from '../lib/api.js';
import { isFavorite } from '../lib/storage.js';
import { useAsync } from '../lib/hooks.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';
import { useGenreTables } from '../state/genres.js';

const SORT_OPTIONS = [
  { id: 'popularite', label: 'Popularité' },
  { id: 'note', label: 'Mieux notés' },
  { id: 'recent', label: 'Plus récents' },
];

const DECADES = [
  { id: '', label: 'Toutes les années' },
  { id: '2020', label: '2020 → aujourd’hui' },
  { id: '2010', label: '2010 → 2019' },
  { id: '2000', label: '2000 → 2009' },
  { id: '1990', label: '1990 → 1999' },
  { id: '1980', label: '1980 → 1989' },
  { id: 'before1980', label: 'Avant 1980' },
];

const DECADE_RANGES = {
  2020: { gte: '2020-01-01', lte: '2029-12-31' },
  2010: { gte: '2010-01-01', lte: '2019-12-31' },
  2000: { gte: '2000-01-01', lte: '2009-12-31' },
  1990: { gte: '1990-01-01', lte: '1999-12-31' },
  1980: { gte: '1980-01-01', lte: '1989-12-31' },
  before1980: { gte: '', lte: '1979-12-31' },
};

function buildFilterParams({ mediaType, sort, genre, decade, anime }) {
  const params = {};

  if (sort === 'note') {
    params.sort_by = 'vote_average.desc';
    params.vote_count_gte = '200';
  } else if (sort === 'recent') {
    params.sort_by = mediaType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
  } else {
    params.sort_by = 'popularity.desc';
  }

  const genres = [];
  if (anime) genres.push(ANIME_FILTER.with_genres);
  if (genre) genres.push(genre);
  if (genres.length) params.with_genres = genres.join(',');
  if (anime) params.with_original_language = ANIME_FILTER.with_original_language;

  const range = DECADE_RANGES[decade];
  if (range) {
    const gteKey = mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
    const lteKey = mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
    if (range.gte) params[gteKey] = range.gte;
    if (range.lte) params[lteKey] = range.lte;
  }

  return params;
}

/**
 * Page de navigation (Films / Séries / Animés) : filtres + pagination
 * « Charger plus », etats de chargement, erreurs actionnables, etat vide.
 */
export default function Browse({ mediaType, mode }) {
  const [params, setParams] = useSearchParams();
  const { lang } = useAudioLang();
  const genres = useGenreTables();
  useStorageVersion();

  const genre = params.get('genre') || '';
  const sort = SORT_OPTIONS.some((option) => option.id === params.get('tri')) ? params.get('tri') : 'popularite';
  const decade = params.has('annee') ? params.get('annee') : '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const isAnime = mode === 'animes';

  const genreOptions = useMemo(() => {
    if (!genres) return [];
    const list = mediaType === 'movie' ? genres.movies : genres.tv;
    return list.slice().sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [genres, mediaType]);

  const [items, setItems] = useState([]);

  const loader = useCallback(
    ({ signal }) => {
      const filterParams = buildFilterParams({ mediaType, sort, genre, decade, anime: isAnime });
      return fetchDiscover(mediaType, { ...filterParams, page }, { signal });
    },
    [mediaType, sort, genre, decade, page, isAnime],
  );

  const { status, data, error, reload } = useAsync(loader, [mediaType, sort, genre, decade, page, isAnime]);

  useEffect(() => {
    if (status !== 'success' || !data) return;
    setItems((previous) => {
      if (page <= 1) return data.items;
      const seen = new Set(previous.map((item) => `${item.type}-${item.id}`));
      return [...previous, ...data.items.filter((item) => !seen.has(`${item.type}-${item.id}`))];
    });
  }, [status, data, page]);

  useEffect(() => {
    setItems([]);
  }, [mediaType, sort, genre, decade, isAnime]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next, { replace: false });
  };

  const setPage = (value) => {
    const next = new URLSearchParams(params);
    if (value <= 1) next.delete('page');
    else next.set('page', String(value));
    setParams(next);
  };

  const heading =
    mode === 'films' ? 'Films' : mode === 'series' ? 'Séries' : 'Animés';
  const description =
    mode === 'films'
      ? 'Tout le catalogue de films : triez par popularité, note ou date de sortie, et filtrez par genre ou par décennie.'
      : mode === 'series'
        ? 'Les séries du catalogue, saison et épisode choisis dans la fiche du titre avant la lecture.'
        : 'Animés du catalogue TMDB : genre Animation, langue originale japonaise.';

  const totalPages = data?.totalPages || 1;
  const totalResults = data?.totalResults || 0;
  const isFirstLoad = status === 'loading' && items.length === 0;

  return (
    <div className="page">
      <header className="page-head">
        <p className="page-kicker">Catalogue</p>
        <h1 className="page-title">{heading}</h1>
        <p className="page-lede">{description}</p>
      </header>

      <section className="filters" aria-label="Filtres du catalogue">
        <div className="filter-field">
          <label htmlFor="filter-genre">
            <IconFilter /> Genre
          </label>
          <select id="filter-genre" value={genre} onChange={(event) => updateParam('genre', event.target.value)}>
            <option value="">Tous les genres</option>
            {genreOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-sort">Tri</label>
          <select id="filter-sort" value={sort} onChange={(event) => updateParam('tri', event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-field">
          <label htmlFor="filter-year">Période</label>
          <select id="filter-year" value={decade} onChange={(event) => updateParam('annee', event.target.value)}>
            {DECADES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {genre || sort !== 'popularite' || decade ? (
          <button type="button" className="btn btn-subtle" onClick={() => setParams(new URLSearchParams())}>
            <IconRefresh />
            Réinitialiser
          </button>
        ) : null}
      </section>

      <p className="results-count" role="status" aria-live="polite">
        {status === 'loading' && items.length > 0
          ? 'Chargement de la suite…'
          : totalResults
            ? `${totalResults.toLocaleString('fr-FR')} titre${totalResults > 1 ? 's' : ''} correspondant aux filtres.`
            : ''}
      </p>

      {isFirstLoad ? <GridSkeleton count={12} /> : null}

      {status === 'error' && items.length === 0 ? <ErrorState error={error} onRetry={reload} /> : null}

      {!isFirstLoad && items.length > 0 ? (
        <div className="grid">
          {items.map((item, index) => (
            <Card key={`${item.type}-${item.id}`} item={item} priority={index < 4} isFavorite={isFavorite(item)} playOptions={{ lang, season: 1, episode: 1 }} />
          ))}
        </div>
      ) : null}

      {status === 'success' && items.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          message="Aucun titre ne correspond à ces filtres. Essayez une autre période, un autre genre ou une autre combinaison."
          actionLabel="Réinitialiser les filtres"
          to={mode === 'films' ? '/films' : mode === 'series' ? '/series' : '/animes'}
        />
      ) : null}

      {status === 'error' && items.length > 0 ? <ErrorState error={error} onRetry={reload} /> : null}

      {isFirstLoad ? null : status === 'loading' && items.length > 0 ? <LoadingBar label="Chargement de la page suivante…" /> : null}

      {items.length > 0 && page < totalPages ? (
        <div className="load-more">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setPage(page + 1)} disabled={status === 'loading'}>
            <IconChevronDown />
            Charger plus
          </button>
          <p className="load-more-note">
            Page {page} sur {totalPages}
          </p>
        </div>
      ) : null}
    </div>
  );
}
