import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  component: TodayPage,
  head: () => ({
    meta: [
      { title: "Today · Seondya" },
      { name: "description", content: "Front-desk operations for Seondya spa." },
      { property: "og:title", content: "Today · Seondya" },
      { property: "og:description", content: "Front-desk operations for Seondya spa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

// ------------------------------------------------------------------
// Model
// ------------------------------------------------------------------

type Status = "in-session" | "confirmed" | "requested" | "hold";

type Service = {
  id: string;
  guest: string;
  partySize?: number;
  service: string;
  room: string;
  practitioner: string;
  start: number;
  end: number;
  status: Status;
  note?: string;
};

type Attention = {
  id: string;
  severity: "critical" | "warn" | "info";
  title: string;
  detail: string;
  action?: string;
};

const ROOMS = [
  "Infrared Room",
  "Buddha Massage",
  "Ayurveda Room",
  "Om Space",
  "The Temple",
  "Land",
];

const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const DAY_SPAN = DAY_END - DAY_START;

const t = (h: number, m = 0) => h * 60 + m - DAY_START;
const fmt = (mins: number) => {
  const abs = mins + DAY_START;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
};

const SERVICES: Service[] = [
  { id: "s1", guest: "Elena Vives", service: "Myers Cocktail IV", room: "Land", practitioner: "Dr. Elise Warren", start: t(9, 30), end: t(10, 30), status: "confirmed" },
  { id: "s2", guest: "Nadia Farrow", service: "Deep Tissue Massage", room: "Buddha Massage", practitioner: "Maya Chen", start: t(10), end: t(11), status: "confirmed" },
  { id: "s3", guest: "Thomas Wren", service: "BEMER Session", room: "Infrared Room", practitioner: "Sofia Park", start: t(11), end: t(12), status: "confirmed" },
  { id: "s4", guest: "Nadia Farrow", service: "Cupping", room: "The Temple", practitioner: "Maya Chen", start: t(11, 15), end: t(11, 45), status: "confirmed" },
  { id: "s5", guest: "Gerald & June Pierce", partySize: 2, service: "Couples Ayurvedic Massage", room: "Ayurveda Room", practitioner: "Daniel Reyes", start: t(13, 30), end: t(15), status: "in-session", note: "25th anniversary · June has a hip injury" },
  { id: "s6", guest: "Amara Okonkwo", service: "Intuitive Reading", room: "Om Space", practitioner: "Uqualla", start: t(14), end: t(14, 50), status: "in-session", note: "Return guest · prefers low light and quiet arrival" },
  { id: "s7", guest: "Marcus Hale", service: "Sound Healing", room: "Om Space", practitioner: "Sofia Park", start: t(14, 40), end: t(15, 30), status: "confirmed" },
  { id: "s8", guest: "Amara Okonkwo", service: "Ceremonial Tea & Integration", room: "The Temple", practitioner: "Uqualla", start: t(14, 50), end: t(15, 20), status: "confirmed" },
  { id: "s9", guest: "Amara Okonkwo", service: "Infrared Sauna", room: "Infrared Room", practitioner: "Sofia Park", start: t(15, 20), end: t(16, 5), status: "confirmed" },
  { id: "s10", guest: "Priya Anand", service: "Medicine Walk", room: "Land", practitioner: "Uqualla", start: t(16), end: t(17, 30), status: "requested", note: "Awaiting confirmation" },
  { id: "s11", guest: "Lena Costa", service: "Grandmother Crystal Bowl", room: "The Temple", practitioner: "Uqualla", start: t(16, 30), end: t(17, 15), status: "confirmed" },
];

const ATTENTION: Attention[] = [
  {
    id: "a1",
    severity: "critical",
    title: "Om Space double-booked",
    detail: "Amara's reading ends 2:50 PM. Marcus's Sound Healing starts 2:40 PM. 10-minute overlap.",
    action: "Resolve",
  },
  {
    id: "a2",
    severity: "warn",
    title: "Room set required · The Temple",
    detail: "Amara's Ceremonial Tea starts 2:50 PM — 20 min out. Tea service + low light.",
    action: "Mark ready",
  },
  {
    id: "a3",
    severity: "info",
    title: "Sofia Park · back-to-back",
    detail: "Om Space 2:40 PM → Infrared 3:20 PM. Confirm she's aware.",
    action: "Notify",
  },
  {
    id: "a4",
    severity: "info",
    title: "Amara · 3-service journey",
    detail: "Reading → Tea → Infrared. Smooth handoff after 3:20 PM.",
  },
];

const FINANCES = [
  { guest: "Amara Okonkwo", services: 3, amount: 340, paid: false },
  { guest: "Gerald & June Pierce", services: 1, amount: 320, paid: false },
  { guest: "Lena Costa", services: 1, amount: 150, paid: false },
  { guest: "Priya Anand", services: 1, amount: 180, paid: false },
  { guest: "Nadia Farrow", services: 2, amount: 230, paid: true },
  { guest: "Marcus Hale", services: 1, amount: 140, paid: true },
  { guest: "Elena Vives", services: 1, amount: 220, paid: true },
  { guest: "Thomas Wren", services: 1, amount: 95, paid: true },
];

const NAV = [
  { label: "Today", key: "T" },
  { label: "Calendar", key: "C" },
  { label: "Requests", key: "R" },
  { label: "Guests", key: "G" },
  { label: "Rooms", key: "M" },
  { label: "Practitioners", key: "P" },
];

// ------------------------------------------------------------------

function useNow() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const DEMO_NOW = t(14, 30);

// ------------------------------------------------------------------

const DISPLAY = "'Inter Tight', Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const ACCENT = "#3730ff"; // electric indigo (system accent, not a guest)
const SURFACE = "#ffffff";
const INK = "#0a0a0a";

// Curated guest palette — each guest gets a consistent, distinct color that
// carries through their avatar, their timeline stripe, and their row.
const GUEST_PALETTE = [
  "#c2410c", // terracotta
  "#a16207", // ochre
  "#4d7c0f", // moss
  "#0f766e", // teal
  "#1d4ed8", // indigo
  "#7e22ce", // plum
  "#be185d", // rose
  "#475569", // slate
  "#b45309", // amber
  "#0369a1", // deep blue
  "#65a30d", // olive
  "#9333ea", // violet
] as const;

// Deterministic distinct color per unique guest (assigned in appearance order).
const GUEST_COLOR_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  let i = 0;
  for (const s of SERVICES) {
    if (!(s.guest in map)) {
      map[s.guest] = GUEST_PALETTE[i % GUEST_PALETTE.length];
      i++;
    }
  }
  return map;
})();

function guestColor(name: string): string {
  return GUEST_COLOR_MAP[name] ?? GUEST_PALETTE[0];
}

function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function TodayPage() {
  const now = useNow();
  const nowMin = DEMO_NOW;

  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const inSession = SERVICES.filter((s) => s.start <= nowMin && s.end > nowMin).length;
  const stillToCome = SERVICES.filter((s) => s.start > nowMin).length;
  const overlaps = 1;
  const revenue = FINANCES.reduce((a, b) => a + b.amount, 0);
  const unpaid = FINANCES.filter((f) => !f.paid).reduce((a, b) => a + b.amount, 0);

  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: SURFACE, color: INK, fontFamily: DISPLAY }}
    >
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/[0.08] backdrop-blur-md" style={{ background: "rgba(255,255,255,0.85)" }}>
        <div className="mx-auto flex max-w-[1440px] items-center gap-8 px-6 py-3">
          <div className="flex items-center gap-2">
            <div
              className="grid h-6 w-6 place-items-center rounded-[6px] text-[11px] font-semibold text-white"
              style={{ background: INK }}
            >
              S
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Seondya</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((item, i) => (
              <button
                key={item.label}
                className={`group flex items-center gap-1.5 rounded-[6px] px-2.5 py-1.5 text-[13px] transition-colors ${
                  i === 0 ? "bg-black/[0.06] text-black" : "text-black/55 hover:bg-black/[0.04] hover:text-black"
                }`}
              >
                {item.label}
                <span
                  className={`hidden rounded-[3px] px-1 text-[9px] font-medium tracking-wide md:inline ${
                    i === 0 ? "bg-black/10 text-black/60" : "bg-black/[0.04] text-black/35 group-hover:bg-black/[0.08]"
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  {item.key}
                </span>
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-[6px] border border-black/10 bg-white px-2.5 py-1.5 text-[12px] text-black/55 shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:text-black"
            >
              <span>Search or command</span>
              <span
                className="rounded-[3px] border border-black/10 bg-black/[0.03] px-1 py-px text-[10px] text-black/50"
                style={{ fontFamily: MONO }}
              >
                ⌘K
              </span>
            </button>
            <div className="h-6 w-px bg-black/10" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#ffb98a] to-[#e06b5c] ring-1 ring-black/10" />
              <span className="text-[13px] font-medium">Alba</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 pt-10 pb-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-[12px] text-black/50">
                <LiveDot />
                <span className="font-medium text-black/70">Live</span>
                <span className="text-black/30">·</span>
                <span>{date}</span>
              </div>
              <h1 className="mt-3 text-[52px] font-semibold leading-[1] tracking-[-0.035em] md:text-[64px]">
                Today
              </h1>
            </div>

            <div className="flex items-end gap-8">
              <Stat label="In session" value={inSession} />
              <Stat label="To come" value={stillToCome} />
              <Stat label="Conflicts" value={overlaps} accent />
              <div className="hidden h-16 w-px bg-black/10 md:block" />
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>Now</div>
                <div className="mt-1 text-[32px] font-semibold tabular-nums leading-none tracking-tight" style={{ fontFamily: DISPLAY }}>
                  {clock}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The one thing — Steve-Jobs move: name the single next action */}
      <section className="border-b border-black/[0.08]" style={{ background: "#fafafa" }}>
        <div className="mx-auto max-w-[1440px] px-6 py-5">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-[10px] uppercase tracking-[0.18em] text-black/45" style={{ fontFamily: MONO }}>
              Do this next
            </span>
            <span className="text-[18px] font-semibold tracking-tight">
              Set <span style={{ color: guestColor("Amara Okonkwo") }}>The Temple</span> for Amara's tea ceremony
            </span>
            <span className="text-[13px] text-black/50" style={{ fontFamily: MONO }}>
              in 20 min · 2:50 PM
            </span>
            <button
              className="ml-auto rounded-full bg-black px-4 py-1.5 text-[12px] font-medium text-white hover:bg-black/85"
            >
              Mark ready
            </button>
          </div>
        </div>
      </section>

      {/* Coming Up (heads-up / attention) */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader eyebrow="01" label="Coming Up" count={ATTENTION.length} />
          <div className="mt-6 grid gap-2 md:grid-cols-2">
            {ATTENTION.map((a) => (
              <AttentionCard key={a.id} item={a} />
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader eyebrow="02" label="Rooms" count={ROOMS.length} trailing={<TimelineLegend />} />
          <div className="mt-6">
            <Timeline nowMin={nowMin} />
          </div>
        </div>
      </section>

      {/* Later today */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader
            eyebrow="03"
            label="Later today"
            count={SERVICES.filter((s) => s.end > nowMin).length}
          />
          <div className="mt-6 overflow-hidden rounded-[10px] border border-black/[0.08] bg-white">
            {SERVICES.filter((s) => s.end > nowMin)
              .sort((a, b) => a.start - b.start)
              .map((s, i) => (
                <ServiceRow key={s.id} s={s} first={i === 0} />
              ))}
          </div>
        </div>
      </section>

      {/* Finances */}
      <section>
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader
            eyebrow="04"
            label="Finances"
            count={FINANCES.length}
            trailing={
              <div className="flex items-baseline gap-4 text-[13px]">
                <span className="text-black/50">Booked</span>
                <span className="tabular-nums font-semibold">${revenue.toLocaleString()}</span>
                <span className="text-black/20">·</span>
                <span className="text-black/50">Unpaid</span>
                <span className="tabular-nums font-semibold" style={{ color: ACCENT }}>${unpaid.toLocaleString()}</span>
              </div>
            }
          />
          <div className="mt-6 overflow-hidden rounded-[10px] border border-black/[0.08] bg-white">
            {FINANCES.map((f, i) => (
              <div
                key={f.guest}
                className={`grid grid-cols-12 items-center gap-4 px-5 py-3.5 text-[13px] ${
                  i > 0 ? "border-t border-black/[0.06]" : ""
                } hover:bg-black/[0.015]`}
              >
                <div className="col-span-6 flex items-center gap-3">
                  <Avatar name={f.guest} />
                  <div>
                    <div className="font-medium">{f.guest}</div>
                    <div className="text-[11px] text-black/45" style={{ fontFamily: MONO }}>
                      {f.services} service{f.services > 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="col-span-2 tabular-nums font-medium" style={{ fontFamily: MONO }}>
                  ${f.amount}
                </div>
                <div className="col-span-2">
                  <PaidPill paid={f.paid} />
                </div>
                <div className="col-span-2 text-right">
                  <button className="rounded-[6px] px-2 py-1 text-[12px] text-black/60 hover:bg-black/[0.05] hover:text-black">
                    Invoice ↗
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-[11px] text-black/35" style={{ fontFamily: MONO }}>
        SEONDYA · SHIFT 09:00 — 20:00
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------
// Bits
// ------------------------------------------------------------------

function LiveDot() {
  return (
    <span className="relative inline-flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: ACCENT }} />
      <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: ACCENT }} />
    </span>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
        {label}
      </div>
      <div
        className="mt-1 text-[32px] font-semibold tabular-nums leading-none tracking-tight"
        style={{ color: accent ? ACCENT : INK }}
      >
        {String(value).padStart(2, "0")}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  label,
  count,
  trailing,
}: {
  eyebrow: string;
  label: string;
  count: number;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
          {eyebrow}
        </span>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{label}</h2>
        <span className="text-[12px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
          {String(count).padStart(2, "0")}
        </span>
      </div>
      {trailing}
    </div>
  );
}

function AttentionCard({ item }: { item: Attention }) {
  const color =
    item.severity === "critical" ? ACCENT : item.severity === "warn" ? "#d97706" : "#0a0a0a";
  return (
    <div className="group flex items-start gap-4 rounded-[10px] border border-black/[0.08] bg-white p-4 transition-colors hover:border-black/20">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.14em]"
            style={{ fontFamily: MONO, color }}
          >
            {item.severity}
          </span>
        </div>
        <div className="mt-1 text-[14px] font-semibold tracking-tight">{item.title}</div>
        <p className="mt-1 text-[13px] leading-snug text-black/60">{item.detail}</p>
      </div>
      {item.action && (
        <button
          className="shrink-0 rounded-[6px] border border-black/10 bg-white px-2.5 py-1 text-[12px] font-medium text-black/70 shadow-[0_1px_0_rgba(0,0,0,0.02)] transition-colors hover:border-black/25 hover:text-black"
        >
          {item.action}
        </button>
      )}
    </div>
  );
}

function TimelineLegend() {
  return (
    <div className="hidden items-center gap-4 text-[11px] text-black/60 md:flex" style={{ fontFamily: MONO }}>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[3px] border border-black/10 bg-white shadow-[inset_3px_0_0_0_#4b5cd6]" />LEFT STRIPE = GUEST</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[3px] border border-black/20 bg-[rgba(75,92,214,0.12)] shadow-[inset_4px_0_0_0_#4b5cd6]" />LIVE</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[3px] border border-dashed border-amber-600/50 bg-[rgba(255,247,237,0.7)]" />REQUEST</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-[3px] border border-black/6 bg-[#f5f5f5]" />PAST</span>
    </div>
  );
}

function ServiceRow({ s, first }: { s: Service; first: boolean }) {
  const gc = guestColor(s.guest);
  return (
    <div
      className={`relative grid grid-cols-12 items-center gap-4 px-5 py-4 pl-6 text-[13px] transition-colors hover:bg-black/[0.015] ${
        first ? "" : "border-t border-black/[0.06]"
      }`}
    >
      <span
        className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
        style={{ background: gc }}
      />
      <div className="col-span-2">
        <div className="text-[15px] font-semibold tabular-nums tracking-tight" style={{ fontFamily: DISPLAY }}>
          {fmt(s.start)}
        </div>
        <div className="mt-0.5 text-[11px] text-black/45" style={{ fontFamily: MONO }}>
          {Math.round((s.end - s.start))}m · ends {fmt(s.end)}
        </div>
      </div>
      <div className="col-span-5 flex items-center gap-3">
        <Avatar name={s.guest} />
        <div className="min-w-0">
          <div className="truncate font-semibold tracking-tight">
            {s.guest}
            {s.partySize ? (
              <span className="ml-2 text-[11px] font-normal text-black/45" style={{ fontFamily: MONO }}>
                +{s.partySize - 1}
              </span>
            ) : null}
          </div>
          <div className="truncate text-[12px] text-black/55">{s.service}</div>
          {s.note && (
            <div className="mt-1 truncate text-[12px] text-black/45">— {s.note}</div>
          )}
        </div>
      </div>
      <div className="col-span-3">
        <div className="text-[13px]">{s.room}</div>
        <div className="text-[11px] text-black/50" style={{ fontFamily: MONO }}>
          {s.practitioner}
        </div>
      </div>
      <div className="col-span-1">
        <StatusPill status={s.status} guestHex={gc} />
      </div>
      <div className="col-span-1 text-right">
        <button className="rounded-[6px] px-2 py-1 text-[12px] text-black/55 hover:bg-black/[0.05] hover:text-black">
          Open
        </button>
      </div>
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const gc = guestColor(name);
  return (
    <div
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
      style={{
        background: tint(gc, 0.14),
        color: gc,
        boxShadow: `inset 0 0 0 1px ${tint(gc, 0.35)}`,
      }}
    >
      {initials}
    </div>
  );
}

function StatusPill({ status, guestHex }: { status: Status; guestHex?: string }) {
  const live = guestHex ?? ACCENT;
  const map: Record<Status, { label: string; bg: string; fg: string; dot: string; border?: string }> = {
    "in-session": { label: "Live", bg: tint(live, 0.12), fg: live, dot: live },
    confirmed: { label: "Confirmed", bg: "rgba(10,10,10,0.05)", fg: "#0a0a0a", dot: "#0a0a0a" },
    requested: { label: "Request", bg: "transparent", fg: "#0a0a0a", dot: "#d97706", border: "1px dashed rgba(217,119,6,0.5)" },
    hold: { label: "Hold", bg: "rgba(10,10,10,0.04)", fg: "rgba(10,10,10,0.5)", dot: "#999" },
  };
  const sm = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: sm.bg, color: sm.fg, border: sm.border ?? "none" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: sm.dot }} />
      {sm.label}
    </span>
  );
}

function PaidPill({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2 py-0.5 text-[11px] font-medium text-black/70">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Paid
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: "rgba(55,48,255,0.08)", color: ACCENT }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
      Unpaid
    </span>
  );
}

// ------------------------------------------------------------------
// Timeline
// ------------------------------------------------------------------

function Timeline({ nowMin }: { nowMin: number }) {
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = 9; h <= 18; h++) out.push(h);
    return out;
  }, []);

  const nowPct = (nowMin / DAY_SPAN) * 100;

  return (
    <div className="overflow-hidden rounded-[14px] border border-black/[0.08] bg-white">
      {/* Hour scale */}
      <div className="grid border-b border-black/[0.06]" style={{ gridTemplateColumns: "180px 1fr" }}>
        <div className="border-r border-black/[0.06] px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-black/50" style={{ fontFamily: MONO }}>
          Room
        </div>
        <div className="relative h-10">
          {hours.map((h) => {
            const pct = ((h * 60 - DAY_START) / DAY_SPAN) * 100;
            return (
              <div
                key={h}
                className="absolute top-3 -translate-x-1/2 text-[11px] font-semibold text-black/55"
                style={{ left: `${pct}%`, fontFamily: MONO }}
              >
                {((h + 11) % 12) + 1}
                {h >= 12 ? "P" : "A"}
              </div>
            );
          })}
          <div
            className="absolute top-2 -translate-x-1/2 rounded-[4px] px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ left: `${nowPct}%`, background: ACCENT, fontFamily: MONO }}
          >
            NOW
          </div>
        </div>
      </div>

      {/* Room rows */}
      <div>
        {ROOMS.map((room, idx) => {
          const services = SERVICES.filter((s) => s.room === room);
          return (
            <div
              key={room}
              className={`grid items-stretch ${idx > 0 ? "border-t border-black/[0.06]" : ""}`}
              style={{ gridTemplateColumns: "180px 1fr" }}
            >
              <div className="flex flex-col justify-center border-r border-black/[0.06] px-5 py-4">
                <span className="text-[15px] font-semibold tracking-tight text-black">{room}</span>
                <span className="mt-1 text-[11px] font-medium text-black/50" style={{ fontFamily: MONO }}>
                  {services.length} bookings
                </span>
              </div>

              <div className="relative h-[88px]" style={{ background: "repeating-linear-gradient(to right, transparent 0, transparent calc(100%/9 - 1px), rgba(0,0,0,0.035) calc(100%/9 - 1px), rgba(0,0,0,0.035) calc(100%/9))" }}>
                {/* now line */}
                <div
                  className="pointer-events-none absolute inset-y-0 z-10 w-px"
                  style={{ left: `${nowPct}%`, background: ACCENT }}
                >
                  <div className="absolute -top-px h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: ACCENT }} />
                </div>

                {services.map((s) => {
                  const left = (s.start / DAY_SPAN) * 100;
                  const width = ((s.end - s.start) / DAY_SPAN) * 100;
                  const isPast = s.end <= nowMin;
                  const isLive = s.start <= nowMin && s.end > nowMin;
                  const gc = guestColor(s.guest);

                  const style: React.CSSProperties = (() => {
                    if (s.status === "requested")
                      return {
                        background: "rgba(255,247,237,0.7)",
                        border: "1.5px dashed rgba(217,119,6,0.5)",
                        color: INK,
                        boxShadow: `inset 3px 0 0 0 ${gc}`,
                      };
                    if (isLive)
                      return {
                        background: tint(gc, 0.12),
                        border: `1.5px solid ${tint(gc, 0.35)}`,
                        color: INK,
                        boxShadow: `inset 4px 0 0 0 ${gc}, 0 0 0 3px ${tint(gc, 0.08)}`,
                      };
                    if (isPast)
                      return {
                        background: "#f5f5f5",
                        border: "1.5px solid rgba(0,0,0,0.06)",
                        color: "rgba(10,10,10,0.55)",
                        boxShadow: `inset 3px 0 0 0 ${tint(gc, 0.45)}`,
                      };
                    return {
                      background: tint(gc, 0.06),
                      border: `1.5px solid ${tint(gc, 0.22)}`,
                      color: INK,
                      boxShadow: `inset 3px 0 0 0 ${gc}`,
                    };
                  })();

                  return (
                    <div
                      key={s.id}
                      className="group absolute top-2 bottom-2 overflow-hidden rounded-[8px] px-3 py-2 leading-snug transition-all hover:z-20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
                      style={{
                        left: `calc(${left}% + 2px)`,
                        width: `calc(${width}% - 4px)`,
                        ...style,
                      }}
                      title={`${s.guest} · ${s.service} · ${fmt(s.start)}–${fmt(s.end)}`}
                    >
                      <div className="flex items-center gap-2">
                        {isLive && (
                          <span className="relative inline-flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" style={{ background: gc }} />
                            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: gc }} />
                          </span>
                        )}
                        <div className="truncate text-[13px] font-semibold tracking-tight">
                          {s.guest}
                          {s.partySize ? ` +${s.partySize - 1}` : ""}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2 truncate text-[11px] font-medium text-black/70" style={{ fontFamily: MONO }}>
                        <span>{fmt(s.start)}</span>
                        <span className="text-black/30">·</span>
                        <span className="truncate">{s.service}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
