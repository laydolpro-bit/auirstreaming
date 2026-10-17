import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AppProvider } from './state/AppState.jsx';
import { PlayerProvider } from './state/PlayerContext.jsx';
import { setupPush } from './lib/push.js';
import './styles/app.css';

/**
 * Notifications publicitaires : initialisation unique, hors du cycle de rendu
 * React (donc insensible au double montage de StrictMode). Le module porte sa
 * propre garde globale ; aucun nouvel appel ne peut recharger le SDK.
 */
setupPush();

const container = document.getElementById('root');

createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <PlayerProvider>
          <App />
        </PlayerProvider>
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
