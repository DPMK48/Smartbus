"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Button,
  Eyebrow,
  Field,
  LinkButton,
  Surface,
} from "@/components/ui";

export default function ReserveForm({
  bus,
  fareKobo,
  canReserve,
  reason,
}: {
  bus: {
    id: string;
    label: string;
    totalSeats: number;
    availableSeats: number;
  };
  fareKobo: number;
  canReserve: boolean;
  reason: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          busId: bus.id,
          studentName: name,
          studentEmail: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error ?? "Reservation failed");
        setLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setErr("Network error. Please try again.");
      setLoading(false);
    }
  }

  const fareNgn = (fareKobo / 100).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
  });

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link
        href="/"
        className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] inline-flex items-center gap-1.5"
      >
        ← All buses
      </Link>

      <Steps current={canReserve ? 1 : 0} />

      {!canReserve ? (
        <Surface variant="default" padding="p-8">
          <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-danger)]/10 grid place-items-center text-[color:var(--color-danger)] text-2xl">
            !
          </div>
          <h2 className="h-display text-2xl mt-5">Can't reserve this bus</h2>
          <p className="text-[15px] text-[color:var(--color-ink-soft)] mt-2">
            {reason}
          </p>
          <LinkButton href="/" tone="primary" className="mt-6">
            Back to buses →
          </LinkButton>
        </Surface>
      ) : (
        <>
          {/* Selected bus summary strip */}
          <Surface variant="dark" padding="p-6 md:p-8" className="relative overflow-hidden dot-grid">
            <div className="flex items-center justify-between relative">
              <div>
                <Eyebrow className="!text-white/55">Booking</Eyebrow>
                <h2 className="h-display text-3xl md:text-4xl mt-2 text-[color:var(--color-surface)]">
                  {bus.label}
                </h2>
                <div className="text-[14px] text-white/65 mt-2">
                  {bus.availableSeats} of {bus.totalSeats} seats free · valid 24 hours
                </div>
              </div>
              <div className="text-right">
                <Eyebrow className="!text-white/55">Fare</Eyebrow>
                <div className="metric text-[36px] md:text-[44px] text-[color:var(--color-surface)] mt-1">
                  ₦{fareNgn}
                </div>
              </div>
            </div>
          </Surface>

          {/* Form */}
          <Surface variant="default" padding="p-6 md:p-8">
            <Eyebrow>Passenger details</Eyebrow>
            <h3 className="h-display text-xl mt-1">Who's this seat for?</h3>
            <form onSubmit={submit} className="mt-6 space-y-5">
              <Field label="Full name">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Aisha Bello"
                  required
                  minLength={2}
                  autoFocus
                />
              </Field>
              <Field
                label="Email address"
                hint="Your QR boarding pass will be sent here."
              >
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="aisha@student.atbu.edu.ng"
                  required
                />
              </Field>

              {err && (
                <div className="text-[14px] text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/8 px-4 py-3 rounded-xl">
                  {err}
                </div>
              )}

              <div className="divider-dashed pt-5 mt-2 flex items-center justify-between">
                <div>
                  <Eyebrow>Total due</Eyebrow>
                  <div className="metric text-2xl mt-1">₦{fareNgn}</div>
                </div>
                <Button
                  type="submit"
                  tone="primary"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? "Redirecting…" : "Continue to payment"}
                  <span aria-hidden>→</span>
                </Button>
              </div>
              <p className="text-[12px] text-[color:var(--color-muted)] text-center">
                You'll be taken to a secure payment page.
              </p>
            </form>
          </Surface>

          <Surface variant="accent" padding="p-5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/60 grid place-items-center text-base shrink-0">
                ⓘ
              </div>
              <div>
                <div className="text-[14px] font-medium text-[color:var(--color-accent-strong)]">
                  If you miss this bus
                </div>
                <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-1 leading-relaxed">
                  Your QR auto-transfers to the next available bus within 24
                  hours. No need to rebook.
                </p>
              </div>
            </div>
          </Surface>
        </>
      )}

    </div>
  );
}

function Steps({ current }: { current: number }) {
  const steps = ["Pick bus", "Your details", "Pay", "Boarding pass"];
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] ${
                done
                  ? "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]"
                  : active
                    ? "bg-[color:var(--color-ink)] text-[color:var(--color-surface)]"
                    : "bg-[color:var(--color-surface-deep)] text-[color:var(--color-muted)]"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full grid place-items-center text-[9px] font-mono ${
                  done
                    ? "bg-[color:var(--color-accent)] text-white"
                    : active
                      ? "bg-white/15 text-white"
                      : "bg-white text-[color:var(--color-muted)]"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className="font-medium">{s}</span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-[color:var(--color-border-strong)]">·</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
