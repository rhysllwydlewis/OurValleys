"use client";

export function PrintButton({ label }: { label: string }) {
  return (
    <button className="button" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
