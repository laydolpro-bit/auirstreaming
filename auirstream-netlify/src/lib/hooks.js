import { useCallback, useEffect, useRef, useState } from 'react';

/** Valeur retardee (utilisee pour la recherche avec debounce). */
export function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Media query reactive. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/** Verifie que l'utilisateur accepte (ou non) les animations. */
export function usePrefersReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Chargement asynchrone generique avec annulation, rechargement manuel et
 * etat d'erreur exploitable par les composants.
 */
export function useAsync(loader, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ status: enabled ? 'loading' : 'idle', data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', data: null, error: null });
      return undefined;
    }
    const controller = new AbortController();
    let active = true;
    setState((prev) => ({ status: 'loading', data: prev.data, error: null }));
    loaderRef
      .current({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        setState({ status: 'success', data, error: null });
      })
      .catch((error) => {
        if (!active || error?.code === 'ABORTED') return;
        setState({ status: 'error', data: null, error });
      });
    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload, setState };
}

/** Verrouille le defilement du body (modale lecteur). */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

/**
 * Piege de focus simple pour les modales : conserve le focus a l'interieur,
 * ferme avec Echap, restaure le focus a la fermeture.
 */
export function useDialogA11y({ open, onClose, initialFocusRef }) {
  const containerRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocused.current = document.activeElement;
    const container = containerRef.current;
    const focusTarget = initialFocusRef?.current || container;
    const timer = setTimeout(() => {
      try {
        focusTarget?.focus?.({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }, 0);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const focusables = container.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      const previous = previouslyFocused.current;
      if (previous && typeof previous.focus === 'function') {
        try {
          previous.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    };
  }, [open, onClose, initialFocusRef]);

  return containerRef;
}

/** Detecte le plein ecran du conteneur du lecteur. */
export function useFullscreen(ref) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(async () => {
    const node = ref.current;
    if (!node) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (node.requestFullscreen) await node.requestFullscreen();
      else if (node.webkitRequestFullscreen) node.webkitRequestFullscreen();
    } catch {
      /* le navigateur a refuse : on ne force pas */
    }
  }, [ref]);

  return { isFullscreen, toggle };
}

/** Observateur de taille d'element (mesure des largeurs de rail). */
export function useElementWidth(ref) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(node);
    setWidth(node.getBoundingClientRect().width);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}
