export default function Loading() {
  return (
    <div className="loading-page" role="status" aria-label="Loading workspace">
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
      <p>Bringing your workspace into focus…</p>
    </div>
  );
}
