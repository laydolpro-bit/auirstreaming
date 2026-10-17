import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Card from '../components/Card.jsx';
import { IconChevronDown, IconRefresh } from '../components/Icons.jsx';
import { EmptyState, ErrorState, GridSkeleton, LoadingBar } from '../components/Skeleton.jsx';
import { fetchSearch } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { isFavorite } from '../lib/storage.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';

const TYPES = [
  { id: 'multi', label: 'Tout' },
  { id: 'movie', label: 'Films' },
  { id: 'tv', label: 'Séries' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 46 }, (_, index) => CURRENT_YEAR - index);

/**
 * Recherche : debounce assure par l'en-tete (navigation ?q=…), filtres par
 * type et par annee, pagination « Charger plus », états vides et erreurs.
 */
export default function Search() {
  const [params, setParams] = useSearchParams();
  const { lang } = useAudioLang();
  useStorageVersion();

  const query = (params.get('q') || '').trim();
  const mediaType = TYPES.some((type) => type.id === params.get('type')) ? params.get('type') : 'multi';
  const year = params.get('annee') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [items, setItems] = useState([]);

  const { status, data, error, reload } = useAsync(
    ({ signal }) => (query.length >= 2 ? fetchSearch(query, { mediaType, year, page }, { signal }) : Promise.resolve(null)),
    [query, mediaType, year, page],
    { enabled: query.length >= 2 },
  );

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
  }, [query, mediaType, year]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setParams(next);
  };

  const setPage = (value) => {
    const next = new URLSearchParams(params);
    if (value <= 1) next.delete('page');
    else next.set('page', String(value));
    setParams(next);
  };

  const totalPages = data?.totalPages || 1;
  const totalResults = data?.totalResults || 0;
  const isFirstLoad = status === 'loading' && items.length === 0;

  return (
    <div className="page">
      <header className="page-head">
        <p className="page-kicker">Recherche</p>
        <h1 className="page-title">{query ? `Résultats pour « ${query} »` : 'Rechercher un titre'}</h1>
        <p className="page-lede">
          La recherche interroge le catalogue TMDB. Saisissez au moins deux caractères : les résultats se mettent à
          jour pendant la frappe.
        </p>
      </header>

      <section className="filters" aria-label="Filtres de recherche">
        <div className="filter-field">
          <span className="filter-label">Type</span>
          <div className="chips">
            {TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`chip${mediaType === type.id ? ' is-active' : ''}`}
                aria-pressed={mediaType === type.id}
                onClick={() => setParam('type', type.id === 'multi' ? '' : type.id)}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-field">
          <label htmlFor="search-year">Année</label>
          <select id="search-year" value={year} onChange={(event) => setParam('annee', event.target.value)}>
            <option value="">Toutes les années</option>
            {YEARS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        {mediaType !== 'multi' || year ? (
          <button type="button" className="btn btn-subtle" onClick={() => setParams(query ? new URLSearchParams({ q: query }) : new URLSearchParams())}>
            <IconRefresh />
            Réinitialiser les filtres
          </button>
        ) : null}
      </section>

      {query.length < 2 ? (
        <EmptyState
          title="Saisissez votre recherche"
          message="Utilisez le champ de recherche de l’en-tête (raccourci « / »). Deux caractères suffisent pour lancer la recherche."
          actionLabel="Voir les films populaires"
          to="/films"
        />
      ) : null}

      {query.length >= 2 ? (
        <p className="results-count" role="status" aria-live="polite">
          {status === 'loading' && items.length > 0
            ? 'Chargement de la suite…'
            : totalResults
              ? `${totalResults.toLocaleString('fr-FR')} titre${totalResults > 1 ? 's' : ''} trouvé${totalResults > 1 ? 's' : ''}.`
              : status === 'success'
                ? 'Aucun résultat.'
                : ''}
        </p>
      ) : null}

      {isFirstLoad ? <GridSkeleton count={6} /> : null}

      {status === 'error' ? <ErrorState error={error} onRetry={reload} /> : null}

      {query.length >= 2 && status === 'success' && items.length === 0 ? (
        <EmptyState
          title="Aucun titre ne correspond"
          message="Essayez un autre orthographe, un titre original, ou retirez les filtres de type et d’année."
          actionLabel="Parcourir les séries"
          to="/series"
        />
      ) : null}

      {items.length > 0 ? (
        <div className="grid">
          {items.map((item, index) => (
            <Card
              key={`${item.type}-${item.id}`}
              item={item}
              priority={index < 4}
              isFavorite={isFavorite(item)}
              playOptions={{ lang, season: 1, episode: 1 }}
            />
          ))}
        </div>
      ) : null}

      {status === 'loading' && items.length > 0 ? <LoadingBar label="Chargement de la page suivante…" /> : null}

      {query.length >= 2 && items.length > 0 && page < totalPages ? (
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

      {query.length >= 2 && status === 'success' && items.length > 0 ? (
        <p className="page-footnote">
          <Link to="/a-propos">Métadonnées fournies par TMDB</Link> — les résultats proviennent du catalogue TMDB, pas
          d’un index interne.
        </p>
      ) : null}
    </div>
  );
}
