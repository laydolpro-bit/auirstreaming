import { Link } from 'react-router-dom';
import { describeError } from '../lib/api.js';
import { IconAlert, IconRefresh } from './Icons.jsx';

/* --------------------------- Chargements --------------------------- */

export function PosterSkeleton() {
  return <div className="skeleton skeleton-poster" aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      <PosterSkeleton />
      <div className="skeleton skeleton-line skeleton-line-lg" />
      <div className="skeleton skeleton-line" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="hero-skeleton" aria-hidden="true">
      <div className="hero-skeleton-inner">
        <div className="skeleton skeleton-line skeleton-line-xl" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-button" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 12 }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-hidden="true">
      <div className="skeleton skeleton-poster-lg" />
      <div className="detail-skeleton-body">
        <div className="skeleton skeleton-line skeleton-line-xl" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line-lg" />
        <div className="skeleton skeleton-button" />
      </div>
    </div>
  );
}

/* ---------------------- Barre de chargement ------------------------ */

export function LoadingBar({ label = 'Chargement…' }) {
  return (
    <div className="loading-bar" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  );
}

/* --------------------------- Erreurs ------------------------------ */

export function ErrorState({ error, onRetry, compact = false, title }) {
  const info = describeError(error);
  return (
    <div className={`error-state${compact ? ' is-compact' : ''}`} role="alert">
      <IconAlert className="error-icon" />
      <div className="error-body">
        <h3 className="error-title">{title || info.title}</h3>
        <p className="error-message">{info.message}</p>
        {info.hint ? <p className="error-hint">{info.hint}</p> : null}
        {info.code ? <p className="error-code">Code : {info.code}{info.status ? ` (HTTP ${info.status})` : ''}</p> : null}
      </div>
      {info.retryable && onRetry ? (
        <button type="button" className="btn btn-subtle" onClick={onRetry}>
          <IconRefresh />
          Réessayer
        </button>
      ) : null}
    </div>
  );
}

/* --------------------------- Etats vides --------------------------- */

export function EmptyState({ title, message, action, to, actionLabel }) {
  return (
    <div className="empty-state">
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action && to ? (
        <Link className="btn btn-primary" to={to}>
          {actionLabel || action}
        </Link>
      ) : null}
    </div>
  );
}
