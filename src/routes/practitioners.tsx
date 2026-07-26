import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import {
  usePractitioners,
  openPractitionerPanel,
  addPractitioner,
  availabilityFor,
  dateKeyOf,
  type PractitionerRec,
} from "@/lib/practitionerStore";
import { PractitionerPanel } from "@/components/PractitionerPanel";

const DISPLAY = "'Inter Tight', Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const INK = "#0a0a0a";
const AVAILABLE = "#16a34a";

const fmtHM = (mins: number) => {
  const abs = mins + 5 * 60;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 24) return `12:${String(m).padStart(2, "0")} AM`;
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const Route = createFileRoute("/practitioners")({
  component: PractitionersPage,
  head: () => ({
    meta: [
      { title: "Practitioners · Seondya" },
      { name: "description", content: "Roster, contact, and today's availability for Seondya practitioners." },
      { property: "og:title", content: "Practitioners · Seondya" },
      { property: "og:description", content: "Roster, contact, and today's availability for Seondya practitioners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PractitionersPage() {
  const { practitioners } = usePractitioners();
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const todayKey = dateKeyOf(new Date());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return practitioners;
    return practitioners.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.offerings.some((o) => o.toLowerCase().includes(q)),
    );
  }, [practitioners, query]);

  return (
    <div className="min-h-screen antialiased" style={{ background: "#ffffff", color: INK, fontFamily: DISPLAY }}>
      {/* Top bar — mirrors index route */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] backdrop-blur-md" style={{ background: "rgba(255,255,255,0.72)" }}>
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-[5px] text-[10px] font-semibold text-white" style={{ background: INK }}>
              S
            </div>
            <span className="text-[13px] font-medium tracking-tight text-black/80">Seondya</span>
          </Link>
          <nav className="flex items-center gap-4 text-[12.5px]">
            <Link to="/" className="text-black/50 hover:text-black">Reservations</Link>
            <Link to="/practitioners" className="font-semibold text-black" activeProps={{ className: "font-semibold text-black" }}>
              Practitioners
            </Link>
          </nav>
          <div className="ml-auto" />
        </div>
      </header>

      <section className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-[1440px] px-6 pt-8 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-[11.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
                Roster
              </div>
              <h1 className="mt-2 text-[44px] font-semibold leading-[1] tracking-[-0.03em] md:text-[56px]">
                Practitioners
              </h1>
              <p className="mt-2 max-w-xl text-[13.5px] text-black/55">
                Contact anyone, see who's available today, and mark someone in when they say yes — by text, phone, or self-scheduled.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or offering"
                  className="w-64 rounded-[8px] border border-black/10 bg-white py-1.5 pl-8 pr-2 text-[13px] text-black placeholder:text-black/35 focus:border-black/40 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-semibold text-white hover:opacity-90"
                style={{ background: INK }}
              >
                <Plus size={13} strokeWidth={2.5} />
                Add practitioner
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-8">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PractitionerCard key={p.id} p={p} todayKey={todayKey} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-black/10 bg-white px-6 py-16 text-center text-[13.5px] text-black/50">
            No matches. Try a different search or add a new practitioner.
          </div>
        )}
      </section>

      {showAdd && <AddPractitionerDialog onClose={() => setShowAdd(false)} />}
      <PractitionerPanel />
    </div>
  );
}

function PractitionerCard({ p, todayKey }: { p: PractitionerRec; todayKey: string }) {
  const blocks = availabilityFor(p.id, todayKey);
  const totalMinutes = blocks.reduce((sum, b) => sum + (b.end - b.start), 0);
  const hasAvailability = totalMinutes > 0;

  return (
    <button
      onClick={() => openPractitionerPanel(p.id)}
      className="group flex flex-col items-stretch rounded-[12px] border border-black/[0.08] bg-white p-4 text-left shadow-[0_1px_0_rgba(0,0,0,0.02)] transition hover:border-black/25 hover:shadow-[0_10px_30px_-16px_rgba(0,0,0,0.18)]"
    >
      <div className="flex items-start gap-3">
        <div
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-semibold text-white"
          style={{ background: p.colorHue }}
        >
          {p.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-semibold text-black">{p.name}</div>
          <div className="mt-0.5 truncate text-[12px] text-black/55" style={{ fontFamily: MONO }}>
            {p.phone ?? "No phone on file"}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{
            background: hasAvailability ? "rgba(22,163,74,0.10)" : "rgba(0,0,0,0.04)",
            color: hasAvailability ? "#065f46" : "rgba(0,0,0,0.45)",
          }}
        >
          {hasAvailability ? `Today · ${Math.round(totalMinutes / 60 * 10) / 10}h` : "No hours today"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.offerings.slice(0, 3).map((o) => (
          <span key={o} className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[11px] text-black/65">
            {o}
          </span>
        ))}
        {p.offerings.length > 3 && (
          <span className="text-[11px] text-black/45">+{p.offerings.length - 3}</span>
        )}
      </div>

      {hasAvailability && (
        <div className="mt-3 border-t border-black/[0.06] pt-2.5">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
            Available today
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5 text-[11.5px] tabular-nums text-emerald-800" style={{ fontFamily: MONO }}>
            {blocks.map((b) => (
              <span key={b.id} className="rounded-[4px] px-1.5 py-0.5" style={{ background: "rgba(22,163,74,0.10)" }}>
                {fmtHM(b.start)}–{fmtHM(b.end)}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

function AddPractitionerDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [offerings, setOfferings] = useState("");
  const [notes, setNotes] = useState("");

  const HUES = ["#3fd6b0", "#ff7aa2", "#f5b544", "#9d8bff", "#e57ac8", "#8fd14f", "#7dd3fc"];
  const [hue, setHue] = useState(HUES[0]);

  const canSave = name.trim().length > 1;

  const save = () => {
    if (!canSave) return;
    const rec = addPractitioner({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      offerings: offerings.split(",").map((s) => s.trim()).filter(Boolean),
      notes: notes.trim() || undefined,
      colorHue: hue,
    });
    onClose();
    openPractitionerPanel(rec.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-[14px] bg-white p-6 shadow-2xl" style={{ fontFamily: DISPLAY }}>
        <div className="mb-4">
          <div className="text-[10.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
            New practitioner
          </div>
          <h3 className="mt-1 text-[20px] font-semibold tracking-tight text-black">Add someone to the roster</h3>
        </div>
        <div className="flex flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="rounded-[8px] border border-black/10 px-3 py-2 text-[14px] focus:border-black/40 focus:outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (for text/call requests)" className="rounded-[8px] border border-black/10 px-3 py-2 text-[14px] focus:border-black/40 focus:outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" className="rounded-[8px] border border-black/10 px-3 py-2 text-[14px] focus:border-black/40 focus:outline-none" />
          <input value={offerings} onChange={(e) => setOfferings(e.target.value)} placeholder="Offerings (comma separated)" className="rounded-[8px] border border-black/10 px-3 py-2 text-[14px] focus:border-black/40 focus:outline-none" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="resize-none rounded-[8px] border border-black/10 px-3 py-2 text-[13px] focus:border-black/40 focus:outline-none" />
          <div>
            <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>Color</div>
            <div className="flex gap-1.5">
              {HUES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setHue(c)}
                  className={`h-6 w-6 rounded-full ring-2 transition ${hue === c ? "ring-black" : "ring-transparent"}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-[8px] px-3 py-2 text-[13px] font-medium text-black/60 hover:text-black">Cancel</button>
          <button onClick={save} disabled={!canSave} className="rounded-[8px] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40" style={{ background: INK }}>
            Add practitioner
          </button>
        </div>
      </div>
    </div>
  );
}
