import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { backdropUrl, formatRating, genresFromIds, truncate } from '../lib/format.js';
import { findProgress } from '../lib/storage.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';
import { useGenreTables } from '../state/genres.js';
import { usePlayer } from '../state/PlayerContext.jsx';
import { detailPath } from './Card.jsx';
import { ErrorState, HeroSkeleton } from './Skeleton.jsx';
import { IconInfo, IconPlay, IconStar } from './Icons.jsx';

/**
 * Hero editorial : vrai backdrop TMDB en w1280, degrade de contraste,
 * titre, annee/genres et bouton « Regarder » relie au bon contenu TMDB.
 * Rotation uniquement manuelle (aucun slideshow automatique).
 */
export default function Hero({ items = [], loading = false, error = null, onRetry }) {
  const [index, setIndex] = useState(0);
  const { play } = usePlayer();
  const { lang } = useAudioLang();
  const genres = useGenreTables();
  useStorageVersion();

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  if (loading) return <HeroSkeleton />;
  if (error) {
    return (
      <section className="hero hero-error" aria-label="Sélection à la une">
        <ErrorState error={error} onRetry={onRetry} title="La sélection à la une est indisponible" />
      </section>
    );
  }
  if (!items.length) return null;

  const item = items[Math.min(index, items.length - 1)];
  const backdrop = backdropUrl(item.backdropPath);
  const resume = item.type === 'tv' ? findProgress(item) : null;
  const season = resume?.season || 1;
  const episode = resume?.episode || 1;
  const itemGenres = genres ? genresFromIds(item.genreIds, genres.merged) : [];
  const rating = formatRating(item.rating);

  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-media" aria-hidden="true">
        {backdrop ? (
          <img key={backdrop} src={backdrop} alt="" fetchpriority="high" decoding="async" />
        ) : (
          <div className="hero-media-fallback" />
        )}
        <div className="hero-scrim" />
      </div>

      <div className="hero-content">
        <p className="hero-kicker">
          {item.type === 'tv' ? 'Série à la une' : 'Film à la une'}
          {rating ? (
            <span className="hero-rating">
              <IconStar />
              {rating}
            </span>
          ) : null}
        </p>
        <h1 className="hero-title" id="hero-title">
          {item.title}
        </h1>
        <p className="hero-meta">
          <span>{item.year || 'Année inconnue'}</span>
          {itemGenres.length ? <span className="hero-dot">•</span> : null}
          <span>{itemGenres.slice(0, 3).join(' · ')}</span>
          {item.type === 'tv' ? (
            <>
              <span className="hero-dot">•</span>
              <span>
                Saison {season} · Épisode {episode}
              </span>
            </>
          ) : null}
        </p>
        <p className="hero-overview">{truncate(item.overview, 260) || 'Synopsis non disponible pour ce titre.'}</p>

        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() =>
              play(item, item.type === 'tv' ? { lang, season, episode } : { lang })
            }
          >
            <IconPlay />
            {resume && item.type === 'tv' ? `Reprendre S${season} E${episode}` : 'Regarder'}
          </button>
          <Link className="btn btn-ghost btn-lg" to={detailPath(item)}>
            <IconInfo />
            Plus d’infos
          </Link>
        </div>

        <p className="hero-note">
          Métadonnées TMDB. Le lecteur s’ouvre dans un cadre 16:9 avec son propre hébergement vidéo.
        </p>
      </div>

      {items.length > 1 ? (
        <div className="hero-dots" role="group" aria-label="Autres titres à la une">
          {items.map((entry, dotIndex) => (
            <button
              key={`${entry.type}-${entry.id}`}
              type="button"
              aria-current={dotIndex === index}
              aria-label={`Afficher ${entry.title}`}
              className={`hero-dot-btn${dotIndex === index ? ' is-active' : ''}`}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
