import { useCallback } from 'react';
import Hero from '../components/Hero.jsx';
import Rail from '../components/Rail.jsx';
import { ANIME_FILTER, fetchDiscover, fetchTrending } from '../lib/api.js';
import { useAsync } from '../lib/hooks.js';
import { listProgress } from '../lib/storage.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';

/** Rail alimenté par un loader du catalogue. */
function useRail(loader) {
  const { status, data, error, reload } = useAsync(loader, []);
  return {
    items: Array.isArray(data) ? data : [],
    loading: status === 'loading',
    error,
    onRetry: reload,
  };
}

export default function Home() {
  const { lang } = useAudioLang();
  useStorageVersion();

  const hero = useAsync(
    useCallback(({ signal }) => fetchTrending('all', 'week', { signal, ttlMs: 10 * 60 * 1000 }), []),
    [],
  );
  const trendingMovies = useRail(useCallback(({ signal }) => fetchTrending('movie', 'week', { signal }), []));
  const trendingTv = useRail(useCallback(({ signal }) => fetchTrending('tv', 'week', { signal }), []));
  const popularMovies = useRail(
    useCallback(({ signal }) => fetchDiscover('movie', { page: 1, sort_by: 'popularity.desc' }, { signal }).then((r) => r.items), []),
  );
  const popularTv = useRail(
    useCallback(({ signal }) => fetchDiscover('tv', { page: 1, sort_by: 'popularity.desc' }, { signal }).then((r) => r.items), []),
  );
  const animes = useRail(
    useCallback(
      ({ signal }) =>
        fetchDiscover('tv', { ...ANIME_FILTER, page: 1, sort_by: 'popularity.desc' }, { signal }).then((r) => r.items),
      [],
    ),
  );
  const topRated = useRail(
    useCallback(
      ({ signal }) => fetchDiscover('movie', { page: 1, sort_by: 'vote_average.desc', vote_count_gte: '500' }, { signal }).then((r) => r.items),
      [],
    ),
  );

  const heroItems = (hero.data || []).filter((item) => item.backdropPath).slice(0, 6);

  const progress = listProgress();
  const continueItems = progress.map((entry) => ({
    id: entry.id,
    type: entry.type,
    title: entry.title,
    posterPath: entry.posterPath,
    backdropPath: entry.backdropPath,
    year: entry.year,
    rating: entry.rating,
    overview: entry.overview,
    season: entry.season,
    episode: entry.episode,
  }));

  return (
    <>
      {heroItems.length === 0 && hero.status === 'loading' ? (
        <Hero loading />
      ) : (
        <Hero
          items={heroItems}
          loading={hero.status === 'loading' && heroItems.length === 0}
          error={hero.status === 'error' ? hero.error : null}
          onRetry={hero.reload}
        />
      )}

      <div className="page-sections">
        {continueItems.length > 0 ? (
          <Rail
            title="Continuer à regarder"
            subtitle="Historique conservé uniquement dans ce navigateur."
            items={continueItems}
            playOptionsFor={(item) => ({ lang, season: item.season || 1, episode: item.episode || 1 })}
            moreHref="/continuer"
            priorityCount={1}
          />
        ) : null}

        <Rail
          title="Tendances de la semaine — films"
          items={trendingMovies.items}
          loading={trendingMovies.loading}
          error={trendingMovies.error}
          onRetry={trendingMovies.onRetry}
          moreHref="/films"
        />
        <Rail
          title="Tendances de la semaine — séries"
          items={trendingTv.items}
          loading={trendingTv.loading}
          error={trendingTv.error}
          onRetry={trendingTv.onRetry}
          moreHref="/series"
        />
        <Rail
          title="Films populaires"
          items={popularMovies.items}
          loading={popularMovies.loading}
          error={popularMovies.error}
          onRetry={popularMovies.onRetry}
          moreHref="/films"
        />
        <Rail
          title="Séries populaires"
          items={popularTv.items}
          loading={popularTv.loading}
          error={popularTv.error}
          onRetry={popularTv.onRetry}
          moreHref="/series"
        />
        <Rail
          title="Animés populaires"
          subtitle="Genre Animation, langue originale japonaise."
          items={animes.items}
          loading={animes.loading}
          error={animes.error}
          onRetry={animes.onRetry}
          moreHref="/animes"
        />
        <Rail
          title="Les mieux notés"
          subtitle="Films avec au moins 500 votes TMDB."
          items={topRated.items}
          loading={topRated.loading}
          error={topRated.error}
          onRetry={topRated.onRetry}
          moreHref="/films?tri=note"
        />
      </div>
    </>
  );
}
