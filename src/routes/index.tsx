import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, Footprints, RefreshCcw, Sparkles, Sparkle, Radio, CalendarRange, ArrowDownRight, AlertTriangle, X, Check, UserCheck, DoorOpen, Coffee, Waves, Phone, Mail, FileText, ShieldAlert, ExternalLink, CreditCard, Copy, Brush, ClipboardCheck, Bell, ArrowRight, HandHeart, Wand2, Flower2, Wind, PartyPopper, Hand, Feather } from "lucide-react";

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



const ROOMS = [
  "Infrared Room",
  "Buddha Massage",
  "Ayurveda Room",
  "Om Space",
  "The Temple",
  "Land",
];

const DAY_START = 9 * 60;
const DAY_END = 24 * 60;
const DAY_SPAN = DAY_END - DAY_START;

const t = (h: number, m = 0) => h * 60 + m - DAY_START;
const fmt = (mins: number) => {
  const abs = mins + DAY_START;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 24) return `12:${String(m).padStart(2, "0")} AM`;
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
  const nowMin = useNowMin();
  const [cueIdx, setCueIdx] = useState(0);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(() => new Set());
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [focusOpen, setFocusOpen] = useState(false);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [openServiceId, setOpenServiceId] = useState<string | null>(null);
  const openService = openServiceId ? SERVICES.find((s) => s.id === openServiceId) ?? null : null;
  const [heroPast, setHeroPast] = useState(false);

  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const date = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

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
    const marker = document.getElementById("active-cue-marker");
    const el = marker ?? document.getElementById(`svc-${cue.serviceId}`);
    if (!el) return;
    // header (~44) + Coming Up strip (~88) + room headers (64) + generous calm
    // buffer so the action item lands comfortably below the sticky chrome.
    const stickyOffset = 44 + 88 + 64 + 144;
    const rect = el.getBoundingClientRect();
    const target = window.scrollY + rect.top - stickyOffset;
    smoothScrollTo(Math.max(0, target), 1300);
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
                <span className="font-medium text-black/65">Live</span>
                <span className="text-black/25">·</span>
                <span>{date}</span>
              </div>
              <h1 className="mt-2 text-[44px] font-semibold leading-[1] tracking-[-0.03em] md:text-[56px]">
                Today
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
                    <div className="flex items-baseline gap-2">
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
                          className="hidden shrink-0 text-[12.5px] md:inline"
                          style={{ color: roomColor(cue.room), fontFamily: MONO }}
                        >
                          · {cue.room}
                        </span>
                      )}
                      <span className="hidden truncate text-[13.5px] text-black/50 lg:inline">
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
              highlightServiceId={cue?.serviceId}
              highlightKind={cue?.kind}
              highlightUrgent={cue?.urgent}
              whispers={prompts}
              activeCueId={cue?.id}
              activeRoom={activeRoom}
              cueRoom={cue?.room ?? null}
              onRoomClick={(r) => setActiveRoom((cur) => (cur === r ? null : r))}
              onOpenService={(id) => setOpenServiceId(id)}
            />
          </div>
        </div>
      </section>

      {/* Extra runway so the calendar can scroll far enough to bring late-day
          action items into the viewport with breathing room below them. */}
      <div className="h-[500px]" aria-hidden="true" />

      <footer className="py-8 text-center text-[11px] text-black/35" style={{ fontFamily: MONO }}>
        SEONDYA · SHIFT 09:00 — 20:00
      </footer>

      {focusOpen && cue && (
        <FocusOverlay cue={cue} onClose={() => setFocusOpen(false)} />
      )}

      <ReservationPanel service={openService} onClose={() => setOpenServiceId(null)} />
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
  whispers = [],
  activeCueId,
  activeRoom,
  cueRoom,
  onRoomClick,
  onOpenService,
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
}) {
  const PX_PER_MIN = 4; // 240px per hour vertical — gives 15/30-min slots room to breathe
  const TAIL_PX_PER_MIN = 1.2; // compress the quiet evening tail so midnight doesn't feel empty
  const TIME_COL = 88;
  const HEADER_H = 64;
  const gridRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef(false);

  // Keep the busy part of the day at full scale; compress the empty evening
  // tail so the calendar reaches midnight without a huge white void.
  const lastEnd = useMemo(() => Math.max(...SERVICES.map((s) => s.end)), []);
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

  const trackHeight = minToPx(DAY_SPAN);

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
    const s = SERVICES.find((x) => x.id === activeCue.serviceId);
    if (!s || !markerKinds.includes(activeCue.kind)) return null;

    const roomServices = SERVICES.filter((x) => x.room === s.room).sort((a, b) => a.start - b.start);
    const prevInRoom = roomServices.find((s2, i, arr) => arr[i + 1]?.id === s.id);
    const idxInRoom = roomServices.findIndex((x) => x.id === s.id);
    const nextInRoom = idxInRoom >= 0 ? roomServices[idxInRoom + 1] ?? null : null;
    const guestServices = SERVICES.filter((x) => x.guest === s.guest).sort((a, b) => a.start - b.start);
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
    if (!cueMarker?.after || !cueMarker.serviceId) { setAfterTopPx(null); return; }
    const el = document.getElementById(`svc-${cueMarker.serviceId}`);
    if (!el) { setAfterTopPx(null); return; }
    const measure = () => setAfterTopPx(el.offsetTop + el.offsetHeight + 8);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [cueMarker?.after, cueMarker?.serviceId]);


  const hours = useMemo(() => {
    const out: number[] = [];
    for (let h = 9; h <= 24; h++) out.push(h);
    return out;
  }, []);

  const hourTops = useMemo(() => hours.map((h) => minToPx(h * 60 - DAY_START)), [hours, minToPx]);
  const quarterTops = useMemo(() => {
    const out: number[] = [];
    for (let m = 15; m <= compressAfter; m += 15) {
      if (m % 60 !== 0) out.push(minToPx(m));
    }
    return out;
  }, [compressAfter, minToPx]);

  const nowTop = minToPx(nowMin);

  // On first load, scroll the calendar so the current time is visible near the
  // top of the viewport instead of showing 9 AM when it's mid-afternoon.
  // If a Coming Up cue is active, the parent handles scrolling to the action
  // marker; this fallback only runs when there is no cue to follow.
  useEffect(() => {
    if (scrolledRef.current || !gridRef.current || activeCueId) return;
    scrolledRef.current = true;
    const rect = gridRef.current.getBoundingClientRect();
    const gridTop = rect.top + window.scrollY;
    // Offset for sticky header (44) + sticky Coming Up strip (~88) + room headers + breathing room.
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
          const count = SERVICES.filter((s) => s.room === room).length;
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
                  : cueMarker.topMin * PX_PER_MIN;
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


                return (
                  <div
                    key={s.id}
                    id={`svc-${s.id}`}
                    className="group absolute inset-x-0 flex flex-col rounded-none bg-white transition-[transform,box-shadow] duration-200 ease-out will-change-transform hover:z-20 hover:-translate-y-[1px] cursor-pointer"
                    style={{
                      top: top + 1,
                      minHeight: Math.max(height - 2, 96),
                      boxShadow: baseShadow,
                      opacity: isPast ? 0.9 : 1,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = hoverShadow;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = baseShadow;
                    }}
                    onClick={() => onOpenService?.(s.id)}
                    
                  >
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
                          className="whitespace-nowrap text-[15px] font-semibold tabular-nums leading-[1.15] tracking-tight"
                          style={{ color: metaColor, fontFamily: MONO }}
                        >
                          <div>{fmt(s.start)}</div>
                          <div style={{ opacity: 0.55 }}>{fmt(s.end)}</div>
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
                                
                              >
                                {orchestration.title}
                              </span>
                            </div>
                          ) : (
                            <div
                              className="truncate text-[11.5px] italic leading-snug"
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
}: {
  service: Service | null;
  onClose: () => void;
}) {
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
                  <span className="font-semibold text-black">{s.practitioner}</span>
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
