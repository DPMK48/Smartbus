import { prisma } from "@/lib/db";
import {
  Eyebrow,
  LinkButton,
  Metric,
  PageHeader,
  Pill,
  Surface,
} from "@/components/ui";

export const dynamic = "force-dynamic";

async function loadStats() {
  const [
    totalBuses,
    activeBuses,
    fullBuses,
    departedBuses,
    paidReservations,
    usedReservations,
    pendingReservations,
    expiredReservations,
    recentScans,
  ] = await Promise.all([
    prisma.bus.count(),
    prisma.bus.count({ where: { status: "ACTIVE" } }),
    prisma.bus.count({ where: { status: "FULL" } }),
    prisma.bus.count({ where: { status: "DEPARTED" } }),
    prisma.reservation.count({ where: { status: "PAID" } }),
    prisma.reservation.count({ where: { status: "USED" } }),
    prisma.reservation.count({ where: { status: "PENDING_PAYMENT" } }),
    prisma.reservation.count({ where: { status: "EXPIRED" } }),
    prisma.scanLog.findMany({
      orderBy: { scannedAt: "desc" },
      take: 10,
      include: { admin: { select: { name: true } } },
    }),
  ]);
  return {
    totalBuses,
    activeBuses,
    fullBuses,
    departedBuses,
    paidReservations,
    usedReservations,
    pendingReservations,
    expiredReservations,
    recentScans,
  };
}

export default async function Dashboard() {
  const s = await loadStats();

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A live look at the campus bus fleet and reservations."
        actions={
          <>
            <LinkButton href="/admin/scan" tone="accent">
              Start scanning
            </LinkButton>
            <LinkButton href="/admin/buses" tone="primary">
              Manage buses
            </LinkButton>
          </>
        }
      />

      {/* Top stats — 3 hero metrics */}
      <section className="grid sm:grid-cols-3 gap-4">
        <Metric
          accent
          label="Active buses"
          value={s.activeBuses}
          sub={`${s.totalBuses} total in system`}
        />
        <Metric
          label="Seats sold today"
          value={s.paidReservations + s.usedReservations}
          sub={`${s.usedReservations} boarded · ${s.paidReservations} pending board`}
        />
        <Metric
          label="Pending payments"
          value={s.pendingReservations}
          sub="awaiting webhook confirmation"
        />
      </section>

      {/* Secondary stats — compact strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCompact
          label="Full"
          value={s.fullBuses}
          sub="awaiting departure"
        />
        <StatCompact
          label="Departed"
          value={s.departedBuses}
          sub="closed for scans"
        />
        <StatCompact
          label="Expired"
          value={s.expiredReservations}
          sub="QR > 24h"
        />
        <StatCompact
          label="Total scans"
          value={s.recentScans.length}
          sub="recent activity"
        />
      </section>

      {/* Recent activity */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <Eyebrow>Activity</Eyebrow>
            <h2 className="h-display text-2xl mt-2">Recent QR scans</h2>
          </div>
          {s.recentScans.length > 0 && (
            <Pill mono dot tone="success">
              <span className="live-dot text-[color:var(--color-accent)]">
                ●
              </span>
              Live
            </Pill>
          )}
        </div>

        {s.recentScans.length === 0 ? (
          <Surface variant="sunken" padding="p-12" className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-[color:var(--color-surface-raised)] grid place-items-center mx-auto text-2xl">
              📷
            </div>
            <h3 className="h-display text-lg mt-4">No scans yet</h3>
            <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-1.5">
              Scans appear here as passengers board.
            </p>
          </Surface>
        ) : (
          <Surface variant="flat" padding="p-0" className="overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="data-table min-w-[600px] sm:min-w-0">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Result</th>
                    <th>Reservation</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentScans.map((row) => (
                    <tr key={row.id}>
                      <td>{new Date(row.scannedAt).toLocaleString()}</td>
                      <td>
                        <ResultPill result={row.result} />
                      </td>
                      <td className="font-mono text-[11.5px] text-[color:var(--color-ink-soft)]">
                        {row.reservationId ?? "—"}
                      </td>
                      <td>{row.admin?.name ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
        )}
      </section>
    </div>
  );
}

function StatCompact({
  label,
  value,
  sub,
}: {
  label: string;
  value: number;
  sub: string;
}) {
  return (
    <div className="surface px-5 py-4">
      <div className="text-[11px] uppercase tracking-wider text-[color:var(--color-muted)] font-mono">
        {label}
      </div>
      <div className="metric text-[28px] mt-2">{value}</div>
      <div className="text-[11.5px] text-[color:var(--color-muted)] mt-1">
        {sub}
      </div>
    </div>
  );
}

function ResultPill({ result }: { result: string }) {
  if (result === "OK") return <Pill tone="success" mono dot>OK</Pill>;
  if (result === "ALREADY_USED")
    return <Pill tone="warning" mono dot>Already used</Pill>;
  if (result === "EXPIRED") return <Pill mono dot>Expired</Pill>;
  return <Pill tone="danger" mono dot>{result}</Pill>;
}
