import * as React from "react";
import Link from "next/link";

type Variant = "brand" | "dark" | "ghost" | "outline" | "soft";
type Size = "sm" | "md" | "lg";

const base = "inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";
const variants: Record<Variant, string> = {
  brand: "bg-brand text-brand-ink hover:bg-[#d24f0a] shadow-[0_6px_18px_-8px_rgba(232,89,12,.7)]",
  dark: "bg-ink text-white hover:bg-black",
  ghost: "text-ink hover:bg-hover",
  outline: "border border-line bg-card text-ink hover:bg-hover",
  soft: "bg-brand-soft text-brand hover:bg-[#fbdcc4]",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

export function Button({ variant = "brand", size = "md", href, className = "", children, ...props }: ButtonProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={cls} {...props}>
      {children}
    </button>
  );
}
