// Primitives.jsx — shadcn-flavoured, LUNA-tinted.
// Small surface: Button, Badge, Input, Eyebrow, IconButton, Kbd, Divider.

const Button = ({ variant = "primary", size = "md", children, className = "", ...p }) => {
  const base = "luna-btn";
  const v = `luna-btn--${variant}`;
  const s = `luna-btn--${size}`;
  return <button className={`${base} ${v} ${s} ${className}`} {...p}>{children}</button>;
};

const IconButton = ({ children, active, className = "", ...p }) => (
  <button className={`luna-iconbtn ${active ? "is-active" : ""} ${className}`} {...p}>{children}</button>
);

const Badge = ({ tone = "neutral", children, dot = false, className = "" }) => (
  <span className={`luna-badge luna-badge--${tone} ${className}`}>
    {dot && <span className="luna-badge__dot" />}
    {children}
  </span>
);

const Input = ({ leadIcon, trailKbd, className = "", ...p }) => (
  <div className={`luna-input ${className}`}>
    {leadIcon && <span className="luna-input__lead">{leadIcon}</span>}
    <input {...p} />
    {trailKbd && <span className="luna-kbd">{trailKbd}</span>}
  </div>
);

const Eyebrow = ({ tone = "frost", children }) => (
  <span className={`luna-eyebrow-el luna-eyebrow-el--${tone}`}>{children}</span>
);

const Kbd = ({ children }) => <span className="luna-kbd">{children}</span>;

const Divider = ({ vertical = false }) =>
  <span className={vertical ? "luna-div luna-div--v" : "luna-div"} />;

// Single cyan dot with pulse halo — reserved for live-data signals only.
const LiveDot = ({ quiet = false }) => (
  <span className={`luna-live ${quiet ? "is-quiet" : ""}`}>
    {!quiet && <span className="luna-live__pulse" />}
    <span className="luna-live__core" />
  </span>
);

Object.assign(window, { Button, IconButton, Badge, Input, Eyebrow, Kbd, Divider, LiveDot });
