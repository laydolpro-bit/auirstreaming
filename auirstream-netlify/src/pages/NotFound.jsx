import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="page page-narrow">
      <header className="page-head">
        <p className="page-kicker">Erreur 404</p>
        <h1 className="page-title">Cette page n’existe pas</h1>
        <p className="page-lede">
          L’adresse demandée ne correspond à aucune page de auirstream. Le catalogue, lui, reste accessible.
        </p>
      </header>
      <div className="notfound-actions">
        <Link className="btn btn-primary btn-lg" to="/">
          Retour à l’accueil
        </Link>
        <Link className="btn btn-ghost btn-lg" to="/films">
          Parcourir les films
        </Link>
        <Link className="btn btn-ghost btn-lg" to="/series">
          Parcourir les séries
        </Link>
      </div>
    </div>
  );
}
