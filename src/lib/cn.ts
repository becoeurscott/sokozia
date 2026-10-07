// Concatène des classes CSS conditionnelles.
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
