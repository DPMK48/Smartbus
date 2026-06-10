"use client";

import { useState } from "react";
import { Button, Field, PageHeader, Surface } from "@/components/ui";

export default function SettingsClient({
  initialFareKobo,
}: {
  initialFareKobo: number;
}) {
  const [fareNgn, setFareNgn] = useState(initialFareKobo / 100);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fareKobo: Math.round(fareNgn * 100) }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Failed");
    } else {
      setMsg("Saved.");
      setTimeout(() => setMsg(""), 2500);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <PageHeader
        eyebrow="Configuration"
        title="Settings"
        description="System-wide configuration. Changes apply to new reservations only."
      />

      <Surface padding="p-6 md:p-8">
        <form onSubmit={save} className="space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-wider font-mono text-[color:var(--color-muted)]">
              Pricing
            </div>
            <h3 className="h-display text-xl mt-1">Bus fare</h3>
          </div>
          <Field
            label="Amount (₦)"
            hint="Charged per seat for every new reservation. Existing reservations keep the fare they paid."
          >
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] pointer-events-none">
                ₦
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input !pl-9"
                value={fareNgn}
                onChange={(e) => setFareNgn(Number(e.target.value))}
                required
              />
            </div>
          </Field>
          {err && (
            <div className="text-[14px] text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/8 px-4 py-3 rounded-xl">
              {err}
            </div>
          )}
          {msg && (
            <div className="text-[14px] text-[color:var(--color-accent-strong)] bg-[color:var(--color-accent-soft)] px-4 py-3 rounded-xl">
              {msg}
            </div>
          )}
          <div className="flex justify-end">
            <Button tone="primary" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}
