import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost"; size?: "sm" | "md" | "lg"; };

const variants = {
  primary: "group relative overflow-hidden bg-gradient-to-r from-royal-500 to-royal-600 text-white shadow-royal transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_80px_rgba(29,78,216,0.32)]",
  secondary: "border border-white/14 bg-white/6 text-white hover:bg-white/10",
  ghost: "text-white/80 hover:bg-white/8 hover:text-white"
};
const sizes = { sm: "h-10 px-4 text-sm", md: "h-12 px-5 text-sm", lg: "h-14 px-6 text-[15px]" };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "primary", size = "md", children, ...props }, ref) => (
  <button ref={ref} className={cn("inline-flex items-center justify-center rounded-full font-semibold tracking-[0.01em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)} {...props}>
    {variant === "primary" ? <span className="pointer-events-none absolute inset-0 button-shine opacity-0 transition-opacity duration-500 group-hover:animate-shimmer group-hover:opacity-100" /> : null}
    <span className="relative z-10">{children}</span>
  </button>
));
Button.displayName = "Button";
