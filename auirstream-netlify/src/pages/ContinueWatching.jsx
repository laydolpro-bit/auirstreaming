import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import { IconTrash } from '../components/Icons.jsx';
import { EmptyState } from '../components/Skeleton.jsx';
import { clearProgress, listProgress, removeProgress } from '../lib/storage.js';
import { formatDate } from '../lib/format.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';

/**
 * Continuer à regarder : historique d'ouverture du lecteur, conserve
 * localement. Aucun pourcentage n'est affiche : le lecteur est heberge par un
 * tiers et auirstream ne connait pas la position de lecture reelle.
 */
export default function ContinueWatching() {
  useStorageVersion();
  const { lang } = useAudioLang();
  const entries = listProgress();

  return (
    <div className="page">
      <header className="page-head">
        <p className="page-kicker">Bibliothèque locale</p>
        <h1 className="page-title">Continuer à regarder</h1>
        <p className="page-lede">
          Les titres que vous avez lancés récemment, avec la dernière saison et le dernier épisode utilisés. Ces
          informations restent dans ce navigateur.
        </p>
      </header>

      {entries.length === 0 ? (
        <EmptyState
          title="Aucune lecture récente"
          message="Lancez un film ou un épisode : il apparaîtra ici pour être repris en un clic."
          actionLabel="Découvrir le catalogue"
          to="/films"
        />
      ) : (
        <>
          <div className="list-toolbar">
            <p className="results-count">
              {entries.length} contenu{entries.length > 1 ? 's' : ''} dans l’historique local.
            </p>
            <button type="button" className="btn btn-subtle" onClick={() => clearProgress()}>
              <IconTrash />
              Vider l’historique
            </button>
          </div>

          <div className="grid">
            {entries.map((entry, index) => (
              <Card
                key={entry.key}
                item={entry}
                priority={index < 4}
                playOptions={{ lang, season: entry.season || 1, episode: entry.episode || 1 }}
                footer={
                  <div className="card-actions">
                    <span className="card-stamp">
                      {entry.type === 'tv' && entry.season
                        ? `S${entry.season} E${entry.episode || 1} · `
                        : ''}
                      {entry.updatedAt ? formatDate(new Date(entry.updatedAt).toISOString()) : ''}
                    </span>
                    <button type="button" className="btn btn-subtle btn-sm" onClick={() => removeProgress(entry)}>
                      <IconTrash />
                      Retirer
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </>
      )}

      <p className="page-footnote">
        Retrouvez vos titres mis de côté dans <Link to="/ma-liste">Ma liste</Link>.
      </p>
    </div>
  );
}
