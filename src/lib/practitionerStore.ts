// ------------------------------------------------------------------
// Practitioner store — extended practitioner records, per-day availability
// blocks, and a tiny event-emitter so any component in the app can read/
// mutate. Client-only for now; swap for real persistence later.
// ------------------------------------------------------------------

import { useEffect, useState } from "react";

export type AvailabilitySource = "phone" | "self" | "text";

export type AvailabilityBlock = {
  id: string;
  practitionerId: string;
  date: string;            // "YYYY-MM-DD" in local time
  start: number;           // minutes since day start (matches Timeline's DAY_START = 5am)
  end: number;
  source: AvailabilitySource;
  note?: string;
};

export type PractitionerRec = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  offerings: string[];
  notes?: string;
  colorHue: string;        // used as the panel/roster accent
  photoInitials?: string;  // future avatar; using initials for now
};

// Seed roster — mirrors + extends the mock PRACTITIONERS in routes/index.tsx.
// Keep names in sync with SERVICES.practitioner values so the reservation
// flow can match on name.
const seedPractitioners: PractitionerRec[] = [
  {
    id: "p-maya",
    name: "Maya Chen",
    phone: "+1 415 555 0142",
    email: "maya@seondya.co",
    offerings: ["Deep Tissue Massage", "Swedish Massage", "Cupping"],
    notes: "Prefers morning shifts. Send text confirmations by 9am for same-day requests.",
    colorHue: "#3fd6b0",
  },
  {
    id: "p-sofia",
    name: "Sofia Park",
    phone: "+1 415 555 0193",
    email: "sofia@seondya.co",
    offerings: ["Sound Healing", "BEMER Session", "Infrared Sauna"],
    notes: "Always confirms by text. Fast turnaround.",
    colorHue: "#ff7aa2",
  },
  {
    id: "p-daniel",
    name: "Daniel Reyes",
    phone: "+1 415 555 0217",
    email: "daniel@seondya.co",
    offerings: ["Couples Ayurvedic Massage", "Ayurvedic Consultation"],
    notes: "Best reached by phone. Marks own calendar on Sundays.",
    colorHue: "#f5b544",
  },
  {
    id: "p-uqualla",
    name: "Uqualla",
    phone: "+1 928 555 0111",
    email: "uqualla@seondya.co",
    offerings: [
      "Intuitive Reading",
      "Ceremonial Tea & Integration",
      "Medicine Walk",
      "Grandmother Crystal Bowl",
      "Meditation",
    ],
    notes: "On the land most days. Text first, call only if urgent.",
    colorHue: "#e57ac8",
  },
  {
    id: "p-elise",
    name: "Dr. Elise Warren",
    phone: "+1 415 555 0288",
    email: "elise@seondya.co",
    offerings: ["Myers Cocktail IV"],
    notes: "Medical director. Only available Wed / Fri unless specifically requested.",
    colorHue: "#9d8bff",
  },
];

const todayKey = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Seed a handful of green blocks so the calendar isn't empty on first look.
const seedAvailability: AvailabilityBlock[] = [
  { id: "av-1", practitionerId: "p-maya", date: todayKey(), start: 9 * 60 - 5 * 60, end: 13 * 60 - 5 * 60, source: "self" },
  { id: "av-2", practitionerId: "p-sofia", date: todayKey(), start: 10 * 60 - 5 * 60, end: 17 * 60 - 5 * 60, source: "self" },
  { id: "av-3", practitionerId: "p-uqualla", date: todayKey(), start: 13 * 60 - 5 * 60, end: 18 * 60 - 5 * 60, source: "self" },
  { id: "av-4", practitionerId: "p-daniel", date: todayKey(), start: 13 * 60 - 5 * 60, end: 16 * 60 - 5 * 60, source: "phone", note: "Confirmed by phone 8:14am" },
];

// ---------------------------------------------------------------
// Store
// ---------------------------------------------------------------

type State = {
  practitioners: PractitionerRec[];
  availability: AvailabilityBlock[];
  panelOpen: string | null;                        // practitioner id
  panelContext: PanelContext | null;               // reservation-in-flight context
};

export type PanelContext = {
  service?: string;       // requested offering name
  room?: string;
  start?: number;         // minutes since day start
  end?: number;
  date?: string;          // "YYYY-MM-DD"
  onAssign?: (practitionerId: string, practitionerName: string) => void;
};

let state: State = {
  practitioners: seedPractitioners,
  availability: seedAvailability,
  panelOpen: null,
  panelContext: null,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  emit();
};

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export const dateKeyOf = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function usePractitioners() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = () => setSnap(state);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return snap;
}

export function findPractitionerByName(name: string): PractitionerRec | undefined {
  return state.practitioners.find((p) => p.name === name);
}

export function findPractitioner(id: string): PractitionerRec | undefined {
  return state.practitioners.find((p) => p.id === id);
}

export function addPractitioner(input: Omit<PractitionerRec, "id">): PractitionerRec {
  const rec: PractitionerRec = { ...input, id: uid("p") };
  set({ practitioners: [...state.practitioners, rec] });
  return rec;
}

export function updatePractitioner(id: string, patch: Partial<PractitionerRec>) {
  set({
    practitioners: state.practitioners.map((p) => (p.id === id ? { ...p, ...patch } : p)),
  });
}

export function availabilityFor(practitionerId: string, dateKey: string): AvailabilityBlock[] {
  return state.availability
    .filter((a) => a.practitionerId === practitionerId && a.date === dateKey)
    .sort((a, b) => a.start - b.start);
}

export function addAvailability(input: Omit<AvailabilityBlock, "id">): AvailabilityBlock {
  const block: AvailabilityBlock = { ...input, id: uid("av") };
  set({ availability: [...state.availability, block] });
  return block;
}

export function updateAvailability(id: string, patch: Partial<AvailabilityBlock>) {
  set({
    availability: state.availability.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  });
}

export function removeAvailability(id: string) {
  set({ availability: state.availability.filter((a) => a.id !== id) });
}

// Panel controls — any component can open the shared practitioner side panel.
export function openPractitionerPanel(id: string, context: PanelContext | null = null) {
  set({ panelOpen: id, panelContext: context });
}

export function openPractitionerPanelByName(name: string, context: PanelContext | null = null) {
  const p = findPractitionerByName(name);
  if (!p) return;
  openPractitionerPanel(p.id, context);
}

export function closePractitionerPanel() {
  set({ panelOpen: null, panelContext: null });
}

// Helper: does this practitioner have green availability covering [start, end)?
export function hasAvailabilityCovering(
  practitionerId: string,
  dateKey: string,
  start: number,
  end: number,
): boolean {
  return state.availability.some(
    (a) =>
      a.practitionerId === practitionerId &&
      a.date === dateKey &&
      a.start <= start &&
      a.end >= end,
  );
}
