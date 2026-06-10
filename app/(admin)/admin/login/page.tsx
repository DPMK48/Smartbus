"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button, Eyebrow, Field } from "@/components/ui";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Login failed");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col p-6 md:p-10">
        <Link
          href="/"
          className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] inline-flex items-center gap-1.5"
        >
          ← Student site
        </Link>

        <div className="flex-1 grid place-items-center">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <Eyebrow>Administrator portal</Eyebrow>
              <h1 className="h-display text-3xl md:text-4xl mt-3">
                Welcome back
              </h1>
              <p className="text-[14px] text-[color:var(--color-ink-soft)] mt-2">
                Sign in to manage buses and verify boarding passes.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <Field label="Email">
                <input
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="admin@atbu.edu.ng"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </Field>
              {err && (
                <div className="text-[14px] text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/8 px-4 py-3 rounded-xl">
                  {err}
                </div>
              )}
              <Button
                type="submit"
                tone="primary"
                size="lg"
                disabled={loading}
                className="w-full !justify-center"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="mt-8 text-[12px] text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-5">
              <div className="font-medium text-[color:var(--color-ink-soft)] mb-1">
                Demo credentials
              </div>
              <code className="font-mono text-[11.5px]">
                admin@atbu.edu.ng · admin123
              </code>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[color:var(--color-muted)] mt-6">
          ATBU Smart Bus · Abubakar Tafawa Balewa University
        </div>
      </div>

      {/* Right: brand panel */}
      <div className="hidden lg:block bg-[color:var(--color-surface-dark)] relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-60" />
        <div className="relative h-full flex flex-col justify-between p-12 text-[color:var(--color-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[color:var(--color-accent)] grid place-items-center text-white">
              <svg
                width="22"
                height="22"
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
            <div>
              <div className="h-display font-bold tracking-tight">
                ATBU Smart Bus
              </div>
              <div className="text-[11px] text-white/55">Administration</div>
            </div>
          </div>

          <div className="space-y-6 max-w-md">
            <div className="h-hero text-5xl">
              Manage every seat,
              <br />
              every boarding,
              <br />
              <span className="text-[color:var(--color-accent)]">
                in real time.
              </span>
            </div>
            <p className="text-white/65 text-[15px] leading-relaxed">
              Add buses as they arrive, watch reservations roll in, and verify
              passes with the in-browser scanner.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            <Mini label="Buses" value="∞" />
            <Mini label="Seats / bus" value="200" />
            <Mini label="QR valid" value="24h" />
          </div>
        </div>
      </div>
    </main>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="text-[10.5px] uppercase tracking-wider text-white/50">
        {label}
      </div>
      <div className="h-display text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
