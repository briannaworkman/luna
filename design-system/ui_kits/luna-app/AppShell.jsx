// AppShell.jsx — top bar + layout scaffolding.

const TopBar = ({ onToggleDock }) => (
  <header className="luna-top">
    <div className="luna-top__left">
      <div className="luna-crumbs">
        <span className="luna-crumbs__item">Notebook</span>
        <span className="luna-crumbs__sep">/</span>
        <span className="luna-crumbs__item luna-crumbs__item--current">Tranquillitatis thermal</span>
      </div>
    </div>
    <div className="luna-top__center">
      <Input
        leadIcon={
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
          </svg>
        }
        trailKbd="⌘K"
        placeholder="Find a crater, mission, or coordinate…"
      />
    </div>
    <div className="luna-top__right">
      <IconButton title="Share">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <path d="m8.6 13.5 6.9 4M15.5 6.5 8.6 10.5"/>
        </svg>
      </IconButton>
      <IconButton title="Sources" onClick={onToggleDock}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7l9-4 9 4M3 7l9 4 9-4M12 11v10"/>
        </svg>
      </IconButton>
      <div className="luna-avatar">JM</div>
    </div>
  </header>
);

Object.assign(window, { TopBar });
