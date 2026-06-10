"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Eyebrow,
  LinkButton,
  Money,
  Pill,
  Surface,
} from "@/components/ui";

type VerifyResponse = {
  status: string;
  busLabel: string;
  studentEmail: string;
  studentName: string;
  amount: number;
  reference: string;
  qrToken: string | null;
  scannedAt: string | null;
  expiresAt: string | null;
};

function PaymentReturn() {
  const params = useSearchParams();
  const reference = params.get("reference") ?? "";
  const intentStatus = params.get("status");
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!reference) {
      setErr("Missing reference");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const res = await fetch(
        `/api/reservations/verify?reference=${encodeURIComponent(reference)}`,
      );
      if (!res.ok) {
        setErr("Could not verify payment");
        return;
      }
      const json = (await res.json()) as VerifyResponse;
      if (cancelled) return;
      if (json.status === "PAID" || json.status === "USED") {
        setData(json);
        return;
      }
      if (json.status === "CANCELED") {
        setErr("Payment was cancelled. Please try again.");
        return;
      }
      if (attempts < 10) {
        setTimeout(poll, 1000);
      } else {
        setData(json);
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (err) {
    return (
      <CenteredCard
        icon="⚠"
        iconTone="danger"
        title={err}
        cta={
          <LinkButton href="/" tone="primary">
            Back to buses
          </LinkButton>
        }
      />
    );
  }

  if (!data) {
    return (
      <Surface padding="p-10" className="max-w-md mx-auto text-center">
        <Eyebrow>Verifying payment</Eyebrow>
        <div className="my-6">
          <div className="inline-block h-10 w-10 rounded-full border-[3px] border-[color:var(--color-border-strong)] border-t-[color:var(--color-ink)] animate-spin" />
        </div>
        <h2 className="h-display text-xl">Confirming with gateway…</h2>
        <p className="text-[13px] text-[color:var(--color-muted)] mt-2">
          This usually takes a couple of seconds.
        </p>
      </Surface>
    );
  }

  if (data.status !== "PAID" && data.status !== "USED") {
    if (intentStatus === "fail") {
      return (
        <CenteredCard
          icon="✕"
          iconTone="danger"
          title="Payment failed"
          description="Your seat was not reserved. You can try again."
          cta={
            <LinkButton href="/" tone="primary">
              Try another bus
            </LinkButton>
          }
        />
      );
    }
    return (
      <Surface padding="p-10" className="max-w-md mx-auto text-center">
        <Pill mono>Status: {data.status}</Pill>
        <h2 className="h-display text-xl mt-4">Still processing…</h2>
        <p className="text-[14px] text-[color:var(--color-ink-soft)] mt-2">
          Refresh in a moment. Your boarding pass will be emailed when payment
          completes.
        </p>
      </Surface>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Confirmation hero */}
      <Surface variant="dark" padding="p-8 md:p-10" className="text-center relative overflow-hidden dot-grid">
        <div className="relative">
          <div className="pop-in inline-block">
            <div className="w-16 h-16 rounded-full bg-[color:var(--color-accent)] grid place-items-center text-white text-3xl mx-auto">
              <CheckIcon />
            </div>
          </div>
          <Eyebrow className="!text-white/55 mt-5">Confirmed</Eyebrow>
          <h1 className="h-display text-3xl md:text-4xl mt-2 text-[color:var(--color-surface)]">
            You're going.
          </h1>
          <p className="mt-3 text-[15px] text-white/70">
            We emailed your QR boarding pass to{" "}
            <span className="text-white font-medium">{data.studentEmail}</span>.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-[12px] text-white/70">
            <span className="w-2 h-2 rounded-full bg-white/50" />
            {data.scannedAt || data.status === "USED"
              ? "Checked in"
              : "Not checked in yet"}
          </div>
        </div>
      </Surface>

      {data.qrToken && (
        <Surface padding="p-6" className="text-center">
          <Eyebrow>Boarding QR</Eyebrow>
          <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-1">
            Show this at the bus stop for verification.
          </p>
          <div className="mt-4 flex justify-center">
            <img
              src={`/api/qr?token=${encodeURIComponent(data.qrToken)}`}
              alt="Boarding QR code"
              width={240}
              height={240}
              className="rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface)]"
            />
          </div>
        </Surface>
      )}

      {/* Receipt */}
      <Surface padding="p-6">
        <Eyebrow>Receipt</Eyebrow>
        <div className="mt-4 divide-y divide-[color:var(--color-border)]">
          <Row k="Passenger" v={<span className="font-medium">{data.studentName}</span>} />
          <Row
            k="Bus"
            v={
              <Pill tone="accent" mono>
                {data.busLabel}
              </Pill>
            }
          />
          <Row k="Fare paid" v={<Money kobo={data.amount} />} />
          <Row
            k="Reference"
            v={
              <span className="font-mono text-[12.5px] text-[color:var(--color-ink-soft)]">
                {data.reference}
              </span>
            }
          />
          {data.expiresAt && (
            <Row
              k="QR valid until"
              v={
                <span className="text-[13px]">
                  {new Date(data.expiresAt).toLocaleString()}
                </span>
              }
            />
          )}
        </div>
      </Surface>

      <Surface variant="accent" padding="p-5">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/60 grid place-items-center text-base shrink-0">
            ⏱
          </div>
          <div>
            <div className="text-[14px] font-medium text-[color:var(--color-accent-strong)]">
              Missed this bus?
            </div>
            <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-1 leading-relaxed">
              Your seat automatically transfers to the next available bus
              within 24 hours. No need to rebook.
            </p>
          </div>
        </div>
      </Surface>

      <div className="text-center pt-2">
        <div className="flex flex-wrap justify-center gap-3">
          <LinkButton href={`/payment/history?email=${encodeURIComponent(data.studentEmail)}`} tone="ghost">
            View payment history
          </LinkButton>
          <LinkButton href="/" tone="ghost">
            ← Back to home
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

function CenteredCard({
  icon,
  iconTone,
  title,
  description,
  cta,
}: {
  icon: string;
  iconTone: "danger";
  title: React.ReactNode;
  description?: React.ReactNode;
  cta?: React.ReactNode;
}) {
  const tone =
    iconTone === "danger"
      ? "bg-[color:var(--color-danger)]/10 text-[color:var(--color-danger)]"
      : "";
  return (
    <Surface padding="p-10" className="max-w-md mx-auto text-center">
      <div className={`w-14 h-14 rounded-2xl ${tone} grid place-items-center text-2xl mx-auto`}>
        {icon}
      </div>
      <h2 className="h-display text-2xl mt-5">{title}</h2>
      {description && (
        <p className="text-[14px] text-[color:var(--color-ink-soft)] mt-2">
          {description}
        </p>
      )}
      {cta && <div className="mt-6">{cta}</div>}
    </Surface>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-3.5 first:pt-0 last:pb-0">
      <span className="text-[13px] text-[color:var(--color-muted)]">{k}</span>
      <span className="text-[14.5px]">{v}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <Surface padding="p-10" className="max-w-md mx-auto text-center">
          <p>Loading…</p>
        </Surface>
      }
    >
      <PaymentReturn />
    </Suspense>
  );
}
