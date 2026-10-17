import { useEffect, useState } from 'react';
import { initials, posterUrl } from '../lib/format.js';
import { IconFilm, IconTv } from './Icons.jsx';

/**
 * Affiche 2:3 avec image reelle TMDB, chargement differe hors ecran
 * et repli elegant (aucune image cassee si TMDB n'a pas d'affiche).
 */
export default function Poster({ item, size = 'w500', priority = false, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = posterUrl(item?.posterPath, size);

  useEffect(() => {
    setFailed(false);
  }, [item?.posterPath]);

  const showImage = src && !failed;
  const Icon = item?.type === 'tv' ? IconTv : IconFilm;

  return (
    <div className={`poster ${className}`.trim()}>
      {showImage ? (
        <img
          className="poster-img"
          src={src}
          alt={`Affiche de ${item?.title || 'contenu'}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={priority ? 'high' : undefined}
          width="500"
          height="750"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="poster-fallback" role="img" aria-label={`Aucune affiche disponible pour ${item?.title || 'ce contenu'}`}>
          <span className="poster-fallback-initials">{initials(item?.title)}</span>
          <Icon className="poster-fallback-icon" />
          <span className="poster-fallback-title">{item?.title}</span>
        </div>
      )}
    </div>
  );
}
