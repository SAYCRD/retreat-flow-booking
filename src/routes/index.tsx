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

type CueKind = "message" | "escort" | "turnover" | "setup" | "handoff";
type Cue = {
  id: string;
  kind: CueKind;
  headline: string;      // verb-first
  reason: string;        // quiet reason line
  room?: string;         // for accent color
  primary: string;       // primary action label
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

const CUES: Cue[] = [
  {
    id: "c1",
    headline: "Text Amara — arrival window open",
    reason: "Intuitive Reading · Om Space · 2:00 PM",
    room: "Om Space",
    primary: "Mark done",
  },
  {
    id: "c2",
    headline: "Walk Amara to Om Space",
    reason: "Session begins in 5 min · low light, quiet arrival",
    room: "Om Space",
    primary: "Walked in",
  },
  {
    id: "c3",
    headline: "Turn Om Space for Sound Healing",
    reason: "Amara's reading ends 2:50 PM · Marcus arrives 2:40 PM",
    room: "Om Space",
    primary: "Room ready",
  },
  {
    id: "c4",
    headline: "Set The Temple for Ceremonial Tea",
    reason: "Amara arrives 2:50 PM · tea service, low light",
    room: "The Temple",
    primary: "Room ready",
  },
  {
    id: "c5",
    headline: "Let Sofia know about short turnover",
    reason: "Sound Healing ends 3:30 · Infrared Sauna starts 3:20",
    room: "Infrared Room",
    primary: "Notified",
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

// Each room has its own color — the color follows the space, not the guest.
// It carries through the timeline card top-bar, the ledger stripe, and the avatar tint.
const ROOM_COLORS: Record<string, string> = {
  "Infrared Room": "#c2410c", // terracotta / warm heat
  "Buddha Massage": "#0f766e", // deep teal
  "Ayurveda Room": "#a16207", // ochre
  "Om Space": "#7e22ce", // plum
  "The Temple": "#be185d", // rose
  "Land": "#4d7c0f", // moss
};

const NEUTRAL = "#475569"; // slate for anything without a room

function roomColor(room: string): string {
  return ROOM_COLORS[room] ?? NEUTRAL;
}

// For finances (guest-level, no room): use the guest's first room of the day.
function guestRoomColor(guest: string): string {
  const svc = SERVICES.find((s) => s.guest === guest);
  return svc ? roomColor(svc.room) : NEUTRAL;
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
  const [cueIdx, setCueIdx] = useState(0);

  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const inSession = SERVICES.filter((s) => s.start <= nowMin && s.end > nowMin).length;
  const stillToCome = SERVICES.filter((s) => s.start > nowMin).length;
  const overlaps = 1;
  const revenue = FINANCES.reduce((a, b) => a + b.amount, 0);
  const unpaid = FINANCES.filter((f) => !f.paid).reduce((a, b) => a + b.amount, 0);

  const cue = CUES[cueIdx];
  const prevCue = () => setCueIdx((i) => (i - 1 + CUES.length) % CUES.length);
  const nextCue = () => setCueIdx((i) => (i + 1) % CUES.length);



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

      {/* Coming up — chrome-less strip, arrow-navigable */}
      <section className="border-b border-black/[0.08] bg-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-6">
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="text-[10px] uppercase tracking-[0.22em] text-black/40"
              style={{ fontFamily: MONO }}
            >
              Coming up
            </span>
            <span
              className="text-[10px] tabular-nums text-black/35"
              style={{ fontFamily: MONO }}
            >
              {String(cueIdx + 1).padStart(2, "0")} / {String(CUES.length).padStart(2, "0")}
            </span>
          </div>

          {cue.room && (
            <span
              aria-hidden
              className="h-10 w-[3px] shrink-0"
              style={{ background: roomColor(cue.room) }}
            />
          )}

          <div className="min-w-0 flex-1">
            <div className="truncate text-[20px] font-semibold tracking-tight text-black">
              {cue.headline}
            </div>
            <div className="mt-0.5 flex items-center gap-2 truncate text-[13.5px] text-black/55">
              {cue.room && (
                <>
                  <span style={{ color: roomColor(cue.room), fontFamily: MONO }}>
                    {cue.room}
                  </span>
                  <span className="text-black/25">·</span>
                </>
              )}
              <span className="truncate">{cue.reason}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5">
            <button
              className="text-[13.5px] font-medium text-black/75 underline decoration-black/20 underline-offset-4 transition-colors hover:decoration-black"
              onClick={nextCue}
            >
              {cue.primary}
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={prevCue}
                aria-label="Previous"
                className="grid h-8 w-8 place-items-center text-[18px] text-black/40 transition-colors hover:text-black"
              >
                ‹
              </button>
              <button
                onClick={nextCue}
                aria-label="Next"
                className="grid h-8 w-8 place-items-center text-[18px] text-black/40 transition-colors hover:text-black"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </section>




      {/* Timeline (rooms across, time down) */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader eyebrow="01" label="Rooms" count={ROOMS.length} trailing={<TimelineLegend />} />
          <div className="mt-6">
            <Timeline nowMin={nowMin} />
          </div>
        </div>
      </section>

      {/* Coming Up */}
      <ComingUp nowMin={nowMin} />


      {/* Finances */}
      <section>
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader
            eyebrow="03"
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
            {FINANCES.map((f, i) => {
              const gc = guestRoomColor(f.guest);
              return (
                <div
                  key={f.guest}
                  className={`grid grid-cols-12 items-center gap-4 px-5 py-4 text-[14px] ${
                    i > 0 ? "border-t border-black/[0.06]" : ""
                  } hover:bg-black/[0.015]`}
                >
                  <div className="col-span-6 flex items-center gap-3">
                    <Avatar name={f.guest} color={gc} />
                    <div>
                      <div className="text-[15px] font-semibold text-black">{f.guest}</div>
                      <div className="text-[12px] text-black/50" style={{ fontFamily: MONO }}>
                        {f.services} service{f.services > 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2 text-[15px] tabular-nums font-semibold" style={{ fontFamily: MONO }}>
                    ${f.amount}
                  </div>
                  <div className="col-span-2">
                    <PaidPill paid={f.paid} />
                  </div>
                  <div className="col-span-2 text-right">
                    <button className="rounded-[6px] px-2.5 py-1 text-[13px] text-black/65 hover:bg-black/[0.05] hover:text-black">
                      Invoice ↗
                    </button>
                  </div>
                </div>
              );
            })}
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
        <span className="text-[12px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
          {eyebrow}
        </span>
        <h2 className="text-[26px] font-semibold tracking-[-0.02em]">{label}</h2>
        <span className="text-[13px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
          {String(count).padStart(2, "0")}
        </span>
      </div>
      {trailing}
    </div>
  );
}


function TimelineLegend() {
  const chip = "h-3 w-4 border border-black/15";
  return (
    <div className="hidden items-center gap-4 text-[12px] text-black/65 md:flex" style={{ fontFamily: MONO }}>
      <span className="flex items-center gap-2"><span className={`${chip} bg-[rgba(29,78,216,0.12)]`} style={{ boxShadow: "inset 0 4px 0 0 #1d4ed8" }} />LIVE</span>
      <span className="flex items-center gap-2"><span className={`${chip} bg-white`} style={{ boxShadow: "inset 0 4px 0 0 #1d4ed8" }} />BOOKED</span>
      <span className="flex items-center gap-2"><span className={`${chip} border-dashed border-amber-600/55 bg-[#fffbeb]`} />REQUEST</span>
      <span className="flex items-center gap-2"><span className={`${chip} bg-[#f7f7f7]`} />PAST</span>
    </div>
  );
}

function ServiceRow({ s, first }: { s: Service; first: boolean }) {
  const gc = roomColor(s.room);
  return (
    <div
      className={`relative grid grid-cols-12 items-center gap-4 px-5 py-5 pl-7 text-[14px] transition-colors hover:bg-black/[0.015] ${
        first ? "" : "border-t border-black/[0.06]"
      }`}
    >
      <span
        className="absolute left-0 top-2 bottom-2 w-[4px]"
        style={{ background: gc }}
      />
      <div className="col-span-2">
        <div className="text-[18px] font-semibold tabular-nums tracking-tight" style={{ fontFamily: DISPLAY }}>
          {fmt(s.start)} <span className="text-black/40">–</span> {fmt(s.end)}
        </div>
        <div className="mt-0.5 text-[12px] text-black/50" style={{ fontFamily: MONO }}>
          {Math.round(s.end - s.start)} min
        </div>
      </div>
      <div className="col-span-5 flex items-center gap-3">
        <Avatar name={s.guest} color={gc} />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold tracking-tight text-black">
            {s.guest}
            {s.partySize ? (
              <span className="ml-2 text-[12px] font-normal text-black/45" style={{ fontFamily: MONO }}>
                +{s.partySize - 1}
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-[20px] font-semibold leading-tight tracking-tight" style={{ color: gc }}>
            {s.service}
          </div>
          {s.note && (
            <div className="mt-1 text-[13px] text-black/55">— {s.note}</div>
          )}
        </div>
      </div>
      <div className="col-span-3">
        <div className="text-[15px] font-medium" style={{ color: gc }}>{s.room}</div>
        <div className="text-[12px] text-black/55" style={{ fontFamily: MONO }}>
          {s.practitioner}
        </div>
      </div>
      <div className="col-span-1">
        <StatusPill status={s.status} guestHex={gc} />
      </div>
      <div className="col-span-1 text-right">
        <button className="rounded-[6px] px-2.5 py-1 text-[13px] text-black/60 hover:bg-black/[0.05] hover:text-black">
          Open
        </button>
      </div>
    </div>
  );
}

function ComingUp({ nowMin }: { nowMin: number }) {
  const [sortBy, setSortBy] = useState<"time" | "room">("time");
  const upcoming = SERVICES.filter((s) => s.end > nowMin);

  const grouped = ROOMS
    .map((room) => ({
      room,
      items: upcoming.filter((s) => s.room === room).sort((a, b) => a.start - b.start),
    }))
    .filter((g) => g.items.length > 0);

  const flat = [...upcoming].sort((a, b) => a.start - b.start);

  return (
    <section className="border-b border-black/[0.08]">
      <div className="mx-auto max-w-[1440px] px-6 py-10">
        <SectionHeader
          eyebrow="02"
          label="Coming Up"
          count={upcoming.length}
          trailing={
            <div
              className="inline-flex items-center gap-0 overflow-hidden rounded-full border border-black/10 bg-white p-0.5 text-[12px]"
              style={{ fontFamily: MONO }}
            >
              {(["time", "room"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  className={`rounded-full px-3 py-1 uppercase tracking-[0.14em] transition-colors ${
                    sortBy === k
                      ? "bg-black text-white"
                      : "text-black/55 hover:text-black"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          }
        />

        {sortBy === "time" ? (
          <div className="mt-6 overflow-hidden border-y border-black/[0.08] bg-white">
            {flat.map((s, i) => (
              <ServiceRow key={s.id} s={s} first={i === 0} />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {grouped.map((g) => {
              const rc = roomColor(g.room);
              return (
                <div key={g.room}>
                  <div className="mb-2 flex items-baseline gap-3 px-1">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: rc }}
                    />
                    <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: rc }}>
                      {g.room}
                    </h3>
                    <span
                      className="text-[12px] tabular-nums text-black/45"
                      style={{ fontFamily: MONO }}
                    >
                      {String(g.items.length).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="overflow-hidden border-y border-black/[0.08] bg-white">
                    {g.items.map((s, i) => (
                      <ServiceRow key={s.id} s={s} first={i === 0} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Avatar({ name, color = NEUTRAL }: { name: string; color?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold"
      style={{
        background: tint(color, 0.16),
        color,
        boxShadow: `inset 0 0 0 1.5px ${tint(color, 0.45)}`,
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
      style={{ background: sm.bg, color: sm.fg, border: sm.border ?? "none" }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: sm.dot }} />
      {sm.label}
    </span>
  );
}

function PaidPill({ paid }: { paid: boolean }) {
  return paid ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 text-[12px] font-medium text-black/75">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Paid
    </span>
  ) : (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium"
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
  const PX_PER_MIN = 2.4; // 144px per hour vertical
  const TIME_COL = 88;
  const HEADER_H = 56;
  const trackHeight = DAY_SPAN * PX_PER_MIN;

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = 9; h <= 18; h++) out.push(h);
    return out;
  }, []);

  const nowTop = nowMin * PX_PER_MIN;

  return (
    <div className="overflow-hidden border-y border-black/[0.08] bg-white">
      {/* Room headers */}
      <div className="flex border-b border-black/[0.08]" style={{ height: HEADER_H }}>
        <div
          className="flex shrink-0 items-center justify-end border-r border-black/[0.06] pr-4 text-[11px] uppercase tracking-[0.14em] text-black/45"
          style={{ width: TIME_COL, fontFamily: MONO }}
        >
          Time
        </div>
        {ROOMS.map((room, idx) => {
          const count = SERVICES.filter((s) => s.room === room).length;
          return (
            <div
              key={room}
              className={`flex min-w-0 flex-1 flex-col justify-center px-4 ${
                idx < ROOMS.length - 1 ? "border-r border-black/[0.06]" : ""
              }`}
            >
              <div className="truncate text-[15px] font-semibold tracking-tight text-black">
                {room}
              </div>
              <div
                className="text-[11px] font-medium text-black/45"
                style={{ fontFamily: MONO }}
              >
                {count} booking{count === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid body */}
      <div className="flex" style={{ height: trackHeight }}>
        {/* Time column */}
        <div
          className="relative shrink-0 border-r border-black/[0.06]"
          style={{ width: TIME_COL }}
        >
          {hours.map((h) => {
            const top = (h * 60 - DAY_START) * PX_PER_MIN;
            return (
              <div
                key={h}
                className="absolute right-3 -translate-y-1/2 text-[13px] font-semibold text-black/55"
                style={{ top, fontFamily: MONO }}
              >
                {((h + 11) % 12) + 1}
                {h >= 12 ? " PM" : " AM"}
              </div>
            );
          })}
          <div
            className="absolute right-1 -translate-y-1/2 rounded-[3px] px-1.5 py-0.5 text-[10px] font-semibold text-white"
            style={{ top: nowTop, background: ACCENT, fontFamily: MONO }}
          >
            NOW
          </div>
        </div>

        {/* Room columns */}
        {ROOMS.map((room, idx) => {
          const services = SERVICES.filter((s) => s.room === room);
          return (
            <div
              key={room}
              className={`relative min-w-0 flex-1 ${
                idx < ROOMS.length - 1 ? "border-r border-black/[0.06]" : ""
              }`}
              style={{
                background:
                  "repeating-linear-gradient(to bottom, transparent 0, transparent calc(" +
                  PX_PER_MIN * 60 +
                  "px - 1px), rgba(0,0,0,0.05) calc(" +
                  PX_PER_MIN * 60 +
                  "px - 1px), rgba(0,0,0,0.05) " +
                  PX_PER_MIN * 60 +
                  "px)",
              }}
            >
              {/* Now line spanning column */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-px"
                style={{ top: nowTop, background: ACCENT }}
              />

              {services.map((s) => {
                const top = s.start * PX_PER_MIN;
                const height = (s.end - s.start) * PX_PER_MIN;
                const isPast = s.end <= nowMin;
                const isLive = s.start <= nowMin && s.end > nowMin;
                const gc = roomColor(s.room);

                const style: React.CSSProperties = (() => {
                  if (s.status === "requested")
                    return {
                      background: "#fffbeb",
                      border: "1px dashed rgba(217,119,6,0.6)",
                      boxShadow: `inset 0 4px 0 0 ${gc}`,
                    };
                  if (isLive)
                    return {
                      background: tint(gc, 0.12),
                      border: `1px solid ${tint(gc, 0.4)}`,
                      boxShadow: `inset 0 4px 0 0 ${gc}`,
                    };
                  if (isPast)
                    return {
                      background: "#f7f7f7",
                      border: "1px solid rgba(0,0,0,0.06)",
                      boxShadow: `inset 0 4px 0 0 ${tint(gc, 0.5)}`,
                    };
                  return {
                    background: tint(gc, 0.07),
                    border: `1px solid ${tint(gc, 0.28)}`,
                    boxShadow: `inset 0 4px 0 0 ${gc}`,
                  };
                })();

                return (
                  <div
                    key={s.id}
                    className="group absolute left-1.5 right-1.5 flex flex-col overflow-hidden rounded-[2px] px-3 pt-3 pb-2 transition-shadow hover:z-20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
                    style={{
                      top: top + 2,
                      height: Math.max(height - 4, 60),
                      ...style,
                    }}
                    title={`${s.guest} · ${s.service} · ${s.practitioner} · ${fmt(s.start)}–${fmt(s.end)}`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isLive && (
                        <span className="relative inline-flex h-2 w-2 shrink-0">
                          <span
                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
                            style={{ background: gc }}
                          />
                          <span
                            className="relative inline-flex h-2 w-2 rounded-full"
                            style={{ background: gc }}
                          />
                        </span>
                      )}
                      <div className="truncate text-[13px] font-semibold leading-tight tracking-tight text-black">
                        {s.guest}
                        {s.partySize ? ` +${s.partySize - 1}` : ""}
                      </div>
                    </div>
                    <div
                      className="mt-1.5 text-[16px] font-semibold leading-[1.15] tracking-tight"
                      style={{ color: gc }}
                    >
                      {s.service}
                    </div>
                    <div className="mt-1 text-[12px] leading-tight text-black/65">
                      {s.practitioner}
                    </div>
                    <div
                      className="mt-auto pt-2 text-[11px] font-semibold tabular-nums text-black/60"
                      style={{ fontFamily: MONO }}
                    >
                      {fmt(s.start)} – {fmt(s.end)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
