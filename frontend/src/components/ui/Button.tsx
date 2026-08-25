import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700 dark:bg-indigo-600 dark:text-white dark:hover:bg-indigo-500 shadow-sm",
  secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 dark:hover:bg-slate-700/50 shadow-sm",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
