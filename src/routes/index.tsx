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
  start: number; // minutes from day-start (09:00)
  end: number;
  status: Status;
  note?: string;
};

type Attention = {
  id: string;
  urgent?: boolean;
  text: string;
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

// day window: 09:00 → 18:00 (540 minutes)
const DAY_START = 9 * 60;
const DAY_END = 18 * 60;
const DAY_SPAN = DAY_END - DAY_START;

// helper to build times
const t = (h: number, m = 0) => h * 60 + m - DAY_START;
const fmt = (mins: number) => {
  const abs = mins + DAY_START;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const hh = ((h + 11) % 12) + 1;
  return m === 0 ? `${hh}${suffix}` : `${hh}:${String(m).padStart(2, "0")}${suffix}`;
};

const SERVICES: Service[] = [
  {
    id: "s1",
    guest: "Elena Vives",
    service: "Myers Cocktail IV",
    room: "Land",
    practitioner: "Dr. Elise Warren",
    start: t(9, 30),
    end: t(10, 30),
    status: "confirmed",
  },
  {
    id: "s2",
    guest: "Nadia Farrow",
    service: "Deep Tissue Massage",
    room: "Buddha Massage",
    practitioner: "Maya Chen",
    start: t(10),
    end: t(11),
    status: "confirmed",
  },
  {
    id: "s3",
    guest: "Thomas Wren",
    service: "BEMER Session",
    room: "Infrared Room",
    practitioner: "Sofia Park",
    start: t(11),
    end: t(12),
    status: "confirmed",
  },
  {
    id: "s4",
    guest: "Nadia Farrow",
    service: "Cupping",
    room: "The Temple",
    practitioner: "Maya Chen",
    start: t(11, 15),
    end: t(11, 45),
    status: "confirmed",
  },
  {
    id: "s5",
    guest: "Gerald & June Pierce",
    partySize: 2,
    service: "Couples Ayurvedic Massage",
    room: "Ayurveda Room",
    practitioner: "Daniel Reyes",
    start: t(13, 30),
    end: t(15),
    status: "in-session",
    note: "25th anniversary · June has a hip injury",
  },
  {
    id: "s6",
    guest: "Amara Okonkwo",
    service: "Intuitive Reading",
    room: "Om Space",
    practitioner: "Uqualla",
    start: t(14),
    end: t(14, 50),
    status: "in-session",
    note: "Return guest · prefers low light and quiet arrival",
  },
  {
    id: "s7",
    guest: "Marcus Hale",
    service: "Sound Healing",
    room: "Om Space",
    practitioner: "Sofia Park",
    start: t(14, 40),
    end: t(15, 30),
    status: "confirmed",
  },
  {
    id: "s8",
    guest: "Amara Okonkwo",
    service: "Ceremonial Tea & Integration",
    room: "The Temple",
    practitioner: "Uqualla",
    start: t(14, 50),
    end: t(15, 20),
    status: "confirmed",
  },
  {
    id: "s9",
    guest: "Amara Okonkwo",
    service: "Infrared Sauna",
    room: "Infrared Room",
    practitioner: "Sofia Park",
    start: t(15, 20),
    end: t(16, 5),
    status: "confirmed",
  },
  {
    id: "s10",
    guest: "Priya Anand",
    service: "Medicine Walk",
    room: "Land",
    practitioner: "Uqualla",
    start: t(16),
    end: t(17, 30),
    status: "requested",
    note: "Awaiting confirmation",
  },
  {
    id: "s11",
    guest: "Lena Costa",
    service: "Grandmother Crystal Bowl",
    room: "The Temple",
    practitioner: "Uqualla",
    start: t(16, 30),
    end: t(17, 15),
    status: "confirmed",
  },
];

const ATTENTION: Attention[] = [
  {
    id: "a1",
    urgent: true,
    text:
      "Om Space turnover: Amara's reading ends 2:50pm, Marcus's Sound Healing starts 2:40pm. 10-minute overlap — needs resolution.",
    action: "Resolve",
  },
  {
    id: "a2",
    text:
      "Amara's Ceremonial Tea starts in The Temple at 2:50pm — 20 minutes from now. Room needs to be set.",
    action: "View",
  },
  {
    id: "a3",
    text:
      "Sofia Park has back-to-back sessions: Om Space 2:40pm then Infrared 3:20pm. Confirm she is aware.",
  },
  {
    id: "a4",
    text:
      "Amara is on a 3-service journey. After Tea she moves directly to Infrared at 3:20pm. Ensure smooth handoff.",
  },
  {
    id: "a5",
    text:
      "Gerald & June's Ayurvedic session ends at 3:00pm. They may need water and rest before departure.",
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

const NAV = ["Today", "Calendar", "Requests", "Guests", "Rooms", "Practitioners"];

// ------------------------------------------------------------------
// Hooks
// ------------------------------------------------------------------

function useNow() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Fake "now" for the demo so the timeline is always interesting
const DEMO_NOW = t(14, 30);

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

function TodayPage() {
  const now = useNow();
  const date = now
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    .toLowerCase();

  const nowMin = DEMO_NOW; // demo cursor; swap with real time when wired to data
  const inSession = SERVICES.filter((s) => s.start <= nowMin && s.end > nowMin).length;
  const stillToCome = SERVICES.filter((s) => s.start > nowMin).length;
  const overlaps = 1; // computed elsewhere in the real thing

  return (
    <div
      className="min-h-screen bg-[#faf9f6] text-[#111111] antialiased"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Nav */}
      <nav className="border-b border-[#111]/10">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-5 text-[13px]">
          <div className="flex items-baseline gap-8">
            <span
              className="text-[18px] leading-none tracking-tight"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Seondya
            </span>
            <div className="hidden items-baseline gap-6 md:flex">
              {NAV.map((item, i) => (
                <button
                  key={item}
                  className={`text-[12px] tracking-wide transition-colors ${
                    i === 0 ? "text-[#111]" : "text-[#111]/40 hover:text-[#111]/70"
                  }`}
                >
                  {item.toLowerCase()}
                  {i === 0 && (
                    <span className="ml-2 inline-block h-[6px] w-[6px] rounded-full bg-[#c8482e] align-middle" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <div
            className="text-[12px] tracking-wide text-[#111]/50"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            front desk · alba
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="border-b border-[#111]/10">
        <div className="mx-auto max-w-[1400px] px-8 pt-14 pb-10">
          <div
            className="text-[11px] uppercase tracking-[0.18em] text-[#111]/40"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            today
          </div>
          <h1
            className="mt-4 text-[72px] leading-[0.95] tracking-[-0.02em] md:text-[96px]"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            {date}
          </h1>
          <div
            className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-2 text-[13px]"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span>
              <span className="tabular-nums">{String(inSession).padStart(2, "0")}</span>{" "}
              <span className="text-[#111]/50">in session</span>
            </span>
            <span className="text-[#111]/20">·</span>
            <span>
              <span className="tabular-nums">{String(stillToCome).padStart(2, "0")}</span>{" "}
              <span className="text-[#111]/50">still to come</span>
            </span>
            <span className="text-[#111]/20">·</span>
            <span className="text-[#c8482e]">
              <span className="tabular-nums">{String(overlaps).padStart(2, "0")}</span>{" "}
              scheduling overlap
            </span>
          </div>
        </div>
      </header>

      {/* Timeline */}
      <section className="border-b border-[#111]/10">
        <div className="mx-auto max-w-[1400px] px-8 py-12">
          <SectionHeader index="I" label="The day" count={SERVICES.length} />
          <div className="mt-10">
            <Timeline nowMin={nowMin} />
          </div>
        </div>
      </section>

      {/* Attention */}
      <section className="border-b border-[#111]/10">
        <div className="mx-auto max-w-[1400px] px-8 py-14">
          <SectionHeader index="II" label="Next 30 minutes" count={ATTENTION.length} />
          <p
            className="mt-4 text-[13px] italic text-[#111]/50"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            pay attention to
          </p>
          <ol className="mt-8 divide-y divide-[#111]/10 border-y border-[#111]/10">
            {ATTENTION.map((a, i) => (
              <li key={a.id} className="grid grid-cols-12 gap-6 py-6">
                <div className="col-span-1 pt-1">
                  <span
                    className={`inline-block h-[8px] w-[8px] rounded-full ${
                      a.urgent ? "bg-[#c8482e]" : "bg-[#111]/25"
                    }`}
                  />
                </div>
                <div className="col-span-11 flex flex-col gap-2 md:col-span-10 md:flex-row md:items-baseline md:justify-between md:gap-8">
                  <p
                    className="max-w-3xl text-[20px] leading-[1.35] tracking-[-0.005em] md:text-[22px]"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {a.text}
                  </p>
                  {a.action && (
                    <button className="shrink-0 text-[13px] tracking-wide text-[#111]/60 underline decoration-[#111]/25 underline-offset-[6px] transition-colors hover:text-[#c8482e] hover:decoration-[#c8482e]">
                      {a.action.toLowerCase()} →
                    </button>
                  )}
                </div>
                <div
                  className="hidden text-right text-[10px] uppercase tracking-[0.18em] text-[#111]/30 md:col-span-1 md:block"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Remainder of day */}
      <section className="border-b border-[#111]/10">
        <div className="mx-auto max-w-[1400px] px-8 py-14">
          <SectionHeader
            index="III"
            label="Remainder of day"
            count={SERVICES.filter((s) => s.end > nowMin).length}
          />
          <ul className="mt-10">
            {SERVICES.filter((s) => s.end > nowMin)
              .sort((a, b) => a.start - b.start)
              .map((s, i, arr) => (
                <li
                  key={s.id}
                  className={`grid grid-cols-12 gap-6 border-t border-[#111]/10 py-6 ${
                    i === arr.length - 1 ? "border-b" : ""
                  }`}
                >
                  {/* time */}
                  <div className="col-span-4 md:col-span-2">
                    <div
                      className="text-[18px] tabular-nums"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {fmt(s.start)}
                    </div>
                    <div
                      className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#111]/40"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      ends {fmt(s.end)}
                    </div>
                    <StatusTag status={s.status} className="mt-3" />
                  </div>

                  {/* guest + service */}
                  <div className="col-span-8 md:col-span-6">
                    <div
                      className="text-[26px] leading-tight tracking-tight"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {s.guest}
                      {s.partySize ? (
                        <span
                          className="ml-3 align-middle text-[12px] tracking-wide text-[#111]/45"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          · {s.partySize} guests
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-[14px] text-[#111]/65">{s.service}</div>
                    {s.note && (
                      <p
                        className="mt-3 max-w-lg text-[13px] italic text-[#111]/50"
                        style={{ fontFamily: "'Instrument Serif', serif" }}
                      >
                        {s.note}
                      </p>
                    )}
                  </div>

                  {/* room + practitioner */}
                  <div className="col-span-12 md:col-span-4 md:text-right">
                    <div className="text-[13px] text-[#111]/70">{s.room}</div>
                    <div
                      className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#111]/45"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {s.practitioner}
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      </section>

      {/* Finances */}
      <section>
        <div className="mx-auto max-w-[1400px] px-8 py-14">
          <div className="flex items-baseline justify-between">
            <SectionHeader index="IV" label="Today's finances" count={FINANCES.length} />
          </div>
          <div
            className="mt-6 text-[13px] tracking-wide text-[#111]/55"
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          >
            <span className="tabular-nums text-[#111]">
              ${FINANCES.reduce((a, b) => a + b.amount, 0).toLocaleString()}
            </span>{" "}
            total ·{" "}
            <span className="tabular-nums text-[#c8482e]">
              $
              {FINANCES.filter((f) => !f.paid)
                .reduce((a, b) => a + b.amount, 0)
                .toLocaleString()}
            </span>{" "}
            unpaid
          </div>
          <ul className="mt-8">
            {FINANCES.map((f, i) => (
              <li
                key={f.guest}
                className={`grid grid-cols-12 gap-4 border-t border-[#111]/10 py-4 ${
                  i === FINANCES.length - 1 ? "border-b" : ""
                }`}
              >
                <div
                  className="col-span-1 text-[10px] uppercase tracking-[0.18em] text-[#111]/35"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="col-span-5">
                  <div
                    className="text-[20px] leading-tight tracking-tight"
                    style={{ fontFamily: "'Instrument Serif', serif" }}
                  >
                    {f.guest}
                  </div>
                  <div
                    className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[#111]/45"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {f.services} service{f.services > 1 ? "s" : ""}
                  </div>
                </div>
                <div
                  className="col-span-2 self-center text-[15px] tabular-nums"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ${f.amount}
                </div>
                <div
                  className={`col-span-2 self-center text-[11px] uppercase tracking-[0.16em] ${
                    f.paid ? "text-[#2e6b4f]" : "text-[#c8482e]"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {f.paid ? "paid" : "unpaid"}
                </div>
                <div className="col-span-2 self-center text-right">
                  <button className="text-[13px] tracking-wide text-[#111]/60 underline decoration-[#111]/25 underline-offset-[6px] transition-colors hover:text-[#111] hover:decoration-[#111]/60">
                    invoice →
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer
        className="border-t border-[#111]/10 py-8 text-center text-[11px] uppercase tracking-[0.2em] text-[#111]/35"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        seondya · shift 09:00 — 20:00
      </footer>
    </div>
  );
}

// ------------------------------------------------------------------
// Section header
// ------------------------------------------------------------------

function SectionHeader({
  index,
  label,
  count,
}: {
  index: string;
  label: string;
  count: number;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="flex items-baseline gap-4">
        <span
          className="text-[11px] uppercase tracking-[0.22em] text-[#111]/40"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {index}
        </span>
        <h2
          className="text-[36px] leading-none tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          {label}
        </h2>
      </div>
      <span
        className="text-[11px] tabular-nums uppercase tracking-[0.18em] text-[#111]/40"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {String(count).padStart(2, "0")}
      </span>
    </div>
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
    <div className="relative">
      {/* Hour scale */}
      <div className="grid" style={{ gridTemplateColumns: "160px 1fr" }}>
        <div />
        <div className="relative h-6">
          {hours.map((h) => {
            const pct = ((h * 60 - DAY_START) / DAY_SPAN) * 100;
            return (
              <div
                key={h}
                className="absolute top-0 -translate-x-1/2 text-[10px] uppercase tracking-[0.14em] text-[#111]/40"
                style={{
                  left: `${pct}%`,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {((h + 11) % 12) + 1}
                {h >= 12 ? "pm" : "am"}
              </div>
            );
          })}
          {/* now marker label */}
          <div
            className="absolute -top-0 -translate-x-1/2 text-[10px] uppercase tracking-[0.14em] text-[#c8482e]"
            style={{ left: `${nowPct}%`, fontFamily: "'JetBrains Mono', monospace" }}
          >
            now
          </div>
        </div>
      </div>

      {/* Room rows */}
      <div className="mt-3 border-t border-[#111]/15">
        {ROOMS.map((room) => {
          const services = SERVICES.filter((s) => s.room === room);
          return (
            <div
              key={room}
              className="grid items-stretch border-b border-[#111]/10"
              style={{ gridTemplateColumns: "160px 1fr" }}
            >
              <div className="flex items-center border-r border-[#111]/10 py-5 pr-4">
                <span
                  className="text-[13px] leading-tight tracking-tight text-[#111]/80"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {room}
                </span>
              </div>

              <div className="relative h-[68px]">
                {/* hour gridlines */}
                {hours.map((h) => {
                  const pct = ((h * 60 - DAY_START) / DAY_SPAN) * 100;
                  return (
                    <div
                      key={h}
                      className="absolute inset-y-0 w-px bg-[#111]/[0.06]"
                      style={{ left: `${pct}%` }}
                    />
                  );
                })}

                {/* now line */}
                <div
                  className="absolute inset-y-0 z-10 w-px bg-[#c8482e]"
                  style={{ left: `${nowPct}%` }}
                />

                {/* services */}
                {services.map((s) => {
                  const left = (s.start / DAY_SPAN) * 100;
                  const width = ((s.end - s.start) / DAY_SPAN) * 100;
                  const isPast = s.end <= nowMin;
                  const isLive = s.start <= nowMin && s.end > nowMin;

                  const styles = (() => {
                    if (s.status === "requested")
                      return {
                        bg: "transparent",
                        border: "1px dashed rgba(17,17,17,0.35)",
                        color: "#111",
                      };
                    if (isPast)
                      return {
                        bg: "rgba(17,17,17,0.04)",
                        border: "1px solid rgba(17,17,17,0.08)",
                        color: "rgba(17,17,17,0.45)",
                      };
                    if (isLive)
                      return {
                        bg: "#111",
                        border: "1px solid #111",
                        color: "#faf9f6",
                      };
                    return {
                      bg: "#faf9f6",
                      border: "1px solid rgba(17,17,17,0.35)",
                      color: "#111",
                    };
                  })();

                  return (
                    <div
                      key={s.id}
                      className="absolute top-1.5 bottom-1.5 overflow-hidden px-2.5 py-1.5 text-[11px] leading-tight"
                      style={{
                        left: `${left}%`,
                        width: `calc(${width}% - 2px)`,
                        background: styles.bg,
                        border: styles.border,
                        color: styles.color,
                      }}
                      title={`${s.guest} · ${s.service} · ${fmt(s.start)}–${fmt(s.end)}`}
                    >
                      <div
                        className="truncate tracking-tight"
                        style={{
                          fontFamily: "'Instrument Serif', serif",
                          fontSize: 14,
                        }}
                      >
                        {s.guest}
                        {s.partySize ? ` · ${s.partySize}` : ""}
                      </div>
                      <div
                        className="mt-0.5 truncate opacity-80"
                        style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}
                      >
                        {fmt(s.start)}–{fmt(s.end)} · {s.practitioner}
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

// ------------------------------------------------------------------
// Status tag
// ------------------------------------------------------------------

function StatusTag({ status, className = "" }: { status: Status; className?: string }) {
  const map: Record<Status, { label: string; color: string }> = {
    "in-session": { label: "in session", color: "text-[#111]" },
    confirmed: { label: "confirmed", color: "text-[#2e6b4f]" },
    requested: { label: "requested", color: "text-[#a67c00]" },
    hold: { label: "hold", color: "text-[#111]/50" },
  };
  const s = map[status];
  return (
    <span
      className={`inline-block text-[10px] uppercase tracking-[0.18em] ${s.color} ${className}`}
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      {s.label}
    </span>
  );
}
