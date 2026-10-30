/** Shown by loading.tsx while a page renders on the server. */
export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center gap-4" role="status">
      <span className="loader-mark h-10 w-10 rounded-[30%] bg-brand" aria-hidden />
      <span className="text-sm font-medium text-muted">{label}</span>
    </div>
  );
}
