"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Eyebrow, PageHeader, Pill, Surface } from "@/components/ui";

type ScanResponse = {
  ok: boolean;
  result: string;
  reservation?: {
    studentName: string;
    studentEmail: string;
    busLabel: string;
  };
};

type Status = "idle" | "scanning" | "success" | "error";

export default function ScanClient() {
  const containerId = "qr-reader";
  const [status, setStatus] = useState<Status>("idle");
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [manualToken, setManualToken] = useState("");
  const scannerRef = useRef<unknown>(null);
  const lastSentRef = useRef<string>("");
  const lastSentAtRef = useRef<number>(0);

  async function start() {
    setStatus("scanning");
    setLastResult(null);
    const mod = await import("html5-qrcode");
    const Html5Qrcode = mod.Html5Qrcode;
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded: string) => handleDecoded(decoded),
        () => {},
      );
    } catch (e) {
      setStatus("error");
      setLastResult({
        ok: false,
        result:
          e instanceof Error && e.message
            ? `Camera error: ${e.message}`
            : "Camera error",
      });
    }
  }

  async function stop() {
    const scanner = scannerRef.current as
      | { stop: () => Promise<void>; clear: () => void }
      | null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {}
      scannerRef.current = null;
    }
    setStatus("idle");
  }

  async function handleDecoded(token: string) {
    const now = Date.now();
    if (token === lastSentRef.current && now - lastSentAtRef.current < 3000) {
      return;
    }
    lastSentRef.current = token;
    lastSentAtRef.current = now;
    await submit(token);
  }

  async function submit(token: string) {
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ qrToken: token }),
    });
    const data: ScanResponse = await res.json();
    setLastResult(data);
    setStatus(data.ok ? "success" : "error");
  }

  useEffect(() => {
    return () => {
      const scanner = scannerRef.current as
        | { stop: () => Promise<void>; clear: () => void }
        | null;
      if (scanner) scanner.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        eyebrow="Boarding"
        title="QR scanner"
        description="Point the camera at a passenger's boarding pass. Valid codes turn green; problems turn red."
      />

      <div className="grid lg:grid-cols-[1fr_340px] gap-5">
        {/* Camera viewport */}
        <Surface padding="p-5" className="space-y-4">
          <div className="relative w-full aspect-square bg-[color:var(--color-surface-dark)] rounded-2xl overflow-hidden">
            <div id={containerId} className="absolute inset-0" />
            {status === "idle" && (
              <div className="absolute inset-0 grid place-items-center text-center text-white/70">
                <div>
                  <div className="w-16 h-16 rounded-2xl bg-white/10 grid place-items-center mx-auto mb-3">
                    <CameraIcon />
                  </div>
                  <div className="text-[13px]">
                    Tap{" "}
                    <span className="font-medium text-white">Start camera</span>{" "}
                    to begin
                  </div>
                </div>
              </div>
            )}
            {status === "scanning" && (
              <>
                <div className="absolute inset-x-12 inset-y-12 border-2 border-[color:var(--color-accent)] rounded-2xl pointer-events-none" />
                <div className="absolute top-3 left-3">
                  <Pill className="!bg-black/60 !text-white">
                    <span className="live-dot text-[color:var(--color-accent)]">
                      ●
                    </span>
                    Scanning
                  </Pill>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {status === "scanning" ? (
              <Button tone="ghost" onClick={stop} className="flex-1">
                Stop camera
              </Button>
            ) : (
              <Button tone="primary" onClick={start} className="flex-1">
                Start camera
              </Button>
            )}
          </div>
        </Surface>

        {/* Result + manual entry */}
        <div className="space-y-4">
          {lastResult ? (
            <ResultPanel result={lastResult} />
          ) : (
            <Surface variant="accent" padding="p-5">
              <Eyebrow className="!text-[color:var(--color-accent-strong)]">
                Ready to scan
              </Eyebrow>
              <p className="text-[13px] text-[color:var(--color-ink-soft)] mt-2 leading-relaxed">
                Each successful scan marks the boarding pass used so it can't
                be reused.
              </p>
            </Surface>
          )}

          <Surface variant="flat" padding="p-5">
            <details>
              <summary className="text-[13px] text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ink)] cursor-pointer flex items-center justify-between">
                <span>Manual entry</span>
                <span className="text-[color:var(--color-muted)]">⌄</span>
              </summary>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualToken.trim()) submit(manualToken.trim());
                }}
                className="mt-3 space-y-2"
              >
                <input
                  className="input"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Paste QR token"
                />
                <Button tone="subtle" size="sm" type="submit" className="w-full">
                  Verify
                </Button>
              </form>
            </details>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: ScanResponse }) {
  const banners: Record<
    string,
    { label: string; tone: "success" | "warning" | "danger" }
  > = {
    OK: { label: "Boarding approved", tone: "success" },
    ALREADY_USED: { label: "Already boarded", tone: "warning" },
    EXPIRED: { label: "QR expired (>24h)", tone: "danger" },
    INVALID: { label: "Invalid QR code", tone: "danger" },
    NOT_PAID: { label: "Payment not complete", tone: "danger" },
    BUS_DEPARTED: { label: "Bus has departed", tone: "danger" },
  };
  const banner = banners[result.result] ?? {
    label: result.result,
    tone: "danger" as const,
  };
  const bg =
    banner.tone === "success"
      ? "bg-[color:var(--color-accent)]"
      : banner.tone === "warning"
        ? "bg-[color:var(--color-warning)]"
        : "bg-[color:var(--color-danger)]";

  return (
    <div className={`rounded-2xl text-white p-6 pop-in ${bg}`}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white/20 grid place-items-center shrink-0">
          {banner.tone === "success" ? <CheckIcon /> : <CrossIcon />}
        </div>
        <div className="min-w-0">
          <div className="text-[10.5px] uppercase tracking-wider font-mono text-white/75">
            {result.ok ? "Verified" : "Rejected"}
          </div>
          <div className="h-display text-xl mt-1">{banner.label}</div>
        </div>
      </div>
      {result.reservation && (
        <div className="mt-5 pt-5 border-t border-white/20 space-y-1 text-[14px]">
          <div className="font-semibold">{result.reservation.studentName}</div>
          <div className="text-white/80">
            {result.reservation.studentEmail}
          </div>
          <div className="text-white/80">{result.reservation.busLabel}</div>
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="24"
      height="24"
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

function CrossIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
