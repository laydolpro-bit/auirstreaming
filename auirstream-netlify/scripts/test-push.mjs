/**
 * auirstream — test du module de notifications publicitaires.
 *
 * Aucun réseau, aucune souscription, aucune autorisation réelle : le DOM,
 * le SDK et les permissions sont simulés. On vérifie :
 *   - le chargement UNIQUE (garde anti double-chargement, React StrictMode) ;
 *   - l'URL, la zone et les callbacks fournis par le prestataire ;
 *   - la transmission de click_id / source_id, conservés même après
 *     une navigation interne (SPA) ;
 *   - le traitement de s.onerror et la reprise unique après un geste réel ;
 *   - l'absence de chargement quand l'environnement ne le permet pas.
 *
 * Usage : npm run test:push
 */
import assert from 'node:assert/strict';

const ZONE = 3231865;
const SDK_SRC = `https://push-sdk.com/f/sdk.js?z=${ZONE}`;

/* ------------------------- Faux navigateur ------------------------- */
function createFakeBrowser({ secure = true, permission = 'default', pushManager = true, serviceWorker = true, href = 'https://auirstream.test/?click_id=click123&source_id=source42' } = {}) {
  const created = [];
  const listeners = new Map();

  const matches = (el, selector) => {
    if (selector === 'script[data-auirstream-push-sdk]') return el.attrs['data-auirstream-push-sdk'] !== undefined;
    return false;
  };

  const makeElement = (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      attrs: {},
      dataset: {},
      _events: {},
      setAttribute(name, value) {
        this.attrs[name] = String(value);
      },
      getAttribute(name) {
        return this.attrs[name];
      },
      addEventListener(name, fn) {
        this._events[name] = fn;
      },
      matches(selector) {
        return matches(this, selector);
      },
    };
    return el;
  };

  const sessionStorage = {
    store: new Map(),
    getItem(k) {
      return this.store.has(k) ? this.store.get(k) : null;
    },
    setItem(k, v) {
      this.store.set(k, String(v));
    },
    removeItem(k) {
      this.store.delete(k);
    },
  };

  const window = {
    isSecureContext: secure,
    location: { href },
    document: null,
    Notification: { permission },
    sessionStorage,
    addEventListener(name, fn) {
      const list = listeners.get(name) || [];
      list.push(fn);
      listeners.set(name, list);
    },
    removeEventListener(name, fn) {
      const list = listeners.get(name) || [];
      listeners.set(name, list.filter((entry) => entry !== fn));
    },
    dispatch(name) {
      (listeners.get(name) || []).slice().forEach((fn) => fn({ type: name }));
    },
    listenerCount(name) {
      return (listeners.get(name) || []).length;
    },
  };

  if (pushManager) window.PushManager = function PushManager() {};

  const mounted = [];

  const document = {
    head: {
      appendChild(el) {
        created.push(el);
        mounted.push(el);
        el.parentNode = document.head;
      },
      removeChild(el) {
        const at = mounted.indexOf(el);
        if (at >= 0) mounted.splice(at, 1);
        el.parentNode = null;
        return el;
      },
    },
    createElement: makeElement,
    querySelector(selector) {
      return mounted.find((el) => el.tagName === 'SCRIPT' && matches(el, selector)) || null;
    },
  };

  window.document = document;

  return { window, document, created, mounted, listeners, sessionStorage };
}

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function install(browser, navigatorValue = { serviceWorker: {} }) {
  defineGlobal('window', browser.window);
  defineGlobal('document', browser.document);
  defineGlobal('navigator', navigatorValue);
}

let modules = 0;
async function freshPushModule() {
  modules += 1;
  return import(`../src/lib/push.js?t=${modules}`);
}

/* ------------------------------- Tests ------------------------------ */
const results = [];
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => results.push(`  OK   ${name}`))
    .catch((error) => {
      results.push(`  FAIL ${name}\n         ${error.message}`);
      process.exitCode = 1;
    });
}

await test('charge le SDK une seule fois, même appelé trois fois (StrictMode)', async () => {
  const browser = createFakeBrowser();
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  push.setupPush();
  push.setupPush();
  assert.equal(browser.created.length, 1, 'le script ne doit être ajouté qu’une fois');
  const [script] = browser.created;
  assert.equal(script.src, SDK_SRC);
  assert.equal(script.async, true);
  assert.equal(script.dataset.cfasync, 'false');
  assert.equal(script.getAttribute('data-auirstream-push-sdk'), 'true');
  assert.equal(browser.window.__auirstreamPushSdk, 'loading');
});

await test('conserve zone, callbacks et identifiants de campagne dans onload', async () => {
  const browser = createFakeBrowser();
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  const [script] = browser.created;
  const opts = { actions: {} };
  script.onload(opts);
  assert.equal(opts.zoneID, ZONE);
  assert.equal(opts.extClickID, 'click123');
  assert.equal(opts.subID1, 'source42');
  for (const key of ['onPermissionGranted', 'onPermissionDenied', 'onAlreadySubscribed', 'onError']) {
    assert.equal(typeof opts.actions[key], 'function', `callback ${key} manquant`);
  }
  assert.equal(push.pushState.status, 'loaded');
});

await test('conserve click_id / source_id après une navigation SPA sans paramètres', async () => {
  const browser = createFakeBrowser({ href: 'https://auirstream.test/?click_id=abc9&source_id=src7' });
  install(browser);
  const push = await freshPushModule();
  push.captureCampaignIds();
  assert.deepEqual(push.getCampaignIds(), { clickId: 'abc9', sourceId: 'src7' });
  browser.window.location.href = 'https://auirstream.test/serie/1399'; // navigation interne
  assert.deepEqual(push.getCampaignIds(), { clickId: 'abc9', sourceId: 'src7' });
});

await test('aucun identifiant si l’URL d’arrivée n’en contient pas', async () => {
  const browser = createFakeBrowser({ href: 'https://auirstream.test/films' });
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  const [script] = browser.created;
  const opts = { actions: {} };
  script.onload(opts);
  assert.equal(opts.extClickID, null);
  assert.equal(opts.subID1, null);
});

await test('s.onerror : état d’erreur, puis une seule reprise sur geste réel', async () => {
  const browser = createFakeBrowser();
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  assert.equal(browser.created.length, 1);
  browser.created[0].onerror();
  assert.equal(push.pushState.status, 'error');
  assert.equal(browser.created.length, 1, 'aucun rechargement immédiat');
  browser.window.dispatch('pointerdown'); // geste normal du visiteur
  assert.equal(browser.created.length, 2, 'une seule nouvelle tentative après un geste');
  assert.equal(push.pushState.attempts, 2, 'pas de boucle de rechargement');
  browser.window.dispatch('pointerdown');
  assert.equal(browser.created.length, 2, 'aucune tentative supplémentaire');
  assert.equal(browser.window.listenerCount('pointerdown'), 0, 'les écouteurs de geste sont retirés');
});

await test('ne charge rien hors HTTPS (window.isSecureContext faux)', async () => {
  const browser = createFakeBrowser({ secure: false });
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  assert.equal(browser.created.length, 0);
  assert.equal(push.pushState.status, 'unsupported');
  assert.match(push.pushState.reason, /HTTPS/i);
});

await test('respecte un refus déjà exprimé (permission denied) sans relancer la demande', async () => {
  const browser = createFakeBrowser({ permission: 'denied' });
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  assert.equal(browser.created.length, 0);
  assert.equal(push.pushState.status, 'unsupported');
  assert.equal(push.notificationStatus(), 'denied');
});

await test('ne charge rien sans PushManager (navigateur non compatible)', async () => {
  const browser = createFakeBrowser({ pushManager: false });
  install(browser);
  const push = await freshPushModule();
  push.setupPush();
  assert.equal(browser.created.length, 0);
  assert.equal(push.pushState.status, 'unsupported');
});

await test('ne charge rien sans service worker', async () => {
  const browser = createFakeBrowser({ serviceWorker: false });
  install(browser, {});
  const push = await freshPushModule();
  push.setupPush();
  assert.equal(browser.created.length, 0);
  assert.equal(push.pushState.status, 'unsupported');
});

console.log('\nNotifications publicitaires (SDK et permissions simulés)\n');
console.log(results.join('\n'));
console.log(process.exitCode ? '\nDes tests ont échoué.\n' : '\nTous les tests push sont passés (aucune souscription réelle).\n');
