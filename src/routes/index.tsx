import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Footprints, RefreshCcw, Sparkles, Sparkle, Radio, CalendarRange, ArrowDownRight, AlertTriangle, X, Check, UserCheck, DoorOpen, Coffee, Waves, Phone, Mail, FileText, ShieldAlert, ExternalLink, CreditCard, Copy, Brush, ClipboardCheck, Bell, ArrowRight, HandHeart, Wand2, Flower2, Wind, PartyPopper, Hand, Feather, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { PractitionerPanel } from "@/components/PractitionerPanel";
import {
  openPractitionerPanelByName,
  hasAvailabilityCovering,
  findPractitionerByName,
  dateKeyOf,
  usePractitioners,
  addService as storeAddService,
  cancelService as storeCancelService,
  getLiveServices,
  consumeOpenReservation,
} from "@/lib/practitionerStore";
import {
  DAY_START,
  DAY_END,
  DAY_SPAN,
  t,
  fmt,
  ROOMS,
  ROOM_COLORS,
  NEUTRAL,
  roomColor,
  OFFERINGS_BY_ROOM,
  SEED_SERVICES as SERVICES,
  setupMinutesFor,
  type Service,
  type Status,
} from "@/lib/catalog";

const WHISPER_ICON = {
  message: MessageSquare,
  notify: Sparkles,
  escort: Footprints,
  checkin: HandHeart,
  turnover: Wind,
  reset: Brush,
  setup: Flower2,
  pickup: Hand,
  handoff: Wand2,
  elixir: Coffee,
  payment: PartyPopper,
  conflict: AlertTriangle,
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

type WhisperKind = "message" | "notify" | "escort" | "checkin" | "turnover" | "reset" | "setup" | "pickup" | "handoff" | "elixir" | "payment" | "conflict";
type Prompt = {
  id: string;
  kind: WhisperKind;
  headline: string;      // poetic, fun, operational
  reason: string;        // quiet reason line
  room?: string;         // for accent color
  primary: string;       // primary action label
  urgent?: boolean;      // shows priority pulse + Important tag
  serviceId?: string;    // links prompt to a booking card on the timeline
};


// ------------------------------------------------------------------
// Blocks — a room made unavailable for a stretch of time (group booking,
// maintenance, deep clean, private event). Frontend-only for now; when the
// booking engine + persistence land, this becomes a row on a sibling table.
// ------------------------------------------------------------------

type Block = {
  id: string;
  room: string;
  start: number;   // minutes since DAY_START, same basis as Service.start
  end: number;
  reason: string;
  note?: string;
};

const BLOCK_REASONS = [
  "Group booking",
  "Maintenance",
  "Deep clean",
  "Private event",
  "Other",
] as const;

// Which offerings each room can host. Sourced from the (backend) room config,
// exported from `@/lib/catalog` and imported at the top of this file.


type Practitioner = { name: string; offerings: string[]; onCalendarToday: boolean };
const PRACTITIONERS: Practitioner[] = [
  { name: "Maya Chen", offerings: ["Deep Tissue Massage", "Swedish Massage", "Cupping"], onCalendarToday: true },
  { name: "Sofia Park", offerings: ["Sound Healing", "BEMER Session", "Infrared Sauna"], onCalendarToday: true },
  { name: "Daniel Reyes", offerings: ["Couples Ayurvedic Massage", "Ayurvedic Consultation"], onCalendarToday: true },
  { name: "Uqualla", offerings: ["Intuitive Reading", "Ceremonial Tea & Integration", "Medicine Walk", "Grandmother Crystal Bowl", "Meditation"], onCalendarToday: true },
  { name: "Dr. Elise Warren", offerings: ["Myers Cocktail IV"], onCalendarToday: false },
];

type SlotDraft = {
  room: string;
  start: number;
  end: number;
  mode: "reservation" | "block";
  editingBlockId?: string;
};


function firstName(guest: string) {
  return guest.split(" ")[0];
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function smoothScrollTo(targetY: number, duration = 900) {
  const startY = window.scrollY;
  const delta = targetY - startY;
  const startTime = performance.now();
  function step(now: number) {
    const t = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    window.scrollTo(0, startY + delta * eased);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


function generatePrompts(nowMin: number): Prompt[] {
  const out: Prompt[] = [];

  // 1a. Check-ins — services starting in 10–30 minutes; guest expected at the desk.
  SERVICES.filter((s) => s.start > nowMin + 10 && s.start <= nowMin + 30).forEach((s) => {
    const name = firstName(s.guest);
    out.push({
      id: `checkin-${s.id}`,
      kind: "checkin",
      headline: `Check in ${s.guest}`,
      reason: `${s.service} · ${fmt(s.start)} · ${s.room} · with ${s.practitioner}`,
      room: s.room,
      serviceId: s.id,
      primary: "Confirm walked in",
    });
  });

  // 1b. Escorts — services starting in the next 10 minutes; walk the guest in.
  SERVICES.filter((s) => s.start > nowMin && s.start <= nowMin + 10).forEach((s) => {
    const mins = Math.round(s.start - nowMin);
    const name = firstName(s.guest);
    out.push({
      id: `arrival-${s.id}`,
      kind: "escort",
      headline: mins <= 5
        ? `Walk ${name} to ${s.room}`
        : `${name} arrives in ${mins} minutes — get ${s.room} ready`,
      reason: `${s.service} · ${fmt(s.start)} · with ${s.practitioner}`,
      room: s.room,
      serviceId: s.id,
      primary: mins <= 5 ? "Confirm walked in" : "Confirm ready",
      urgent: mins <= 5,
    });
  });

  // 1c. Practitioner notifications — a built-in cue for EVERY upcoming
  // session on the day. Fires as soon as the session is on the horizon
  // (up to ~3 hours out) and stays live until the practitioner is on-floor
  // (within 10 min of start), so "notify practitioner" is a guaranteed
  // step in every Coming Up cycle.
  SERVICES.filter((s) => s.start > nowMin + 10 && s.start <= nowMin + 180).forEach((s) => {
    out.push({
      id: `notify-${s.id}`,
      kind: "notify",
      headline: `Notify ${s.practitioner} — ${firstName(s.guest)} at ${fmt(s.start)}`,
      reason: `${s.service} · ${s.room} · quiet heads-up`,
      room: s.room,
      serviceId: s.id,
      primary: "Confirm notified",
    });
  });

  // 1d. Pickup / handoff — same guest has back-to-back sessions with a tight
  // gap (≤ 15 min). Walk them from the ending room to the next one.
  const guestSorted: Record<string, Service[]> = {};
  SERVICES.forEach((s) => (guestSorted[s.guest] ??= []).push(s));
  Object.values(guestSorted).forEach((svcs) => {
    if (svcs.length < 2) return;
    const sorted = [...svcs].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gap = b.start - a.end;
      // Fire while the prior session is closing (within 10 min of ending) or
      // just ended, and the gap is short enough to feel like a hand-off.
      if (gap < 15 && a.end > nowMin - 5 && a.end <= nowMin + 10 && b.start > nowMin) {
        out.push({
          id: `pickup-${a.id}-${b.id}`,
          kind: "pickup",
          headline: `Pick up ${firstName(a.guest)} from ${a.room} — take to ${b.room}`,
          reason: `${a.service} ends ${fmt(a.end)} · ${b.service} at ${fmt(b.start)}`,
          room: b.room,
          serviceId: b.id,
          primary: "Confirm handoff",
          urgent: gap < 5,
        });
      }
    }
  });

  // 2. Turnovers & setups — back-to-back services in the same room.
  ROOMS.forEach((room) => {
    const roomServices = SERVICES.filter((s) => s.room === room).sort((a, b) => a.start - b.start);
    for (let i = 0; i < roomServices.length - 1; i++) {
      const prev = roomServices[i];
      const next = roomServices[i + 1];
      const gap = next.start - prev.end;
      if (gap < 30 && next.end > nowMin) {
        const urgent = gap < 10;
        out.push({
          id: `turnover-${prev.id}-${next.id}`,
          kind: urgent ? "turnover" : "setup",
          headline: urgent
            ? `Quick reset before ${firstName(next.guest)}`
            : `Set for ${next.service}`,
          reason: `${prev.service} ends ${fmt(prev.end)} · ${next.service} at ${fmt(next.start)}`,
          room,
          serviceId: next.id,
          primary: "Confirm room ready",
          urgent,
        });
      }
    }
  });

  // 2b. Room reset notifications — every completed session whose room isn't
  // reused later in the day still needs a reset. Stays live until confirmed,
  // so unreset rooms remain visible in Coming Up all day.
  SERVICES.filter((s) => s.end <= nowMin + 2).forEach((s) => {
    const roomReused = SERVICES.some(
      (other) => other.room === s.room && other.start >= s.end,
    );
    if (roomReused) return;
    out.push({
      id: `reset-${s.id}`,
      kind: "reset",
      headline: `Room reset`,
      reason: `after ${s.service} · ended ${fmt(s.end)}`,
      room: s.room,
      serviceId: s.id,
      primary: "Confirm reset",
    });
  });


  // 3. Elixir windows — a guest has a break between two services.
  const byGuest: Record<string, Service[]> = {};
  SERVICES.forEach((s) => {
    byGuest[s.guest] = byGuest[s.guest] ?? [];
    byGuest[s.guest].push(s);
  });
  Object.entries(byGuest).forEach(([guest, svcs]) => {
    if (svcs.length < 2) return;
    const sorted = [...svcs].sort((a, b) => a.start - b.start);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      const gap = b.start - a.end;
      if (gap >= 5 && gap <= 60 && b.start > nowMin) {
        out.push({
          id: `elixir-${a.id}-${b.id}`,
          kind: "elixir",
          headline: `A quiet window opens for ${firstName(guest)}`,
          reason: `${fmt(a.end)}–${fmt(b.start)} between ${a.service} and ${b.service}`,
          room: b.room,
          serviceId: b.id,
          primary: "Tea ready",
        });
      }
    }
  });

  // 4. Payment whispers — unpaid services that are current or upcoming.
  SERVICES.filter((s) => !SERVICE_PAID[s.id] && s.start > nowMin - 15).forEach((s) => {
    out.push({
      id: `payment-${s.id}`,
      kind: "payment",
      headline: `${firstName(s.guest)}'s ${s.service} needs checkout`,
      reason: `$${PRICES[s.id]} · ${s.room} · ${fmt(s.start)}`,
      room: s.room,
      serviceId: s.id,
      primary: "Send link",
    });
  });

  // 5. Conflicts — overlapping services in the same room.
  detectConflicts(SERVICES).forEach((c, i) => {
    out.push({
      id: `conflict-${i}`,
      kind: "conflict",
      headline: `Two sessions want ${c.a.room}`,
      reason: `${c.a.service} (${fmt(c.a.start)}–${fmt(c.a.end)}) overlaps ${c.b.service}`,
      room: c.a.room,
      primary: "Resolve",
      urgent: true,
    });
  });

  return out;
}




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

// Per-guest details — contact, waiver, contraindications keyed to service kind.
type GuestInfo = {
  phone: string;
  email: string;
  pronouns?: string;
  waiverSignedOn?: string; // ISO date, undefined = not signed
  notes?: string;
  contraindications?: string[];
};

const GUESTS: Record<string, GuestInfo> = {
  "Elena Vives": {
    phone: "+1 (415) 555-0132", email: "elena.vives@hey.com", pronouns: "she/her",
    waiverSignedOn: "2026-06-14",
    notes: "Prefers arm rest under IV. Slight vein anxiety — talk her through the tap.",
    contraindications: ["History of vasovagal response — recline fully", "Avoid B-complex flush at high rate"],
  },
  "Nadia Farrow": {
    phone: "+1 (628) 555-0177", email: "nadia@farrowstudio.com", pronouns: "she/her",
    waiverSignedOn: "2026-07-02",
    notes: "Deep pressure OK on shoulders, light on lower back.",
    contraindications: ["Recent cortisone in right shoulder (May) — avoid direct work", "No cupping over lumbar tattoo (still healing)"],
  },
  "Thomas Wren": {
    phone: "+1 (206) 555-0104", email: "twren@northlight.co",
    waiverSignedOn: "2026-05-20",
    contraindications: ["Pacemaker — confirm BEMER protocol distance"],
  },
  "Gerald & June Pierce": {
    phone: "+1 (312) 555-0155", email: "pierces@fastmail.com",
    waiverSignedOn: "2026-07-25",
    notes: "25th anniversary. Champagne + card in the room.",
    contraindications: ["June: right hip replacement 2019 — no deep hip work, side-lying only"],
  },
  "Amara Okonkwo": {
    phone: "+44 20 7946 0432", email: "amara.o@studio.london", pronouns: "she/her",
    waiverSignedOn: "2026-07-25",
    notes: "Sensory sensitive. Low light, minimal chat on arrival. Journey of 3.",
    contraindications: ["Migraine trigger — no strong essential oils in reading room"],
  },
  "Marcus Hale": {
    phone: "+1 (503) 555-0198", email: "marcus.hale@proton.me",
    waiverSignedOn: undefined,
    notes: "First visit — greet at the door, walk him through the space.",
    contraindications: ["Tinnitus — check bowl proximity before session"],
  },
  "Priya Anand": {
    phone: "+1 (917) 555-0121", email: "priya.a@lantern.co",
    waiverSignedOn: undefined,
    notes: "Awaiting confirmation on Medicine Walk. Bring water + light jacket.",
    contraindications: [],
  },
  "Lena Costa": {
    phone: "+1 (415) 555-0187", email: "lena@costafolio.com",
    waiverSignedOn: "2026-04-11",
    contraindications: ["Second trimester pregnancy — supine only briefly, side-lying preferred"],
  },
};

// Session protocols — cautions tied to the SERVICE (modality), not the person.
// These are the things the practitioner must brief the guest on, or confirm before starting.
// The waiver is auto-composed from the applicable protocols + the guest's disclosures.
type Protocol = { text: string; severity: "brief" | "confirm" | "block" };
const SESSION_PROTOCOLS: Record<string, Protocol[]> = {
  "Myers Cocktail IV": [
    { text: "Confirm no recent kidney issues or dialysis", severity: "confirm" },
    { text: "Brief guest on cold sensation & metallic taste during push", severity: "brief" },
    { text: "Vasovagal risk — recline fully before insertion", severity: "confirm" },
  ],
  "Deep Tissue Massage": [
    { text: "Check pressure at 5 min and again at 15 min", severity: "brief" },
    { text: "Avoid areas of recent injection, cortisone, or fresh ink", severity: "block" },
    { text: "No deep work over replaced joints or acute inflammation", severity: "block" },
  ],
  "BEMER Session": [
    { text: "Pacemaker / ICD — maintain protocol distance, confirm model", severity: "block" },
    { text: "Not for active pregnancy first trimester", severity: "block" },
  ],
  "Cupping": [
    { text: "No cupping over tattoos <6 weeks, moles, or broken skin", severity: "block" },
    { text: "Brief on marking — lasts 3–7 days", severity: "brief" },
  ],
  "Couples Ayurvedic Massage": [
    { text: "Confirm oil allergies with both guests", severity: "confirm" },
    { text: "Side-lying only for hip replacement or late pregnancy", severity: "confirm" },
  ],
  "Intuitive Reading": [
    { text: "Confirm guest is not in acute grief or crisis — offer reschedule", severity: "confirm" },
  ],
  "Sound Healing": [
    { text: "Tinnitus — position bowls at safe distance, check before start", severity: "confirm" },
    { text: "Photosensitive epilepsy — no strobe elements", severity: "block" },
  ],
  "Ceremonial Tea & Integration": [
    { text: "Confirm no MAOI medications in last 14 days", severity: "block" },
    { text: "Brief on tea composition & duration", severity: "brief" },
  ],
  "Infrared Sauna": [
    { text: "Hydration check before entry — offer electrolytes", severity: "brief" },
    { text: "No entry with fever, alcohol, or first-trimester pregnancy", severity: "block" },
  ],
  "Medicine Walk": [
    { text: "Confirm mobility & footwear — 90 min terrain", severity: "confirm" },
    { text: "Brief on weather, water, and sun exposure", severity: "brief" },
  ],
  "Grandmother Crystal Bowl": [
    { text: "Photosensitivity & tinnitus — confirm before start", severity: "confirm" },
  ],
};

function getProtocols(serviceName: string): Protocol[] {
  return SESSION_PROTOCOLS[serviceName] ?? [];
}

// Payment state per service (in a real app this would come from the DB).
// A guest's `paid` flag in FINANCES represents the whole visit;
// here we mark individual services so the panel can show a payment link.
const SERVICE_PAID: Record<string, boolean> = {
  s1: true, s2: true, s3: true, s4: true,
  s5: false, s6: false, s7: true, s8: false, s9: false,
  s10: false, s11: false,
};

const PRICES: Record<string, number> = {
  s1: 220, s2: 180, s3: 95, s4: 50,
  s5: 320, s6: 140, s7: 140, s8: 60, s9: 140,
  s10: 180, s11: 150,
};


// ------------------------------------------------------------------

function useNow() {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// Fallback anchor for the demo timeline when the wall clock sits outside
// the day span (e.g. late night, early morning). Keeps the choreography
// engine believable when no one is actually on the property.
const DEMO_NOW = t(14, 30);

// The intelligence layer runs off the real wall clock: at 4pm you see the
// 4pm cues (turn over Infrared, set up The Temple, respond to Priya's
// request), so the system reads as alive and reactive rather than scripted.
function useNowMin(): number {
  const now = useNow();
  const wall = now.getHours() * 60 + now.getMinutes() - DAY_START;
  if (wall < 0 || wall > DAY_SPAN) return DEMO_NOW;
  return wall;
}

// ------------------------------------------------------------------

const DISPLAY = "'Inter Tight', Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";

const ACCENT = "#3730ff"; // electric indigo (system accent, not a guest)
const SURFACE = "#ffffff";
const INK = "#0a0a0a";

// Room colors, NEUTRAL, and roomColor are imported from @/lib/catalog.


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

function DateNavigator({
  value,
  onChange,
  today,
}: {
  value: Date;
  onChange: (d: Date) => void;
  today: Date;
}) {
  const [open, setOpen] = useState(false);
  const isToday = value.toDateString() === today.toDateString();

  const shift = (days: number) => {
    const d = new Date(value);
    d.setDate(d.getDate() + days);
    onChange(d);
  };

  const label = value.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Previous day"
        className="grid h-6 w-6 place-items-center rounded-[5px] text-black/45 transition hover:bg-black/[0.04] hover:text-black/75"
      >
        <ChevronLeft size={14} strokeWidth={2} />
      </button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-[6px] px-1.5 py-1 text-[11.5px] font-medium text-black/70 transition hover:bg-black/[0.04] hover:text-black"
          >
            <CalendarRange size={12} strokeWidth={2} className="text-black/45" />
            <span>{label}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={10}
          className="w-auto rounded-[12px] border border-black/[0.08] bg-white p-0 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)]"
        >
          <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2">
            <span className="text-[11px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
              Jump to
            </span>
            <button
              type="button"
              onClick={() => {
                onChange(new Date());
                setOpen(false);
              }}
              disabled={isToday}
              className="rounded-[5px] px-1.5 py-0.5 text-[11px] font-medium text-black/70 transition hover:bg-black/[0.04] hover:text-black disabled:cursor-not-allowed disabled:text-black/25 disabled:hover:bg-transparent"
            >
              Today
            </button>
          </div>
          <MiniCalendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            defaultMonth={value}
            showOutsideDays
            className="p-3 pointer-events-auto"
          />
          <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] px-3 py-2">
            <button
              type="button"
              onClick={() => onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate() - 7))}
              className="rounded-[5px] px-2 py-1 text-[11px] font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black"
            >
              − Week
            </button>
            <button
              type="button"
              onClick={() => onChange(new Date(value.getFullYear(), value.getMonth() - 1, value.getDate()))}
              className="rounded-[5px] px-2 py-1 text-[11px] font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black"
            >
              − Month
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => onChange(new Date(value.getFullYear(), value.getMonth() + 1, value.getDate()))}
              className="rounded-[5px] px-2 py-1 text-[11px] font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black"
            >
              + Month
            </button>
            <button
              type="button"
              onClick={() => onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate() + 7))}
              className="rounded-[5px] px-2 py-1 text-[11px] font-medium text-black/60 transition hover:bg-black/[0.04] hover:text-black"
            >
              + Week
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => shift(1)}
        aria-label="Next day"
        className="grid h-6 w-6 place-items-center rounded-[5px] text-black/45 transition hover:bg-black/[0.04] hover:text-black/75"
      >
        <ChevronRight size={14} strokeWidth={2} />
      </button>
    </span>
  );
}


function TodayPage() {
  const now = useNow();
  const nowMin = useNowMin();
  const [cueIdx, setCueIdx] = useState(0);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [openServiceId, setOpenServiceId] = useState<string | null>(null);
  const [heroPast, setHeroPast] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [openSlot, setOpenSlot] = useState<SlotDraft | null>(null);

  // Services flow through the shared store so the practitioner panel sees
  // the same live list (seed + created − canceled).
  const storeSnap = usePractitioners();
  const liveServices = useMemo(() => getLiveServices(), [storeSnap]);
  const openService = openServiceId ? liveServices.find((s) => s.id === openServiceId) ?? null : null;

  // Bus: practitioner panel can request that we open a reservation card.
  useEffect(() => {
    const id = storeSnap.openReservationId;
    if (id) {
      setOpenServiceId(id);
      consumeOpenReservation();
    }
  }, [storeSnap.openReservationId]);


  const timelineRef = useRef<HTMLDivElement | null>(null);
  const prevDateKeyRef = useRef<string>(new Date().toDateString());

  useEffect(() => {
    const key = selectedDate.toDateString();
    if (key === prevDateKeyRef.current) return;
    prevDateKeyRef.current = key;
    const el = timelineRef.current;
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 180;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }, [selectedDate]);

  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isToday = selectedDate.toDateString() === now.toDateString();
  const date = selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  useEffect(() => {
    const onScroll = () => setHeroPast(window.scrollY > 180);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const conflicts = useMemo(() => detectConflicts(SERVICES), []);
  const inSession = SERVICES.filter((s) => s.start <= nowMin && s.end > nowMin).length;
  const stillToCome = SERVICES.filter((s) => s.start > nowMin).length;
  const overlaps = conflicts.length;

  const allPrompts = useMemo(() => generatePrompts(nowMin), [nowMin]);
  const prompts = useMemo(
    () => allPrompts.filter((p) => !resolvedIds.has(p.id)),
    [allPrompts, resolvedIds],
  );
  const cue = prompts.length ? prompts[cueIdx % prompts.length] ?? null : null;
  const prevCue = () => setCueIdx((i) => (prompts.length ? (i - 1 + prompts.length) % prompts.length : 0));
  const nextCue = () => setCueIdx((i) => (prompts.length ? (i + 1) % prompts.length : 0));
  const confirmCue = () => {
    if (!cue) return;
    setResolvedIds((prev) => {
      const next = new Set(prev);
      next.add(cue.id);
      return next;
    });
  };

  // When the active cue changes, scroll to its action marker (or the linked
  // reservation card as a fallback) so the operator's eyes travel to the exact
  // spot the notification is about. We stop a little higher up, leaving calm
  // space between the sticky header and the actual action item.
  useEffect(() => {
    if (!cue?.serviceId) return;
    // Wait two frames so the timeline can (a) re-render the marker for the
    // new cue and (b) measure the target card's DOM bottom for "after"
    // markers (checkout, room reset). Without this we sometimes scroll to a
    // stale marker position from the previous cue — which for late-day
    // reset cues lands near the bottom of the page.
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const marker = document.getElementById("active-cue-marker");
      const el = marker ?? document.getElementById(`svc-${cue.serviceId}`);
      if (!el) return;
      const stickyOffset = 44 + 88 + 64 + 144;
      const rect = el.getBoundingClientRect();
      const target = window.scrollY + rect.top - stickyOffset;
      smoothScrollTo(Math.max(0, target), 1300);
    };
    const r1 = requestAnimationFrame(() => {
      const r2 = requestAnimationFrame(run);
      (run as any)._r2 = r2;
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(r1);
    };
  }, [cue?.id, cue?.serviceId]);





  return (
    <div
      className="min-h-screen antialiased"
      style={{ background: SURFACE, color: INK, fontFamily: DISPLAY }}
    >
      {/* Top bar — quiet, receded navigation so the broadcast bar owns attention */}
      <header className="sticky top-0 z-30 border-b border-black/[0.06] backdrop-blur-md" style={{ background: "rgba(255,255,255,0.72)" }}>
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-2.5">
          <div className="flex items-center gap-2">
            <div
              className="grid h-5 w-5 place-items-center rounded-[5px] text-[10px] font-semibold text-white"
              style={{ background: INK }}
            >
              S
            </div>
            <span className="text-[13px] font-medium tracking-tight text-black/80">Seondya</span>
          </div>

          <nav className="flex items-center gap-4 text-[12.5px]">
            <Link to="/" className="font-semibold text-black">Reservations</Link>
            <Link to="/practitioners" className="text-black/50 hover:text-black">Practitioners</Link>
          </nav>



          <div className="ml-auto flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-[6px] border border-black/10 bg-white/70 px-2 py-1 text-[11.5px] text-black/45 shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:bg-white hover:text-black/60"
            >
              <span>Search</span>
              <span
                className="rounded-[3px] border border-black/10 bg-black/[0.03] px-1 py-px text-[9.5px] text-black/45"
                style={{ fontFamily: MONO }}
              >
                ⌘K
              </span>
            </button>
            <div className="h-5 w-px bg-black/8" />
            <div className="flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-[#ffb98a] to-[#e06b5c] ring-1 ring-black/10" />
              <span className="text-[12px] font-medium text-black/70">Alba</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero — lighter and more compact so the broadcast bar can breathe */}
      <section className="border-b border-black/[0.06]">
        <div className="mx-auto max-w-[1440px] px-6 pt-8 pb-6">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 text-[11.5px] text-black/45">
                <LiveDot />
                <span className="font-medium text-black/65">{isToday ? "Live" : "Viewing"}</span>
                <span className="text-black/25">·</span>
                <DateNavigator value={selectedDate} onChange={setSelectedDate} today={now} />
              </div>
              <h1 className="mt-2 text-[44px] font-semibold leading-[1] tracking-[-0.03em] md:text-[56px]">
                {isToday ? "Today" : selectedDate.toLocaleDateString("en-US", { weekday: "long" })}
              </h1>
            </div>

            <div className="flex items-end gap-6">
              <Stat label="In session" value={inSession} />
              <Stat label="To come" value={stillToCome} />
              <Stat label="Conflicts" value={overlaps} accent />
              <div className="hidden h-12 w-px bg-black/8 md:block" />
              <div className="text-right">
                <div className="text-[10.5px] uppercase tracking-[0.14em] text-black/40" style={{ fontFamily: MONO }}>Now</div>
                <div className="mt-0.5 text-[28px] font-semibold tabular-nums leading-none tracking-tight" style={{ fontFamily: DISPLAY }}>
                  {clock}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Coming up — distinct notification layer separated from navigation */}
      <section
        className="sticky z-20 border-y border-black/[0.08] backdrop-blur-md"
        style={{
          top: 44,
          background: "rgba(253,242,248,0.97)",
          boxShadow: "0 1px 0 rgba(244,114,182,0.28) inset, 0 18px 50px -20px rgba(0,0,0,0.18)",
        }}
      >
        <div className="mx-auto flex max-w-[1440px] items-center gap-5 px-6 py-6">
          {/* broadcast label */}
          <div className="flex shrink-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center text-black/75">
              <span
                aria-hidden
                key={cue?.id ?? "empty"}
                className="absolute inset-0 rounded-full"
                style={{
                  background: "#fde047",
                  opacity: 0.22,
                  animation: "ping 1s cubic-bezier(0, 0, 0.2, 1) 3 forwards",
                }}
              />
              <span
                aria-hidden
                className="absolute inset-0 rounded-full opacity-[0.14]"
                style={{ background: "#fde047", boxShadow: "0 0 18px #fde047" }}
              />
              <Radio size={20} strokeWidth={2} className="relative z-10" />
            </span>
            <div className="flex flex-col">
              <span className="text-[14px] font-semibold tracking-tight text-black">
                <Highlight color="#fde047">Coming up</Highlight>
              </span>
              <span
                className="hidden text-[11px] tabular-nums text-black/40 sm:inline"
                style={{ fontFamily: MONO }}
              >
                {String(cueIdx + 1).padStart(2, "0")}/{String(prompts.length).padStart(2, "0")}
              </span>
            </div>
          </div>

          <span className="h-10 w-px shrink-0 bg-black/10" />

          {/* cue body */}
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            {cue ? (() => {
              const Icon = WHISPER_ICON[cue.kind];
              const tint = cue.room ? roomColor(cue.room) : "#0a0a0a";
              return (
                <>
                  <span className="relative shrink-0">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 place-items-center rounded-full"
                      style={{ background: `${tint}14`, color: tint }}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    {cue.urgent && (
                      <span aria-hidden className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-70" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                      </span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2.5">
                      <h3 className="truncate text-[17px] font-semibold tracking-tight text-black">
                        {cue.headline}
                      </h3>
                      {cue.urgent && (
                        <span className="shrink-0 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-px text-[10.5px] font-bold uppercase tracking-tight text-amber-700">
                          Important
                        </span>
                      )}
                      {cue.room && (
                        <span
                          className="hidden shrink-0 text-[18px] font-semibold md:inline"
                          style={{ color: roomColor(cue.room), fontFamily: DISPLAY }}
                        >
                          · {cue.room}
                        </span>
                      )}
                      <span className="hidden truncate text-[14.5px] font-medium text-black/75 lg:inline">
                        · {cue.reason}
                      </span>
                    </div>
                  </div>
                </>
              );
            })() : (
              <div className="flex items-center gap-2 text-[14px] text-black/50">
                <Sparkles size={16} strokeWidth={1.75} />
                <span>All caught up. The day is flowing.</span>
              </div>
            )}
          </div>

          {/* actions + arrows all inline, right-aligned */}
          <div className="flex shrink-0 items-center gap-3">
            {cue && (
              <>
                <button
                  onClick={confirmCue}
                  className="text-[13.5px] font-medium text-black/85 underline decoration-black/25 underline-offset-4 transition-colors hover:decoration-black"
                >
                  {cue.primary}
                </button>
                <span className="h-5 w-px bg-black/10" />
              </>
            )}
            <div className="flex items-center gap-0.5">
              <button
                onClick={prevCue}
                aria-label="Previous cue"
                className="grid h-9 w-9 place-items-center rounded-full text-[19px] leading-none text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black"
              >
                ‹
              </button>
              <button
                onClick={nextCue}
                aria-label="Next cue"
                className="grid h-9 w-9 place-items-center rounded-full text-[19px] leading-none text-black/45 transition-colors hover:bg-black/[0.05] hover:text-black"
              >
                ›
              </button>
            </div>
            <span className="h-8 w-px shrink-0 bg-black/10" />
            <div
              className="shrink-0 text-right tabular-nums transition-opacity duration-300"
              style={{ opacity: heroPast ? 1 : 0, fontFamily: DISPLAY }}
              aria-hidden={!heroPast}
            >
              <div className="text-[22px] font-semibold leading-none tracking-tight text-black">{clock}</div>
            </div>
          </div>
        </div>
      </section>









      {/* Timeline (rooms across, time down) */}
      <section className="border-b border-black/[0.08]">
        <div className="mx-auto max-w-[1440px] px-6 py-10">
          <SectionHeader eyebrow="01" label="Reservations" count={ROOMS.length} highlightColor="#86efac" icon={CalendarRange} />
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
          <div className="mt-6" ref={timelineRef}>
            <Timeline
              nowMin={nowMin}
              highlightServiceId={isToday ? cue?.serviceId : undefined}
              highlightKind={isToday ? cue?.kind : undefined}
              highlightUrgent={isToday ? cue?.urgent : undefined}
              whispers={isToday ? prompts : []}
              activeCueId={isToday ? cue?.id : undefined}
              activeRoom={activeRoom}
              cueRoom={isToday ? cue?.room ?? null : null}
              onRoomClick={(r) => setActiveRoom((cur) => (cur === r ? null : r))}
              onOpenService={(id) => setOpenServiceId(id)}
              allServices={isToday ? liveServices : liveServices.filter((s) => !SERVICES.some((seed) => seed.id === s.id))}
              blocks={blocks}
              draft={openSlot}
              onOpenSlot={(room, start, end, editingBlockId) => {
                if (editingBlockId) {
                  const b = blocks.find((x) => x.id === editingBlockId);
                  if (!b) return;
                  setOpenSlot({ room: b.room, start: b.start, end: b.end, mode: "block", editingBlockId });
                } else {
                  setOpenSlot({ room, start, end, mode: "reservation" });
                }
              }}
              onMoveBlock={(b) => {
                setBlocks((prev) => prev.map((x) => (x.id === b.id ? b : x)));
              }}
            />
          </div>
        </div>
      </section>


      <footer className="py-8 text-center text-[11px] text-black/35" style={{ fontFamily: MONO }}>
        SEONDYA · SHIFT 09:00 — 20:00
      </footer>

      {focusOpen && cue && (
        <FocusOverlay cue={cue} onClose={() => setFocusOpen(false)} />
      )}

      <ReservationPanel
        service={openService}
        onClose={() => setOpenServiceId(null)}
        onCancel={(id) => {
          storeCancelService(id);
          setOpenServiceId(null);
        }}
      />
      <SlotPanel
        draft={openSlot}
        allServices={liveServices}
        blocks={blocks}
        onClose={() => setOpenSlot(null)}
        onSaveReservation={(svc) => {
          storeAddService(svc);
          setOpenSlot(null);
        }}
        onSaveBlock={(b) => {
          setBlocks((prev) => {
            const others = prev.filter((x) => x.id !== b.id);
            return [...others, b];
          });
          setOpenSlot(null);
        }}
        onRemoveBlock={(id) => {
          setBlocks((prev) => prev.filter((x) => x.id !== id));
          setOpenSlot(null);
        }}
      />

      <PractitionerPanel />

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
  whispers = [],
  activeCueId,
  activeRoom,
  cueRoom,
  onRoomClick,
  onOpenService,
  allServices = SERVICES,
  emptyLabel,
  blocks = [],
  draft,
  onOpenSlot,
  onMoveBlock,
  onRequestMoveService,
}: {
  nowMin: number;
  highlightServiceId?: string;
  highlightKind?: WhisperKind;
  highlightUrgent?: boolean;
  whispers?: Prompt[];
  activeCueId?: string;
  activeRoom?: string | null;
  cueRoom?: string | null;
  onRoomClick?: (room: string) => void;
  onOpenService?: (id: string) => void;
  allServices?: Service[];
  emptyLabel?: string;
  blocks?: Block[];
  draft?: SlotDraft | null;
  onOpenSlot?: (room: string, start: number, end: number, editingBlockId?: string) => void;
  onMoveBlock?: (b: Block) => void;
  onRequestMoveService?: (id: string, start: number, end: number) => void;

}) {

  const PX_PER_MIN = 4; // 240px per hour vertical — gives 15/30-min slots room to breathe
  const TAIL_PX_PER_MIN = 1.2; // compress the quiet evening tail so midnight doesn't feel empty
  const TIME_COL = 88;
  const HEADER_H = 64;
  const TOP_PAD = 160; // enough breathing room so the user can scroll 5 AM clear of the sticky nav + Coming Up strip + room header chrome
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // Keep the busy part of the day at full scale; compress the empty evening
  // tail so the calendar reaches midnight without a huge white void.
  const lastEnd = useMemo(() => (allServices.length ? Math.max(...allServices.map((s) => s.end)) : 0), [allServices]);
  const compressAfter = useMemo(() => {
    const buffer = Math.max(nowMin + 60, lastEnd + 30);
    return Math.min(Math.max(buffer, DAY_SPAN * 0.5), DAY_SPAN);
  }, [nowMin, lastEnd]);

  const minToPx = useMemo(() => {
    const fullPx = compressAfter * PX_PER_MIN;
    return (m: number) => {
      if (m <= compressAfter) return m * PX_PER_MIN;
      return fullPx + (m - compressAfter) * TAIL_PX_PER_MIN;
    };
  }, [compressAfter]);

  // Inverse of minToPx — converts a Y offset inside the grid track (already
  // minus TOP_PAD) back into minutes since DAY_START. Snap to 15-min slots.
  const pxToMin = useMemo(() => {
    const fullPx = compressAfter * PX_PER_MIN;
    return (px: number) => {
      const raw = px <= fullPx ? px / PX_PER_MIN : compressAfter + (px - fullPx) / TAIL_PX_PER_MIN;
      const snapped = Math.round(raw / 15) * 15;
      return Math.max(0, Math.min(DAY_SPAN, snapped));
    };
  }, [compressAfter]);

  const trackHeight = TOP_PAD + minToPx(DAY_SPAN);

  // Drag-to-open state — while the operator drags across an empty stretch of a
  // room column we paint a live "draft" card in-place. On mouseup (or a plain
  // click) we hand the range to the parent, which opens the side panel in
  // Reservation mode by default.
  const [drag, setDrag] = useState<{ room: string; anchorMin: number; startMin: number; endMin: number } | null>(null);
  const dragDidMove = useRef(false);

  const blocksByRoom = useMemo(() => {
    const map: Record<string, Block[]> = {};
    for (const b of blocks) (map[b.room] ??= []).push(b);
    return map;
  }, [blocks]);

  const rangeOverlaps = (room: string, startMin: number, endMin: number, ignoreBlockId?: string) => {
    if (startMin >= endMin) return true;
    const s = allServices.some((sv) => sv.room === room && sv.start < endMin && sv.end > startMin);
    if (s) return true;
    return (blocksByRoom[room] ?? []).some((b) => b.id !== ignoreBlockId && b.start < endMin && b.end > startMin);
  };

  const beginDrag = (room: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!onOpenSlot) return;
    // Ignore clicks that started on a service card, existing block, or the draft.
    const target = e.target as HTMLElement;
    if (target.closest("[data-svc-card], [data-block-chip], [data-slot-draft]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top - TOP_PAD;
    const anchor = pxToMin(y);
    dragDidMove.current = false;
    setDrag({ room, anchorMin: anchor, startMin: anchor, endMin: anchor + 60 });
  };

  const moveDrag = (room: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!drag || drag.room !== room) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top - TOP_PAD;
    const m = pxToMin(y);
    const startMin = Math.min(drag.anchorMin, m);
    const endMin = Math.max(drag.anchorMin, m);
    if (endMin - startMin >= 15) dragDidMove.current = true;
    setDrag({ ...drag, startMin, endMin: Math.max(endMin, startMin + 15) });
  };

  const endDrag = (room: string) => {
    if (!drag || drag.room !== room || !onOpenSlot) return;
    const startMin = drag.startMin;
    const endMin = dragDidMove.current ? drag.endMin : drag.anchorMin + 60;
    setDrag(null);
    if (rangeOverlaps(room, startMin, endMin)) return;
    onOpenSlot(room, startMin, endMin);
  };

  // Drag existing blocks vertically within the same room column to reschedule.
  // Uses document-level pointer listeners so the drag survives mouse crossings
  // over the block card's own children. A short movement threshold distinguishes
  // a reschedule gesture from a plain click (which opens the panel).
  const [blockGhost, setBlockGhost] = useState<{ id: string; room: string; start: number; end: number; bad: boolean } | null>(null);
  const swallowBlockClickRef = useRef(false);
  const beginBlockMove = (b: Block, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!onMoveBlock) return;
    const originY = e.clientY;
    const dur = b.end - b.start;
    let moved = false;
    let curStart = b.start;
    let curEnd = b.end;
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - originY;
      const deltaMin = Math.round(dy / PX_PER_MIN / 15) * 15;
      if (Math.abs(deltaMin) >= 15) moved = true;
      let ns = Math.max(0, b.start + deltaMin);
      let ne = ns + dur;
      if (ne > DAY_SPAN) { ne = DAY_SPAN; ns = ne - dur; }
      curStart = ns;
      curEnd = ne;
      const bad = rangeOverlaps(b.room, ns, ne, b.id);
      setBlockGhost({ id: b.id, room: b.room, start: ns, end: ne, bad });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setBlockGhost(null);
      if (moved) {
        swallowBlockClickRef.current = true;
        setTimeout(() => { swallowBlockClickRef.current = false; }, 0);
        if (!rangeOverlaps(b.room, curStart, curEnd, b.id)) {
          onMoveBlock({ ...b, start: curStart, end: curEnd });
        }
      }
  };

  // Drag reservation cards vertically within their own room column to
  // reschedule. Same gesture semantics as block moves: >=15-min threshold
  // distinguishes a reschedule from a plain click. On drop we don't commit —
  // we hand the new time up so the parent can render a confirm bar.
  const [svcDrag, setSvcDrag] = useState<{ id: string; delta: number; bad: boolean } | null>(null);
  const swallowSvcClickRef = useRef(false);
  const beginServiceMove = (svc: Service, e: React.MouseEvent) => {
    if (!onRequestMoveService) return;
    e.stopPropagation();
    e.preventDefault();
    const originY = e.clientY;
    const dur = svc.end - svc.start;
    let moved = false;
    let curDelta = 0;
    let curBad = false;
    const checkBad = (ns: number, ne: number) =>
      allServices.some((o) => o.id !== svc.id && o.room === svc.room && o.start < ne && o.end > ns) ||
      (blocksByRoom[svc.room] ?? []).some((b) => b.start < ne && b.end > ns);
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - originY;
      const deltaMin = Math.round(dy / PX_PER_MIN / 15) * 15;
      if (Math.abs(deltaMin) >= 15) moved = true;
      let ns = Math.max(0, svc.start + deltaMin);
      let ne = ns + dur;
      if (ne > DAY_SPAN) { ne = DAY_SPAN; ns = ne - dur; }
      curDelta = ns - svc.start;
      curBad = checkBad(ns, ne);
      setSvcDrag({ id: svc.id, delta: curDelta, bad: curBad });
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setSvcDrag(null);
      if (moved) {
        swallowSvcClickRef.current = true;
        setTimeout(() => { swallowSvcClickRef.current = false; }, 0);
        const ns = svc.start + curDelta;
        const ne = svc.end + curDelta;
        if (curDelta !== 0 && !curBad) onRequestMoveService!(svc.id, ns, ne);
      }
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };






  // Group whispers by the service they touch, so the calendar can render
  // little living notes right above each card ("footprints", "broom", "tea").
  const whispersByService = useMemo(() => {
    const map: Record<string, Prompt[]> = {};
    for (const w of whispers) {
      if (!w.serviceId) continue;
      (map[w.serviceId] ??= []).push(w);
    }
    return map;
  }, [whispers]);

  const markerKinds: WhisperKind[] = ["notify", "checkin", "escort", "turnover", "setup", "elixir", "pickup", "reset", "payment"];

  // The one currently highlighted cue gets its own marker on the timeline,
  // separate from the session card, so check-ins and reset notifications read as
  // their own actions rather than decoration on top of a booking.
  const activeCue = useMemo(() => whispers.find((w) => w.id === activeCueId), [whispers, activeCueId]);

  const cueMarker = useMemo(() => {
    if (!activeCue?.serviceId) return null;
    const s = allServices.find((x) => x.id === activeCue.serviceId);
    if (!s || !markerKinds.includes(activeCue.kind)) return null;

    const roomServices = allServices.filter((x) => x.room === s.room).sort((a, b) => a.start - b.start);
    const prevInRoom = roomServices.find((s2, i, arr) => arr[i + 1]?.id === s.id);
    const idxInRoom = roomServices.findIndex((x) => x.id === s.id);
    const nextInRoom = idxInRoom >= 0 ? roomServices[idxInRoom + 1] ?? null : null;
    const guestServices = allServices.filter((x) => x.guest === s.guest).sort((a, b) => a.start - b.start);
    const guestIdx = guestServices.findIndex((x) => x.id === s.id);
    const prevGuest = guestIdx > 0 ? guestServices[guestIdx - 1] : null;

    let topMin: number;
    let after = false; // marker sits after the session card, not before
    switch (activeCue.kind) {
      case "checkin":
        topMin = s.start - 15;
        break;
      case "escort":
        // Give the "Walk in" marker meaningful breathing room above the card.
        topMin = s.start - 12;
        break;
      case "notify":
        topMin = s.start - 20;
        break;
      case "turnover":
      case "setup":
        topMin = prevInRoom ? prevInRoom.end + 1 : s.start - 10;
        break;
      case "pickup":
        topMin = prevGuest ? prevGuest.end + 1 : s.start - 5;
        break;
      case "elixir":
        topMin = prevGuest ? Math.round((prevGuest.end + s.start) / 2) : s.start - 10;
        break;
      case "reset":
        topMin = s.end + 2;
        after = true;
        break;
      case "payment":
        topMin = s.end + 2;
        after = true;
        break;
      default:
        topMin = s.start - 10;
    }
    topMin = Math.max(0, topMin);

    // If the next session in this room starts right after the current one,
    // an "after" marker would sit on top of it — nudge it up into the tail
    // of the current card. The highlighter background keeps it legible.
    const gapMin = nextInRoom ? nextInRoom.start - s.end : Infinity;
    const overlapsNext = after && gapMin < 6;

    const label =
      activeCue.kind === "reset"
        ? "" // notify is elegant — just verb + tiny highlight, no room name
        : activeCue.kind === "turnover" || activeCue.kind === "setup"
        ? s.room
        : activeCue.kind === "notify"
          ? s.practitioner.replace(/^(Dr\.?|Mr\.?|Ms\.?)\s+/i, "").split(/\s+/)[0]
          : firstName(s.guest);

    const verb = ({
      notify: "Notify",
      checkin: "Check in",
      escort: "Walk in",
      turnover: "Reset",
      reset: "Reset room",
      setup: "Set up",
      elixir: "Tea for",
      pickup: "Pick up",
      payment: "Checkout",
      message: "",
      handoff: "",
      conflict: "",
    } as Record<WhisperKind, string>)[activeCue.kind];


    return { topMin, label, verb, after, overlapsNext, kind: activeCue.kind, room: s.room, gc: roomColor(s.room), serviceId: s.id };
  }, [activeCue]);

  // After-markers (checkout, reset) must sit BELOW the actual rendered card,
  // not just below the card's time-block. Cards use minHeight and grow when
  // notes push content down, so a time-based topMin can land inside the card.
  // Measure the referenced card's DOM bottom after render and use that.
  const [afterTopPx, setAfterTopPx] = useState<number | null>(null);
  useEffect(() => {
    // Reset immediately so stale positions from a previously-active cue
    // (often much further down the day) never leak into the new marker's
    // paint or the scroll-into-view target.
    setAfterTopPx(null);
    if (!cueMarker?.after || !cueMarker.serviceId) return;
    const el = document.getElementById(`svc-${cueMarker.serviceId}`);
    if (!el) return;
    const measure = () => setAfterTopPx(el.offsetTop + el.offsetHeight + 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cueMarker?.after, cueMarker?.serviceId]);


  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = 5; h <= 23; h++) out.push(h);
    return out;
  }, []);

  const hourTops = useMemo(() => hours.map((h) => TOP_PAD + minToPx(h * 60 - DAY_START)), [hours, minToPx]);
  const quarterTops = useMemo(() => {
    const out: number[] = [];
    for (let m = 15; m <= compressAfter; m += 15) {
      if (m % 60 !== 0) out.push(TOP_PAD + minToPx(m));
    }
    return out;
  }, [compressAfter, minToPx]);

  const nowTop = TOP_PAD + minToPx(nowMin);

  // On first load, scroll the calendar so the current time is visible near the
  // top of the viewport instead of showing 9 AM when it's mid-afternoon.
  // If a Coming Up cue is active, the parent handles scrolling to the action
  // marker; this fallback only runs when there is no cue to follow.
  useEffect(() => {
    if (scrolledRef.current || !gridRef.current || activeCueId) return;
    scrolledRef.current = true;
    const rect = gridRef.current.getBoundingClientRect();
    const gridTop = rect.top + window.scrollY;
    // Offset for sticky header (44) + sticky Coming Up strip (~88) + room headers + top bounce.
    const target = gridTop + nowTop - 180;
    smoothScrollTo(Math.max(0, target), 1400);
  }, [nowTop, activeCueId]);


  return (
    <div className="border-y border-black/[0.08] bg-white">
      {/* Room headers — stick under the top bar + Coming Up strip while the calendar scrolls */}
      <div
        className="sticky z-10 flex border-b border-black/[0.08] bg-white/95 backdrop-blur-md"
        style={{ height: HEADER_H, top: 136 }}
      >
        <div
          className="flex shrink-0 items-center justify-end border-r border-black/[0.06] pr-4 text-[11px] uppercase tracking-[0.14em] text-black/45"
          style={{ width: TIME_COL, fontFamily: MONO }}
        >
          Time
        </div>
        {ROOMS.map((room, idx) => {
          const count = allServices.filter((s) => s.room === room).length;
          const rc = roomColor(room);
          const isPinned = activeRoom === room;
          const isCueRoom = cueRoom === room;
          const isActive = isPinned || isCueRoom;
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
                  <Highlight color={tint(rc, isPinned ? 0.55 : 0.42)}>{room}</Highlight>
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
      <div ref={gridRef} className="flex" style={{ height: trackHeight }}>
        {/* Time column */}
        <div
          className="relative shrink-0 border-r border-black/[0.06]"
          style={{ width: TIME_COL }}
        >
          {hours.map((h, i) => {
            const top = hourTops[i];
            return (
              <div
                key={h}
                className="absolute right-3 -translate-y-1/2 text-[13px] font-semibold text-black/55"
                style={{ top, fontFamily: MONO }}
              >
                {fmt(h * 60 - DAY_START)}
              </div>
            );
          })}
          <div
            className="absolute right-2 -translate-y-1/2 text-[9.5px] font-semibold tracking-[0.14em]"
            style={{ top: nowTop, color: ACCENT, fontFamily: MONO, opacity: 0.35 }}
          >
            NOW
          </div>
        </div>

        {/* Room columns */}
        {ROOMS.map((room, idx) => {
          const services = allServices.filter((s) => s.room === room);
          const roomBlocks = blocksByRoom[room] ?? [];
          const rc = roomColor(room);
          const activeDrag = drag && drag.room === room ? drag : null;
          const activeDraft = draft && !draft.editingBlockId && draft.room === room ? draft : null;
          const dragBad = activeDrag ? rangeOverlaps(room, activeDrag.startMin, activeDrag.endMin) : false;

          return (
          <div
              key={room}
              className={`relative min-w-0 flex-1 select-none bg-white ${
                idx < ROOMS.length - 1 ? "border-r border-black/[0.06]" : ""
              }`}
              onMouseDown={(e) => beginDrag(room, e)}
              onMouseMove={(e) => moveDrag(room, e)}
              onMouseUp={() => endDrag(room)}
              onMouseLeave={() => { if (drag && drag.room === room) endDrag(room); }}
            >
              {/* Hour lines */}
              {hourTops.map((top, i) => (
                <div
                  key={`h-${i}`}
                  className="pointer-events-none absolute inset-x-0 h-px"
                  style={{ top, background: "rgba(0,0,0,0.07)" }}
                />
              ))}
              {/* 15-minute lines */}
              {quarterTops.map((top, i) => (
                <div
                  key={`q-${i}`}
                  className="pointer-events-none absolute inset-x-0 h-px"
                  style={{ top, background: "rgba(0,0,0,0.03)" }}
                />
              ))}
              {/* Now line — almost invisible */}
              <div
                className="pointer-events-none absolute inset-x-0 z-10 h-px"
                style={{ top: nowTop, background: ACCENT, opacity: 0.09 }}
              />

              {/* Active cue marker — lives in the column as its own element,
                  separate from the session card, so check-ins/reset notifications feel
                  like their own actions rather than decoration on a booking. */}
              {cueMarker && cueMarker.room === room && (() => {
                const Icon = WHISPER_ICON[cueMarker.kind];
                const wash = `color-mix(in oklab, ${cueMarker.gc} 34%, white)`;
                const topPx = cueMarker.after && afterTopPx != null
                  ? afterTopPx
                  : TOP_PAD + minToPx(cueMarker.topMin);
                const shift = cueMarker.overlapsNext && afterTopPx == null ? "translateY(-28px)" : undefined;
                const isReset = cueMarker.kind === "reset";
                return (
                  <div
                    id="active-cue-marker"
                    className="pointer-events-none absolute inset-x-0 z-30"
                    style={{ top: topPx, transform: shift }}
                  >
                    {isReset ? (
                      // Elegant, minimal — a thin marker-pen underline behind
                      // just the verb, no room name, no card chrome.
                      <div className="mx-3 flex w-fit items-center gap-1.5">
                        <Icon size={13} strokeWidth={1.75} style={{ color: cueMarker.gc, flexShrink: 0 }} />
                        <span
                          className="text-[12px] font-medium tracking-tight text-black/85"
                          style={{
                            backgroundImage: `linear-gradient(transparent 62%, ${wash} 62%, ${wash} 96%, transparent 96%)`,
                            padding: "0 3px",
                          }}
                        >
                          {cueMarker.verb}
                        </span>
                      </div>
                    ) : (
                      <div className="mx-2 flex w-fit items-center gap-2 px-2 py-1"
                        style={{
                          background: `linear-gradient(178deg, transparent 8%, ${wash} 14%, ${wash} 92%, transparent 98%)`,
                          borderRadius: "3px 7px 4px 8px",
                        }}
                      >
                        <Icon size={16} strokeWidth={2} style={{ color: cueMarker.gc, flexShrink: 0 }} />
                        <span className="text-[13px] font-semibold tracking-tight text-black">
                          {cueMarker.verb}
                          {cueMarker.label && (
                            <>
                              <span className="mx-1.5 text-black/40">·</span>
                              {cueMarker.label}
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}




              {services.map((s) => {
                const top = TOP_PAD + minToPx(s.start);
                const height = minToPx(s.end) - minToPx(s.start);
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

                const baseShadow = isLive
                  ? `2px 3px 0 -1px rgba(15,23,42,0.05), 4px 8px 18px -10px ${tint(gc, 0.45)}, 0 0 0 1px ${tint(gc, 0.15)}`
                  : isRequest
                    ? "2px 3px 0 -1px rgba(15,23,42,0.05), 4px 8px 16px -10px rgba(217,119,6,0.35)"
                    : "2px 3px 0 -1px rgba(15,23,42,0.04), 3px 5px 12px -8px rgba(15,23,42,0.14)";
                const hoverShadow = `2px 4px 0 -1px rgba(15,23,42,0.05), 8px 14px 28px -12px ${tint(gc, 0.26)}, 0 0 0 1px ${tint(gc, 0.18)}`;

                // Only render a badge for the CURRENTLY shown notification when
                // it is not a pre-session action (those now live as their own
                // marker on the timeline, separate from the session card).
                const activeWhisper = (whispersByService[s.id] ?? []).find(
                  (w) => w.id === activeCueId,
                );
                const badgeWhisper = activeWhisper && !markerKinds.includes(activeWhisper.kind) ? activeWhisper : null;
              {/* Prep strips — a soft "room open for setup" cushion before
                  every reservation, so it's clear the room isn't free right
                  up to the session start. Non-interactive. */}
              {services.map((s) => {
                const prepMin = setupMinutesFor(s.service);
                if (prepMin <= 0) return null;
                const prepStart = Math.max(0, s.start - prepMin);
                const top = TOP_PAD + minToPx(prepStart);
                const height = minToPx(s.start) - minToPx(prepStart);
                return (
                  <div
                    key={`prep-${s.id}`}
                    className="pointer-events-none absolute inset-x-2 z-[5] rounded-[6px] border-l-2 border-dashed"
                    style={{
                      top,
                      height,
                      borderColor: tint(rc, 0.35),
                      background: `repeating-linear-gradient(135deg, ${tint(rc, 0.10)} 0 6px, transparent 6px 12px)`,
                    }}
                  >
                    <div
                      className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{ color: tint(rc, 0.55), fontFamily: MONO }}
                    >
                      Prep · {prepMin}m
                    </div>
                  </div>
                );
              })}




                const isDragging = svcDrag?.id === s.id;
                const dragTx = isDragging ? svcDrag!.delta * PX_PER_MIN : 0;
                const dragBadThis = isDragging && svcDrag!.bad;
                return (
                  <div
                    key={s.id}
                    id={`svc-${s.id}`}
                    data-svc-card
                    className={`group absolute inset-x-0 flex flex-col rounded-none bg-white transition-[box-shadow] duration-200 ease-out will-change-transform hover:z-20 ${isDragging ? "cursor-grabbing z-30" : onRequestMoveService ? "cursor-grab hover:-translate-y-[1px]" : "cursor-pointer"}`}
                    style={{
                      top: top + 1,
                      minHeight: Math.max(height - 2, 96),
                      boxShadow: dragBadThis
                        ? `0 0 0 1.5px rgba(220,38,38,0.6), 8px 14px 28px -12px rgba(220,38,38,0.35)`
                        : baseShadow,
                      opacity: isPast ? 0.9 : 1,
                      transform: isDragging ? `translateY(${dragTx}px)` : undefined,
                      transition: isDragging ? "box-shadow 120ms ease-out" : undefined,
                    }}
                    onMouseEnter={(e) => {
                      if (isDragging) return;
                      e.currentTarget.style.boxShadow = hoverShadow;
                    }}
                    onMouseLeave={(e) => {
                      if (isDragging) return;
                      e.currentTarget.style.boxShadow = baseShadow;
                    }}
                    onMouseDown={(e) => beginServiceMove(s, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (swallowSvcClickRef.current) return;
                      onOpenService?.(s.id);
                    }}
                  >
                    {/* Live time pill while dragging */}
                    {isDragging && (
                      <div
                        className="pointer-events-none absolute -top-3 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-sm px-2 py-1 text-[11px] font-semibold tabular-nums shadow"
                        style={{
                          background: dragBadThis ? "#dc2626" : "#0a0a0a",
                          color: "#fff",
                          fontFamily: MONO,
                        }}
                      >
                        {dragBadThis ? "Overlaps" : `→ ${fmt(s.start + svcDrag!.delta)} – ${fmt(s.end + svcDrag!.delta)}`}
                      </div>
                    )}

                    {/* Top color rail — thinner, high-chroma, thickens subtly on hover */}
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-[2px] transition-[height,opacity] duration-200 ease-out group-hover:h-[3px]"
                      style={{
                        background: isRequest
                          ? "repeating-linear-gradient(to right, #d97706 0 6px, transparent 6px 10px)"
                          : gc,
                      }}
                    />




                    {/* Badge whisper — for non-gap kinds (payment, message, handoff, conflict)
                        floats a small dot in the top-right of the card. */}
                    {badgeWhisper && (() => {
                      const WIcon = WHISPER_ICON[badgeWhisper.kind];
                      return (
                        <span
                          aria-hidden
                          
                          className="pointer-events-none absolute -top-3 right-1.5 z-20 grid h-6 w-6 place-items-center rounded-full bg-white"
                          style={{
                            color: gc,
                            boxShadow: `0 2px 6px -1px ${tint(gc, 0.35)}, 0 0 0 2px ${tint(gc, 0.22)}`,
                          }}
                        >
                          <WIcon size={13} strokeWidth={2.25} />
                          {badgeWhisper.urgent && (
                            <span
                              aria-hidden
                              className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 ring-1 ring-white"
                            />
                          )}
                        </span>
                      );
                    })()}



                    {/* Soft chroma wash that fades in on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-70"
                      style={{
                        background: `linear-gradient(180deg, ${tint(gc, 0.95)} 0%, rgba(255,255,255,0) 50%)`,
                      }}
                    />



                    <div className="relative z-10 flex flex-1 flex-col px-3 pt-3 pb-2.5">
                      {/* Time — from on one line, to on the next, so it reads calmly */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="whitespace-nowrap text-[17px] font-semibold tabular-nums leading-[1.15] tracking-tight"
                          style={{ color: metaColor, fontFamily: MONO }}
                        >
                          <div>{fmt(s.start)}</div>
                          <div style={{ opacity: 0.55 }}>{fmt(s.end)}</div>
                        </div>
                        <div
                          className="shrink-0 whitespace-nowrap text-[12px] font-semibold tabular-nums tracking-[0.08em]"
                          style={{ color: metaColor, fontFamily: MONO, opacity: 0.65 }}
                        >
                          {duration}m
                        </div>
                      </div>

                      {/* Room — the space this session happens in */}
                      <div
                        className="mt-2.5 text-[21px] font-semibold leading-[1.05] tracking-[-0.025em]"
                        style={{ color: "#0a0a0a", fontFamily: DISPLAY }}
                      >
                        {s.room}
                      </div>

                      {/* Service — the offering, in the room's chroma */}
                      <div
                        className="mt-1 text-[17px] font-semibold leading-[1.15] tracking-[-0.015em]"
                        style={{ color: serviceColor, fontFamily: DISPLAY }}
                      >
                        {s.service}
                      </div>

                      {/* for {guest} */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        {isLive && (
                          <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                            <span
                              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                              style={{ background: gc }}
                            />
                            <span
                              className="relative inline-flex h-2.5 w-2.5 rounded-full"
                              style={{ background: gc }}
                            />
                          </span>
                        )}
                        <span
                          className="shrink-0 text-[14px] italic leading-tight"
                          style={{ color: metaColor, fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif", opacity: 0.7 }}
                        >
                          for
                        </span>
                        <div
                          className="truncate text-[16px] font-semibold leading-tight tracking-[-0.005em]"
                          style={{ color: nameColor, fontFamily: DISPLAY }}
                        >
                          {s.guest}
                          {s.partySize ? ` +${s.partySize - 1}` : ""}
                        </div>
                        {isRequest && (
                          <span
                            className="ml-auto rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                            style={{ color: "#b45309", background: "rgba(217,119,6,0.10)", fontFamily: MONO }}
                          >
                            Request
                          </span>
                        )}
                      </div>

                      {/* with {practitioner} — right justified */}
                      <div className="mt-2 flex items-center justify-end gap-1.5">
                        <span
                          className="shrink-0 text-[14px] italic leading-tight"
                          style={{ color: metaColor, fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif", opacity: 0.7 }}
                        >
                          with
                        </span>
                        <span
                          className="truncate text-[14.5px] font-medium leading-tight"
                          style={{ color: metaColor }}
                          
                        >
                          {s.practitioner}
                        </span>
                        <span
                          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px] font-bold"
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
                      {(orchestration || plainNote) && height > 120 && (
                        <div className="mt-auto pt-2.5">
                          {orchestration ? (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="rounded-[3px] px-1.5 py-0.5 text-[12px] font-bold tabular-nums leading-none"
                                style={{
                                  background: tint(gc, 0.18),
                                  color: "#1a1a1a",
                                  fontFamily: MONO,
                                }}
                              >
                                {orchestration.step}
                              </span>
                              <span
                                className="truncate text-[13px] font-medium leading-tight"
                                style={{ color: metaColor }}
                                
                              >
                                {orchestration.title}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="truncate text-[13px] italic leading-snug"
                              style={{ color: metaColor }}
                              
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

              {/* Unified slot card — used for committed room blocks, live drag
                  previews, and the pinned draft while the side panel is open.
                  Same typographic scale as reservation cards: large time top-
                  left, big room name, third-line label (reason for a block, or
                  "New reservation" for an in-flight draft). */}
              {(() => {
                const renderSlotCard = (opts: {
                  key: string;
                  startMin: number;
                  endMin: number;
                  headline: string;   // room name (kept prominent, matches reservation layout)
                  subline: string;    // reason or "New reservation"
                  bad?: boolean;
                  past?: boolean;
                  pending?: boolean;  // preview / not yet committed
                  draggable?: boolean;
                  hidden?: boolean;
                  onClick?: (e: React.MouseEvent) => void;
                  onMouseDown?: (e: React.MouseEvent) => void;
                }) => {
                  const bTop = TOP_PAD + minToPx(opts.startMin);
                  const bH = Math.max(minToPx(opts.endMin) - minToPx(opts.startMin), 96);
                  const rail = opts.bad ? "#dc2626" : rc;
                  const duration = Math.round(opts.endMin - opts.startMin);
                  const subColor = opts.bad ? "#7f1d1d" : rc;
                  if (opts.hidden) return null;
                  return (
                    <div
                      key={opts.key}
                      data-slot-draft={opts.pending ? "" : undefined}
                      data-block-chip={opts.pending ? undefined : ""}
                      className={`absolute inset-x-0 z-[6] flex flex-col rounded-none bg-white ${opts.pending ? "pointer-events-none" : opts.draggable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
                      style={{
                        top: bTop + 1,
                        minHeight: bH - 2,
                        boxShadow: opts.pending
                          ? `0 0 0 1px ${opts.bad ? "rgba(220,38,38,0.55)" : tint(rail, 0.55)}, 0 8px 24px -12px ${tint(rail, 0.35)}`
                          : "2px 3px 0 -1px rgba(15,23,42,0.04), 3px 5px 12px -8px rgba(15,23,42,0.14)",
                        opacity: opts.past ? 0.6 : 1,
                      }}
                      onMouseDown={opts.onMouseDown ?? ((e) => e.stopPropagation())}
                      onClick={opts.onClick}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-x-0 top-0 h-[2px]"
                        style={{ background: rail }}
                      />
                      <div className="relative z-10 flex flex-1 flex-col px-3 pt-3 pb-2.5">
                        {/* Time — same scale as reservation card */}
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="whitespace-nowrap text-[17px] font-semibold tabular-nums leading-[1.15] tracking-tight"
                            style={{ color: "#2a2a2a", fontFamily: MONO }}
                          >
                            <div>{fmt(opts.startMin)}</div>
                            <div style={{ opacity: 0.55 }}>{fmt(opts.endMin)}</div>
                          </div>
                          <div
                            className="shrink-0 whitespace-nowrap text-[12px] font-semibold tabular-nums tracking-[0.08em]"
                            style={{ color: "#2a2a2a", fontFamily: MONO, opacity: 0.65 }}
                          >
                            {duration}m
                          </div>
                        </div>
                        {/* Room name — same weight and size as reservation cards */}
                        <div
                          className="mt-2.5 text-[21px] font-semibold leading-[1.05] tracking-[-0.025em]"
                          style={{ color: "#0a0a0a", fontFamily: DISPLAY }}
                        >
                          {opts.headline}
                        </div>
                        {/* Third line — reason or draft label, in the room's chroma */}
                        <div
                          className="mt-1 text-[17px] font-semibold leading-[1.15] tracking-[-0.015em]"
                          style={{ color: subColor, fontFamily: DISPLAY }}
                        >
                          {opts.subline}
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {roomBlocks.map((b) => {
                      const beingMoved = blockGhost?.id === b.id;
                      return renderSlotCard({
                        key: b.id,
                        startMin: b.start,
                        endMin: b.end,
                        headline: b.room,
                        subline: b.reason,
                        past: b.end <= nowMin,
                        draggable: !!onMoveBlock,
                        hidden: beingMoved,
                        onMouseDown: (e) => beginBlockMove(b, e),
                        onClick: (e) => {
                          e.stopPropagation();
                          if (swallowBlockClickRef.current) return;
                          onOpenSlot?.(b.room, b.start, b.end, b.id);
                        },
                      });
                    })}

                    {blockGhost && blockGhost.room === room &&
                      renderSlotCard({
                        key: "block-ghost",
                        startMin: blockGhost.start,
                        endMin: blockGhost.end,
                        headline: room,
                        subline: blockGhost.bad ? "Overlaps a session" : "Reschedule block",
                        bad: blockGhost.bad,
                        pending: true,
                      })}


                    {activeDrag && activeDrag.endMin > activeDrag.startMin &&
                      renderSlotCard({
                        key: "drag-preview",
                        startMin: activeDrag.startMin,
                        endMin: activeDrag.endMin,
                        headline: room,
                        subline: dragBad ? "Overlaps a session" : "New reservation",
                        bad: dragBad,
                        pending: true,
                      })}

                    {activeDraft &&
                      renderSlotCard({
                        key: "draft-preview",
                        startMin: activeDraft.start,
                        endMin: activeDraft.end,
                        headline: room,
                        subline: activeDraft.mode === "block" ? "New room block" : "New reservation",
                        pending: true,
                      })}
                  </>
                );
              })()}
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

function FocusOverlay({ cue, onClose }: { cue: Prompt; onClose: () => void }) {
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
      case "checkin":
        base.push(
          { icon: ClipboardCheck, label: service ? `Greet ${service.guest} at the desk` : "Greet guest at the desk", hint: "Warm welcome, offer water, mark arrived." },
          { icon: FileText, label: "Confirm waiver on file", hint: "If missing, present tablet before session." },
          { icon: DoorOpen, label: service ? `Escort to ${service.room} when cued` : "Escort to room when cued", hint: "Wait for practitioner ready signal." },
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
          { icon: Brush, label: "Reset room", hint: "Sweep, refresh, and make the space feel new again." },
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
      case "notify":
        base.push(
          { icon: Bell, label: service ? `Give ${service.practitioner} a heads-up` : "Notify practitioner", hint: service ? `${service.service} at ${fmt(service.start)} · ${service.room}` : "Quiet heads-up before session" },
          { icon: Sparkles, label: "Confirm room is ready", hint: service ? `${service.room} — props, linens, ventilation` : "Room ready" },
          { icon: ClipboardCheck, label: "Check guest is here", hint: service ? `${service.guest} — arrival window open` : "Confirm arrival" },
        );
        break;
      case "pickup":
        base.push(
          { icon: DoorOpen, label: "Collect guest from ending room", hint: service ? `Meet at door as ${service.service} closes` : "Meet at door" },
          { icon: Footprints, label: service ? `Walk to ${service.room}` : "Walk to next room", hint: "Unhurried pace, offer water on the way." },
          { icon: Sparkles, label: "Hand off to next practitioner", hint: service ? `${service.practitioner} — ready to begin` : "Signal ready" },
        );
        break;
      case "handoff":
        base.push(
          { icon: Waves, label: "Notify practitioner", hint: service ? `${service.practitioner} — short turnover` : "Short turnover heads-up" },
          { icon: Brush, label: "Reset room", hint: "Quick sweep and refresh between guests." },
          { icon: UserCheck, label: "Guide next guest in", hint: "Signal ready to front desk." },
        );
        break;
      case "elixir":
        base.push(
          { icon: Coffee, label: "Prepare the pause", hint: "Warm tea, water, light snack if wanted." },
          { icon: DoorOpen, label: "Show guest to lounge", hint: service ? `Between ${service.service} legs` : "Between services" },
          { icon: CalendarRange, label: "Confirm next room", hint: service ? `Next: ${service.room}` : "Confirm next room" },
        );
        break;
      case "payment":
        base.push(
          { icon: CreditCard, label: "Open checkout", hint: service ? `${service.guest} · ${formatCurrency(PRICES[service.id] ?? 0)}` : "Open checkout" },
          { icon: MessageSquare, label: "Send payment link", hint: "Text/email secure link before guest leaves." },
          { icon: Check, label: "Mark as paid", hint: "Update once payment clears." },
        );
        break;
      case "conflict":
        base.push(
          { icon: AlertTriangle, label: "Review overlap", hint: service ? `${service.room} · ${fmt(service.start)}` : "Review overlap" },
          { icon: UserCheck, label: "Call affected guest", hint: "Offer reschedule or alternate room." },
          { icon: CalendarRange, label: "Update booking", hint: "Move or split the reservation." },
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

// ------------------------------------------------------------------
// Reservation detail — side panel opened from a timeline card
// ------------------------------------------------------------------

function ReservationPanel({
  service,
  onClose,
  onCancel,
}: {
  service: Service | null;
  onClose: () => void;
  onCancel?: (id: string) => void;
}) {
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  useEffect(() => { if (!service) setConfirmingCancel(false); }, [service]);
  // Trap Esc to close
  useEffect(() => {
    if (!service) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [service, onClose]);

  const open = !!service;
  const s = service;
  const rc = s ? roomColor(s.room) : ACCENT;
  const paid = s ? SERVICE_PAID[s.id] ?? false : false;
  const price = s ? PRICES[s.id] ?? 0 : 0;
  const guest = s ? GUESTS[s.guest] : undefined;

  // Orchestration = the guest's full ordered set of services today.
  // The current leg is this service's index within that set (1-based).
  const journey = useMemo(() => {
    if (!s) return [] as Service[];
    return SERVICES
      .filter((x) => x.guest === s.guest)
      .sort((a, b) => a.start - b.start);
  }, [s]);
  const legIndex = s ? journey.findIndex((x) => x.id === s.id) : -1;
  const isOrchestration = journey.length > 1;

  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={s ? `${s.guest} — ${s.service}` : "Reservation"}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: DISPLAY, color: INK }}
      >
        {!s ? null : (
          <>
            {/* Room color rail — matches the card it opened from */}
            <div className="h-[3px] w-full shrink-0" style={{ background: rc }} />

            {/* Header */}
            <div className="flex items-start gap-4 px-7 pt-6 pb-5">
              <Avatar name={s.guest} color={rc} />
              <div className="min-w-0 flex-1">
                <div
                  className="text-[10.5px] uppercase tracking-[0.16em] text-black/45"
                  style={{ fontFamily: MONO }}
                >
                  Reservation
                </div>
                <h2 className="mt-1 truncate text-[24px] font-semibold tracking-[-0.02em] text-black">
                  {s.guest}
                  {s.partySize ? (
                    <span
                      className="ml-2 text-[13px] font-medium text-black/45"
                      style={{ fontFamily: MONO }}
                    >
                      +{s.partySize - 1}
                    </span>
                  ) : null}
                </h2>
                <div
                  className="mt-1 text-[16px] font-semibold leading-tight tracking-tight"
                  style={{ color: rc }}
                >
                  {s.service}
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

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8">
              {/* Fact list */}
              <dl className="grid grid-cols-[110px_1fr] gap-y-3 border-t border-black/[0.08] py-5 text-[14px]">
                <PanelRow label="Room">
                  <span className="font-semibold" style={{ color: rc }}>{s.room}</span>
                </PanelRow>
                <PanelRow label="Practitioner">
                  <button
                    type="button"
                    onClick={() => openPractitionerPanelByName(s.practitioner)}
                    className="font-semibold text-black underline-offset-4 hover:underline"
                  >
                    {s.practitioner}
                  </button>
                </PanelRow>
                <PanelRow label="Time">
                  <span className="font-semibold tabular-nums text-black" style={{ fontFamily: MONO }}>
                    {fmt(s.start)} – {fmt(s.end)}
                  </span>
                </PanelRow>
                <PanelRow label="Duration">
                  <span className="font-semibold tabular-nums text-black" style={{ fontFamily: MONO }}>
                    {Math.round(s.end - s.start)} min
                  </span>
                </PanelRow>
                <PanelRow label="Status">
                  <StatusPill status={s.status} guestHex={rc} />
                </PanelRow>
              </dl>

              {/* Payment */}
              <PanelSection
                eyebrow="Payment"
                trailing={
                  <span className="tabular-nums text-[15px] font-semibold" style={{ fontFamily: MONO }}>
                    ${price}
                  </span>
                }
              >
                {paid ? (
                  <div className="flex items-center gap-2 text-[13.5px] text-black/70">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check size={13} strokeWidth={2.5} />
                    </span>
                    Paid in full · card on file
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-[13.5px]" style={{ color: ACCENT }}>
                      <span
                        className="grid h-6 w-6 place-items-center rounded-full"
                        style={{ background: tint(ACCENT, 0.12) }}
                      >
                        <CreditCard size={13} strokeWidth={2} />
                      </span>
                      Outstanding — send guest a payment link
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ background: ACCENT }}
                      >
                        Send payment link
                        <ExternalLink size={13} strokeWidth={2.25} />
                      </button>
                      <button
                        className="inline-flex items-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] hover:text-black"
                        
                      >
                        <Copy size={13} strokeWidth={2} />
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </PanelSection>

              {/* Orchestration */}
              {isOrchestration && (
                <PanelSection
                  eyebrow="Journey"
                  trailing={
                    <span
                      className="rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums leading-none"
                      style={{ background: tint(rc, 0.18), color: "#1a1a1a", fontFamily: MONO }}
                    >
                      Leg {legIndex + 1}/{journey.length}
                    </span>
                  }
                >
                  <ol className="space-y-2">
                    {journey.map((leg, i) => {
                      const legColor = roomColor(leg.room);
                      const isCurrent = leg.id === s.id;
                      return (
                        <li
                          key={leg.id}
                          className="flex items-start gap-3 rounded-[8px] px-2.5 py-2"
                          style={{
                            background: isCurrent ? tint(rc, 0.08) : "transparent",
                          }}
                        >
                          <span
                            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums"
                            style={{
                              background: isCurrent ? legColor : tint(legColor, 0.16),
                              color: isCurrent ? "#fff" : "#1a1a1a",
                              fontFamily: MONO,
                            }}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <div
                                className="truncate text-[14px] font-semibold leading-tight text-black"
                              >
                                {leg.service}
                              </div>
                              <div
                                className="shrink-0 text-[11.5px] tabular-nums text-black/55"
                                style={{ fontFamily: MONO }}
                              >
                                {fmt(leg.start)}
                              </div>
                            </div>
                            <div
                              className="mt-0.5 truncate text-[12px]"
                              style={{ color: legColor, fontFamily: MONO }}
                            >
                              {leg.room}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </PanelSection>
              )}

              {/* Contact */}
              {guest && (
                <PanelSection eyebrow="Contact">
                  <div className="space-y-1.5 text-[13.5px]">
                    <a
                      href={`tel:${guest.phone.replace(/\s+/g, "")}`}
                      className="flex items-center gap-2.5 text-black/75 hover:text-black"
                    >
                      <Phone size={14} strokeWidth={2} className="text-black/40" />
                      <span className="tabular-nums" style={{ fontFamily: MONO }}>
                        {guest.phone}
                      </span>
                    </a>
                    <a
                      href={`mailto:${guest.email}`}
                      className="flex items-center gap-2.5 text-black/75 hover:text-black"
                    >
                      <Mail size={14} strokeWidth={2} className="text-black/40" />
                      <span>{guest.email}</span>
                    </a>
                    {guest.pronouns && (
                      <div className="pt-1 text-[12px] text-black/50" style={{ fontFamily: MONO }}>
                        {guest.pronouns}
                      </div>
                    )}
                  </div>
                </PanelSection>
              )}

              {/* Notes */}
              {guest?.notes && (
                <PanelSection eyebrow="Notes">
                  <p className="text-[13.5px] leading-relaxed text-black/75">{guest.notes}</p>
                </PanelSection>
              )}

              {/* Session protocol — cautions about the SERVICE itself */}
              {(() => {
                const protocols = getProtocols(s.service);
                const sevMeta = {
                  block:   { label: "Blocker",  bg: "bg-rose-50/70",   border: "border-rose-200/70",   dot: "bg-rose-500",   text: "text-rose-900",   chipBg: "bg-rose-100",    chipText: "text-rose-700" },
                  confirm: { label: "Confirm",  bg: "bg-amber-50/60",  border: "border-amber-200/70",  dot: "bg-amber-500",  text: "text-amber-900",  chipBg: "bg-amber-100",   chipText: "text-amber-700" },
                  brief:   { label: "Brief",    bg: "bg-sky-50/60",    border: "border-sky-200/70",    dot: "bg-sky-500",    text: "text-sky-900",    chipBg: "bg-sky-100",     chipText: "text-sky-700" },
                } as const;
                return (
                  <PanelSection
                    eyebrow="Session protocol"
                    trailing={
                      protocols.length > 0 ? (
                        <span
                          className="text-[11px] text-black/45"
                          style={{ fontFamily: MONO }}
                        >
                          {protocols.length} item{protocols.length === 1 ? "" : "s"}
                        </span>
                      ) : null
                    }
                  >
                    <p className="mb-2.5 text-[12px] leading-snug text-black/55">
                      What to brief or confirm for <span className="text-black/75">{s.service}</span>.
                    </p>
                    {protocols.length > 0 ? (
                      <ul className="space-y-2">
                        {protocols.map((p, i) => {
                          const m = sevMeta[p.severity];
                          return (
                            <li
                              key={i}
                              className={`flex items-start gap-2.5 rounded-[8px] border ${m.border} ${m.bg} px-3 py-2.5`}
                            >
                              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${m.dot}`} />
                              <div className="min-w-0 flex-1">
                                <div className={`text-[13px] leading-snug ${m.text}`}>{p.text}</div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full ${m.chipBg} ${m.chipText} px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em]`}
                              >
                                {m.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="text-[13px] text-black/50">No protocol on file for this service.</p>
                    )}
                  </PanelSection>
                );
              })()}

              {/* Client disclosures — what the CLIENT has shared */}
              <PanelSection
                eyebrow="Client disclosures"
                trailing={
                  guest?.contraindications && guest.contraindications.length > 0 ? (
                    <span
                      className="text-[11px] text-black/45"
                      style={{ fontFamily: MONO }}
                    >
                      shared by {firstName(s.guest)}
                    </span>
                  ) : null
                }
              >
                {guest?.contraindications && guest.contraindications.length > 0 ? (
                  <ul className="space-y-1.5">
                    {guest.contraindications.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 rounded-[8px] border border-black/[0.06] bg-black/[0.015] px-3 py-2 text-[13px] text-black/80"
                      >
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black/30" />
                        <span className="leading-snug">{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[13px] text-black/50">
                    Nothing shared yet — intake form pending.
                  </p>
                )}
              </PanelSection>

              {/* Waiver — auto-generated from protocol + disclosures */}
              {(() => {
                const protocols = getProtocols(s.service);
                const disclosures = guest?.contraindications ?? [];
                const clauseCount = protocols.length + disclosures.length;
                return (
                  <PanelSection
                    eyebrow="Waiver"
                    trailing={
                      <span
                        className="text-[11px] text-black/45"
                        style={{ fontFamily: MONO }}
                      >
                        auto · {clauseCount} clause{clauseCount === 1 ? "" : "s"}
                      </span>
                    }
                  >
                    <p className="mb-2.5 text-[12px] leading-snug text-black/55">
                      Composed from this session's protocol and {firstName(s.guest)}'s disclosures.
                    </p>
                    {guest?.waiverSignedOn ? (
                      <div className="flex items-center justify-between gap-3 rounded-[8px] border border-black/[0.08] px-3.5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                            <FileText size={13} strokeWidth={2.25} />
                          </span>
                          <div>
                            <div className="text-[13.5px] font-semibold text-black">Signed</div>
                            <div className="text-[11.5px] text-black/50" style={{ fontFamily: MONO }}>
                              {guest.waiverSignedOn}
                            </div>
                          </div>
                        </div>
                        <button className="text-[12.5px] font-medium text-black/60 underline decoration-black/20 underline-offset-4 hover:text-black hover:decoration-black">
                          View
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-[8px] border border-amber-200 bg-amber-50/60 px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-amber-700">
                            <FileText size={13} strokeWidth={2.25} />
                          </span>
                          <div>
                            <div className="text-[13.5px] font-semibold text-amber-900">
                              Not signed yet
                            </div>
                            <div className="text-[11.5px] text-amber-900/70">
                              Required before session starts
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex items-center gap-2 rounded-[8px] bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-amber-700"
                          >
                            Send waiver
                            <ExternalLink size={13} strokeWidth={2.25} />
                          </button>
                          <button className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] hover:text-black">
                            Sign on iPad
                          </button>
                        </div>
                      </div>
                    )}
                  </PanelSection>
                );
              })()}
            </div>

            {onCancel && (
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.08] px-7 py-4">
                {confirmingCancel ? (
                  <>
                    <div className="text-[12.5px] text-black/60">Cancel this reservation?</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmingCancel(false)}
                        className="rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-black/70 hover:bg-black/[0.03] hover:text-black"
                      >
                        Keep
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancel(s.id)}
                        className="rounded-[8px] bg-rose-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-rose-700"
                      >
                        Confirm cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmingCancel(true)}
                      className="text-[13px] font-semibold text-rose-700 hover:text-rose-900"
                    >
                      Cancel reservation
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="text-[13px] font-medium text-black/55 hover:text-black"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}

      </aside>
    </>
  );
}

function PanelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt
        className="text-[11.5px] uppercase tracking-[0.14em] text-black/45"
        style={{ fontFamily: MONO }}
      >
        {label}
      </dt>
      <dd className="text-right">{children}</dd>
    </>
  );
}

function PanelSection({
  eyebrow,
  children,
  trailing,
}: {
  eyebrow: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <section className="border-t border-black/[0.08] py-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div
          className="text-[10.5px] uppercase tracking-[0.16em] text-black/45"
          style={{ fontFamily: MONO }}
        >
          {eyebrow}
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

// ------------------------------------------------------------------
// Slot panel — one surface for creating a reservation or a block,
// and for editing an existing block. Reservation is the default mode
// because ~95% of clicks on empty space are bookings.
// ------------------------------------------------------------------

function SlotPanel({
  draft,
  allServices,
  blocks,
  onClose,
  onSaveReservation,
  onSaveBlock,
  onRemoveBlock,
}: {
  draft: SlotDraft | null;
  allServices: Service[];
  blocks: Block[];
  onClose: () => void;
  onSaveReservation: (svc: Service) => void;
  onSaveBlock: (b: Block) => void;
  onRemoveBlock: (id: string) => void;
}) {
  const open = !!draft;

  // Local editable copy so field edits don't move the on-canvas draft card
  // (per the design: what you drew stays anchored while you fill the form).
  const [mode, setMode] = useState<"reservation" | "block">("reservation");
  const [room, setRoom] = useState<string>("");
  const [start, setStart] = useState<number>(0);
  const [end, setEnd] = useState<number>(0);
  const [offering, setOffering] = useState<string>("");
  const [practitioner, setPractitioner] = useState<string>("");
  const [guest, setGuest] = useState<string>("");
  const [reason, setReason] = useState<string>(BLOCK_REASONS[0]);

  useEffect(() => {
    if (!draft) return;
    setMode(draft.mode);
    setRoom(draft.room);
    setStart(draft.start);
    setEnd(draft.end);
    if (draft.editingBlockId) {
      const b = blocks.find((x) => x.id === draft.editingBlockId);
      setReason(b?.reason ?? BLOCK_REASONS[0]);
    } else {
      const offerings = OFFERINGS_BY_ROOM[draft.room] ?? [];
      setOffering(offerings[0] ?? "");
      setPractitioner("");
      setGuest("");
      setReason(BLOCK_REASONS[0]);
    }
  }, [draft, blocks]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const rc = room ? roomColor(room) : ACCENT;
  const isEditingBlock = !!draft?.editingBlockId;

  const offerings = OFFERINGS_BY_ROOM[room] ?? [];
  const eligiblePractitioners = useMemo(() => {
    const list = PRACTITIONERS.filter((p) => p.offerings.includes(offering));
    const today = dateKeyOf(new Date());
    // Prefer practitioners with green availability covering the requested slot,
    // then those already on today's calendar, then everyone else.
    return list
      .map((p) => {
        const rec = findPractitionerByName(p.name);
        const covered = rec ? hasAvailabilityCovering(rec.id, today, start, end) : false;
        return { p, rec, covered };
      })
      .sort((a, b) => {
        if (a.covered !== b.covered) return a.covered ? -1 : 1;
        if (a.p.onCalendarToday !== b.p.onCalendarToday) return a.p.onCalendarToday ? -1 : 1;
        return a.p.name.localeCompare(b.p.name);
      });
  }, [offering, start, end]);


  const conflicts = useMemo(() => {
    if (!room || start >= end) return { session: false, block: false };
    const session = allServices.some((s) => s.room === room && s.start < end && s.end > start);
    const block = blocks.some((b) => b.id !== draft?.editingBlockId && b.room === room && b.start < end && b.end > start);
    return { session, block };
  }, [room, start, end, allServices, blocks, draft?.editingBlockId]);
  const conflict = conflicts.session || conflicts.block;

  const selectedPract = PRACTITIONERS.find((p) => p.name === practitioner);
  const reservationValid = !!room && !!offering && !!practitioner && !!guest.trim() && start < end && !conflict;

  const saveReservation = () => {
    if (!reservationValid) return;
    const pending = selectedPract && !selectedPract.onCalendarToday;
    onSaveReservation({
      id: `svc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      guest: guest.trim(),
      service: offering,
      room,
      practitioner,
      start,
      end,
      status: pending ? "requested" : "confirmed",
      note: pending ? "Awaiting practitioner SMS confirmation" : undefined,
    });
  };

  const saveBlock = () => {
    if (conflict || start >= end) return;
    onSaveBlock({
      id: draft?.editingBlockId ?? `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      room,
      start,
      end,
      reason,
    });
  };

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={mode === "block" ? "Room block" : "New reservation"}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: DISPLAY, color: INK }}
      >
        {!draft ? null : (
          <>
            <div className="h-[3px] w-full shrink-0" style={{ background: rc }} />

            <div className="flex items-start justify-between gap-3 px-7 pt-6 pb-4">
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                  {isEditingBlock ? "Edit room block" : mode === "block" ? "New room block" : "New reservation"}
                </div>
                <h2 className="mt-1 truncate text-[24px] font-semibold tracking-[-0.02em] text-black">
                  {room || "Choose a room"}
                </h2>
                <div className="mt-1 text-[13px] font-semibold tabular-nums" style={{ color: rc, fontFamily: MONO }}>
                  {fmt(start)} – {fmt(end)}
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

            {/* Mode toggle — only for new slots, not when editing an existing block */}
            {!isEditingBlock && (
              <div className="mx-7 mb-4 inline-flex shrink-0 self-start rounded-full border border-black/[0.1] bg-black/[0.03] p-0.5 text-[12px] font-semibold" style={{ fontFamily: MONO }}>
                {(["reservation", "block"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full px-3 py-1 transition-colors ${
                      mode === m ? "bg-white text-black shadow-sm" : "text-black/50 hover:text-black"
                    }`}
                  >
                    {m === "reservation" ? "Reservation" : "Block"}
                  </button>
                ))}
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
              {conflict && (
                <div className="mb-4 rounded-[8px] border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-800">
                  Overlaps {conflicts.session ? "an existing session" : "another block"} in {room}. Adjust the time.
                </div>
              )}

              <FieldGrid>
                <Field label="Time">
                  <div className="flex items-center gap-2 text-[13.5px]">
                    <TimeInput value={start} onChange={setStart} />
                    <span className="text-black/40">→</span>
                    <TimeInput value={end} onChange={setEnd} />
                  </div>
                </Field>
                <Field label="Room">
                  <select
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    className="w-full rounded-[8px] border border-black/10 bg-white px-2.5 py-1.5 text-[13.5px] font-medium text-black focus:border-black/40 focus:outline-none"
                  >
                    {ROOMS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </FieldGrid>

              {mode === "reservation" ? (
                <>
                  <Field label="Offering" block>
                    <select
                      value={offering}
                      onChange={(e) => { setOffering(e.target.value); setPractitioner(""); }}
                      className="w-full rounded-[8px] border border-black/10 bg-white px-2.5 py-2 text-[14px] font-medium text-black focus:border-black/40 focus:outline-none"
                    >
                      <option value="" disabled>Select an offering…</option>
                      {offerings.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                    {offerings.length === 0 && (
                      <div className="mt-1 text-[11.5px] text-black/50">No offerings configured for {room}.</div>
                    )}
                  </Field>

                  <Field label="Practitioner" block>
                    {!offering ? (
                      <div className="text-[12.5px] text-black/45">Choose an offering to see who can run it.</div>
                    ) : eligiblePractitioners.length === 0 ? (
                      <div className="text-[12.5px] text-black/50">No practitioners qualified for this offering.</div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {eligiblePractitioners.map(({ p, rec, covered }) => {
                          const selected = practitioner === p.name;
                          const status = covered
                            ? { label: "Available for this slot", color: "#059669" }
                            : p.onCalendarToday
                              ? { label: "On today's calendar", color: "#0f766e" }
                              : { label: "Not marked available — call or text to request", color: "#b45309" };
                          return (
                            <div
                              key={p.name}
                              className={`flex items-center justify-between gap-3 rounded-[8px] border px-3 py-2 text-left transition-colors ${
                                selected ? "border-black bg-black/[0.03]" : "border-black/10 bg-white hover:border-black/30"
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setPractitioner(p.name)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="truncate text-[14px] font-semibold text-black">{p.name}</div>
                                <div className="text-[11.5px]" style={{ fontFamily: MONO, color: status.color }}>
                                  {status.label}
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!rec) return;
                                  openPractitionerPanelByName(p.name, {
                                    service: offering,
                                    room,
                                    start,
                                    end,
                                    date: dateKeyOf(new Date()),
                                    onAssign: (_id, name) => setPractitioner(name),
                                  });
                                }}
                                className="shrink-0 rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[11px] font-semibold text-black/70 hover:border-black/30 hover:text-black"
                              >
                                Open
                              </button>
                              {selected && <Check size={14} strokeWidth={2.5} className="shrink-0 text-black" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Field>

                  <Field label="Guest" block>
                    <input
                      value={guest}
                      onChange={(e) => setGuest(e.target.value)}
                      placeholder="Guest name"
                      className="w-full rounded-[8px] border border-black/10 bg-white px-2.5 py-2 text-[14px] font-medium text-black placeholder:text-black/35 focus:border-black/40 focus:outline-none"
                    />
                  </Field>
                </>
              ) : (
                <Field label="Reason" block>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCK_REASONS.map((r) => {
                      const selected = reason === r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setReason(r)}
                          className={`rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                            selected ? "border-black bg-black text-white" : "border-black/15 bg-white text-black/75 hover:border-black/40"
                          }`}
                        >
                          {r}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-black/[0.08] px-7 py-4">
              {isEditingBlock ? (
                <button
                  type="button"
                  onClick={() => onRemoveBlock(draft.editingBlockId!)}
                  className="text-[13px] font-semibold text-rose-700 hover:text-rose-900"
                >
                  Remove block
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[13px] font-medium text-black/55 hover:text-black"
                >
                  Cancel
                </button>
              )}
              {mode === "reservation" ? (
                <button
                  type="button"
                  disabled={!reservationValid}
                  onClick={saveReservation}
                  className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: ACCENT }}
                >
                  {selectedPract && !selectedPract.onCalendarToday ? "Send request" : "Confirm reservation"}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={conflict || start >= end}
                  onClick={saveBlock}
                  className="inline-flex items-center gap-2 rounded-[8px] px-4 py-2 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: ACCENT }}
                >
                  {isEditingBlock ? "Save block" : "Confirm block"}
                </button>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, children, block }: { label: string; children: React.ReactNode; block?: boolean }) {
  return (
    <div className={block ? "mb-4" : ""}>
      <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-black/50" style={{ fontFamily: MONO }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function TimeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // value = minutes since DAY_START; render as HH:MM (24h) so it's compact and
  // unambiguous inside the form. Snap to 5-min increments.
  const abs = value + DAY_START;
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  const str = `${String(hh % 24).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return (
    <input
      type="time"
      step={300}
      value={str}
      onChange={(e) => {
        const [h, m] = e.target.value.split(":").map(Number);
        if (Number.isFinite(h) && Number.isFinite(m)) {
          onChange(h * 60 + m - DAY_START);
        }
      }}
      className="rounded-[8px] border border-black/10 bg-white px-2.5 py-1.5 text-[13.5px] font-semibold tabular-nums text-black focus:border-black/40 focus:outline-none"
      style={{ fontFamily: MONO }}
    />
  );
}

