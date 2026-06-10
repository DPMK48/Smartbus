"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Eyebrow, Money, Pill, Surface } from "@/components/ui";

type HistoryRow = {
  id: string;
  studentName: string;
  reference: string;
  busLabel: string;
  amount: number;
  status: "PAID" | "USED";
  qrToken: string | null;
  scannedAt: string | null;
  purchasedAt: string | null;
  expiresAt: string | null;
};

export default function PaymentHistoryPage() {
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [active, setActive] = useState<HistoryRow | null>(null);

  useEffect(() => {
    if (!initialEmail) return;
    void load(initialEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(targetEmail: string) {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/reservations/history?email=${encodeURIComponent(targetEmail)}`,
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error ?? "Failed to load history");
        setRows([]);
      } else {
        const data = (await res.json()) as { reservations: HistoryRow[] };
        setRows(data.reservations ?? []);
      }
    } catch {
      setErr("Network error. Please try again.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Surface padding="p-6">
        <Eyebrow>History</Eyebrow>
        <h1 className="h-display text-2xl mt-2">Payment history</h1>
        <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-2">
          Successful payments are kept here for 24 hours.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3 items-center"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) load(email.trim().toLowerCase());
          }}
        >
          <input
            className="input flex-1 min-w-[240px]"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
          />
          <Button tone="primary" type="submit" disabled={loading}>
            {loading ? "Loading..." : "View history"}
          </Button>
          <Link
            href="/"
            className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
          >
            Back to home
          </Link>
        </form>
        {err && (
          <div className="mt-3 text-[13px] text-[color:var(--color-danger)]">
            {err}
          </div>
        )}
      </Surface>

      {rows.length === 0 && !loading ? (
        <Surface padding="p-8" className="text-center">
          <div className="text-[13px] text-[color:var(--color-ink-soft)]">
            No payments found yet.
          </div>
        </Surface>
      ) : (
        <div className="grid gap-4">
          {rows.map((r) => (
            <Surface
              key={r.id}
              padding="p-6"
              className="flex flex-wrap gap-5 items-center"
            >
              <div className="min-w-[220px]">
                <div className="text-[12px] text-[color:var(--color-muted)]">Bus</div>
                <div className="h-display text-[18px] mt-1">{r.busLabel}</div>
                <div className="text-[12px] text-[color:var(--color-ink-soft)] mt-1">
                  {r.studentName}
                </div>
                <div className="text-[12px] text-[color:var(--color-ink-soft)] mt-1">
                  Ref {r.reference.slice(-12)}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Pill tone={r.status === "USED" ? "accent" : "subtle"} mono>
                    {r.status === "USED" ? "Checked in" : "Not checked in"}
                  </Pill>
                  <span className="text-[12px] text-[color:var(--color-ink-soft)]">
                    <Money kobo={r.amount} />
                  </span>
                </div>
                {r.expiresAt && (
                  <div className="text-[11.5px] text-[color:var(--color-muted)] mt-2">
                    Valid until {new Date(r.expiresAt).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="flex-1" />
              {r.qrToken ? (
                <button
                  type="button"
                  className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden hover-lift"
                  onClick={() => setActive(r)}
                  aria-label="Open QR code"
                >
                  <img
                    src={`/api/qr?token=${encodeURIComponent(r.qrToken)}`}
                    alt="Boarding QR code"
                    width={160}
                    height={160}
                  />
                </button>
              ) : (
                <div className="w-[160px] h-[160px] rounded-2xl border border-[color:var(--color-border)] grid place-items-center text-[12px] text-[color:var(--color-ink-soft)]">
                  QR pending
                </div>
              )}
            </Surface>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-5">
          <Surface padding="p-6" className="w-full max-w-md relative">
            <button
              className="absolute top-4 right-4 text-[12px] text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
              onClick={() => setActive(null)}
              aria-label="Close"
            >
              Close
            </button>
            <Eyebrow>Boarding QR</Eyebrow>
            <div className="h-display text-xl mt-2">{active.busLabel}</div>
            <div className="text-[13px] text-[color:var(--color-ink-soft)] mt-1">
              {active.studentName}
            </div>
            <div className="mt-4 flex justify-center">
              {active.qrToken ? (
                <img
                  src={`/api/qr?token=${encodeURIComponent(active.qrToken)}`}
                  alt="Boarding QR code"
                  width={260}
                  height={260}
                  className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
                />
              ) : (
                <div className="w-[260px] h-[260px] rounded-2xl border border-[color:var(--color-border)] grid place-items-center text-[12px] text-[color:var(--color-ink-soft)]">
                  QR pending
                </div>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Pill tone={active.status === "USED" ? "accent" : "subtle"} mono>
                {active.status === "USED" ? "Checked in" : "Not checked in"}
              </Pill>
              <span className="text-[12px] text-[color:var(--color-ink-soft)]">
                <Money kobo={active.amount} />
              </span>
            </div>
          </Surface>
        </div>
      )}
    </div>
  );
}
