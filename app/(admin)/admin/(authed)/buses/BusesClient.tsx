"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  BusStatusPill,
  EmptyState,
  Eyebrow,
  Field,
  PageHeader,
  Pill,
  ReservationStatusPill,
  Surface,
} from "@/components/ui";

type Reservation = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: string;
  createdAt: string;
  purchasedAt: string | null;
  scannedAt: string | null;
  paystackRef: string;
};

type Bus = {
  id: string;
  label: string;
  journey: "YELWA_TO_GUBI" | "GUBI_TO_YELWA";
  fareKobo: number | null;
  totalSeats: number;
  status: "ACTIVE" | "FULL" | "DEPARTED";
  createdAt: string;
  departedAt: string | null;
  occupancy: number;
  reservations: Reservation[];
};

const journeyOptions = [
  { value: "YELWA_TO_GUBI", label: "Yelwa to Gubi" },
  { value: "GUBI_TO_YELWA", label: "Gubi to Yelwa" },
];

function journeyLabel(journey: Bus["journey"]) {
  return journey === "YELWA_TO_GUBI" ? "Yelwa to Gubi" : "Gubi to Yelwa";
}

export default function BusesClient({
  initialBuses,
}: {
  initialBuses: Bus[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newJourney, setNewJourney] = useState<Bus["journey"]>(
    "YELWA_TO_GUBI",
  );
  const [newFare, setNewFare] = useState("");
  const [newSeats, setNewSeats] = useState(18);
  const [err, setErr] = useState("");

  async function addBus(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const fareNgn = newFare.trim() ? Number(newFare) : null;
    const fareKobo =
      fareNgn && Number.isFinite(fareNgn)
        ? Math.round(fareNgn * 100)
        : null;
    const res = await fetch("/api/buses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        label: newLabel,
        totalSeats: newSeats,
        journey: newJourney,
        fareKobo: fareKobo ?? undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Failed");
    } else {
      setNewLabel("");
      setNewJourney("YELWA_TO_GUBI");
      setNewFare("");
      setNewSeats(18);
      setShowAdd(false);
      router.refresh();
    }
    setBusy(false);
  }

  async function depart(id: string) {
    if (
      !confirm(
        "Mark this bus departed? Unscanned passengers will float to the next bus.",
      )
    )
      return;
    setBusy(true);
    await fetch(`/api/buses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "depart" }),
    });
    router.refresh();
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm("Remove this bus? (History preserved.)")) return;
    setBusy(true);
    await fetch(`/api/buses/${id}`, { method: "DELETE" });
    router.refresh();
    setBusy(false);
  }

  async function markAbsent(busId: string, reservationIds: string[]) {
    if (reservationIds.length === 0) return;
    if (
      !confirm(
        `Mark ${reservationIds.length} absent? Their seats reopen here and they float forward.`,
      )
    )
      return;
    setBusy(true);
    await fetch(`/api/buses/${busId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "markAbsent", reservationIds }),
    });
    router.refresh();
    setBusy(false);
  }

  const active = initialBuses.filter((b) => b.status !== "DEPARTED");
  const departed = initialBuses.filter((b) => b.status === "DEPARTED");
  const activeByJourney = {
    YELWA_TO_GUBI: active.filter((b) => b.journey === "YELWA_TO_GUBI"),
    GUBI_TO_YELWA: active.filter((b) => b.journey === "GUBI_TO_YELWA"),
  };
  const departedByJourney = {
    YELWA_TO_GUBI: departed.filter((b) => b.journey === "YELWA_TO_GUBI"),
    GUBI_TO_YELWA: departed.filter((b) => b.journey === "GUBI_TO_YELWA"),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Fleet"
        title="Buses"
        description="Add buses as they arrive on campus. Each journey fills in upload order; depart a bus when it leaves so unscanned passengers float forward to the next in that journey."
        actions={
          <Button
            tone={showAdd ? "ghost" : "primary"}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Cancel" : "+ Add bus"}
          </Button>
        }
      />

      {showAdd && (
        <Surface variant="default" padding="p-6" className="slide-up">
          <form
            onSubmit={addBus}
            className="grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 items-end"
          >
            <Field label="Bus label">
              <input
                className="input"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Bus 3"
                required
                autoFocus
              />
            </Field>
            <Field label="Journey">
              <select
                className="input"
                value={newJourney}
                onChange={(e) =>
                  setNewJourney(e.target.value as Bus["journey"])
                }
              >
                {journeyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fare (NGN)">
              <input
                type="number"
                className="input"
                value={newFare}
                onChange={(e) => setNewFare(e.target.value)}
                min={1}
                step="0.01"
                placeholder="Default fare"
              />
            </Field>
            <Field label="Total seats">
              <input
                type="number"
                className="input"
                value={newSeats}
                onChange={(e) => setNewSeats(Number(e.target.value))}
                min={1}
                max={200}
                required
              />
            </Field>
            <Button tone="primary" disabled={busy} type="submit">
              {busy ? "Adding…" : "Add to queue"}
            </Button>
            {err && (
              <div className="sm:col-span-5 text-[14px] text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/8 px-4 py-3 rounded-xl">
                {err}
              </div>
            )}
          </form>
        </Surface>
      )}

      {active.length === 0 && !showAdd && (
        <EmptyState
          icon={<div className="text-4xl">🚍</div>}
          title="No active buses"
          description="Add your first bus to start accepting reservations."
          action={
            <Button tone="primary" onClick={() => setShowAdd(true)}>
              + Add bus
            </Button>
          }
        />
      )}

      <div className="space-y-10">
        {journeyOptions.map((journey) => (
          <div key={journey.value} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="h-display text-xl md:text-2xl">
                {journey.label}
              </h2>
              <span className="text-[12px] text-[color:var(--color-muted)] font-mono uppercase tracking-wider">
                {activeByJourney[journey.value as Bus["journey"]].length} in queue
              </span>
            </div>
            {activeByJourney[journey.value as Bus["journey"]].length === 0 ? (
              <Surface variant="flat" padding="p-5">
                <div className="text-[13px] text-[color:var(--color-ink-soft)]">
                  No active buses for this journey.
                </div>
              </Surface>
            ) : (
              <div className="space-y-4">
                {activeByJourney[journey.value as Bus["journey"]].map(
                  (bus, idx) => (
                    <BusCardAdmin
                      key={bus.id}
                      bus={bus}
                      queuePosition={idx + 1}
                      onDepart={() => depart(bus.id)}
                      onRemove={() => remove(bus.id)}
                      onMarkAbsent={(ids) => markAbsent(bus.id, ids)}
                      busy={busy}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {departed.length > 0 && (
        <details className="pt-4">
          <summary className="text-[12px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] cursor-pointer inline-flex items-center gap-2">
            <span className="font-mono uppercase tracking-wider">
              {departed.length} departed
            </span>
            <span>· show history</span>
          </summary>
          <div className="mt-4 space-y-6">
            {journeyOptions.map((journey) => (
              <div key={journey.value} className="space-y-2">
                <div className="text-[12px] text-[color:var(--color-muted)] font-mono uppercase tracking-wider">
                  {journey.label}
                </div>
                {departedByJourney[journey.value as Bus["journey"]].length ===
                0 ? (
                  <div className="text-[12px] text-[color:var(--color-ink-soft)]">
                    No departed buses for this journey yet.
                  </div>
                ) : (
                  departedByJourney[journey.value as Bus["journey"]].map(
                    (bus) => (
                      <div
                        key={bus.id}
                        className="surface-flat px-5 py-3 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <BusStatusPill status={bus.status} />
                          <span className="h-display text-[15px]">
                            {bus.label}
                          </span>
                          <span className="text-[12px] text-[color:var(--color-muted)]">
                            {
                              bus.reservations.filter(
                                (r) => r.status === "USED",
                              ).length
                            }{" "}
                            boarded · {bus.reservations.length} total
                          </span>
                        </div>
                        {bus.departedAt && (
                          <span className="text-[12px] text-[color:var(--color-muted)]">
                            Departed {new Date(bus.departedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    ),
                  )
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function BusCardAdmin({
  bus,
  queuePosition,
  onDepart,
  onRemove,
  onMarkAbsent,
  busy,
}: {
  bus: Bus;
  queuePosition: number;
  onDepart: () => void;
  onRemove: () => void;
  onMarkAbsent: (ids: string[]) => void;
  busy: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const unscannedPaid = bus.reservations.filter(
    (r) => r.status === "PAID" && !r.scannedAt,
  );
  const isFirst = queuePosition === 1;
  const filledPct =
    bus.totalSeats === 0
      ? 0
      : Math.round((bus.occupancy / bus.totalSeats) * 100);

  return (
    <Surface padding="p-0" className="overflow-hidden">
      {/* Bus header strip */}
      <div className="p-5 md:p-6 flex flex-wrap gap-4 items-start justify-between">
        <div className="flex items-start gap-4 min-w-0">
          <div
            className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${
              isFirst
                ? "bg-[color:var(--color-ink)] text-[color:var(--color-surface)]"
                : "bg-[color:var(--color-surface-deep)] text-[color:var(--color-ink-soft)]"
            }`}
          >
            <span className="bus-no text-[22px]">{queuePosition}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="h-display text-xl">{bus.label}</h3>
              <BusStatusPill status={bus.status} />
              {isFirst && bus.status === "ACTIVE" && (
                <Pill tone="accent" mono dot>
                  Boarding next
                </Pill>
              )}
            </div>
            <div className="text-[12px] text-[color:var(--color-muted)] mt-1">
              {journeyLabel(bus.journey)} · Added{" "}
              {new Date(bus.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button tone="accent" size="sm" onClick={onDepart} disabled={busy}>
            Depart bus
          </Button>
          <Button tone="ghost" size="sm" onClick={onRemove} disabled={busy}>
            Remove
          </Button>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="px-5 md:px-6 pb-5">
        <div className="flex items-baseline justify-between text-[12px] mb-1.5">
          <span className="font-mono uppercase tracking-wider text-[color:var(--color-muted)]">
            Occupancy
          </span>
          <span className="text-[color:var(--color-ink-soft)]">
            <span className="font-medium text-[color:var(--color-ink)]">
              {bus.occupancy}
            </span>{" "}
            of {bus.totalSeats} ({filledPct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-[color:var(--color-surface-deep)] overflow-hidden">
          <div
            className="h-full bg-[color:var(--color-accent)] transition-all"
            style={{ width: `${filledPct}%` }}
          />
        </div>
      </div>

      {/* Roster */}
      {bus.reservations.length === 0 ? (
        <div className="bg-[color:var(--color-surface-deep)] px-5 md:px-6 py-6 text-center text-[13px] text-[color:var(--color-ink-soft)]">
          No reservations yet — first to book gets the next seat.
        </div>
      ) : (
        <div className="border-t border-[color:var(--color-border)]">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-10"></th>
                <th>Passenger</th>
                <th>Email</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {bus.reservations.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.status === "PAID" && !r.scannedAt ? (
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        className="w-4 h-4 accent-[color:var(--color-ink)]"
                      />
                    ) : null}
                  </td>
                  <td className="font-medium">{r.studentName}</td>
                  <td className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                    {r.studentEmail}
                  </td>
                  <td>
                    <ReservationStatusPill status={r.status} />
                  </td>
                  <td className="font-mono text-[11px] text-[color:var(--color-muted)]">
                    {r.paystackRef.slice(-12)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {unscannedPaid.length > 0 && (
            <div className="bg-[color:var(--color-surface-deep)] px-5 md:px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
              <Eyebrow>
                Reopen absent seats; their QR transfers to next bus.
              </Eyebrow>
              <Button
                tone="ghost"
                size="sm"
                onClick={() => onMarkAbsent([...selected])}
                disabled={busy || selected.size === 0}
              >
                Float {selected.size} → next bus
              </Button>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}
