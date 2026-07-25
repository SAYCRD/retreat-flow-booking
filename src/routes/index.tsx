import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Footprints, RefreshCcw, Sparkles, Radio, CalendarRange, ArrowDownRight, AlertTriangle, X, Check, UserCheck, DoorOpen, Coffee, Waves } from "lucide-react";

const CUE_ICON = {
  message: MessageSquare,
  escort: Footprints,
  turnover: RefreshCcw,
  setup: Sparkles,
  handoff: Radio,
} as const;


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
  urgent?: boolean;      // shows priority pulse + Urgent tag
  serviceId?: string;    // links cue to a booking card on the timeline
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
  { id: "s7", guest: "Marcus Hale", service: "Sound Healing", room: "Buddha Massage", practitioner: "Sofia Park", start: t(14, 40), end: t(15, 30), status: "confirmed", note: "First visit · greet at door" },
  { id: "s8", guest: "Amara Okonkwo", service: "Ceremonial Tea & Integration", room: "The Temple", practitioner: "Uqualla", start: t(14, 50), end: t(15, 20), status: "confirmed", note: "Part 2 of 3 · Amara's afternoon journey" },
  { id: "s9", guest: "Amara Okonkwo", service: "Infrared Sauna", room: "Infrared Room", practitioner: "Sofia Park", start: t(15, 20), end: t(16, 5), status: "confirmed", note: "Part 3 of 3 · closes Amara's journey" },
  { id: "s10", guest: "Priya Anand", service: "Medicine Walk", room: "Land", practitioner: "Uqualla", start: t(16), end: t(17, 30), status: "requested", note: "Awaiting confirmation" },
  { id: "s11", guest: "Lena Costa", service: "Grandmother Crystal Bowl", room: "The Temple", practitioner: "Uqualla", start: t(16, 30), end: t(17, 15), status: "confirmed" },
];

const CUES: Cue[] = [
  {
    id: "c1",
    kind: "message",
    headline: "Text Amara — arrival window open",
    reason: "Intuitive Reading · Om Space · 2:00 PM",
    room: "Om Space",
    primary: "Mark done",
    serviceId: "s6",
  },
  {
    id: "c2",
    kind: "escort",
    headline: "Walk Amara to Om Space",
    reason: "Session begins in 5 min · low light, quiet arrival",
    room: "Om Space",
    primary: "Walked in",
    serviceId: "s6",
  },
  {
    id: "c3",
    kind: "turnover",
    headline: "Turn Om Space for Sound Healing",
    reason: "Amara's reading ends 2:50 PM · Marcus arrives 2:40 PM",
    room: "Om Space",
    primary: "Room ready",
    serviceId: "s7",
  },
  {
    id: "c4",
    kind: "setup",
    headline: "Set The Temple for Ceremonial Tea",
    reason: "Amara arrives 2:50 PM · tea service, low light",
    room: "The Temple",
    primary: "Room ready",
    serviceId: "s8",
  },
  {
    id: "c5",
    kind: "handoff",
    headline: "Let Sofia know about short turnover",
    reason: "Sound Healing ends 3:30 · Infrared Sauna starts 3:20",
    room: "Infrared Room",
    primary: "Notified",
    urgent: true,
    serviceId: "s9",
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
// High-chroma pastels — saturated but light. Text on white reads them as
// distinct hues while still feeling soft and modern.
const ROOM_COLORS: Record<string, string> = {
  "Infrared Room": "#ff7aa2",   // pastel watermelon
  "Buddha Massage": "#3fd6b0",  // pastel jade
  "Ayurveda Room": "#f5b544",   // pastel marigold
  "Om Space": "#9d8bff",        // pastel iris
  "The Temple": "#e57ac8",      // pastel orchid
  "Land": "#8fd14f",            // pastel lime
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

function detectConflicts(services: Service[]) {
  const out: { a: Service; b: Service }[] = [];
  const byRoom = new Map<string, Service[]>();
  services.forEach((s) => {
    const arr = byRoom.get(s.room) ?? [];
    arr.push(s);
    byRoom.set(s.room, arr);
  });
  byRoom.forEach((arr) => {
    const sorted = [...arr].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[j].start < sorted[i].end) out.push({ a: sorted[i], b: sorted[j] });
        else break;
      }
    }
  });
  return out;
}

function TodayPage() {
  const now = useNow();
  const nowMin = DEMO_NOW;
  const [cueIdx, setCueIdx] = useState(0);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);

  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const conflicts = useMemo(() => detectConflicts(SERVICES), []);
  const inSession = SERVICES.filter((s) => s.start <= nowMin && s.end > nowMin).length;
  const stillToCome = SERVICES.filter((s) => s.start > nowMin).length;
  const overlaps = conflicts.length;
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

      {/* Coming up — label sits above the divider; strip carries only what matters */}
      <section className="relative bg-white">
        {/* label above the top hairline — sized to match Reservations */}
        <div className="mx-auto flex max-w-[1440px] items-baseline gap-3 px-6 pt-8 pb-3">
          <span className="text-[12px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
            00
          </span>
          <span className="self-center text-black/70">
            <Radio size={22} strokeWidth={1.75} />
          </span>
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
            <Highlight color="#fde047">Coming up</Highlight>
          </h2>
          <span className="text-[13px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
            {String(cueIdx + 1).padStart(2, "0")} / {String(CUES.length).padStart(2, "0")}
          </span>
        </div>

        {/* the strip itself — hairline top and bottom, information-first */}
        <div className="border-y border-black/[0.08]">
          <div className="mx-auto flex max-w-[1440px] items-center gap-5 px-6 py-5">
            {(() => {
              const Icon = CUE_ICON[cue.kind];
              const tint = cue.room ? roomColor(cue.room) : "#0a0a0a";
              return (
                <span className="relative shrink-0">
                  <span
                    aria-hidden
                    className="grid h-10 w-10 place-items-center rounded-full"
                    style={{ background: `${tint}14`, color: tint }}
                  >
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  {cue.urgent && (
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 flex h-3 w-3"
                    >
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 ring-2 ring-white" />
                    </span>
                  )}
                </span>
              );
            })()}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="shrink-0 text-[12px] font-semibold tabular-nums text-black/35"
                  style={{ fontFamily: MONO }}
                >
                  #{String(cueIdx + 1).padStart(2, "0")}
                </span>
                <h3 className="truncate text-[20px] font-semibold tracking-tight text-black">
                  {cue.headline}
                </h3>
                {cue.urgent && (
                  <span className="shrink-0 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-tight text-amber-700">
                    Urgent
                  </span>
                )}
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

            <div className="flex shrink-0 items-center gap-4">
              <button
                onClick={() => setFocusOpen(true)}
                className="text-[13.5px] font-medium text-black/60 underline decoration-black/15 underline-offset-4 transition-colors hover:text-black hover:decoration-black"
              >
                Focus
              </button>
              <button
                className="text-[13.5px] font-medium text-black/80 underline decoration-black/20 underline-offset-4 transition-colors hover:decoration-black"
                onClick={nextCue}
              >
                {cue.primary}
              </button>
            </div>
          </div>

          {/* Arrows anchored bottom-right of the strip — larger, easier to reach */}
          <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-1 px-6 pb-3">
            <button
              onClick={prevCue}
              aria-label="Previous cue"
              className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-black/45 transition-colors hover:bg-black/[0.04] hover:text-black"
            >
              ‹
            </button>
            <button
              onClick={nextCue}
              aria-label="Next cue"
              className="grid h-9 w-9 place-items-center rounded-full text-[18px] text-black/45 transition-colors hover:bg-black/[0.04] hover:text-black"
            >
              ›
            </button>
          </div>
        </div>

      </section>







      {/* Timeline (rooms across, time down) */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader eyebrow="01" label="Reservations" count={ROOMS.length} highlightColor="#86efac" icon={CalendarRange} trailing={<TimelineLegend />} />
          {conflicts.length > 0 && !conflictDismissed && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-[8px] border px-4 py-3"
              style={{ background: "#fff8ec", borderColor: "#fbd38d" }}
            >
              <span className="mt-0.5 shrink-0 text-amber-600">
                <AlertTriangle size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold text-amber-900">
                  {conflicts.length} room conflict{conflicts.length > 1 ? "s" : ""} — two services can't share a room
                </div>
                <ul className="mt-1 space-y-0.5 text-[12.5px] text-amber-900/85">
                  {conflicts.map((c, i) => (
                    <li key={i}>
                      <span style={{ fontFamily: MONO }}>{c.a.room}</span> · {c.a.service} ({fmt(c.a.start)}–{fmt(c.a.end)}) overlaps {c.b.service} ({fmt(c.b.start)}–{fmt(c.b.end)})
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => setConflictDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 rounded p-1 text-amber-800/70 hover:bg-amber-100 hover:text-amber-900"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <div className="mt-6">
            <Timeline
              nowMin={nowMin}
              highlightServiceId={cue.serviceId}
              highlightKind={cue.kind}
              highlightUrgent={cue.urgent}
              activeRoom={activeRoom}
              onRoomClick={(r) => setActiveRoom((cur) => (cur === r ? null : r))}
            />
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

      {focusOpen && (
        <FocusOverlay cue={cue} onClose={() => setFocusOpen(false)} />
      )}
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

function Highlight({
  children,
  color = "#fde047",
  className = "",
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  // Bold marker-pen highlight: thick band, slightly uneven edges to feel
  // hand-drawn. Text sits on top at full contrast.
  return (
    <span
      className={`relative inline px-1.5 -mx-1 ${className}`}
      style={{
        background: `linear-gradient(178deg, transparent 8%, ${color} 12%, ${color} 94%, transparent 98%)`,
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        borderRadius: "2px 5px 3px 6px",
      }}
    >
      {children}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  label,
  count,
  trailing,
  highlightColor,
  icon: Icon,
}: {
  eyebrow: string;
  label: string;
  count: number;
  trailing?: React.ReactNode;
  highlightColor?: string;
  icon?: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-4">
      <div className="flex items-baseline gap-3">
        <span className="text-[12px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
          {eyebrow}
        </span>
        {Icon && (
          <span className="self-center text-black/70">
            <Icon size={22} strokeWidth={1.75} />
          </span>
        )}
        <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
          {highlightColor ? <Highlight color={highlightColor}>{label}</Highlight> : label}
        </h2>
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
          highlightColor="#fda4af"
          icon={ArrowDownRight}

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

function Timeline({
  nowMin,
  highlightServiceId,
  highlightKind,
  highlightUrgent,
  activeRoom,
  onRoomClick,
}: {
  nowMin: number;
  highlightServiceId?: string;
  highlightKind?: CueKind;
  highlightUrgent?: boolean;
  activeRoom?: string | null;
  onRoomClick?: (room: string) => void;
}) {
  const PX_PER_MIN = 4; // 240px per hour vertical — gives 15/30-min slots room to breathe
  const TIME_COL = 88;
  const HEADER_H = 64;
  const trackHeight = DAY_SPAN * PX_PER_MIN;

  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = 9; h <= 18; h++) out.push(h);
    return out;
  }, []);

  const nowTop = nowMin * PX_PER_MIN;

  return (
    <div className="border-y border-black/[0.08] bg-white">
      {/* Room headers — stick under the top bar while the calendar scrolls */}
      <div
        className="sticky z-20 flex border-b border-black/[0.08] bg-white/95 backdrop-blur-md"
        style={{ height: HEADER_H, top: 48 }}
      >
        <div
          className="flex shrink-0 items-center justify-end border-r border-black/[0.06] pr-4 text-[11px] uppercase tracking-[0.14em] text-black/45"
          style={{ width: TIME_COL, fontFamily: MONO }}
        >
          Time
        </div>
        {ROOMS.map((room, idx) => {
          const count = SERVICES.filter((s) => s.room === room).length;
          const rc = roomColor(room);
          const isActive = activeRoom === room;
          return (
            <button
              key={room}
              type="button"
              onClick={() => onRoomClick?.(room)}
              className={`group flex min-w-0 flex-1 flex-col justify-center px-4 text-left transition-colors ${
                idx < ROOMS.length - 1 ? "border-r border-black/[0.06]" : ""
              } ${isActive ? "" : "hover:bg-black/[0.02]"}`}
            >


              <div className="truncate text-[20px] font-semibold leading-tight tracking-[-0.02em] text-black">
                {isActive ? (
                  <Highlight color={tint(rc, 0.5)}>{room}</Highlight>
                ) : (
                  room
                )}
              </div>
              <div
                className="mt-0.5 text-[11px] font-medium text-black/45"
                style={{ fontFamily: MONO }}
              >
                {count} booking{count === 1 ? "" : "s"}
              </div>
            </button>
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
            className="absolute right-2 -translate-y-1/2 text-[9.5px] font-semibold tracking-[0.14em]"
            style={{ top: nowTop, color: ACCENT, fontFamily: MONO, opacity: 0.7 }}
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
              className={`relative min-w-0 flex-1 bg-white ${
                idx < ROOMS.length - 1 ? "border-r border-black/[0.06]" : ""
              }`}
              style={{
                backgroundImage: [
                  // hour lines
                  `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_MIN * 60 - 1}px, rgba(0,0,0,0.07) ${PX_PER_MIN * 60 - 1}px, rgba(0,0,0,0.07) ${PX_PER_MIN * 60}px)`,
                  // 15-minute lines
                  `repeating-linear-gradient(to bottom, transparent 0, transparent ${PX_PER_MIN * 15 - 1}px, rgba(0,0,0,0.03) ${PX_PER_MIN * 15 - 1}px, rgba(0,0,0,0.03) ${PX_PER_MIN * 15}px)`,
                ].join(","),
              }}
            >
              {/* Now line — barely visible */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-px"
                style={{ top: nowTop, background: ACCENT, opacity: 0.28 }}
              />



              {services.map((s) => {
                const top = s.start * PX_PER_MIN;
                const height = (s.end - s.start) * PX_PER_MIN;
                const isPast = s.end <= nowMin;
                const isLive = s.start <= nowMin && s.end > nowMin;
                const isRequest = s.status === "requested";
                const gc = roomColor(s.room);
                const duration = Math.round(s.end - s.start);
                const practInitials = s.practitioner
                  .replace(/^(Dr\.?|Mr\.?|Ms\.?)\s+/i, "")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase();

                // Pure-white cards on tinted column surface. No borders,
                // color lives only in a soft top rail + small chroma accents.
                const nameColor = isPast ? "#1a1a1a" : "#0a0a0a";
                const serviceColor = isPast ? tint(gc, 0.75) : gc;
                const metaColor = isPast ? "#4a4a4a" : "#2a2a2a";

                // Parse orchestration notes like "Part 2 of 3 · Amara's afternoon journey"
                let orchestration: { step: string; title: string } | null = null;
                let plainNote: string | null = null;
                if (s.note) {
                  const m = s.note.match(/^Part\s+(\d+)\s+of\s+(\d+)\s*·\s*(.+)$/i);
                  if (m) orchestration = { step: `${m[1]}/${m[2]}`, title: m[3] };
                  else plainNote = s.note;
                }

                return (
                  <div
                    key={s.id}
                    className="group absolute inset-x-0 flex flex-col overflow-hidden rounded-none bg-white transition-all hover:z-20"
                    style={{
                      top: top + 1,
                      height: Math.max(height - 2, 96),
                      boxShadow: isLive
                        ? `0 1px 0 rgba(0,0,0,0.04), 0 6px 20px -8px ${tint(gc, 0.35)}, 0 0 0 1px ${tint(gc, 0.15)}`
                        : isRequest
                          ? "0 1px 0 rgba(0,0,0,0.04), 0 4px 14px -8px rgba(217,119,6,0.35)"
                          : "0 1px 0 rgba(0,0,0,0.04), 0 2px 10px -4px rgba(15,23,42,0.10)",
                      opacity: isPast ? 0.9 : 1,
                    }}
                    title={`${s.guest} · ${s.service} · ${s.practitioner} · ${fmt(s.start)}–${fmt(s.end)}`}
                  >
                    {/* Top color rail — thinner, high-chroma */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[2px]"
                      style={{
                        background: isRequest
                          ? "repeating-linear-gradient(to right, #d97706 0 6px, transparent 6px 10px)"
                          : gc,
                      }}
                    />

                    <div className="flex flex-1 flex-col px-3 pt-3 pb-2.5">
                      {/* Time — big, monospace, sits at the top so it reads first */}
                      <div className="flex items-baseline justify-between gap-2">
                        <div
                          className="whitespace-nowrap text-[14px] font-semibold tabular-nums leading-none tracking-tight"
                          style={{ color: metaColor, fontFamily: MONO }}
                        >
                          {fmt(s.start)}
                          <span className="mx-1 opacity-40">–</span>
                          {fmt(s.end)}
                        </div>
                        <div
                          className="shrink-0 whitespace-nowrap text-[10.5px] font-semibold tabular-nums tracking-[0.08em]"
                          style={{ color: metaColor, fontFamily: MONO, opacity: 0.65 }}
                        >
                          {duration}m
                        </div>
                      </div>

                      {/* Service — the offering, in the room's chroma */}
                      <div
                        className="mt-2 text-[19px] font-semibold leading-[1.1] tracking-[-0.02em]"
                        style={{ color: serviceColor, fontFamily: DISPLAY }}
                      >
                        {s.service}
                      </div>

                      {/* for {guest} */}
                      <div className="mt-2 flex items-center gap-1.5">
                        {isLive && (
                          <span className="relative inline-flex h-2 w-2 shrink-0">
                            <span
                              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                              style={{ background: gc }}
                            />
                            <span
                              className="relative inline-flex h-2 w-2 rounded-full"
                              style={{ background: gc }}
                            />
                          </span>
                        )}
                        <span
                          className="shrink-0 text-[13px] italic leading-tight"
                          style={{ color: metaColor, fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif", opacity: 0.7 }}
                        >
                          for
                        </span>
                        <div
                          className="truncate text-[14px] font-semibold leading-tight tracking-[-0.005em]"
                          style={{ color: nameColor, fontFamily: DISPLAY }}
                        >
                          {s.guest}
                          {s.partySize ? ` +${s.partySize - 1}` : ""}
                        </div>
                        {isRequest && (
                          <span
                            className="ml-auto rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em]"
                            style={{ color: "#b45309", background: "rgba(217,119,6,0.10)", fontFamily: MONO }}
                          >
                            Request
                          </span>
                        )}
                      </div>

                      {/* with {practitioner} — right justified */}
                      <div className="mt-1.5 flex items-center justify-end gap-1.5">
                        <span
                          className="shrink-0 text-[13px] italic leading-tight"
                          style={{ color: metaColor, fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif", opacity: 0.7 }}
                        >
                          with
                        </span>
                        <span
                          className="truncate text-[12.5px] font-medium leading-tight"
                          style={{ color: metaColor }}
                          title={s.practitioner}
                        >
                          {s.practitioner}
                        </span>
                        <span
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9.5px] font-bold"
                          style={{
                            background: tint(gc, 0.18),
                            color: "#1a1a1a",
                            fontFamily: DISPLAY,
                          }}
                        >
                          {practInitials}
                        </span>
                      </div>

                      {/* Orchestration pill or plain note — pushed to bottom */}
                      {(orchestration || plainNote) && height > 110 && (
                        <div className="mt-auto pt-2">
                          {orchestration ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums leading-none"
                                style={{
                                  background: tint(gc, 0.18),
                                  color: "#1a1a1a",
                                  fontFamily: MONO,
                                }}
                              >
                                {orchestration.step}
                              </span>
                              <span
                                className="truncate text-[11.5px] font-medium leading-tight"
                                style={{ color: metaColor }}
                                title={orchestration.title}
                              >
                                {orchestration.title}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="truncate text-[11.5px] italic leading-snug"
                              style={{ color: metaColor }}
                              title={plainNote ?? undefined}
                            >
                              {plainNote}
                            </div>
                          )}
                        </div>
                      )}
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

// ------------------------------------------------------------------
// Focus overlay — the choreography behind a single cue
// ------------------------------------------------------------------

function FocusOverlay({ cue, onClose }: { cue: Cue; onClose: () => void }) {
  const service = cue.serviceId ? SERVICES.find((s) => s.id === cue.serviceId) : undefined;
  const rc = cue.room ? roomColor(cue.room) : ACCENT;

  // Choreographed steps per cue kind — small, opinionated defaults.
  const steps = useMemo(() => {
    const base: { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string; hint: string; done?: boolean }[] = [];
    switch (cue.kind) {
      case "message":
        base.push(
          { icon: MessageSquare, label: "Text guest — arrival window open", hint: "Warm, one line. Confirm they're on the way.", done: true },
          { icon: UserCheck, label: "Check in on arrival", hint: "Greet by name, offer water." },
          { icon: DoorOpen, label: "Walk to room", hint: service ? `Escort to ${service.room}` : "Escort to room" },
        );
        break;
      case "escort":
        base.push(
          { icon: UserCheck, label: "Confirm guest is checked in", hint: "", done: true },
          { icon: DoorOpen, label: service ? `Walk guest to ${service.room}` : "Walk guest to room", hint: "Low voice, unhurried pace." },
          { icon: Sparkles, label: "Practitioner arrival", hint: service ? `Cue ${service.practitioner}` : "Cue practitioner" },
        );
        break;
      case "turnover":
        base.push(
          { icon: DoorOpen, label: "Close out prior session", hint: "Escort guest out, collect linens." },
          { icon: RefreshCcw, label: "Room reset", hint: "Reset props, ventilate, wipe surfaces." },
          { icon: Sparkles, label: "Set for next service", hint: service ? `Prepare for ${service.service}` : "Prepare space" },
        );
        break;
      case "setup":
        base.push(
          { icon: Sparkles, label: "Set the room", hint: service ? `${service.service} — ${service.room}` : "Set room" },
          { icon: Coffee, label: "Elixir / tea break window", hint: "If part of an orchestration, offer between-service pause." },
          { icon: UserCheck, label: "Cue guest arrival", hint: "Bring guest 2 min before start." },
        );
        break;
      case "handoff":
        base.push(
          { icon: Waves, label: "Notify practitioner", hint: service ? `${service.practitioner} — short turnover` : "Short turnover heads-up" },
          { icon: RefreshCcw, label: "Fast room reset", hint: "Skip full ventilation, refresh linens only." },
          { icon: UserCheck, label: "Guide next guest in", hint: "Signal ready to front desk." },
        );
        break;
    }
    return base;
  }, [cue.kind, service]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-t-[16px] bg-white shadow-2xl sm:rounded-[16px]"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `4px solid ${rc}` }}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
              Focus · {cue.kind}
            </div>
            <h3 className="mt-1 text-[22px] font-semibold tracking-tight text-black">{cue.headline}</h3>
            <div className="mt-1 text-[13px] text-black/55">
              {cue.room && (
                <span style={{ color: rc, fontFamily: MONO }}>{cue.room} · </span>
              )}
              {cue.reason}
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-black/50 hover:bg-black/[0.05] hover:text-black"
          >
            <X size={16} />
          </button>
        </div>

        <ol className="px-6 pb-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            const done = step.done;
            return (
              <li
                key={i}
                className={`flex items-start gap-3 border-t border-black/[0.06] py-3 ${
                  done ? "opacity-60" : ""
                }`}
              >
                <span
                  className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full"
                  style={{
                    background: done ? "rgba(16,185,129,0.14)" : tint(rc, 0.14),
                    color: done ? "#059669" : rc,
                  }}
                >
                  {done ? <Check size={14} strokeWidth={2.5} /> : <Icon size={14} strokeWidth={2} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-black">
                    <span className="mr-2 text-[11px] tabular-nums text-black/40" style={{ fontFamily: MONO }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {step.label}
                  </div>
                  {step.hint && (
                    <div className="mt-0.5 text-[12.5px] text-black/55">{step.hint}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
