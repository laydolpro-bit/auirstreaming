/**
 * auirstream - fonction Netlify : GET /api/config
 *
 * Expose uniquement de la configuration PUBLIQUE (jamais de secret) :
 *   - l'URL du Smartlink du site, lue dans la variable privee NETWORK_SMARTLINK_URL.
 *     Cette adresse est de toute facon visible par le visiteur dans le panneau
 *     publicitaire du lecteur : ce n'est pas un secret, mais elle est servie par
 *     le serveur pour pouvoir etre modifiee sans reconstruire le site.
 *   - la zone des notifications push (publique egalement).
 *
 * Aucun secret TMDB ni token n'est expose ici.
 */
const DEFAULT_SMARTLINK = 'https://celyntor.xyz/go/5nSgY6oIZsesHyfOIpup8_Om';
const PUSH_ZONE_ID = '3231865';

export const handler = async (event) => {
  const method = (event.httpMethod || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return respond(405, { error: 'METHOD_NOT_ALLOWED', message: 'Seule la methode GET est autorisee.' }, { Allow: 'GET, HEAD' });
  }

  const smartlinkUrl = sanitizeUrl(process.env.NETWORK_SMARTLINK_URL) || DEFAULT_SMARTLINK;

  return respond(200, {
    siteName: 'auirstream',
    smartlink: {
      enabled: Boolean(smartlinkUrl),
      url: smartlinkUrl,
    },
    push: {
      zoneId: PUSH_ZONE_ID,
      enabled: true,
    },
    // Le lecteur conserve sa cle publique d'integration (parametre pk).
    player: {
      provider: 'fluxora',
      embedPath: '/embed/zenix',
      origin: 'https://fluxora.sbs',
    },
  });
};

function sanitizeUrl(value) {
  if (!value || typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!/^https:\/\/[^\s"'<>]+$/i.test(trimmed)) return '';
  try {
    const url = new URL(trimmed);
    return url.toString();
  } catch {
    return '';
  }
}

function respond(status, body, extraHeaders) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(body),
  };
}
