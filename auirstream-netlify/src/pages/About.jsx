import { Link } from 'react-router-dom';
import { SITE_NAME } from '../lib/config.js';
import { IconExternal, IconFilm, IconShield, IconTv } from '../components/Icons.jsx';

export default function About() {
  return (
    <div className="page page-narrow">
      <header className="page-head">
        <p className="page-kicker">À propos</p>
        <h1 className="page-title">Comment fonctionne {SITE_NAME}</h1>
        <p className="page-lede">
          {SITE_NAME} est un catalogue éditorial : il présente des films, séries et animés, puis ouvre un lecteur
          intégré fourni par un service tiers. Le site n’héberge aucune vidéo.
        </p>
      </header>

      <section className="prose">
        <h2>Le catalogue</h2>
        <p>
          Les titres, synopsis, affiches, notes et dates proviennent de <strong>TMDB</strong>. Le navigateur
          interroge uniquement notre serveur (<code>/api/catalog</code>), qui relaie la demande vers l’API TMDB :
          aucune clé n’est exposée côté client.
        </p>
        <p className="muted">
          Les métadonnées ne confèrent aucun droit de diffusion. Elles servent uniquement à décrire les contenus.
        </p>

        <h2>Le lecteur</h2>
        <p>
          La lecture s’effectue dans une iframe 16:9 fournie par le lecteur partenaire. Ses contrôles, ses menus et
          ses éventuelles étapes publicitaires sont gérés par le lecteur lui-même : {SITE_NAME} ne les modifie pas et
          n’intègre aucun script vidéo tiers.
        </p>

        <h2>Ce qui reste sur votre appareil</h2>
        <p>
          « Ma liste », l’historique de lecture et l’épisode marqué comme vu sont stockés dans le navigateur
          (localStorage). Aucun compte n’est nécessaire et aucune donnée de lecture n’est envoyée à {SITE_NAME}.
        </p>

        <h2>Financement et notifications</h2>
        <p>
          Avant la lecture, un panneau publicitaire peut être proposé dans le même cadre que le lecteur : il ouvre la
          page d’un partenaire publicitaire, que vous fermez pour lancer la lecture. Les notifications, si votre
          navigateur les autorise, sont publicitaires ; leur refus n’empêche jamais la lecture.
        </p>
        <p>
          <Link to="/confidentialite">Consulter la notice de confidentialité</Link>.
        </p>
      </section>

      <section className="credits-card">
        <div className="credits-head">
          <img src="/tmdb-logo.svg" alt="TMDB" width="180" height="24" loading="lazy" decoding="async" />
        </div>
        <p className="credits-required">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p className="muted">
          Ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB. Affiches et fonds sont servis
          depuis <span className="mono">image.tmdb.org</span> (w500 pour les affiches, w1280 pour les fonds).
        </p>
        <a className="btn btn-ghost" href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">
          <IconExternal />
          Site officiel TMDB
        </a>
      </section>

      <section className="prose">
        <h2>Accessibilité</h2>
        <p className="icon-line">
          <IconShield />
          Thème sombre par défaut et thème clair accessible, navigation clavier complète (rails, modales, filtres),
          focus visible, contrastes vérifiés et respect de la préférence système « animations réduites ».
        </p>
        <p className="icon-line">
          <IconFilm />
          Films et séries ont des fiches distinctes ; les séries affichent saisons et épisodes numérotés.
        </p>
        <p className="icon-line">
          <IconTv />
          Les animés sont identifiés dans le catalogue TMDB par le genre Animation et la langue originale japonaise.
        </p>
      </section>
    </div>
  );
}
