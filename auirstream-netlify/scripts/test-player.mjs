/**
 * auirstream — test des URLs du lecteur Fluxora.
 *
 * Vérifie que la clé publique d'intégration `pk` est présente à l'identique
 * dans TOUTES les URLs (films et épisodes), que les paramètres sont dans le
 * bon ordre et que la détection d'URL invalide fonctionne.
 *
 * Usage : npm run test:player
 */
import assert from 'node:assert/strict';
import { buildPlayerUrl, isPlayerUrlValid, playTargetFor } from '../src/lib/player.js';
import { FLUXORA_PK } from '../src/lib/config.js';

const PK = 'jKh9GEZJ5oIiWyrSErnlf4oPl0mV8j';
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push(`  OK   ${name}`);
  } catch (error) {
    results.push(`  FAIL ${name}\n         ${error.message}`);
    process.exitCode = 1;
  }
}

test('la clé publique du lecteur est celle attribuée', () => {
  assert.equal(FLUXORA_PK, PK);
});

test('film : URL exacte attendue', () => {
  const url = buildPlayerUrl({ type: 'movie', tmdbId: 550, lang: 'vf' });
  assert.equal(url, `https://fluxora.sbs/embed/zenix?tmdb=550&type=movie&lang=vf&pk=${PK}`);
});

test('série : saison et épisode inclus', () => {
  const url = buildPlayerUrl({ type: 'tv', tmdbId: 79744, lang: 'vf', season: 1, episode: 1 });
  assert.equal(url, `https://fluxora.sbs/embed/zenix?tmdb=79744&type=tv&lang=vf&season=1&episode=1&pk=${PK}`);
});

test('version originale (vo) transmise', () => {
  const url = buildPlayerUrl({ type: 'movie', tmdbId: 550, lang: 'vo' });
  assert.match(url, /&lang=vo&/);
});

test('langue inconnue : repli sur vf', () => {
  const url = buildPlayerUrl({ type: 'movie', tmdbId: 550, lang: 'de' });
  assert.match(url, /&lang=vf&/);
});

test('saison/épisode nettoyés (valeurs invalides ramenées à 1)', () => {
  const url = buildPlayerUrl({ type: 'tv', tmdbId: 1399, lang: 'vf', season: 'abc', episode: -4 });
  assert.match(url, /&season=1&episode=1&/);
});

test('identifiant TMDB manquant : erreur explicite', () => {
  assert.throws(() => buildPlayerUrl({ type: 'movie', tmdbId: null }), /Identifiant TMDB manquant/);
});

test('pk conservée dans toutes les URLs (film, série, plusieurs épisodes)', () => {
  const urls = [
    buildPlayerUrl({ type: 'movie', tmdbId: 550 }),
    buildPlayerUrl({ type: 'tv', tmdbId: 79744, season: 2, episode: 7 }),
    buildPlayerUrl({ type: 'tv', tmdbId: 1399, season: 8, episode: 6 }),
  ];
  for (const url of urls) {
    assert.equal(new URL(url).searchParams.get('pk'), PK, `pk absente ou modifiée : ${url}`);
    assert.ok(isPlayerUrlValid(url), `URL de lecteur invalide : ${url}`);
  }
});

test('détection d’une URL de lecteur sans pk', () => {
  assert.equal(isPlayerUrlValid('https://fluxora.sbs/embed/zenix?tmdb=550&type=movie&lang=vf'), false);
  assert.equal(isPlayerUrlValid('https://exemple.test/embed/zenix?tmdb=550&pk=' + PK), false);
});

test('cible de lecture déduite du type de contenu', () => {
  assert.deepEqual(playTargetFor({ id: 550, type: 'movie' }, { lang: 'vo' }), { type: 'movie', tmdbId: 550, lang: 'vo' });
  assert.deepEqual(playTargetFor({ id: 79744, type: 'tv' }, { lang: 'vf', season: 3, episode: 4 }), {
    type: 'tv',
    tmdbId: 79744,
    lang: 'vf',
    season: 3,
    episode: 4,
  });
});

console.log('\nLecteur Fluxora (URLs et clé d’intégration)\n');
console.log(results.join('\n'));
console.log(process.exitCode ? '\nDes tests ont échoué.\n' : '\nTous les tests lecteur sont passés.\n');
