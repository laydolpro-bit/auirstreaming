import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PUSH_SDK_URL, PUSH_WORKER_PATH, SITE_NAME } from '../lib/config.js';
import { notificationStatus, pushSupport } from '../lib/push.js';

const STATUS_LABEL = {
  granted: 'autorisations accordées dans ce navigateur',
  denied: 'autorisations refusées dans ce navigateur',
  default: 'aucune réponse donnée pour le moment',
  unsupported: 'non pris en charge par ce navigateur',
};

export default function Privacy() {
  const [status, setStatus] = useState('unsupported');
  const [support, setSupport] = useState({ supported: false, reason: '' });

  useEffect(() => {
    setStatus(notificationStatus());
    setSupport(pushSupport());
  }, []);

  return (
    <div className="page page-narrow">
      <header className="page-head">
        <p className="page-kicker">Confidentialité</p>
        <h1 className="page-title">Notice de confidentialité</h1>
        <p className="page-lede">
          {SITE_NAME} ne demande aucun compte, ne collecte aucun profil et n’ajoute aucun outil de mesure d’audience
          sur le site. Voici précisément ce qui est stocké et par qui.
        </p>
      </header>

      <section className="prose">
        <h2>1. Données conservées dans votre navigateur</h2>
        <p>
          Les favoris (« Ma liste »), l’historique de lecture, la saison et l’épisode marqués comme vus, ainsi que vos
          préférences d’affichage (thème clair/sombre, VF/VO) sont enregistrés en <code>localStorage</code> sur votre
          appareil. Ces données ne sont transmises à {SITE_NAME} ni à aucun tiers. Vous pouvez les effacer à tout
          moment depuis les pages « Ma liste » et « Continuer à regarder », ou en vidant les données du site.
        </p>

        <h2>2. Catalogue TMDB via notre serveur</h2>
        <p>
          Les recherches et les fiches passent par notre proxy serveur (<code>/api/catalog</code>). Votre navigateur ne
          contacte jamais directement l’API TMDB et ne détient aucune clé. Côté serveur, la clé TMDB reste dans les
          variables privées de l’hébergeur.
        </p>
        <p>
          Les images (affiches, fonds) sont chargées depuis <span className="mono">image.tmdb.org</span>. À ce titre,
          TMDB et son hébergeur d’images peuvent recevoir des informations techniques habituelles de requête (adresse
          IP, agent utilisateur). Voir la{' '}
          <a href="https://www.themoviedb.org/privacy-policy" target="_blank" rel="noopener noreferrer">
            politique de confidentialité de TMDB
          </a>
          .
        </p>

        <h2>3. Lecteur vidéo partenaire</h2>
        <p>
          La lecture se fait dans une iframe fournie par le lecteur partenaire, dans un cadre 16:9. Lorsque vous
          lancez la lecture, ce service tiers peut utiliser ses propres cookies ou mesures, selon sa propre politique.
          {SITE_NAME} ne modifie pas ses contrôles et ne lui transmet aucune donnée de votre profil local.
        </p>

        <h2>4. Publicité du site (Smartlink)</h2>
        <p>
          Avant la lecture, un panneau affiché <em>dans le cadre du lecteur</em> peut proposer d’ouvrir la page
          publicitaire d’un partenaire. L’ouverture se produit uniquement sur un clic de votre part ; aucun clic
          automatique, aucune redirection masquée, aucun compteur fictif. Si le navigateur bloque l’ouverture, un lien
          explicite est proposé à la place.
        </p>
        <p>
          Le partenaire publicitaire peut déposer ses propres identifiants de campagne dans l’adresse de la page qu’il
          ouvre ({SITE_NAME} conserve uniquement <span className="mono">click_id</span> et{' '}
          <span className="mono">source_id</span> présents dans l’URL d’arrivée, sans donnée personnelle). Les
          éventuelles statistiques de ce dispositif sont fournies par le réseau publicitaire, jamais par {SITE_NAME} :
          aucune estimation de trafic ou de revenu n’est affichée ou inventée sur ce site.
        </p>

        <h2>5. Notifications publicitaires (facultatives)</h2>
        <p>
          Ce site intègre un dispositif de notifications publicitaires opéré par le prestataire{' '}
          <span className="mono">push-sdk.com</span> (zone <span className="mono">3231865</span>), pour le compte du
          réseau publicitaire de l’éditeur. Il sert à envoyer des messages publicitaires si — et seulement si — vous
          acceptez la demande d’autorisation native de votre navigateur.
        </p>
        <ul className="privacy-list">
          <li>
            Aucun panneau, bandeau ou faux dialogue système n’est affiché par {SITE_NAME} : la demande d’autorisation
            est celle de votre navigateur (« Autoriser » / « Bloquer »), et rien n’est cliqué à votre place.
          </li>
          <li>Un refus est respecté : la demande n’est pas relancée à chaque page ni à chaque lecture.</li>
          <li>La lecture des vidéos reste possible que vous acceptiez ou refusiez ces notifications.</li>
          <li>
            Service worker dédié : <span className="mono">{PUSH_WORKER_PATH}</span>, qui charge{' '}
            <span className="mono">{PUSH_SDK_URL}</span>. Aucun autre SDK de notifications n’est utilisé.
          </li>
          <li>
            Ces notifications sont distinctes de toute statistique de lecture : {SITE_NAME} n’attribue à ce dispositif
            aucun revenu ni suivi individuel.
          </li>
        </ul>

        <div className="privacy-status" role="status">
          <p className="privacy-status-title">État actuel dans ce navigateur</p>
          <p>
            Notifications : <strong>{STATUS_LABEL[status] || status}</strong>.
          </p>
          {!support.supported && support.reason ? (
            <p className="muted">
              Activation non proposée ici : {support.reason}. Vous pouvez modifier ce réglage dans les paramètres de
              votre navigateur ; la lecture reste disponible. La compatibilité n’est pas garantie sur tous les
              appareils, notamment sur iPhone.
            </p>
          ) : (
            <p className="muted">
              L’autorisation est gérée par votre navigateur et par le prestataire ; {SITE_NAME} ne peut ni la
              déclencher à votre place, ni confirmer un abonnement à votre insu.
            </p>
          )}
        </div>

        <h2>6. Aucun autre tiers</h2>
        <p>
          Le site ne charge aucun réseau social, aucun outil de mesure d’audience et aucun script publicitaire
          additionnel. Les seuls domaines externes réellement nécessaires sont <span className="mono">image.tmdb.org</span>{' '}
          (images), <span className="mono">fluxora.sbs</span> (lecteur), <span className="mono">push-sdk.com</span>{' '}
          (notifications publicitaires) et le domaine du partenaire publicitaire ouvert sur votre clic.
        </p>

        <p className="page-footnote">
          Voir aussi <Link to="/a-propos">À propos &amp; crédits</Link>.
        </p>
      </section>
    </div>
  );
}
