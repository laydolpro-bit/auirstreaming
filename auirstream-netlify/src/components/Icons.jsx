/**
 * auirstream - jeu d'icones SVG unique et coherent.
 * Toutes les icones : 24x24, trait 1.6, currentColor, aria-hidden par defaut.
 */
const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

function Svg({ children, title, ...rest }) {
  return (
    <svg {...base} {...rest} role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export const IconSearch = (props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Svg>
);

export const IconPlay = (props) => (
  <Svg {...props}>
    <path d="M7 4.8v14.4l12-7.2z" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconClose = (props) => (
  <Svg {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const IconChevronLeft = (props) => (
  <Svg {...props}>
    <path d="M14.5 5 8 12l6.5 7" />
  </Svg>
);

export const IconChevronRight = (props) => (
  <Svg {...props}>
    <path d="M9.5 5 16 12l-6.5 7" />
  </Svg>
);

export const IconChevronDown = (props) => (
  <Svg {...props}>
    <path d="M5 9.5 12 16l7-6.5" />
  </Svg>
);

export const IconHeart = ({ filled = false, ...props }) => (
  <Svg {...props}>
    <path
      d="M12 20s-7.2-4.4-7.2-9.4A4.4 4.4 0 0 1 12 7.8a4.4 4.4 0 0 1 7.2 2.8C19.2 15.6 12 20 12 20z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Svg>
);

export const IconCheck = (props) => (
  <Svg {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Svg>
);

export const IconFilm = (props) => (
  <Svg {...props}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M8 4v16M16 4v16M3 9.5h5M16 9.5h5M3 14.5h5M16 14.5h5" />
  </Svg>
);

export const IconTv = (props) => (
  <Svg {...props}>
    <rect x="3" y="6.5" width="18" height="12" rx="2.5" />
    <path d="m9 3 3 3.5L15 3" />
  </Svg>
);

export const IconSparkle = (props) => (
  <Svg {...props}>
    <path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z" />
    <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  </Svg>
);

export const IconMoon = (props) => (
  <Svg {...props}>
    <path d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.4 8.4 0 1 0 10.6 10.6z" />
  </Svg>
);

export const IconSun = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
  </Svg>
);

export const IconExternal = (props) => (
  <Svg {...props}>
    <path d="M14 4h6v6" />
    <path d="M20 4 11 13" />
    <path d="M19 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5" />
  </Svg>
);

export const IconInfo = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5M12 7.8h.01" />
  </Svg>
);

export const IconExpand = (props) => (
  <Svg {...props}>
    <path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15" />
  </Svg>
);

export const IconShrink = (props) => (
  <Svg {...props}>
    <path d="M9 4v3.5A1.5 1.5 0 0 1 7.5 9H4M20 9h-3.5A1.5 1.5 0 0 1 15 7.5V4M15 20v-3.5A1.5 1.5 0 0 1 16.5 15H20M4 15h3.5A1.5 1.5 0 0 1 9 16.5V20" />
  </Svg>
);

export const IconAlert = (props) => (
  <Svg {...props}>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4M12 16.8h.01" />
  </Svg>
);

export const IconRefresh = (props) => (
  <Svg {...props}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4.5V10h-5.2" />
  </Svg>
);

export const IconStar = (props) => (
  <Svg {...props}>
    <path d="m12 4.5 2.3 4.9 5.2.6-3.9 3.6 1 5.3-4.6-2.6-4.6 2.6 1-5.3-3.9-3.6 5.2-.6z" />
  </Svg>
);

export const IconClock = (props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const IconList = (props) => (
  <Svg {...props}>
    <path d="M8 6.5h12M8 12h12M8 17.5h12M4 6.5h.01M4 12h.01M4 17.5h.01" />
  </Svg>
);

export const IconTrash = (props) => (
  <Svg {...props}>
    <path d="M4.5 7h15M9.5 7V5.5A1 1 0 0 1 10.5 4.5h3A1 1 0 0 1 14.5 5.5V7" />
    <path d="M6.5 7l.8 11.2A1.8 1.8 0 0 0 9.1 20h5.8a1.8 1.8 0 0 0 1.8-1.8L17.5 7" />
  </Svg>
);

export const IconFilter = (props) => (
  <Svg {...props}>
    <path d="M4 6.5h16M7 12h10M10 17.5h4" />
  </Svg>
);

export const IconMenu = (props) => (
  <Svg {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconBell = (props) => (
  <Svg {...props}>
    <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5z" />
    <path d="M10 18.5a2 2 0 0 0 4 0" />
  </Svg>
);

export const IconShield = (props) => (
  <Svg {...props}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.9 7.4-7 9-4.1-1.6-7-4.8-7-9V6z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);
