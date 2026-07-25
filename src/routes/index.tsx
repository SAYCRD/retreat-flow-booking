import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

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
// Types
// ------------------------------------------------------------------

type AttentionLevel = "critical" | "warning";

type AttentionItem = {
  id: string;
  level: AttentionLevel;
  message: string;
  context: string;
  action: string;
};

type NextItem = {
  id: string;
  time: string;
  minutesAway: number;
  guest: string;
  service: string;
  location: string;
  state: "arriving" | "in-room" | "turnover" | "checkout";
  action: string;
};

type DayBlock = {
  id: string;
  start: string;
  end: string;
  label: string;
  density: "light" | "moderate" | "full";
  note?: string;
};

// ------------------------------------------------------------------
// Seeded data
// ------------------------------------------------------------------

const ATTENTION: AttentionItem[] = [
  {
    id: "a1",
    level: "critical",
    message: "Double booking risk",
    context: "Marcus Thorne is requested in Room 04 and Suite A at 15:00.",
    action: "Resolve conflict",
  },
  {
    id: "a2",
    level: "warning",
    message: "Late arrival",
    context: "Elena Vance is 12 minutes past her Deep Tissue start time.",
    action: "Call guest",
  },
  {
    id: "a3",
    level: "warning",
    message: "Room turnover needed",
    context: "Room 02 will be free in 4 minutes. Next guest arrives at 15:15.",
    action: "Notify housekeeping",
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
    action: "Prepare room",
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
  { id: "d1", start: "15:00", end: "16:00", label: "Afternoon rush", density: "full", note: "4 arrivals, 2 checkouts" },
  { id: "d2", start: "16:00", end: "17:00", label: "Turnover window", density: "moderate", note: "3 rooms reset" },
  { id: "d3", start: "17:00", end: "18:30", label: "Evening bookings", density: "light" },
  { id: "d4", start: "18:30", end: "20:00", label: "Closing prep", density: "light", note: "Last guest at 19:45" },
];

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function stateColor(state: NextItem["state"]) {
  switch (state) {
    case "arriving":
      return "bg-chart-3 text-white";
    case "turnover":
      return "bg-chart-5 text-white";
    case "checkout":
      return "bg-chart-1 text-white";
    case "in-room":
      return "bg-chart-2 text-white";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function densityBar(density: DayBlock["density"]) {
  switch (density) {
    case "full":
      return "w-full";
    case "moderate":
      return "w-2/3";
    case "light":
      return "w-1/3";
  }
}

// ------------------------------------------------------------------
// Components
// ------------------------------------------------------------------

function AttentionSection() {
  if (ATTENTION.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Attention</h2>
        <span className="text-xs text-muted-foreground">{ATTENTION.length} items</span>
      </div>
      <div className="grid gap-3">
        {ATTENTION.map((item) => (
          <div
            key={item.id}
            className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  item.level === "critical" ? "bg-destructive" : "bg-chart-5"
                }`}
              />
              <div>
                <h3 className="font-medium text-card-foreground">{item.message}</h3>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">{item.context}</p>
              </div>
            </div>
            <button className="shrink-0 self-start rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:self-center">
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function Next15Section() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Next 15 minutes</h2>
        <span className="text-xs text-muted-foreground">{NEXT_15.length} actions</span>
      </div>
      <div className="space-y-2">
        {NEXT_15.map((item) => (
          <div
            key={item.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-accent/30"
          >
            <div className="flex flex-col items-center justify-center rounded-xl bg-muted px-3 py-2 text-center">
              <span className="text-xs font-medium tabular-nums">{item.time}</span>
              <span className="text-[10px] text-muted-foreground">{item.minutesAway}m</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-card-foreground">{item.guest}</h3>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${stateColor(
                    item.state
                  )}`}
                >
                  {item.state}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {item.service} · {item.location}
              </p>
            </div>
            <button className="shrink-0 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary">
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function DayShapeSection() {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">Day shape</h2>
        <span className="text-xs text-muted-foreground">Rest of the day</span>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="space-y-5">
          {DAY_SHAPE.map((block) => (
            <div key={block.id} className="group space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-3">
                  <span className="text-sm font-medium text-card-foreground">{block.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {block.start} – {block.end}
                  </span>
                </div>
                {block.note && (
                  <span className="hidden text-xs text-muted-foreground sm:inline">{block.note}</span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full bg-primary transition-all ${densityBar(
                    block.density
                  )}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TopBar() {
  const now = useMemo(() => new Date(), []);
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <header className="flex items-center justify-between py-6">
      <div className="flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Seondya</h1>
        <span className="hidden text-sm text-muted-foreground sm:inline">Front desk</span>
      </div>
      <div className="text-right">
        <div className="text-2xl font-semibold tabular-nums tracking-tight">{time}</div>
        <div className="text-xs text-muted-foreground">{date}</div>
      </div>
    </header>
  );
}

function BottomNav() {
  const links = ["Today", "Calendar", "Requests", "Guests", "Rooms", "Practitioners"];
  return (
    <nav className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-background/80 px-2 py-1.5 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-1">
        {links.map((link, i) => (
          <button
            key={link}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              i === 0 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

function TodayPage() {
  return (
    <div className="min-h-screen bg-background px-6 pb-28 pt-2">
      <div className="mx-auto max-w-3xl">
        <TopBar />
        <main className="space-y-10">
          <AttentionSection />
          <Next15Section />
          <DayShapeSection />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
