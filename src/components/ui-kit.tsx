import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/60 bg-card p-5 shadow-[0_1px_0_0_hsl(0_0%_100%/0.04)_inset]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <header className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
        {children}
      </h2>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </header>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "accent" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-5 py-2.5 text-sm",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "accent" && "bg-accent text-accent-foreground hover:bg-accent/90",
        variant === "ghost" &&
          "border border-border bg-transparent text-foreground hover:bg-secondary",
        variant === "danger" &&
          "border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20",
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        {...props}
        className={cn(
          "w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring",
          className,
        )}
      />
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        {...props}
        className="w-full rounded-2xl border border-input bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-ring"
      >
        {children}
      </select>
    </label>
  );
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "accent" | "primary" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tone === "muted" && "bg-secondary text-secondary-foreground",
        tone === "accent" && "bg-accent/20 text-accent",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "danger" && "bg-destructive/15 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
