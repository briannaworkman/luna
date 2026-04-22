export function GrainOverlay() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        backgroundImage: "var(--luna-grain)",
        backgroundRepeat: "repeat",
        backgroundSize: "160px 160px",
      }}
    />
  );
}
