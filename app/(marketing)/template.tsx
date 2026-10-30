/** Re-mounted on each navigation, so every page fades in. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in flex min-h-0 flex-1 flex-col">{children}</div>;
}
