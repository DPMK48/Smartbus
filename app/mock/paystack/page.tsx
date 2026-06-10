"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Eyebrow, Money, Pill, Surface } from "@/components/ui";

function MockCheckout() {
  const params = useSearchParams();
  const router = useRouter();
  const reference = params.get("reference") ?? "";
  const amount = Number(params.get("amount") ?? 0);
  const email = params.get("email") ?? "";
  const [loading, setLoading] = useState<null | "success" | "fail">(null);

  async function fire(outcome: "success" | "fail") {
    setLoading(outcome);
    const eventName =
      outcome === "success" ? "charge.success" : "charge.failed";
    await fetch("/api/paystack/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-paystack-signature": "stub",
      },
      body: JSON.stringify({
        event: eventName,
        data: {
          reference,
          status: outcome === "success" ? "success" : "failed",
        },
      }),
    });
    router.push(
      `/payment/return?reference=${encodeURIComponent(reference)}&status=${outcome}`,
    );
  }

  return (
    <main className="min-h-screen grid place-items-center p-5 bg-[color:var(--color-surface)]">
      <div className="w-full max-w-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[color:var(--color-ink)] grid place-items-center text-[color:var(--color-surface)] text-xs font-mono font-bold">
              ps
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-[14px]">Paystack</div>
              <div className="text-[11px] text-[color:var(--color-muted)]">
                Secure checkout
              </div>
            </div>
          </div>
          <Pill mono>Dev stub</Pill>
        </div>

        <Surface padding="p-6 md:p-7" className="space-y-6">
          <div>
            <Eyebrow>Amount due</Eyebrow>
            <div className="metric text-[44px] mt-1">
              <Money kobo={amount} />
            </div>
          </div>

          <div className="divider-dashed pt-5 space-y-3">
            <Row k="Customer" v={email} />
            <Row
              k="Reference"
              v={<span className="font-mono text-[12px]">{reference}</span>}
            />
            <Row k="Method" v="Test card (auto)" />
          </div>

          <div className="space-y-2 pt-2">
            <Button
              tone="primary"
              size="lg"
              className="w-full !justify-center"
              onClick={() => fire("success")}
              disabled={loading !== null}
            >
              {loading === "success" ? "Processing…" : "Pay successfully"}
            </Button>
            <Button
              tone="ghost"
              className="w-full !justify-center"
              onClick={() => fire("fail")}
              disabled={loading !== null}
            >
              {loading === "fail" ? "…" : "Simulate failure"}
            </Button>
          </div>

          <p className="text-[11.5px] text-[color:var(--color-muted)] text-center">
            Dev-only checkout. In production this is the real Paystack hosted
            page.
          </p>
        </Surface>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-[color:var(--color-muted)] uppercase tracking-wider font-mono">
        {k}
      </span>
      <span className="text-[13.5px]">{v}</span>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8">Loading…</div>}>
      <MockCheckout />
    </Suspense>
  );
}
