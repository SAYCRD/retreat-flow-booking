// ------------------------------------------------------------------
// Shared spa catalog — types, timing helpers, seed data, room/offering
// tables, and the per-offering setup-buffer map. Imported by the room
// timeline, the practitioner panel, and the practitioner store so all
// three read from a single source of truth.
// ------------------------------------------------------------------

export type Status = "in-session" | "confirmed" | "requested" | "hold";

export type Service = {
  id: string;
  guest: string;
  partySize?: number;
  service: string;
  room: string;
  practitioner: string;
  start: number;   // minutes since DAY_START
  end: number;
  status: Status;
  note?: string;
};

export const DAY_START = 5 * 60;  // 5:00 AM
export const DAY_END = 24 * 60;   // 12:00 AM (next day)
export const DAY_SPAN = DAY_END - DAY_START;

export const t = (h: number, m = 0) => h * 60 + m - DAY_START;

export const fmt = (mins: number) => {
  const abs = mins + DAY_START;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 24) return `12:${String(m).padStart(2, "0")} AM`;
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
};

export const ROOMS = [
  "Infrared Room",
  "Buddha Massage",
  "Ayurveda Room",
  "Om Space",
  "The Temple",
  "Land",
] as const;

// High-chroma pastels — the color follows the space, not the guest.
export const ROOM_COLORS: Record<string, string> = {
  "Infrared Room": "#ff7aa2",
  "Buddha Massage": "#3fd6b0",
  "Ayurveda Room": "#f5b544",
  "Om Space": "#9d8bff",
  "The Temple": "#e57ac8",
  "Land": "#8fd14f",
};

export const NEUTRAL = "#475569";

export const roomColor = (room: string): string => ROOM_COLORS[room] ?? NEUTRAL;

// Which offerings each room can host.
export const OFFERINGS_BY_ROOM: Record<string, string[]> = {
  "Infrared Room": ["Infrared Sauna", "BEMER Session"],
  "Buddha Massage": ["Deep Tissue Massage", "Swedish Massage", "Sound Healing"],
  "Ayurveda Room": ["Couples Ayurvedic Massage", "Ayurvedic Consultation"],
  "Om Space": ["Intuitive Reading", "Sound Healing", "Meditation"],
  "The Temple": ["Ceremonial Tea & Integration", "Cupping", "Grandmother Crystal Bowl"],
  "Land": ["Myers Cocktail IV", "Medicine Walk"],
};

export const allOfferings = (): string[] =>
  Array.from(new Set(Object.values(OFFERINGS_BY_ROOM).flat())).sort();

// Per-offering room-setup buffer (in minutes). Rendered as a soft prep
// strip immediately BEFORE the session on both the room and practitioner
// timelines. Default is 15 minutes for anything not listed.
export const DEFAULT_SETUP_MIN = 15;
export const SETUP_MINUTES: Record<string, number> = {
  "Myers Cocktail IV": 20,
  "Couples Ayurvedic Massage": 25,
  "Sound Healing": 10,
  "BEMER Session": 10,
  "Infrared Sauna": 10,
  "Intuitive Reading": 15,
  "Grandmother Crystal Bowl": 20,
  "Medicine Walk": 15,
  "Ceremonial Tea & Integration": 15,
  "Deep Tissue Massage": 15,
  "Swedish Massage": 15,
  "Cupping": 15,
  "Ayurvedic Consultation": 10,
  "Meditation": 10,
};
export const setupMinutesFor = (offering: string): number =>
  SETUP_MINUTES[offering] ?? DEFAULT_SETUP_MIN;

// Seed reservations for today.
export const SEED_SERVICES: Service[] = [
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
