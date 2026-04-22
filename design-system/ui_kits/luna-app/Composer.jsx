// Composer.jsx — bottom prompt bar.

const Composer = ({ value, onChange, onSubmit, activeAgents, running }) => {
  const ref = React.useRef(null);
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(); }
  };
  return (
    <div className="luna-composer">
      <div className="luna-composer__chips">
        <span className="luna-mono-label">routing</span>
        {activeAgents.map(a =>
          <span key={a} className="luna-chip"><span className="luna-chip__dot" />{a}</span>
        )}
        <span className="luna-chip luna-chip--ghost">+ add agent</span>
      </div>
      <div className="luna-composer__main">
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask LUNA anything about the Moon."
          rows={2}
        />
        <div className="luna-composer__actions">
          <IconButton title="Attach coordinate">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>
            </svg>
          </IconButton>
          <IconButton title="Attach dataset">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
            </svg>
          </IconButton>
          <Divider vertical />
          <Button variant="cyan" size="sm" onClick={onSubmit} disabled={!value.trim() || running}>
            {running ? (
              <>
                <span className="luna-mono-label luna-mono-label--dark">running</span>
                <Kbd>esc</Kbd>
              </>
            ) : (
              <>
                Run query
                <Kbd>⏎</Kbd>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Composer });
