import { useEffect, useState } from 'react';
import { getGenreTables } from '../lib/api.js';

/**
 * Table des genres TMDB (films + séries), chargée une seule fois par session
 * et mise en cache mémoire : sert à afficher « Action · Drame » dans le hero.
 */
let cached = null;

export function useGenreTables() {
  const [tables, setTables] = useState(cached);

  useEffect(() => {
    if (cached) {
      setTables(cached);
      return undefined;
    }
    let active = true;
    getGenreTables()
      .then((value) => {
        cached = value;
        if (active) setTables(value);
      })
      .catch(() => {
        /* les genres sont cosmétiques : en cas d'erreur on n'affiche rien */
      });
    return () => {
      active = false;
    };
  }, []);

  return tables;
}
