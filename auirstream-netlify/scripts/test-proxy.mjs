/**
 * auirstream — test des règles du proxy catalogue (sans réseau).
 *
 * On vérifie que le proxy n'accepte que les chemins TMDB de métadonnées, et
 * qu'il refuse les URLs arbitraires, les traversées de chemin et les
 * paramètres inconnus. La clé utilisée ici est factice : aucun appel n'est émis.
 *
 * Usage : npm run test:proxy
 */
import assert from 'node:assert/strict';
import { buildTmdbUrl, validateQueryParams, validateTmdbPath, ProxyError, checkRateLimit } from '../server/tmdb.mjs';

const FAKE_KEY = 'CLE-DE-TEST-NON-REELLE';
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

function expectError(fn, code) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof ProxyError, `type d'erreur inattendu : ${error}`);
    if (code) assert.equal(error.code, code, `code attendu ${code}, reçu ${error.code}`);
    return error;
  }
  throw new Error('aucune erreur levée alors qu’une erreur était attendue');
}

/* --------------------------- Chemins autorisés --------------------------- */
for (const path of [
  '/movie/550',
  '/movie/550/credits',
  '/movie/550/videos',
  '/movie/popular',
  '/movie/top_rated',
  '/movie/upcoming',
  '/tv/1399',
  '/tv/1399/season/1',
  '/tv/1399/season/1/episode/2',
  '/tv/popular',
  '/search/movie',
  '/discover/movie',
  '/discover/tv',
  '/trending/all/week',
  '/trending/movie/day',
  '/genre/movie/list',
  '/genre/tv/list',
  '/configuration/languages',
  '/configuration/countries',
  '/tv/1399/recommendations',
]) {
  test(`chemin autorisé : ${path}`, () => {
    assert.equal(validateTmdbPath(path), path);
  });
}

/* --------------------------- Chemins refusés ---------------------------- */
const rejected = [
  ['URL absolue', 'https://api.themoviedb.org/3/movie/550'],
  ['URL avec schéma relatif', '//evil.test/movie/550'],
  ['traversée de chemin', '/movie/../configuration'],
  ['traversée encodée', '/movie/%2e%2e/configuration'],
  ['antislash', '/movie\\550'],
  ['racine inconnue', '/person/287'],
  ['racine administrateur', '/authentication/token/new'],
  ['sous-chemin inconnu', '/movie/550/hack'],
  ['profondeur excessive', '/movie/550/credits/a/b/c/d'],
  ['double slash', '//movie/550'],
  ['segment vide', '/movie//550'],
  ['caractères exotiques', '/movie/550<script>'],
];
for (const [label, path] of rejected) {
  test(`chemin refusé : ${label}`, () => {
    expectError(() => validateTmdbPath(path));
  });
}

/* -------------------------- Paramètres autorisés ------------------------- */
test('paramètres autorisés acceptés et normalisés', () => {
  const search = validateQueryParams({
    language: 'fr-FR',
    page: '2',
    sort_by: 'popularity.desc',
    with_genres: '16,10759',
    with_original_language: 'ja',
    'primary_release_date.gte': '2010-01-01',
  });
  assert.equal(search.get('language'), 'fr-FR');
  assert.equal(search.get('page'), '2');
  assert.equal(search.get('with_genres'), '16,10759');
  assert.equal(search.get('primary_release_date.gte'), '2010-01-01');
});

test('paramètre inconnu refusé', () => {
  expectError(() => validateQueryParams({ api_key: 'volée' }), 'PARAM_NOT_ALLOWED');
  expectError(() => validateQueryParams({ append_to_response: 'videos', evil: '1' }), 'PARAM_NOT_ALLOWED');
});

test('valeurs invalides refusées', () => {
  expectError(() => validateQueryParams({ language: 'français' }), 'PARAM_INVALID');
  expectError(() => validateQueryParams({ page: 'abc' }), 'PARAM_INVALID');
  expectError(() => validateQueryParams({ sort_by: 'DROP TABLE movie' }), 'PARAM_INVALID');
  expectError(() => validateQueryParams({ year: '20200' }), 'PARAM_INVALID');
});

test('page hors bornes refusée (1 à 500)', () => {
  expectError(() => validateQueryParams({ page: '0' }), 'PARAM_INVALID');
  expectError(() => validateQueryParams({ page: '9999' }), 'PARAM_INVALID');
});

test('/search exige une requête', () => {
  expectError(() => buildTmdbUrl('/search/multi', {}, FAKE_KEY), 'QUERY_REQUIRED');
});

test('la clé est ajoutée côté serveur et pointe vers TMDB', () => {
  const { url } = buildTmdbUrl('/movie/550', { language: 'fr-FR' }, FAKE_KEY);
  assert.equal(url.origin, 'https://api.themoviedb.org');
  assert.equal(url.pathname, '/3/movie/550');
  assert.equal(url.searchParams.get('api_key'), FAKE_KEY);
  assert.equal(url.searchParams.get('language'), 'fr-FR');
});

test('TMDB_BASE personnalisable côté serveur', () => {
  process.env.TMDB_BASE = 'https://proxy-interne.test/tmdb/3';
  const { url } = buildTmdbUrl('/tv/1399', {}, FAKE_KEY);
  assert.equal(url.origin, 'https://proxy-interne.test');
  delete process.env.TMDB_BASE;
});

test('limitation de débit par client', () => {
  let last = null;
  for (let i = 0; i < 95; i += 1) last = checkRateLimit('test-client-limite');
  assert.equal(last.allowed, false);
  assert.ok(last.retryAfter > 0);
  assert.equal(checkRateLimit('autre-client').allowed, true);
});

console.log('\nProxy catalogue (validation des chemins et paramètres)\n');
console.log(results.join('\n'));
console.log(process.exitCode ? '\nDes tests ont échoué.\n' : '\nTous les tests proxy sont passés.\n');
