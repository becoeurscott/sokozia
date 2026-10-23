import Link from "next/link";

export function Logo({ href = "/", className = "", size = "md" }: { href?: string; className?: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  return (
    <Link href={href} className={`inline-flex items-center gap-1.5 font-extrabold tracking-tight ${sz} ${className}`} aria-label="Sokozia">
      <span className="inline-block h-[0.9em] w-[0.9em] rounded-[30%] bg-brand" aria-hidden />
      <span>
        Soko<span className="text-brand">zia</span>
      </span>
    </Link>
  );
}
