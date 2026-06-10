import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "primary" | "accent" | "ghost" | "subtle" | "danger";
type Size = "sm" | "md" | "lg";

function btnClass(tone: Tone, size: Size, extra?: string) {
  return [
    "btn",
    size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "",
    `btn-${tone}`,
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  tone = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: Tone;
  size?: Size;
}) {
  return <button className={btnClass(tone, size, className)} {...rest} />;
}

export function LinkButton({
  tone = "primary",
  size = "md",
  className,
  children,
  ...rest
}: LinkProps & {
  tone?: Tone;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link className={btnClass(tone, size, className)} {...rest}>
      {children}
    </Link>
  );
}

type Variant = "default" | "flat" | "sunken" | "dark" | "accent";

export function Surface({
  variant = "default",
  hover = false,
  className = "",
  padding = "p-6",
  children,
}: {
  variant?: Variant;
  hover?: boolean;
  className?: string;
  padding?: string;
  children: ReactNode;
}) {
  const v =
    variant === "default"
      ? "surface"
      : variant === "flat"
        ? "surface-flat"
        : variant === "sunken"
          ? "surface-sunken"
          : variant === "dark"
            ? "surface-dark"
            : "surface-accent";
  return (
    <div
      className={`${v} ${hover ? "hover-lift" : ""} ${padding} ${className}`}
    >
      {children}
    </div>
  );
}

type PillTone =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "ink"
  | "on-dark";

export function Pill({
  tone = "default",
  mono = false,
  dot = false,
  className = "",
  children,
}: {
  tone?: PillTone;
  mono?: boolean;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={`pill ${tone !== "default" ? `pill-${tone}` : ""} ${
        mono ? "pill-mono" : ""
      } ${dot ? "pill-dot" : ""} ${className}`}
    >
      {children}
    </span>
  );
}

export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`eyebrow ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <h1 className="h-display text-[32px] md:text-[40px]">{title}</h1>
        {description && (
          <p className="text-[15px] text-[color:var(--color-ink-soft)] mt-2 max-w-prose">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex gap-2 items-center">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon = "🪹",
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="surface-sunken dot-grid-light text-center py-16 px-6">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="h-display text-xl">{title}</h3>
      {description && (
        <p className="text-[14px] text-[color:var(--color-ink-soft)] mt-2 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && (
        <span className="block text-[12.5px] text-[color:var(--color-muted)] mt-2">
          {hint}
        </span>
      )}
    </label>
  );
}

export function Metric({
  label,
  value,
  sub,
  accent = false,
  className = "",
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <Surface variant={accent ? "dark" : "default"} className={className}>
      <Eyebrow
        className={accent ? "!text-white/55" : undefined}
      >
        {label}
      </Eyebrow>
      <div className="metric text-[40px] md:text-[48px] mt-3">{value}</div>
      {sub && (
        <div
          className={`mt-2 text-[13px] ${
            accent ? "text-white/65" : "text-[color:var(--color-muted)]"
          }`}
        >
          {sub}
        </div>
      )}
    </Surface>
  );
}

export function Money({ kobo }: { kobo: number }) {
  const ngn = (kobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return <span>&#8358;{ngn}</span>;
}

export function ReservationStatusPill({ status }: { status: string }) {
  const map: Record<string, PillTone> = {
    PAID: "accent",
    USED: "success",
    PENDING_PAYMENT: "warning",
    EXPIRED: "default",
    CANCELED: "danger",
  };
  return (
    <Pill tone={map[status] ?? "default"} mono dot>
      {status.replace("_", " ")}
    </Pill>
  );
}

export function BusStatusPill({ status }: { status: string }) {
  const map: Record<string, PillTone> = {
    ACTIVE: "success",
    FULL: "warning",
    DEPARTED: "default",
  };
  return (
    <Pill tone={map[status] ?? "default"} mono dot>
      {status}
    </Pill>
  );
}
