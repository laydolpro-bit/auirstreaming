import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import { IconTrash } from '../components/Icons.jsx';
import { EmptyState } from '../components/Skeleton.jsx';
import { readFavorites, removeFavorite } from '../lib/storage.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';

/** Ma liste : favoris enregistres localement (aucun compte, aucun serveur). */
export default function MyList() {
  useStorageVersion();
  const { lang } = useAudioLang();
  const favorites = readFavorites();

  return (
    <div className="page">
      <header className="page-head">
        <p className="page-kicker">Bibliothèque locale</p>
        <h1 className="page-title">Ma liste</h1>
        <p className="page-lede">
          Vos favoris sont enregistrés dans ce navigateur uniquement. Ils ne sont envoyés à aucun serveur et
          disparaissent si vous effacez les données du site.
        </p>
      </header>

      {favorites.length === 0 ? (
        <EmptyState
          title="Ma liste est vide"
          message="Ajoutez un film ou une série depuis sa fiche : le bouton « Ajouter à ma liste » conserve le titre ici."
          actionLabel="Parcourir les films"
          to="/films"
        />
      ) : (
        <>
          <p className="results-count">
            {favorites.length} titre{favorites.length > 1 ? 's' : ''} enregistré{favorites.length > 1 ? 's' : ''}.
          </p>
          <div className="grid">
            {favorites.map((item, index) => (
              <Card
                key={`${item.type}-${item.id}`}
                item={item}
                priority={index < 4}
                isFavorite
                playOptions={{ lang, season: 1, episode: 1 }}
                footer={
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn-subtle btn-sm"
                      onClick={() => {
                        removeFavorite(item);
                      }}
                    >
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
        Envie de reprendre une lecture ? <Link to="/continuer">Voir « Continuer à regarder »</Link>.
      </p>
    </div>
  );
}
