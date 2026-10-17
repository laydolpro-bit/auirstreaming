import { Link } from 'react-router-dom';
import { formatRating, truncate } from '../lib/format.js';
import { useAudioLang } from '../state/AppState.jsx';
import { usePlayer } from '../state/PlayerContext.jsx';
import { IconHeart, IconPlay, IconStar } from './Icons.jsx';
import Poster from './Poster.jsx';

/** Details d'un titre : /film/550 ou /serie/1399 */
export function detailPath(item) {
  if (!item) return '/';
  return item.type === 'tv' ? `/serie/${item.id}` : `/film/${item.id}`;
}

/**
 * Carte d'affiche 2:3 : lien vers la fiche + action de lecture directe.
 * Le bouton de lecture est un vrai bouton (clavier, focus visible) et
 * n'apparait qu'au survol/focus pour ne pas surcharger la grille.
 */
export default function Card({ item, priority = false, isFavorite = false, footer = null, playOptions = null }) {
  const { play } = usePlayer();
  const { lang } = useAudioLang();
  if (!item) return null;

  const rating = formatRating(item.rating);

  const onPlay = (event) => {
    event.preventDefault();
    event.stopPropagation();
    play(item, playOptions || { lang, season: 1, episode: 1 });
  };

  return (
    <article className="card">
      <Link className="card-link" to={detailPath(item)} aria-label={`${item.title} — voir la fiche`}>
        <Poster item={item} priority={priority} />
        <span className="card-veil" aria-hidden="true" />
        {item.type === 'tv' ? <span className="card-tag">Série</span> : null}
        {isFavorite ? (
          <span className="card-fav" aria-hidden="true">
            <IconHeart filled />
          </span>
        ) : null}
        {rating ? (
          <span className="card-rating">
            <IconStar />
            {rating}
          </span>
        ) : null}
      </Link>
      <button type="button" className="card-play" onClick={onPlay} aria-label={`Lire ${item.title}`} title={`Lire ${item.title}`}>
        <IconPlay />
      </button>
      <div className="card-body">
        <h3 className="card-title" title={item.title}>
          {item.title}
        </h3>
        <p className="card-meta">
          {item.year || 'Année inconnue'}
          {item.overview ? ` · ${truncate(item.overview, 64)}` : ''}
        </p>
      </div>
      {footer}
    </article>
  );
}
