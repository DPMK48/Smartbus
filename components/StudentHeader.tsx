import Link from "next/link";

export default function StudentHeader() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[color:var(--color-surface)]/85 border-b border-[color:var(--color-border)]">
      <div className="max-w-6xl mx-auto px-5 py-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo />
          <div className="leading-tight">
            <div className="h-display text-[15px] font-bold tracking-tight">
              ATBU Bus
            </div>
            <div className="text-[11px] text-[color:var(--color-muted)] -mt-0.5">
              Campus transit
            </div>
          </div>
        </Link>
        <Link
          href="/admin/login"
          className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] transition-colors"
        >
          Admin
        </Link>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="w-9 h-9 rounded-xl bg-[color:var(--color-ink)] grid place-items-center text-[color:var(--color-surface)] text-base font-bold transition-transform group-hover:rotate-[-6deg]">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 17h14M5 7h14M3 11h18M5 7v10M19 7v10" />
        <circle cx="8" cy="20" r="1.5" />
        <circle cx="16" cy="20" r="1.5" />
      </svg>
    </div>
  );
}
