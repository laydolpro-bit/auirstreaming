import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { animesAvailable } from '../lib/api.js';
import { SITE_NAME } from '../lib/config.js';
import { useDebouncedValue } from '../lib/hooks.js';
import { useApp } from '../state/AppState.jsx';
import { IconHeart, IconMoon, IconSearch, IconSun } from './Icons.jsx';

const NAV = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/films', label: 'Films' },
  { to: '/series', label: 'Séries' },
  { to: '/animes', label: 'Animés', feature: 'animes' },
  { to: '/ma-liste', label: 'Ma liste' },
];

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { theme, toggleTheme } = useApp();
  const [animesOk, setAnimesOk] = useState(true);
  /* La recherche de l'en-tête reprend le paramètre ?q= dès le premier rendu :
     sinon, le debounce viderait un lien direct /recherche?q=… au montage. */
  const initialQuery = location.pathname === '/recherche' ? params.get('q') || '' : '';
  const [query, setQuery] = useState(initialQuery);
  const debounced = useDebouncedValue(query, 350);
  const inputRef = useRef(null);
  const lastSyncedQuery = useRef(initialQuery);

  /* L'entrée « Animés » n'apparaît que si le catalogue en contient. */
  useEffect(() => {
    let active = true;
    animesAvailable().then((ok) => active && setAnimesOk(ok));
    return () => {
      active = false;
    };
  }, []);

  /* Synchronisation avec l'URL quand on arrive sur /recherche?q=… */
  useEffect(() => {
    if (location.pathname === '/recherche') {
      const urlQuery = params.get('q') || '';
      if (urlQuery !== lastSyncedQuery.current) {
        lastSyncedQuery.current = urlQuery;
        setQuery(urlQuery);
      }
    }
  }, [location.pathname, params]);

  /* Recherche immédiate : debounce puis navigation. */
  useEffect(() => {
    const value = debounced.trim();
    if (location.pathname === '/recherche' && (params.get('q') || '') === value) return;
    if (!value) {
      if (location.pathname === '/recherche' && params.get('q')) navigate('/recherche', { replace: true });
      return;
    }
    lastSyncedQuery.current = value;
    navigate(`/recherche?q=${encodeURIComponent(value)}`, { replace: location.pathname === '/recherche' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  /* Raccourci clavier « / » pour atteindre la recherche. */
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      event.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onSubmit = (event) => {
    event.preventDefault();
    const value = query.trim();
    if (value) navigate(`/recherche?q=${encodeURIComponent(value)}`);
  };

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label={`${SITE_NAME} — accueil`}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30" role="presentation">
              <defs>
                <linearGradient id="auirstream-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" />
                  <stop offset="100%" stopColor="var(--accent-strong)" />
                </linearGradient>
              </defs>
              <rect x="2" y="6" width="28" height="20" rx="6" fill="url(#auirstream-grad)" opacity="0.18" />
              <path
                d="M13 11.6v8.8l7.4-4.4z"
                fill="url(#auirstream-grad)"
              />
              <rect x="2" y="6" width="28" height="20" rx="6" fill="none" stroke="url(#auirstream-grad)" strokeWidth="1.4" />
            </svg>
          </span>
          <span className="brand-text">
            auir<span className="brand-text-accent">stream</span>
          </span>
        </Link>

        <nav className="site-nav" id="site-nav" aria-label="Navigation principale">
          {NAV.filter((entry) => !entry.feature || entry.feature !== 'animes' || animesOk).map((entry) => (
            <NavLink
              key={entry.to}
              to={entry.to}
              end={entry.end}
              className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}
            >
              {entry.to === '/ma-liste' ? <IconHeart /> : null}
              {entry.label}
            </NavLink>
          ))}
        </nav>

        <form className="header-search" role="search" onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="site-search">
            Rechercher un film, une série ou un animé
          </label>
          <span className="header-search-icon" aria-hidden="true">
            <IconSearch />
          </span>
          <input
            id="site-search"
            ref={inputRef}
            type="search"
            name="q"
            value={query}
            placeholder="Rechercher (touche /)"
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="header-search-clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Effacer la recherche"
            >
              ×
            </button>
          ) : null}
        </form>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggleTheme}
            aria-pressed={theme === 'light'}
            aria-label={theme === 'dark' ? 'Activer le thème clair' : 'Activer le thème sombre'}
            title={theme === 'dark' ? 'Thème clair' : 'Thème sombre'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>
    </header>
  );
}
