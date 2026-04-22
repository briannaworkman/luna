// DataDock.jsx — right drawer for source data / map preview.

const MiniMap = () => (
  <div className="luna-map">
    <svg viewBox="0 0 200 120" className="luna-map__svg">
      <defs>
        <pattern id="g" width="16" height="16" patternUnits="userSpaceOnUse">
          <path d="M16 0H0V16" fill="none" stroke="#1F2E4A" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="200" height="120" fill="#0A1424"/>
      <rect width="200" height="120" fill="url(#g)"/>
      <circle cx="118" cy="62" r="28" fill="none" stroke="#7A849A" strokeWidth="0.5"/>
      <circle cx="118" cy="62" r="52" fill="none" stroke="#7A849A" strokeWidth="0.5" opacity="0.5"/>
      <path d="M30 70 Q 80 55 130 65 T 190 78" fill="none" stroke="#7DD3FC" strokeWidth="1"/>
      <circle cx="130" cy="65" r="3" fill="#7DD3FC"/>
      <circle cx="130" cy="65" r="8" fill="none" stroke="#7DD3FC" strokeWidth="0.5" opacity="0.5"/>
      <text x="136" y="62" fill="#7DD3FC" fontSize="7" fontFamily="JetBrains Mono" letterSpacing="0.06em">0.69°N 23.47°E</text>
    </svg>
  </div>
);

const DockSource = ({ label, sensor, date, res, active }) => (
  <div className={`luna-source ${active ? "is-active" : ""}`}>
    <div className="luna-source__top">
      <span className="luna-source__label">{label}</span>
      <span className="luna-source__sensor">{sensor}</span>
    </div>
    <div className="luna-source__meta">
      <span>{date}</span>
      <span>·</span>
      <span>{res}</span>
    </div>
  </div>
);

const DataDock = ({ open, onClose, focusedCitation }) => {
  if (!open) return null;
  return (
    <aside className="luna-dock">
      <div className="luna-dock__head">
        <Eyebrow tone="cyan">source data</Eyebrow>
        <IconButton onClick={onClose} title="Close">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </IconButton>
      </div>

      <div className="luna-dock__title">
        {focusedCitation?.label || "Mare Tranquillitatis"}
      </div>
      <div className="luna-dock__coord">0.6889° N · 23.4731° E</div>

      <MiniMap />

      <div className="luna-dock__section">
        <span className="luna-mono-label">used in answer</span>
        <div className="luna-dock__sources">
          <DockSource label="NAC M1334189784LE" sensor="LROC" date="2024-08-12" res="0.5 m/px" active />
          <DockSource label="Diviner temperature tile" sensor="LRO" date="2024-06" res="128 ppd" />
          <DockSource label="Apollo 11 H-70-16624" sensor="Hasselblad" date="1969-07-20" res="scan" />
        </div>
      </div>

      <div className="luna-dock__section">
        <span className="luna-mono-label">export</span>
        <div className="luna-dock__actions">
          <Button variant="outline" size="sm">Save to notebook</Button>
          <Button variant="ghost" size="sm">Copy citation</Button>
        </div>
      </div>
    </aside>
  );
};

Object.assign(window, { DataDock });
