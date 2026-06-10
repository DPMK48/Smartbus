"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Field,
  PageHeader,
  Pill,
  Surface,
} from "@/components/ui";

type Admin = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  createdById: string | null;
};

export default function AdminsClient({ initial }: { initial: Admin[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/admins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Failed");
    } else {
      setEmail("");
      setName("");
      setPassword("");
      setShowAdd(false);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <PageHeader
        eyebrow="Team"
        title="Administrators"
        description="Any admin can add more admins. All admins share the same permissions."
        actions={
          <Button
            tone={showAdd ? "ghost" : "primary"}
            onClick={() => setShowAdd((v) => !v)}
          >
            {showAdd ? "Cancel" : "+ Invite admin"}
          </Button>
        }
      />

      {showAdd && (
        <Surface padding="p-6" className="slide-up">
          <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
            <Field label="Name">
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            <Field
              label="Initial password"
              hint="Share with the new admin out-of-band; they'll use it to sign in."
            >
              <input
                type="text"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </Field>
            {err && (
              <div className="sm:col-span-2 text-[14px] text-[color:var(--color-danger)] bg-[color:var(--color-danger)]/8 px-4 py-3 rounded-xl">
                {err}
              </div>
            )}
            <div className="sm:col-span-2 flex justify-end">
              <Button tone="primary" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create admin"}
              </Button>
            </div>
          </form>
        </Surface>
      )}

      <Surface padding="p-0" className="overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {initial.map((a) => (
              <tr key={a.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[color:var(--color-surface-deep)] grid place-items-center text-[12px] font-medium">
                      {a.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{a.name}</span>
                  </div>
                </td>
                <td className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                  {a.email}
                </td>
                <td>
                  {a.createdById ? (
                    <Pill mono>Admin</Pill>
                  ) : (
                    <Pill tone="ink" mono>Super</Pill>
                  )}
                </td>
                <td className="text-[12.5px] text-[color:var(--color-ink-soft)]">
                  {new Date(a.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Surface>
    </div>
  );
}
