"use client";

export function RetryButton({ label }: { label: string }) {
  return (
    <button
      className="button primary"
      type="button"
      onClick={() => window.location.reload()}
    >
      {label}
    </button>
  );
}
