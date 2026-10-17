import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Header from './components/Header.jsx';
import About from './pages/About.jsx';
import Browse from './pages/Browse.jsx';
import ContinueWatching from './pages/ContinueWatching.jsx';
import Details from './pages/Details.jsx';
import Home from './pages/Home.jsx';
import MyList from './pages/MyList.jsx';
import NotFound from './pages/NotFound.jsx';
import Privacy from './pages/Privacy.jsx';
import Search from './pages/Search.jsx';

/** Remonte en haut de page à chaque changement d'itinéraire. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Aller au contenu principal
      </a>
      <Header />
      <main id="main" className="site-main" tabIndex={-1}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/films" element={<Browse mediaType="movie" mode="films" />} />
          <Route path="/series" element={<Browse mediaType="tv" mode="series" />} />
          <Route path="/animes" element={<Browse mediaType="tv" mode="animes" />} />
          <Route path="/recherche" element={<Search />} />
          <Route path="/film/:id" element={<Details type="movie" />} />
          <Route path="/serie/:id" element={<Details type="tv" />} />
          <Route path="/ma-liste" element={<MyList />} />
          <Route path="/continuer" element={<ContinueWatching />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/confidentialite" element={<Privacy />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
