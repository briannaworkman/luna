// AgentRail.jsx — Left rail of specialist agents.

const AGENTS = [
  { id: "orbit",       name: "Orbit",         hint: "ground tracks · ephemerides" },
  { id: "mineralogy",  name: "Mineralogy",    hint: "spectra · composition" },
  { id: "thermal",     name: "Thermal",       hint: "diviner · temperature maps" },
  { id: "topography",  name: "Topography",    hint: "LOLA · DEM · slope" },
  { id: "imagery",     name: "Imagery",       hint: "LROC NAC / WAC" },
  { id: "history",     name: "Mission history", hint: "Apollo · Luna · Chang'e" },
  { id: "hazards",     name: "Hazards",       hint: "craters · boulders · shadow" },
  { id: "ingest",      name: "Data ingest",   hint: "fetch · normalise · cache" },
];

const AgentRail = ({ active, statuses, onPick }) => {
  return (
    <aside className="luna-rail">
      <div className="luna-rail__head">
        <div className="luna-wordmark">
          <svg viewBox="0 0 32 32" className="luna-mark" width="18" height="18">
            <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.3"/>
            <path d="M16 5a11 11 0 1 0 0 22 7.5 7.5 0 0 1 0-22Z" fill="currentColor"/>
          </svg>
          <span>LUNA</span>
        </div>
        <IconButton title="New session">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </IconButton>
      </div>

      <div className="luna-rail__label">Agents <span className="luna-rail__count">{AGENTS.length}</span></div>
      <nav className="luna-rail__list">
        {AGENTS.map(a => {
          const s = statuses[a.id] || "idle";
          return (
            <button key={a.id}
              className={`luna-rail__item ${active === a.id ? "is-active" : ""} ${s === "active" ? "is-live" : ""}`}
              onClick={() => onPick(a.id)}>
              <span className={`luna-rail__dot luna-rail__dot--${s}`} />
              <span className="luna-rail__name">{a.name}</span>
              <span className="luna-rail__hint">{a.hint}</span>
            </button>
          );
        })}
      </nav>

      <div className="luna-rail__foot">
        <div className="luna-rail__model">
          <span className="luna-mono-label">model</span>
          <span>Claude Opus 4.7</span>
        </div>
        <div className="luna-rail__model">
          <span className="luna-mono-label">session</span>
          <span>lun-00041</span>
        </div>
      </div>
    </aside>
  );
};

Object.assign(window, { AgentRail, AGENTS });
