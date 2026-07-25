import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
// Data
// ------------------------------------------------------------------

type AttentionItem = {
  id: string;
  level: "critical" | "warning";
  headline: string;
  detail: string;
  action: string;
};

type NextItem = {
  id: string;
  time: string;
  minutesAway: number;
  guest: string;
  service: string;
  location: string;
  state: "arriving" | "turnover" | "checkout" | "in-room";
  action: string;
};

type DayBlock = {
  id: string;
  start: string;
  end: string;
  label: string;
  load: number; // 0..1
  note?: string;
};

const ATTENTION: AttentionItem[] = [
  {
    id: "a1",
    level: "critical",
    headline: "Marcus Thorne is double-booked",
    detail: "Room 04 and Suite A both hold him at 15:00.",
    action: "Resolve",
  },
  {
    id: "a2",
    level: "warning",
    headline: "Elena Vance is 12 minutes late",
    detail: "Deep Tissue with Ana, Room 02.",
    action: "Call",
  },
  {
    id: "a3",
    level: "warning",
    headline: "Room 02 needs a turnover",
    detail: "Free in 4 minutes. Next guest at 15:15.",
    action: "Housekeeping",
  },
];

const NEXT_15: NextItem[] = [
  {
    id: "n1",
    time: "14:48",
    minutesAway: 4,
    guest: "Sarah Jenkins",
    service: "Aromatherapy",
    location: "Room 03",
    state: "arriving",
    action: "Check in",
  },
  {
    id: "n2",
    time: "14:52",
    minutesAway: 8,
    guest: "David Kalu",
    service: "Hot Stone Therapy",
    location: "Suite A",
    state: "turnover",
    action: "Mark ready",
  },
  {
    id: "n3",
    time: "14:55",
    minutesAway: 11,
    guest: "Isabella Chen",
    service: "Hydrafacial",
    location: "Room 05",
    state: "arriving",
    action: "Prepare",
  },
  {
    id: "n4",
    time: "14:58",
    minutesAway: 14,
    guest: "Marcus Thorne",
    service: "Deep Tissue",
    location: "Room 04",
    state: "checkout",
    action: "Review bill",
  },
];

const DAY_SHAPE: DayBlock[] = [
  { id: "d1", start: "15:00", end: "16:00", label: "Afternoon rush", load: 1, note: "4 arrivals · 2 checkouts" },
  { id: "d2", start: "16:00", end: "17:00", label: "Turnover window", load: 0.62, note: "3 rooms reset" },
  { id: "d3", start: "17:00", end: "18:30", label: "Evening bookings", load: 0.4 },
  { id: "d4", start: "18:30", end: "20:00", label: "Closing prep", load: 0.22, note: "Last guest 19:45" },
];

const NAV = ["Today", "Calendar", "Requests", "Guests", "Rooms", "Practitioners"];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function stateLabel(state: NextItem["state"]) {
  return state.replace("-", " ");
}

function useNow() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

function TodayPage() {
  const now = useNow();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const date = now
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    .toLowerCase();

  return (
    <div
      className="min-h-screen bg-[#faf9f6] text-[#111111] antialiased"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {/* Nav strip */}
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
                    i === 0
                      ? "text-[#111]"
                      : "text-[#111]/40 hover:text-[#111]/70"
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

      {/* Hero: time as the character */}
      <section className="border-b border-[#111]/10">
        <div className="mx-auto grid max-w-[1400px] grid-cols-12 gap-8 px-8 pt-16 pb-14">
          <div className="col-span-12 md:col-span-8">
            <div
              className="text-[11px] uppercase tracking-[0.18em] text-[#111]/40"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              now
            </div>
            <div
              className="mt-6 flex items-baseline gap-6 leading-none"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              <span
                className="text-[168px] tabular-nums tracking-[-0.04em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 400 }}
              >
                {time}
              </span>
              <span className="hidden text-[40px] italic text-[#111]/50 md:inline">
                {date}
              </span>
            </div>
            <p
              className="mt-8 max-w-xl text-[17px] leading-relaxed text-[#111]/70"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Three things need you.{" "}
              <span className="text-[#c8482e]">One is urgent.</span> Four guests
              move through the next fifteen minutes.
            </p>
          </div>

          <aside className="col-span-12 border-l border-[#111]/10 pl-8 md:col-span-4">
            <div
              className="text-[11px] uppercase tracking-[0.18em] text-[#111]/40"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              today at a glance
            </div>
            <dl
              className="mt-5 space-y-4 text-[13px]"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {[
                ["guests", "14"],
                ["services", "22"],
                ["rooms in use", "3 / 6"],
                ["practitioners on", "5"],
                ["revenue expected", "€4,280"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between border-b border-dotted border-[#111]/15 pb-2">
                  <dt className="text-[#111]/50">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </section>

      {/* Body: three columns */}
      <section className="mx-auto grid max-w-[1400px] grid-cols-12 gap-0 px-8 py-16">
        {/* Attention */}
        <div className="col-span-12 md:col-span-5 md:pr-10">
          <SectionHeader index="I" label="Attention" count={ATTENTION.length} />
          <ol className="mt-8 space-y-8">
            {ATTENTION.map((a, i) => (
              <li key={a.id} className="border-t border-[#111]/15 pt-6">
                <div className="flex items-baseline gap-4">
                  <span
                    className="text-[11px] tabular-nums text-[#111]/40"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.18em] ${
                      a.level === "critical" ? "text-[#c8482e]" : "text-[#a67c00]"
                    }`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {a.level}
                  </span>
                </div>
                <h3
                  className="mt-3 text-[26px] leading-[1.15] tracking-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {a.headline}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#111]/60">
                  {a.detail}
                </p>
                <button
                  className="mt-4 text-[13px] tracking-wide text-[#111] underline decoration-[#111]/30 underline-offset-[6px] transition-colors hover:decoration-[#c8482e] hover:text-[#c8482e]"
                >
                  {a.action.toLowerCase()} →
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* Next 15 */}
        <div className="col-span-12 mt-16 border-t border-[#111]/10 pt-8 md:col-span-7 md:mt-0 md:border-l md:border-t-0 md:pl-10 md:pt-0">
          <SectionHeader index="II" label="Next 15 minutes" count={NEXT_15.length} />
          <table
            className="mt-8 w-full border-collapse text-left"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            <thead>
              <tr
                className="text-[10px] uppercase tracking-[0.18em] text-[#111]/40"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                <th className="border-b border-[#111]/20 pb-3 pr-4 font-normal">time</th>
                <th className="border-b border-[#111]/20 pb-3 pr-4 font-normal">guest</th>
                <th className="hidden border-b border-[#111]/20 pb-3 pr-4 font-normal md:table-cell">service · room</th>
                <th className="border-b border-[#111]/20 pb-3 pr-4 font-normal">state</th>
                <th className="border-b border-[#111]/20 pb-3 text-right font-normal">action</th>
              </tr>
            </thead>
            <tbody>
              {NEXT_15.map((n) => (
                <tr
                  key={n.id}
                  className="group border-b border-[#111]/10 align-baseline transition-colors hover:bg-[#111]/[0.02]"
                >
                  <td className="py-5 pr-4">
                    <div
                      className="text-[15px] tabular-nums"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {n.time}
                    </div>
                    <div
                      className="text-[10px] uppercase tracking-[0.14em] text-[#111]/40"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      in {n.minutesAway}m
                    </div>
                  </td>
                  <td className="py-5 pr-4">
                    <div
                      className="text-[22px] leading-tight tracking-tight"
                      style={{ fontFamily: "'Instrument Serif', serif" }}
                    >
                      {n.guest}
                    </div>
                    <div className="mt-0.5 text-[12px] text-[#111]/50 md:hidden">
                      {n.service} · {n.location}
                    </div>
                  </td>
                  <td className="hidden py-5 pr-4 text-[13px] text-[#111]/70 md:table-cell">
                    <div>{n.service}</div>
                    <div className="text-[#111]/45">{n.location}</div>
                  </td>
                  <td className="py-5 pr-4">
                    <span
                      className={`text-[10px] uppercase tracking-[0.18em] ${
                        n.state === "arriving"
                          ? "text-[#2e6b4f]"
                          : n.state === "turnover"
                          ? "text-[#a67c00]"
                          : n.state === "checkout"
                          ? "text-[#c8482e]"
                          : "text-[#111]/60"
                      }`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {stateLabel(n.state)}
                    </span>
                  </td>
                  <td className="py-5 text-right">
                    <button className="text-[13px] tracking-wide text-[#111]/60 underline decoration-[#111]/20 underline-offset-[6px] transition-colors hover:text-[#111] hover:decoration-[#111]/60">
                      {n.action.toLowerCase()}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Day shape */}
      <section className="border-t border-[#111]/10">
        <div className="mx-auto max-w-[1400px] px-8 py-16">
          <SectionHeader index="III" label="Day shape" count={DAY_SHAPE.length} />

          <div className="mt-10 grid grid-cols-12 gap-6">
            {DAY_SHAPE.map((b, i) => (
              <div
                key={b.id}
                className="col-span-12 border-t border-[#111]/15 pt-5 md:col-span-3"
              >
                <div
                  className="flex items-baseline justify-between text-[10px] uppercase tracking-[0.18em] text-[#111]/40"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span>
                    {String(i + 1).padStart(2, "0")} · {b.start}—{b.end}
                  </span>
                  <span className="tabular-nums">{Math.round(b.load * 100)}%</span>
                </div>
                <h3
                  className="mt-4 text-[28px] leading-none tracking-tight"
                  style={{ fontFamily: "'Instrument Serif', serif" }}
                >
                  {b.label}
                </h3>
                {b.note && (
                  <p className="mt-3 text-[13px] leading-relaxed text-[#111]/55">
                    {b.note}
                  </p>
                )}
                {/* Load bar as vertical ticks */}
                <div className="mt-6 flex h-8 items-end gap-[3px]">
                  {Array.from({ length: 24 }).map((_, tickIndex) => {
                    const active = tickIndex / 24 < b.load;
                    return (
                      <span
                        key={tickIndex}
                        className={`w-[3px] transition-all ${
                          active ? "bg-[#111]" : "bg-[#111]/10"
                        }`}
                        style={{
                          height: `${20 + ((tickIndex * 37) % 60) * 0.5}%`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t border-[#111]/10 py-8 text-center text-[11px] uppercase tracking-[0.2em] text-[#111]/35"
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        seondya · saturday, july 25 · shift 09:00 — 20:00
      </footer>
    </div>
  );
}

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
        {String(count).padStart(2, "0")} items
      </span>
    </div>
  );
}
