import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import PlayerModal from '../components/PlayerModal.jsx';

/**
 * Lecteur global : n'importe quelle page peut demander une lecture
 * (hero, affiche, fiche film, fiche série, « Continuer à regarder »).
 */
const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [request, setRequest] = useState(null);

  const play = useCallback((item, options = {}) => {
    if (!item) return;
    setRequest({
      item,
      lang: options.lang || 'vf',
      season: options.season ?? 1,
      episode: options.episode ?? 1,
      episodeCount: options.episodeCount || 0,
      requestId: Date.now(),
    });
  }, []);

  const close = useCallback(() => setRequest(null), []);

  const value = useMemo(() => ({ play, close, isOpen: Boolean(request), request }), [play, close, request]);

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <PlayerModal request={request} onClose={close} />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer doit être utilisé dans <PlayerProvider>.');
  return context;
}
