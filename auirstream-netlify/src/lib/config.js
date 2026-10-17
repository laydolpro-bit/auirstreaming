/**
 * auirstream - constantes publiques cote navigateur.
 *
 * Aucun secret ici : la cle TMDB reste sur le serveur (/api/catalog).
 * La cle du lecteur (pk) est une cle PUBLIQUE d'integration Fluxora qui doit
 * figurer dans chaque URL de lecture ; ce n'est pas un secret TMDB.
 */

export const SITE_NAME = 'auirstream';

/** Cle publique d'integration du lecteur : conservee a l'identique partout. */
export const FLUXORA_PK = 'jKh9GEZJ5oIiWyrSErnlf4oPl0mV8j';
export const FLUXORA_ORIGIN = 'https://fluxora.sbs';
export const FLUXORA_EMBED_PATH = '/embed/zenix';

/** Adresse publique du Smartlink du site (aucun secret : elle est visible). */
export const DEFAULT_SMARTLINK_URL = 'https://celyntor.xyz/go/5nSgY6oIZsesHyfOIpup8_Om';

/** Zone du dispositif de notifications publicitaires (publique). */
export const PUSH_ZONE_ID = '3231865';
export const PUSH_SDK_URL = `https://push-sdk.com/f/sdk.js?z=${PUSH_ZONE_ID}`;
export const PUSH_WORKER_PATH = `/${PUSH_ZONE_ID}.sw.js`;

/** Langue des metadonnees TMDB. */
export const TMDB_LANGUAGE = 'fr-FR';

/** Langues de lecture disponibles (parametre `lang` du lecteur). */
export const AUDIO_LANGS = [
  { id: 'vf', label: 'VF', title: 'Version française' },
  { id: 'vo', label: 'VO', title: 'Version originale sous-titrée' },
];

export const POSTER_SIZE = 'w500';
export const BACKDROP_SIZE = 'w1280';
export const IMAGE_BASE = 'https://image.tmdb.org/t/p';
