import Link from "next/link";
import { prisma } from "@/lib/db";
import { activeReservationCountForBus } from "@/lib/float";
import {
  Eyebrow,
  EmptyState,
  LinkButton,
  Money,
  Pill,
  Surface,
} from "@/components/ui";

export const dynamic = "force-dynamic";

type StudentBus = {
  id: string;
  label: string;
  journey: "YELWA_TO_GUBI" | "GUBI_TO_YELWA";
  totalSeats: number;
  availableSeats: number;
  fareKobo: number;
  selectable: boolean;
};

const journeyOptions = [
  { value: "YELWA_TO_GUBI", label: "Yelwa to Gubi" },
  { value: "GUBI_TO_YELWA", label: "Gubi to Yelwa" },
];

async function getBuses(defaultFareKobo: number): Promise<StudentBus[]> {
  const buses = await prisma.bus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
                                                                                                                                                                                                                                            const firstByJourney = new Map<string, string>();
                                                                                                                                                                                                                                            for (const bus of buses) {
                                                                                                                                                                                                                                              if (!firstByJourney.has(bus.journey)) {
                                                                                                                                                                                                                                                firstByJourney.set(bus.journey, bus.id);
                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                            }
  return Promise.all(
    buses.map(async (b) => {
      const occupancy = await activeReservationCountForBus(prisma, b.id);
      const availableSeats = Math.max(0, b.totalSeats - occupancy);
      const isSpecial = b.fareKobo !== null && b.fareKobo !== defaultFareKobo;
      return {
        id: b.id,
        label: b.label,
        journey: b.journey,
        totalSeats: b.totalSeats,
        availableSeats,
        fareKobo: b.fareKobo ?? defaultFareKobo,
        selectable:
          availableSeats > 0 &&
          (isSpecial || firstByJourney.get(b.journey) === b.id),
      };
    }),
  );
}

async function getFare(): Promise<number> {
  const f = await prisma.setting.findUnique({ where: { key: "fareKobo" } });
  return Number(f?.value ?? 60000);
}

export default async function StudentHome() {
  const fareKobo = await getFare();
  const buses = await getBuses(fareKobo);
  const totalAvailable = buses.reduce((s, b) => s + b.availableSeats, 0);
  const byJourney = {
    YELWA_TO_GUBI: buses.filter((b) => b.journey === "YELWA_TO_GUBI"),
    GUBI_TO_YELWA: buses.filter((b) => b.journey === "GUBI_TO_YELWA"),
  };

  return (
    <div className="space-y-10 md:space-y-14">
      {/* HERO */}
      <section className="surface-dark dot-grid rounded-[28px] px-6 py-10 md:px-12 md:py-16 relative overflow-hidden">
        <div className="relative max-w-3xl">
          <Pill tone="on-dark" mono dot className="!bg-white/10">
            <span className="live-dot text-[color:var(--color-accent)]">●</span>
            <span>
              {buses.length > 0
                ? `${totalAvailable} seat${totalAvailable === 1 ? "" : "s"} available now`
                : "No buses listed"}
            </span>
          </Pill>
          <h1 className="h-hero text-[44px] md:text-[68px] mt-5 text-[color:var(--color-surface)]">
            Skip the queue.
            <br />
            <span className="text-[color:var(--color-accent)]">
              Board with a QR.
            </span>
          </h1>
          <p className="mt-5 text-[16px] md:text-[18px] text-white/65 max-w-xl leading-relaxed">
            Reserve a seat on the next campus bus, pay online, and we'll email
            your boarding pass instantly. No more cash, no more stranded.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="text-[14px] text-white/55">
              Flat fare ·{" "}
              <span className="text-white font-medium">
                <Money kobo={fareKobo} />
              </span>{" "}
              per seat
            </div>
          </div>
        </div>

        {/* Decorative bus illustration */}
        <BusGlyph className="hidden md:block absolute right-[-32px] bottom-[-40px] w-[420px] text-white/8" />
      </section>

      {/* BUS QUEUE */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <div>
            <Eyebrow>The queue</Eyebrow>
            <h2 className="h-display text-2xl md:text-3xl mt-2">
              Available buses
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/payment/history"
              className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)]"
            >
              Payment history
            </Link>
            <Link
              href="/"
              className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] inline-flex items-center gap-1.5"
            >
              <RefreshIcon />
              Refresh
            </Link>
          </div>
        </div>

        {buses.length === 0 ? (
          <EmptyState
            icon={
              <div className="w-14 h-14 rounded-2xl bg-[color:var(--color-surface-raised)] grid place-items-center mx-auto">
                <BusGlyph className="w-8 text-[color:var(--color-ink-soft)]" />
              </div>
            }
            title="No buses currently available"
            description="Please check back shortly. The administrator will list new buses as they arrive on campus."
          />
        ) : (
          <div className="space-y-8">
            {journeyOptions.map((journey) => (
              <div key={journey.value} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="h-display text-xl md:text-2xl">
                    {journey.label}
                  </h3>
                  <span className="text-[12px] text-[color:var(--color-muted)] font-mono uppercase tracking-wider">
                    {byJourney[journey.value as keyof typeof byJourney].length} buses
                  </span>
                </div>
                {byJourney[journey.value as keyof typeof byJourney].length ===
                0 ? (
                  <Surface variant="flat" padding="p-5">
                    <div className="text-[13px] text-[color:var(--color-ink-soft)]">
                      No buses for this journey yet.
                    </div>
                  </Surface>
                ) : (
                  <ol className="space-y-3">
                    {byJourney[
                      journey.value as keyof typeof byJourney
                    ].map((b, i) => (
                      <li
                        key={b.id}
                        className="slide-up"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <BusRow bus={b} position={i + 1} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* HOW IT WORKS */}
      <section>
        <div className="mb-5">
          <Eyebrow>The flow</Eyebrow>
          <h2 className="h-display text-2xl md:text-3xl mt-2">How it works</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              n: 1,
              t: "Pick the next bus",
              d: "Buses board in upload order. Only the next-up bus per journey is selectable.",
            },
            {
              n: 2,
              t: "Enter your details",
              d: "Just your name and email — no account or password needed.",
            },
            {
              n: 3,
              t: "Pay securely",
              d: "Card, bank transfer, or USSD through Paystack.",
            },
            {
              n: 4,
              t: "Board with QR",
              d: "Your boarding pass arrives by email. Show it at the bus stop.",
            },
          ].map((s) => (
            <Surface key={s.n} padding="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="metric text-[40px] text-[color:var(--color-accent)]">
                  {s.n}
                </div>
                <div className="w-7 h-7 rounded-lg bg-[color:var(--color-surface-deep)] grid place-items-center text-[color:var(--color-ink-soft)]">
                  →
                </div>
              </div>
              <div className="h-display text-[16px]">{s.t}</div>
              <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-2 leading-snug">
                {s.d}
              </p>
            </Surface>
          ))}
        </div>
      </section>
    </div>
  );
}

function BusRow({
  bus,
  position,
}: {
  bus: StudentBus;
  position: number;
}) {
  const filled = bus.totalSeats - bus.availableSeats;
  const pct =
    bus.totalSeats === 0 ? 0 : Math.round((filled / bus.totalSeats) * 100);
  const dotsCount = Math.min(bus.totalSeats, 24);
  const filledDots = Math.round((filled / bus.totalSeats) * dotsCount);

  return (
    <div
      className={`surface ${bus.selectable ? "hover-lift" : "opacity-60"} px-5 py-5 md:px-6 md:py-5`}
    >
      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 md:gap-6">
        {/* Position + label */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className={`w-14 h-14 rounded-2xl grid place-items-center shrink-0 ${
              bus.selectable
                ? "bg-[color:var(--color-ink)] text-[color:var(--color-surface)]"
                : "bg-[color:var(--color-surface-deep)] text-[color:var(--color-ink-soft)]"
            }`}
          >
            <span className="bus-no text-[22px]">{position}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-display text-[18px] truncate">{bus.label}</div>
              {bus.selectable ? (
                <Pill tone="accent" mono dot>
                  Boarding next
                </Pill>
              ) : (
                <Pill mono>In queue</Pill>
              )}
            </div>
            <div className="text-[13px] text-[color:var(--color-ink-soft)] mt-0.5">
              {bus.availableSeats} of {bus.totalSeats} seats free ·{" "}
              <Money kobo={bus.fareKobo} />
            </div>
          </div>
        </div>

        {/* Seat dot map (only on md+) */}
        <div className="hidden md:flex items-center gap-[3px] shrink-0">
          {Array.from({ length: dotsCount }).map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < filledDots
                  ? "bg-[color:var(--color-ink)]/40"
                  : "bg-[color:var(--color-accent)]"
              }`}
            />
          ))}
        </div>

        {/* Action */}
        <div className="w-full md:w-auto shrink-0">
          {bus.selectable ? (
            <LinkButton
              href={`/reserve/${bus.id}`}
              tone="primary"
              className="w-full md:w-auto"
            >
              Reserve
              <span aria-hidden>→</span>
            </LinkButton>
          ) : (
            <button className="btn btn-ghost w-full md:w-auto" disabled>
              Locked
            </button>
          )}
        </div>
      </div>

      {/* Mobile progress bar */}
      <div className="md:hidden mt-4 h-1.5 rounded-full bg-[color:var(--color-surface-deep)] overflow-hidden">
        <div
          className={
            bus.selectable
              ? "h-full bg-[color:var(--color-accent)]"
              : "h-full bg-[color:var(--color-border-strong)]"
          }
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BusGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 200 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="10" y="20" width="160" height="70" rx="14" />
      <line x1="10" y1="55" x2="170" y2="55" />
      <rect x="22" y="30" width="22" height="18" rx="3" />
      <rect x="52" y="30" width="22" height="18" rx="3" />
      <rect x="82" y="30" width="22" height="18" rx="3" />
      <rect x="112" y="30" width="22" height="18" rx="3" />
      <rect x="142" y="30" width="20" height="18" rx="3" />
      <circle cx="42" cy="100" r="12" />
      <circle cx="138" cy="100" r="12" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
