import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Poster from '../components/Poster.jsx';
import Rail from '../components/Rail.jsx';
import {
  IconCheck,
  IconChevronLeft,
  IconHeart,
  IconPlay,
  IconRefresh,
  IconStar,
} from '../components/Icons.jsx';
import { DetailSkeleton, EmptyState, ErrorState } from '../components/Skeleton.jsx';
import { fetchMovie, fetchRecommendations, fetchSeason, fetchTv } from '../lib/api.js';
import { backdropUrl, formatDate, formatRating, formatRuntime, truncate } from '../lib/format.js';
import { useAsync } from '../lib/hooks.js';
import {
  findProgress,
  isEpisodeWatched,
  isFavorite,
  markEpisodeWatched,
  nextEpisode,
  toggleFavorite,
} from '../lib/storage.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';
import { usePlayer } from '../state/PlayerContext.jsx';

/**
 * Fiche film ou série.
 * Film : titre, synopsis, informations utiles, bouton de lecture évident.
 * Série : même fiche + choix saison/épisode simple, épisodes numérotés.
 */
export default function Details({ type }) {
  const { id } = useParams();
  const numericId = Number(id);
  const { play } = usePlayer();
  const { lang } = useAudioLang();
  useStorageVersion();

  const detail = useAsync(
    ({ signal }) => (type === 'tv' ? fetchTv(numericId, { signal }) : fetchMovie(numericId, { signal })),
    [type, numericId],
  );

  const item = detail.data;
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    if (item) setFav(isFavorite(item));
  }, [item]);

  const seasons = useMemo(
    () => (item?.seasons || []).filter((s) => s.seasonNumber >= 1),
    [item],
  );

  /* Saison et épisode par défaut : reprise locale si elle existe. */
  useEffect(() => {
    if (!item || type !== 'tv') return;
    const progress = findProgress(item);
    if (progress?.season) {
      setSeason(progress.season);
      setEpisode(progress.episode || 1);
      return;
    }
    const next = nextEpisode(seasons, type, item.id, 1);
    if (next) {
      setSeason(next.season);
      setEpisode(next.episode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, type, seasons.length]);

  const seasonData = useAsync(
    ({ signal }) => (type === 'tv' && item ? fetchSeason(item.id, season, { signal }) : Promise.resolve(null)),
    [type, item?.id, season],
    { enabled: type === 'tv' && Boolean(item) },
  );

  const recommendations = useAsync(
    ({ signal }) => (item ? fetchRecommendations(item, { signal }) : Promise.resolve([])),
    [item?.id, item?.type],
    { enabled: Boolean(item) },
  );

  if (detail.status === 'loading' && !item) {
    return (
      <div className="page">
        <DetailSkeleton />
      </div>
    );
  }

  if (detail.status === 'error') {
    const notFound = detail.error?.status === 404;
    return (
      <div className="page">
        {notFound ? (
          <EmptyState
            title="Ce titre est introuvable"
            message="L’identifiant demandé n’existe pas dans le catalogue TMDB. Il a peut-être été retiré."
            actionLabel="Revenir à l’accueil"
            to="/"
          />
        ) : (
          <ErrorState error={detail.error} onRetry={detail.reload} />
        )}
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page">
        <EmptyState title="Aucune donnée" message="La fiche est vide." actionLabel="Revenir à l’accueil" to="/" />
      </div>
    );
  }

  const backdrop = backdropUrl(item.backdropPath);
  const rating = formatRating(item.rating);
  const episodes = seasonData.data?.episodes || [];
  const runtime = item.runtime || item.episodeRuntime;
  const progress = type === 'tv' ? findProgress(item) : null;
  const showResume = Boolean(progress?.season && (progress.season !== season || progress.episode !== episode));

  const playSelected = () => {
    if (type === 'tv') play(item, { lang, season, episode, episodeCount: episodes.length || item.numberOfEpisodes });
    else play(item, { lang });
  };

  return (
    <article className="detail">
      <div className="detail-hero">
        {backdrop ? <img className="detail-backdrop" src={backdrop} alt="" decoding="async" /> : null}
        <div className="detail-scrim" aria-hidden="true" />
        <Link className="detail-back" to={type === 'tv' ? '/series' : '/films'}>
          <IconChevronLeft />
          Retour
        </Link>
      </div>

      <div className="detail-body">
        <div className="detail-poster">
          <Poster item={item} priority size="w500" />
        </div>

        <div className="detail-main">
          <p className="detail-kicker">{type === 'tv' ? 'Série' : 'Film'}</p>
          <h1 className="detail-title">{item.title}</h1>
          {item.tagline ? <p className="detail-tagline">{item.tagline}</p> : null}

          <ul className="detail-meta">
            <li>{item.year || 'Année inconnue'}</li>
            {runtime ? <li>{formatRuntime(runtime)}</li> : null}
            {type === 'tv' && item.numberOfSeasons ? (
              <li>
                {item.numberOfSeasons} saison{item.numberOfSeasons > 1 ? 's' : ''}
                {item.numberOfEpisodes ? ` · ${item.numberOfEpisodes} épisodes` : ''}
              </li>
            ) : null}
            {rating ? (
              <li className="detail-meta-rating">
                <IconStar />
                {rating} / 10
                {item.votes ? ` (${item.votes.toLocaleString('fr-FR')} votes)` : ''}
              </li>
            ) : null}
            {item.originalTitle && item.originalTitle !== item.title ? <li>Titre original : {item.originalTitle}</li> : null}
          </ul>

          {item.genres?.length ? (
            <ul className="detail-genres">
              {item.genres.map((genre) => (
                <li key={genre}>{genre}</li>
              ))}
            </ul>
          ) : null}

          <p className="detail-overview">{item.overview || 'Synopsis indisponible en français pour ce titre.'}</p>

          <div className="detail-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={playSelected}>
              <IconPlay />
              {type === 'tv' ? `Regarder S${season} E${episode}` : 'Regarder'}
            </button>
            {type === 'tv' && showResume ? (
              <button
                type="button"
                className="btn btn-ghost btn-lg"
                onClick={() => {
                  setSeason(progress.season);
                  setEpisode(progress.episode || 1);
                }}
              >
                <IconRefresh />
                Reprendre S{progress.season} E{progress.episode}
              </button>
            ) : null}
            <button
              type="button"
              className={`btn btn-ghost btn-lg${fav ? ' is-active' : ''}`}
              aria-pressed={fav}
              onClick={() => {
                const result = toggleFavorite(item);
                setFav(result.added);
              }}
            >
              <IconHeart filled={fav} />
              {fav ? 'Dans ma liste' : 'Ajouter à ma liste'}
            </button>
          </div>

          <p className="detail-note">
            Métadonnées TMDB (affiches, synopsis, notes). La lecture se fait dans le lecteur intégré, dans un cadre
            16:9 ; auirstream ne mesure pas votre lecture.
          </p>

          <dl className="detail-facts">
            {item.status ? (
              <>
                <dt>Statut</dt>
                <dd>{item.status}</dd>
              </>
            ) : null}
            {type === 'tv' && item.lastAirDate ? (
              <>
                <dt>Dernière diffusion</dt>
                <dd>{formatDate(item.lastAirDate)}</dd>
              </>
            ) : null}
            {item.countries?.length ? (
              <>
                <dt>Pays</dt>
                <dd>{item.countries.join(', ')}</dd>
              </>
            ) : null}
            {item.spokenLanguages?.length ? (
              <>
                <dt>Langues</dt>
                <dd>{item.spokenLanguages.slice(0, 4).join(', ')}</dd>
              </>
            ) : null}
            {item.homepage ? (
              <>
                <dt>Site officiel</dt>
                <dd>
                  <a href={item.homepage} target="_blank" rel="noopener noreferrer">
                    {truncate(item.homepage, 48)}
                  </a>
                </dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      {type === 'tv' ? (
        <section className="season-picker" aria-labelledby="season-title">
          <div className="season-head">
            <h2 className="section-title" id="season-title">
              Saisons et épisodes
            </h2>
            <div className="filter-field">
              <label htmlFor="season-select">Saison</label>
              <select
                id="season-select"
                value={season}
                onChange={(event) => {
                  setSeason(Number(event.target.value));
                  setEpisode(1);
                }}
              >
                {seasons.length === 0 ? <option value={1}>Saison 1</option> : null}
                {seasons.map((entry) => (
                  <option key={entry.seasonNumber} value={entry.seasonNumber}>
                    {entry.name}
                    {entry.episodeCount ? ` (${entry.episodeCount} ép.)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {seasonData.status === 'loading' ? (
            <p className="muted" role="status">
              Chargement des épisodes…
            </p>
          ) : null}

          {seasonData.status === 'error' ? (
            <ErrorState error={seasonData.error} onRetry={seasonData.reload} compact />
          ) : null}

          {seasonData.status === 'success' && episodes.length === 0 ? (
            <p className="muted">Aucun épisode publié pour cette saison.</p>
          ) : null}

          {episodes.length > 0 ? (
            <ol className="episode-list">
              {episodes.map((ep) => {
                const watched = isEpisodeWatched('tv', item.id, season, ep.episodeNumber);
                const active = ep.episodeNumber === episode;
                return (
                  <li key={ep.id || `${season}-${ep.episodeNumber}`} className={`episode-item${active ? ' is-active' : ''}`}>
                    <button
                      type="button"
                      className="episode-select"
                      aria-current={active}
                      onClick={() => setEpisode(ep.episodeNumber)}
                    >
                      <span className="episode-number">E{ep.episodeNumber}</span>
                      <span className="episode-text">
                        <span className="episode-name">{ep.name}</span>
                        <span className="episode-sub">
                          {ep.airDate ? formatDate(ep.airDate) : 'Date de diffusion inconnue'}
                          {ep.runtime ? ` · ${formatRuntime(ep.runtime)}` : ''}
                          {watched ? ' · vu' : ''}
                        </span>
                      </span>
                    </button>
                    <div className="episode-actions">
                      <button
                        type="button"
                        className={`icon-btn${watched ? ' is-active' : ''}`}
                        aria-pressed={watched}
                        aria-label={watched ? `Marquer l’épisode ${ep.episodeNumber} comme non vu` : `Marquer l’épisode ${ep.episodeNumber} comme vu`}
                        title={watched ? 'Marqué comme vu' : 'Marquer comme vu'}
                        onClick={() => markEpisodeWatched(item, season, ep.episodeNumber, !watched)}
                      >
                        <IconCheck />
                      </button>
                      <button
                        type="button"
                        className="btn btn-subtle"
                        onClick={() => play(item, { lang, season, episode: ep.episodeNumber, episodeCount: episodes.length })}
                      >
                        <IconPlay />
                        Lire
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </section>
      ) : null}

      <div className="page-sections">
        <Rail
          title="Titres similaires"
          items={recommendations.data || []}
          loading={recommendations.status === 'loading'}
          error={recommendations.status === 'error' ? recommendations.error : null}
          onRetry={recommendations.reload}
          emptyMessage="Aucune recommandation TMDB disponible pour ce titre."
          priorityCount={1}
        />
      </div>
    </article>
  );
}
