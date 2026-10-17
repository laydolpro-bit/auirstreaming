/**
 * auirstream - notifications publicitaires (integration du prestataire).
 *
 * Regles strictes respectees ici :
 *   - AUCUNE interface ajoutee : pas de panneau, banniere, faux dialogue
 *     systeme ni bouton « Activer les notifications ». Le prestataire et le
 *     navigateur gerent seuls la demande d'autorisation native.
 *   - Le script prestataire est charge une seule fois (garde module + garde
 *     globale, utile avec React StrictMode et les doubles imports).
 *   - Les callbacks fournis par le prestataire sont conserves a l'identique.
 *   - click_id / source_id de l'URL d'arrivee sont conserves (sessionStorage)
 *     pour rester disponibles meme apres une navigation interne (SPA).
 *   - Aucun autre SDK push n'est charge.
 *   - Un refus d'autorisation est respecte : aucun rechargement a chaque page.
 *
 * Le chargement du script n'est PAS une preuve d'abonnement.
 */
import { PUSH_SDK_URL, PUSH_ZONE_ID } from './config.js';

const CLICK_ID_KEY = 'auirstream.push.click_id';
const SOURCE_ID_KEY = 'auirstream.push.source_id';
const SCRIPT_FLAG = 'data-auirstream-push-sdk';
const GLOBAL_GUARD = '__auirstreamPushSdk';

/** Etat interne, expose en lecture pour la page Confidentialite. */
export const pushState = {
  attempted: false,
  attempts: 0,
  status: 'idle', // idle | unsupported | loading | loaded | error
  reason: '',
};

/** Conserve click_id / source_id de l'URL d'arrivee (aucune donnee personnelle). */
export function captureCampaignIds() {
  try {
    const url = new URL(window.location.href);
    const clickId = url.searchParams.get('click_id');
    const sourceId = url.searchParams.get('source_id');
    if (clickId) window.sessionStorage.setItem(CLICK_ID_KEY, clickId);
    if (sourceId) window.sessionStorage.setItem(SOURCE_ID_KEY, sourceId);
  } catch {
    /* stockage indisponible : on continue sans identifiants */
  }
}

export function getCampaignIds() {
  try {
    return {
      clickId: window.sessionStorage.getItem(CLICK_ID_KEY) || null,
      sourceId: window.sessionStorage.getItem(SOURCE_ID_KEY) || null,
    };
  } catch {
    return { clickId: null, sourceId: null };
  }
}

/**
 * Verifie les prerequis techniques avant tout chargement du SDK.
 * Renvoie { supported, reason } — `reason` sert a expliquer l'indisponibilite
 * (page Confidentialite), sans jamais promettre une compatibilite universelle.
 */
export function pushSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'indisponible pendant le rendu serveur' };
  }
  if (!window.isSecureContext) {
    return { supported: false, reason: 'le site doit être servi en HTTPS (contexte sécurisé)' };
  }
  if (typeof window.Notification === 'undefined') {
    return { supported: false, reason: 'ce navigateur ne prend pas en charge les notifications' };
  }
  if (window.Notification.permission === 'denied') {
    return { supported: false, reason: 'les notifications sont refusées dans ce navigateur' };
  }
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'ce navigateur ne gère pas les service workers' };
  }
  if (!('PushManager' in window)) {
    return { supported: false, reason: 'ce navigateur ne prend pas en charge les notifications push' };
  }
  return { supported: true, reason: '' };
}

/** Etat reel lu depuis le navigateur (jamais une supposition). */
export function notificationStatus() {
  if (typeof window === 'undefined' || typeof window.Notification === 'undefined') return 'unsupported';
  return window.Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Charge le SDK prestataire une seule fois.
 *
 * Le corps de la fonction est celui fourni par le prestataire : meme zone,
 * meme URL, memes callbacks. Le reacteur `onload` recoit bien les options du
 * SDK (on ne le remplace par aucun ecouteur DOM).
 */
export function initPushSdk() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return pushState;
  if (window[GLOBAL_GUARD] === 'done' || pushState.status === 'loaded') return pushState;

  // Garde globale : evite tout double chargement (React StrictMode, remount,
  // double import du module, deux appels de main.jsx...).
  if (window[GLOBAL_GUARD] === 'loading') return pushState;
  window[GLOBAL_GUARD] = 'loading';
  pushState.attempted = true;
  pushState.attempts += 1;

  if (document.querySelector(`script[${SCRIPT_FLAG}]`)) {
    pushState.status = 'loaded';
    window[GLOBAL_GUARD] = 'done';
    return pushState;
  }

  const support = pushSupport();
  if (!support.supported) {
    pushState.status = 'unsupported';
    pushState.reason = support.reason;
    window[GLOBAL_GUARD] = 'done';
    return pushState;
  }

  captureCampaignIds();
  const { clickId, sourceId } = getCampaignIds();

  pushState.status = 'loading';

  const s = document.createElement('script');
  s.async = true;
  s.dataset.cfasync = 'false';
  s.setAttribute(SCRIPT_FLAG, 'true');
  s.dataset.zone = String(PUSH_ZONE_ID);
  s.src = PUSH_SDK_URL;

  // --- Corps conserve tel que fourni par le prestataire ---
  s.onload = (opts) => {
    pushState.status = 'loaded';
    window[GLOBAL_GUARD] = 'done';
    opts.zoneID = 3231865;
    opts.extClickID = clickId;
    opts.subID1 = sourceId;
    opts.actions.onPermissionGranted = () => {};
    opts.actions.onPermissionDenied = () => {};
    opts.actions.onAlreadySubscribed = () => {};
    opts.actions.onError = () => {};
  };

  s.onerror = () => {
    pushState.status = 'error';
    pushState.reason = 'le SDK de notifications n’a pas pu être chargé (réseau ou bloqueur)';
    window[GLOBAL_GUARD] = 'error';
    // Le script en échec est retiré du DOM : sans cela, la garde
    // `document.querySelector` empêcherait toute nouvelle tentative.
    if (s.parentNode && typeof s.parentNode.removeChild === 'function') {
      s.parentNode.removeChild(s);
    }
    // Autorise une seule nouvelle tentative lors d'une interaction reelle.
    armSingleRetry();
  };

  document.head.appendChild(s);
  return pushState;
}

/**
 * Une seule nouvelle tentative, declenchee par une interaction normale deja
 * presente sur le site (clic, toucher, touche clavier). Aucun panneau, aucune
 * demande forcee : si le navigateur exige un geste utilisateur, ce geste est
 * celui du visiteur.
 */
function armSingleRetry() {
  if (pushState.attempts > 1 || typeof window === 'undefined') return;
  const events = ['pointerdown', 'keydown', 'touchend'];
  const onGesture = () => {
    events.forEach((name) => window.removeEventListener(name, onGesture));
    if (window[GLOBAL_GUARD] === 'error') {
      window[GLOBAL_GUARD] = 'idle';
      initPushSdk();
    }
  };
  events.forEach((name) => window.addEventListener(name, onGesture, { passive: true, once: false }));
}

/** Point d'entree unique appele au demarrage de l'application. */
export function setupPush() {
  captureCampaignIds();
  try {
    initPushSdk();
  } catch {
    pushState.status = 'error';
    pushState.reason = 'initialisation impossible dans ce navigateur';
  }
  return pushState;
}
