export default function AdminLoading() {
  // Rendered inside the admin layout, which already supplies the site chrome
  // and the page heading; repeating them here duplicated the <h1>.
  return (
    <div aria-busy="true" aria-live="polite">
      <div className="skeleton-card" aria-hidden="true" />
      <span className="sr-only">Loading admin dashboard</span>
    </div>
  );
}
