"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  {
    href: "/admin/dashboard",
    label: "Dashboard",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/buses",
    label: "Buses",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 17h14M5 7h14M3 11h18M5 7v10M19 7v10" />
        <circle cx="8" cy="20" r="1.5" />
        <circle cx="16" cy="20" r="1.5" />
      </svg>
    ),
  },
  {
    href: "/admin/scan",
    label: "Scan",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    href: "/admin/admins",
    label: "Admins",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const initial = (adminName ?? "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-1 min-h-screen">
      <aside className="w-[240px] bg-[color:var(--color-surface-dark)] text-[color:var(--color-surface)] flex flex-col shrink-0 sticky top-0 h-screen">
        <Link
          href="/admin/dashboard"
          className="px-5 pt-5 pb-6 flex items-center gap-2.5"
        >
          <div className="w-9 h-9 rounded-xl bg-[color:var(--color-accent)] grid place-items-center text-white">
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
          <div className="leading-tight">
            <div className="h-display font-bold text-[15px]">ATBU Bus</div>
            <div className="text-[10px] text-white/45 mt-0.5 uppercase tracking-wider">
              Admin
            </div>
          </div>
        </Link>

        <div className="px-3 flex flex-col gap-0.5">
          {NAV.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="w-[18px] h-[18px] shrink-0">{item.icon}</span>
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[color:var(--color-accent)]" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto p-3 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-white/10 grid place-items-center text-white font-medium">
              {initial}
            </div>
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-[13px] text-white truncate">
                {adminName}
              </div>
              <button
                onClick={logout}
                className="text-[11.5px] text-white/55 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-[color:var(--color-surface)]">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
