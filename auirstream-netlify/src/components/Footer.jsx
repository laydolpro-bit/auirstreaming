import { Link } from 'react-router-dom';
import { SITE_NAME } from '../lib/config.js';
import { IconBell, IconShield } from './Icons.jsx';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <p className="footer-name">{SITE_NAME}</p>
          <p className="footer-tagline">
            Catalogue éditorial de films, séries et animés, avec lecteur intégré. Aucun compte requis.
          </p>
        </div>

        <nav className="footer-links" aria-label="Liens de pied de page">
          <Link to="/films">Films</Link>
          <Link to="/series">Séries</Link>
          <Link to="/animes">Animés</Link>
          <Link to="/ma-liste">Ma liste</Link>
          <Link to="/continuer">Continuer à regarder</Link>
          <Link to="/a-propos">À propos &amp; crédits</Link>
          <Link to="/confidentialite">Confidentialité</Link>
        </nav>

        <div className="footer-notes">
          <p className="footer-note">
            <IconShield />
            Aucune donnée de lecture n’est transmise par {SITE_NAME} : favoris et progression restent dans votre
            navigateur.
          </p>
          <p className="footer-note">
            <IconBell />
            Les notifications, si le navigateur les autorise, sont publicitaires. Elles ne mesurent pas vos lectures.
          </p>
        </div>

        <div className="footer-tmdb">
          <img src="/tmdb-logo.svg" alt="TMDB" width="150" height="20" loading="lazy" decoding="async" />
          <p className="footer-tmdb-text">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </p>
          <p className="footer-tmdb-text footer-tmdb-fr">
            Les métadonnées (titres, synopsis, affiches) sont fournies par TMDB et ne confèrent aucun droit de
            diffusion.
          </p>
        </div>

        <p className="footer-legal">© {year} {SITE_NAME}. Site de démonstration éditoriale.</p>
      </div>
    </footer>
  );
}
