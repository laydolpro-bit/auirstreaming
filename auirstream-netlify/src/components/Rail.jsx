import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePrefersReducedMotion } from '../lib/hooks.js';
import { isFavorite } from '../lib/storage.js';
import { useStorageVersion } from '../state/AppState.jsx';
import Card from './Card.jsx';
import { IconChevronLeft, IconChevronRight } from './Icons.jsx';
import { CardSkeleton, ErrorState } from './Skeleton.jsx';

/**
 * Rail horizontal d'affiches : defilement natif, boutons precedant/suivant,
 * navigation clavier (fleches gauche/droite deplacees de carte en carte).
 */
export default function Rail({
  title,
  subtitle,
  items = [],
  loading = false,
  error = null,
  onRetry,
  moreHref,
  moreLabel = 'Tout voir',
  emptyMessage = 'Aucun contenu à afficher dans cette sélection.',
  priorityCount = 2,
  playOptionsFor = null,
}) {
  const trackRef = useRef(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });
  const reducedMotion = usePrefersReducedMotion();
  useStorageVersion();

  const updateArrows = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setCanScroll({ left: node.scrollLeft > 8, right: max > 8 && node.scrollLeft < max - 8 });
  }, []);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return undefined;
    updateArrows();
    node.addEventListener('scroll', updateArrows, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null;
    observer?.observe(node);
    return () => {
      node.removeEventListener('scroll', updateArrows);
      observer?.disconnect();
    };
  }, [updateArrows, items, loading]);

  const scrollBy = (direction) => {
    const node = trackRef.current;
    if (!node) return;
    const amount = Math.max(240, node.clientWidth * 0.82);
    node.scrollBy({ left: direction * amount, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const onKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    const node = trackRef.current;
    if (!node) return;
    const cells = Array.from(node.querySelectorAll('li'));
    if (cells.length === 0) return;
    const active = document.activeElement;
    const currentIndex = cells.findIndex((cell) => cell.contains(active));
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    let nextIndex = currentIndex === -1 ? (direction === 1 ? 0 : cells.length - 1) : currentIndex + direction;
    nextIndex = Math.max(0, Math.min(cells.length - 1, nextIndex));
    const target = cells[nextIndex]?.querySelector('a, button');
    if (!target) return;
    event.preventDefault();
    target.focus({ preventScroll: true });
    cells[nextIndex].scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section className="rail" aria-labelledby={`rail-${slug(title)}`}>
      <div className="rail-head">
        <div>
          <h2 className="rail-title" id={`rail-${slug(title)}`}>
            {title}
          </h2>
          {subtitle ? <p className="rail-subtitle">{subtitle}</p> : null}
        </div>
        <div className="rail-head-actions">
          {moreHref ? (
            <Link className="rail-more" to={moreHref}>
              {moreLabel}
              <IconChevronRight />
            </Link>
          ) : null}
          <div className="rail-arrows">
            <button
              type="button"
              className="icon-btn"
              onClick={() => scrollBy(-1)}
              disabled={!canScroll.left}
              aria-label={`Faire défiler « ${title} » vers la gauche`}
            >
              <IconChevronLeft />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={() => scrollBy(1)}
              disabled={!canScroll.right}
              aria-label={`Faire défiler « ${title} » vers la droite`}
            >
              <IconChevronRight />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <ErrorState compact error={error} onRetry={onRetry} />
      ) : (
        <div
          className="rail-track"
          ref={trackRef}
          onKeyDown={onKeyDown}
          tabIndex={0}
          role="list"
          aria-label={`${title} — utilisez les flèches gauche et droite pour parcourir`}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <div className="rail-cell" key={`skeleton-${index}`} role="listitem">
                  <CardSkeleton />
                </div>
              ))
            : items.map((item, index) => (
                <div className="rail-cell" key={`${item.type}-${item.id}`} role="listitem">
                  <Card
                    item={item}
                    priority={index < priorityCount}
                    isFavorite={isFavorite(item)}
                    playOptions={playOptionsFor ? playOptionsFor(item) : null}
                  />
                </div>
              ))}
        </div>
      )}

      {!loading && !error && items.length === 0 ? <p className="rail-empty">{emptyMessage}</p> : null}
    </section>
  );
}

function slug(value) {
  return String(value || 'rail')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
