import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSiteConfig, fetchSeason } from '../lib/api.js';
import { DEFAULT_SMARTLINK_URL } from '../lib/config.js';
import { backdropUrl, posterUrl } from '../lib/format.js';
import { useDialogA11y, useBodyScrollLock, useFullscreen } from '../lib/hooks.js';
import { buildPlayerUrl, isPlayerUrlValid } from '../lib/player.js';
import { markEpisodeWatched, recordProgress } from '../lib/storage.js';
import { useAudioLang, useStorageVersion } from '../state/AppState.jsx';
import { AUDIO_LANGS } from '../lib/config.js';
import {
  IconAlert,
  IconCheck,
  IconClose,
  IconExpand,
  IconExternal,
  IconPlay,
  IconRefresh,
  IconShrink,
} from './Icons.jsx';

const PLAYER_LOAD_TIMEOUT_MS = 15000;
const MAX_IFRAME_RETRIES = 2;

/**
 * Lecteur en modale sombre.
 *
 * Etapes :
 *   1. Panneau publicitaire du site (uniquement si le Smartlink est configuré),
 *      affiché DANS le même cadre 16:9 que le lecteur : visuel flouté discret,
 *      un seul bouton explicite. Aucun faux compteur, aucun clic automatique.
 *   2. Retour au site : bouton « Lancer la lecture ».
 *   3. Iframe Fluxora intacte (aucune modification de ses contrôles),
 *      avec message d'erreur et possibilité de réessayer (nombre limité).
 */
export default function PlayerModal({ request, onClose }) {
  const { lang, setLang } = useAudioLang();
  useStorageVersion();
  const [phase, setPhase] = useState('loading');
  const [episode, setEpisode] = useState(request?.episode || 1);
  const [season, setSeason] = useState(request?.season || 1);
  const [episodeCount, setEpisodeCount] = useState(request?.episodeCount || 0);
  const [adOpened, setAdOpened] = useState(false);
  const [adBlocked, setAdBlocked] = useState(false);
  const [iframeNonce, setIframeNonce] = useState(0);
  const [retries, setRetries] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [markedWatched, setMarkedWatched] = useState(false);
  const [smartlink, setSmartlink] = useState(DEFAULT_SMARTLINK_URL);
  const [configLoaded, setConfigLoaded] = useState(false);

  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const closeButtonRef = useRef(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(frameRef);
  useBodyScrollLock(Boolean(request));
  useDialogA11y({ open: Boolean(request), onClose, initialFocusRef: closeButtonRef });

  const item = request?.item || null;
  const isTv = item?.type === 'tv';

  /* Configuration publique : le panneau publicitaire n'apparaît que si un
     Smartlink est réellement configuré. Sinon, lecture directe. */
  useEffect(() => {
    let active = true;
    getSiteConfig()
      .then((config) => {
        if (!active) return;
        const url = config?.smartlink?.enabled ? config.smartlink.url : '';
        setSmartlink(url || '');
        setConfigLoaded(true);
      })
      .catch(() => {
        if (active) {
          setSmartlink(DEFAULT_SMARTLINK_URL);
          setConfigLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  /* Reinitialisation a chaque nouvelle demande de lecture. */
  useEffect(() => {
    if (!request) return;
    setPhase('loading');
    setEpisode(request.episode || 1);
    setSeason(request.season || 1);
    setEpisodeCount(request.episodeCount || 0);
    setAdOpened(false);
    setAdBlocked(false);
    setIframeNonce(0);
    setRetries(0);
    setIframeLoaded(false);
    setSlowLoad(false);
    setMarkedWatched(false);
  }, [request]);

  /* Le panneau publicitaire n'est proposé que si le Smartlink est prêt. */
  useEffect(() => {
    if (!request || !configLoaded) return;
    setPhase(smartlink ? 'ad' : 'player');
  }, [request, configLoaded, smartlink]);

  /* Nombre d'episodes de la saison (pour la navigation episode). */
  useEffect(() => {
    if (!request || !isTv || episodeCount) return;
    let active = true;
    fetchSeason(item.id, season)
      .then((data) => {
        if (active && data?.episodes?.length) setEpisodeCount(data.episodes.length);
      })
      .catch(() => {
        /* navigation episode limitee, la lecture reste possible */
      });
    return () => {
      active = false;
    };
  }, [request, isTv, item?.id, season, episodeCount]);

  const playerUrl = useMemo(() => {
    if (!item) return '';
    try {
      return buildPlayerUrl({ type: item.type, tmdbId: item.id, lang, season, episode });
    } catch {
      return '';
    }
  }, [item, lang, season, episode]);

  const urlIsValid = useMemo(() => isPlayerUrlValid(playerUrl), [playerUrl]);

  /* Surveillance du chargement de l'iframe : au-delà du délai, on propose une
     solution de repli sans jamais affirmer que le contenu est disponible. */
  useEffect(() => {
    if (phase !== 'player' || iframeLoaded) return undefined;
    setSlowLoad(false);
    const timer = setTimeout(() => setSlowLoad(true), PLAYER_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [phase, iframeLoaded, iframeNonce]);

  /* Enregistre la lecture reelle dans l'historique local. */
  useEffect(() => {
    if (phase !== 'player' || !item) return;
    recordProgress(item, { lang, season: isTv ? season : null, episode: isTv ? episode : null });
  }, [phase, item, lang, season, episode, isTv]);

  const launchPlayback = useCallback(() => setPhase('player'), []);

  const openSmartlink = useCallback(() => {
    if (!smartlink) return;
    // Ouverture uniquement sur un vrai clic. On ne prétend pas que l'ouverture
    // a réussi : si le navigateur la bloque, on l'indique et on propose un lien.
    let win = null;
    try {
      win = window.open(smartlink, '_blank');
    } catch {
      win = null;
    }
    if (win) {
      try {
        win.opener = null;
      } catch {
        /* ignore */
      }
    }
    setAdOpened(true);
    setAdBlocked(!win);
  }, [smartlink]);

  const retryIframe = useCallback(() => {
    if (retries >= MAX_IFRAME_RETRIES) return;
    setRetries((value) => value + 1);
    setIframeLoaded(false);
    setSlowLoad(false);
    setIframeNonce((value) => value + 1);
  }, [retries]);

  const toggleWatched = useCallback(() => {
    if (!item || !isTv) return;
    markEpisodeWatched(item, season, episode, !markedWatched);
    setMarkedWatched((value) => !value);
  }, [item, isTv, season, episode, markedWatched]);

  if (!request || !item) return null;

  const backdrop = backdropUrl(item.backdropPath) || posterUrl(item.posterPath);
  const maxEpisodes = episodeCount || 0;

  return (
    <div className="player-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="player-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
        ref={containerRef}
      >
        <header className="player-head">
          <div className="player-heading">
            <p className="player-eyebrow">{isTv ? 'Série' : 'Film'} · Lecture {lang.toUpperCase()}</p>
            <h2 id="player-title" className="player-name">
              {item.title}
            </h2>
            {isTv ? (
              <p className="player-sub">
                Saison {season} · Épisode {episode}
                {maxEpisodes ? ` sur ${maxEpisodes}` : ''}
              </p>
            ) : null}
          </div>
          <div className="player-head-actions">
            <div className="segmented" role="group" aria-label="Langue de lecture">
              {AUDIO_LANGS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`segmented-btn${lang === option.id ? ' is-active' : ''}`}
                  aria-pressed={lang === option.id}
                  onClick={() => setLang(option.id)}
                  title={option.title}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            >
              {isFullscreen ? <IconShrink /> : <IconExpand />}
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-strong"
              onClick={onClose}
              ref={closeButtonRef}
              aria-label="Fermer le lecteur"
              title="Fermer (Échap)"
            >
              <IconClose />
            </button>
          </div>
        </header>

        <div className="player-stage" ref={frameRef}>
          <div className="player-frame" style={backdrop ? { '--frame-backdrop': `url("${backdrop}")` } : undefined}>
            {phase !== 'player' ? (
              <div className="ad-panel">
                <div className="ad-panel-backdrop" aria-hidden="true" />
                <div className="ad-panel-body">
                  <p className="ad-panel-kicker">Espace publicitaire du site</p>
                  <h3 className="ad-panel-title">Votre contenu est prêt</h3>
                  {!adOpened ? (
                    <>
                      <p className="ad-panel-text">
                        Avant de démarrer, ouvrez la page publicitaire de notre partenaire : elle finance
                        l’hébergement du site.
                      </p>
                      <button type="button" className="btn btn-primary btn-lg" onClick={openSmartlink}>
                        <IconExternal />
                        Ouvrir la publicité puis regarder
                      </button>
                      <p className="ad-panel-note">Cette publicité soutient le site.</p>
                    </>
                  ) : (
                    <>
                      <p className="ad-panel-text">
                        Fermez la page publicitaire et revenez ici pour lancer la lecture.
                      </p>
                      {adBlocked ? (
                        <p className="ad-panel-alert" role="alert">
                          <IconAlert />
                          L’ouverture automatique a été bloquée par le navigateur. Ouvrez la publicité avec
                          le lien ci-dessous.
                        </p>
                      ) : null}
                      <div className="ad-panel-actions">
                        <button type="button" className="btn btn-primary btn-lg" onClick={launchPlayback}>
                          <IconPlay />
                          Lancer la lecture
                        </button>
                        <a
                          className="btn btn-ghost"
                          href={smartlink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setAdOpened(true)}
                        >
                          <IconExternal />
                          {adBlocked ? 'Ouvrir la publicité (lien direct)' : 'Réouvrir la publicité'}
                        </a>
                      </div>
                      <p className="ad-panel-note">Cette publicité soutient le site.</p>
                    </>
                  )}
                </div>
              </div>
            ) : null}

            {phase === 'player' ? (
              <>
                {!urlIsValid ? (
                  <div className="player-fallback">
                    <IconAlert />
                    <p>URL de lecteur invalide : la clé d’intégration du lecteur est manquante.</p>
                  </div>
                ) : (
                  <iframe
                    key={`${playerUrl}-${iframeNonce}`}
                    className="player-iframe"
                    src={playerUrl}
                    title={`Lecteur vidéo — ${item.title}${isTv ? ` S${season} E${episode}` : ''}`}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="origin"
                    loading="eager"
                    onLoad={() => {
                      setIframeLoaded(true);
                      setSlowLoad(false);
                    }}
                  />
                )}
              </>
            ) : null}
          </div>
        </div>

        {phase === 'player' ? (
          <div className="player-bar">
            {isTv ? (
              <div className="player-ep-nav">
                <button
                  type="button"
                  className="btn btn-subtle"
                  onClick={() => {
                    if (episode > 1) setEpisode(episode - 1);
                    else if (season > 1) {
                      setSeason(season - 1);
                      setEpisode(1);
                    }
                  }}
                  disabled={season === 1 && episode === 1}
                >
                  Épisode précédent
                </button>
                <span className="player-ep-current">
                  S{season} · E{episode}
                </span>
                <button
                  type="button"
                  className="btn btn-subtle"
                  onClick={() => {
                    if (!maxEpisodes || episode < maxEpisodes) setEpisode(episode + 1);
                    else {
                      setSeason(season + 1);
                      setEpisode(1);
                    }
                  }}
                >
                  Épisode suivant
                </button>
                <button
                  type="button"
                  className={`btn btn-subtle${markedWatched ? ' is-active' : ''}`}
                  onClick={toggleWatched}
                  aria-pressed={markedWatched}
                >
                  <IconCheck />
                  {markedWatched ? 'Vu' : 'Marquer comme vu'}
                </button>
              </div>
            ) : (
              <span className="player-bar-note">
                {iframeLoaded
                  ? 'Lecture lancée dans le cadre ci-dessus. Aucune donnée de lecture n’est envoyée par auirstream.'
                  : 'Chargement du lecteur…'}
              </span>
            )}
            <div className="player-bar-actions">
              {slowLoad && retries < MAX_IFRAME_RETRIES ? (
                <button type="button" className="btn btn-subtle" onClick={retryIframe}>
                  <IconRefresh />
                  Réessayer le chargement
                </button>
              ) : null}
              {playerUrl ? (
                <a className="btn btn-subtle" href={playerUrl} target="_blank" rel="noopener noreferrer">
                  <IconExternal />
                  Ouvrir dans un nouvel onglet
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        {phase === 'player' && slowLoad && retries >= MAX_IFRAME_RETRIES ? (
          <p className="player-warning" role="status">
            <IconAlert />
            Le lecteur ne s’affiche pas dans cette page (bloqueur de publicité, réseau ou restriction du
            navigateur). Utilisez « Ouvrir dans un nouvel onglet ».
          </p>
        ) : null}
      </div>
    </div>
  );
}
