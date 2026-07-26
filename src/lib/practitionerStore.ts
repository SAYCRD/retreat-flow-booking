// ------------------------------------------------------------------
// Practitioner + reservation store — extended practitioner records,
// per-day availability blocks, the live reservation list (seed +
// created − canceled), and a small pub/sub so any component can open
// the practitioner or reservation side panels.
// ------------------------------------------------------------------

import { useEffect, useState } from "react";
import { SEED_SERVICES, SEED_SERVICES_TOMORROW, type Service } from "./catalog";

export type AvailabilitySource = "phone" | "self" | "text";

export type AvailabilityBlock = {
  id: string;
  practitionerId: string;
  date: string;            // "YYYY-MM-DD" in local time
  start: number;           // minutes since DAY_START (5am)
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
  colorHue: string;
  photoInitials?: string;
};

// Seed roster — names match SERVICES.practitioner values.
const seedPractitioners: PractitionerRec[] = [
  {
    id: "p-maya", name: "Maya Chen",
    phone: "+1 415 555 0142", email: "maya@seondya.co",
    offerings: ["Deep Tissue Massage", "Swedish Massage", "Cupping"],
    notes: "Prefers morning shifts. Send text confirmations by 9am for same-day requests.",
    colorHue: "#3fd6b0",
  },
  {
    id: "p-sofia", name: "Sofia Park",
    phone: "+1 415 555 0193", email: "sofia@seondya.co",
    offerings: ["Sound Healing", "BEMER Session", "Infrared Sauna"],
    notes: "Always confirms by text. Fast turnaround.",
    colorHue: "#ff7aa2",
  },
  {
    id: "p-daniel", name: "Daniel Reyes",
    phone: "+1 415 555 0217", email: "daniel@seondya.co",
    offerings: ["Couples Ayurvedic Massage", "Ayurvedic Consultation"],
    notes: "Best reached by phone. Marks own calendar on Sundays.",
    colorHue: "#f5b544",
  },
  {
    id: "p-uqualla", name: "Uqualla",
    phone: "+1 928 555 0111", email: "uqualla@seondya.co",
    offerings: [
      "Intuitive Reading", "Ceremonial Tea & Integration", "Medicine Walk",
      "Grandmother Crystal Bowl", "Meditation",
    ],
    notes: "On the land most days. Text first, call only if urgent.",
    colorHue: "#e57ac8",
  },
  {
    id: "p-elise", name: "Dr. Elise Warren",
    phone: "+1 415 555 0288", email: "elise@seondya.co",
    offerings: ["Myers Cocktail IV"],
    notes: "Medical director. Only available Wed / Fri unless specifically requested.",
    colorHue: "#9d8bff",
  },
  {
    id: "p-ravi", name: "Ravi Kapoor",
    phone: "+1 415 555 0344", email: "ravi@seondya.co",
    offerings: ["Infrared Sauna", "BEMER Session", "Sound Healing"],
    notes: "Confirms same day by text. Prefers back-to-back afternoons.",
    colorHue: "#ff7aa2",
  },
  {
    id: "p-willow", name: "Willow Grey",
    phone: "+1 928 555 0422", email: "willow@seondya.co",
    offerings: ["Ceremonial Tea & Integration", "Grandmother Crystal Bowl", "Meditation"],
    notes: "Ceremonialist. Arrives 20 minutes before each session to prepare the space.",
    colorHue: "#e57ac8",
  },
];

const todayKey = () => dateKeyOf(new Date());

const seedAvailability: AvailabilityBlock[] = [
  { id: "av-1", practitionerId: "p-maya", date: todayKey(), start: 9 * 60 - 5 * 60, end: 13 * 60 - 5 * 60, source: "self" },
  { id: "av-2", practitionerId: "p-sofia", date: todayKey(), start: 10 * 60 - 5 * 60, end: 17 * 60 - 5 * 60, source: "self" },
  { id: "av-3", practitionerId: "p-uqualla", date: todayKey(), start: 13 * 60 - 5 * 60, end: 18 * 60 - 5 * 60, source: "self" },
  { id: "av-4", practitionerId: "p-daniel", date: todayKey(), start: 13 * 60 - 5 * 60, end: 16 * 60 - 5 * 60, source: "phone", note: "Confirmed by phone 8:14am" },
];

// ------------------------------------------------------------------
// Store shape
// ------------------------------------------------------------------

export type PanelContext = {
  service?: string;
  room?: string;
  start?: number;
  end?: number;
  date?: string;
  onAssign?: (practitionerId: string, practitionerName: string) => void;
  notifyDraft?: {
    // A prefilled SMS the front desk can send to the practitioner.
    // The panel renders this at the top with a "Send text" button.
    message: string;
    guestFirstName?: string;
    serviceLabel?: string;
    roomLabel?: string;
    startMin?: number;
  };
};


export type PendingMove = {
  id: string;
  from: { start: number; end: number };
  to: { start: number; end: number };
};

type State = {
  practitioners: PractitionerRec[];
  availability: AvailabilityBlock[];
  createdServices: Service[];
  canceledIds: Set<string>;
  serviceOverrides: Record<string, { start: number; end: number }>;
  pendingMove: PendingMove | null;
  moveToast: { text: string; at: number } | null;
  panelOpen: string | null;
  panelContext: PanelContext | null;
  openReservationId: string | null;
};

type PersistedReservationState = {
  createdServices: Service[];
  canceledIds: string[];
  serviceOverrides: Record<string, { start: number; end: number }>;
};

const RESERVATION_STORAGE_KEY = "seondya-reservations-v1";
let hasHydratedReservations = false;

let state: State = {
  practitioners: seedPractitioners,
  availability: seedAvailability,
  createdServices: [],
  canceledIds: new Set(),
  serviceOverrides: {},
  pendingMove: null,
  moveToast: null,
  panelOpen: null,
  panelContext: null,
  openReservationId: null,
};


const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const persistReservations = () => {
  if (typeof window === "undefined" || !hasHydratedReservations) return;
  const persisted: PersistedReservationState = {
    createdServices: state.createdServices,
    canceledIds: Array.from(state.canceledIds),
    serviceOverrides: state.serviceOverrides,
  };
  window.localStorage.setItem(RESERVATION_STORAGE_KEY, JSON.stringify(persisted));
};
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  persistReservations();
  emit();
};

function hydrateReservations() {
  if (hasHydratedReservations || typeof window === "undefined") return;
  hasHydratedReservations = true;
  try {
    const raw = window.localStorage.getItem(RESERVATION_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<PersistedReservationState>;
    state = {
      ...state,
      createdServices: Array.isArray(saved.createdServices) ? saved.createdServices : [],
      canceledIds: new Set(Array.isArray(saved.canceledIds) ? saved.canceledIds : []),
      serviceOverrides: saved.serviceOverrides && typeof saved.serviceOverrides === "object"
        ? saved.serviceOverrides
        : {},
    };
    emit();
  } catch {
    window.localStorage.removeItem(RESERVATION_STORAGE_KEY);
  }
}

const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

// ------------------------------------------------------------------
// Public API
// ------------------------------------------------------------------

export function dateKeyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Subscribe-once hook returning the current snapshot.
export function usePractitioners() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = () => setSnap(state);
    listeners.add(fn);
    hydrateReservations();
    setSnap(state);
    return () => { listeners.delete(fn); };
  }, []);
  return snap;
}

// ---------- Practitioners ----------

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

export function addPractitionerOffering(id: string, offering: string) {
  const p = findPractitioner(id);
  if (!p || p.offerings.includes(offering)) return;
  updatePractitioner(id, { offerings: [...p.offerings, offering] });
}

export function removePractitionerOffering(id: string, offering: string) {
  const p = findPractitioner(id);
  if (!p) return;
  updatePractitioner(id, { offerings: p.offerings.filter((o) => o !== offering) });
}

// ---------- Availability ----------

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

export function removeAvailability(id: string) {
  set({ availability: state.availability.filter((a) => a.id !== id) });
}

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

// ---------- Services (live: seed + created − canceled) ----------

export function getLiveServices(dateKey?: string): Service[] {
  const today = dateKeyOf(new Date());
  const key = dateKey ?? today;
  const tomorrow = dateKeyOf(new Date(Date.now() + 86400000));
  const seed = key === tomorrow ? SEED_SERVICES_TOMORROW
             : key === today ? SEED_SERVICES
             : [];
  const ov = state.serviceOverrides;
  const created = state.createdServices.filter((s) => (s.date ?? today) === key);
  return [...seed, ...created]
    .filter((s) => !state.canceledIds.has(s.id))
    .map((s) => (ov[s.id] ? { ...s, start: ov[s.id].start, end: ov[s.id].end } : s));
}


export function addService(svc: Service) {
  set({ createdServices: [...state.createdServices, svc] });
}

export function cancelService(id: string) {
  const next = new Set(state.canceledIds);
  next.add(id);
  set({ canceledIds: next });
}

// ---------- Reschedule (drag reservations) ----------

function findServiceById(id: string): Service | undefined {
  const ov = state.serviceOverrides;
  const pool = [...SEED_SERVICES, ...SEED_SERVICES_TOMORROW, ...state.createdServices];
  const svc = pool.find((s) => s.id === id);
  if (!svc) return undefined;
  return ov[id] ? { ...svc, start: ov[id].start, end: ov[id].end } : svc;
}

export function requestMoveService(id: string, start: number, end: number) {
  const svc = findServiceById(id);
  if (!svc) return;
  if (svc.start === start && svc.end === end) return;
  set({
    pendingMove: {
      id,
      from: { start: svc.start, end: svc.end },
      to: { start, end },
    },
  });
}

export function confirmPendingMove() {
  const pm = state.pendingMove;
  if (!pm) return;
  const nextOv = { ...state.serviceOverrides, [pm.id]: pm.to };
  const svc = findServiceById(pm.id);
  const toastText = svc
    ? `${svc.service} moved · notifications sent`
    : `Reservation moved · notifications sent`;
  set({
    serviceOverrides: nextOv,
    pendingMove: null,
    moveToast: { text: toastText, at: Date.now() },
  });
}


export function cancelPendingMove() {
  set({ pendingMove: null });
}

export function clearMoveToast() {
  set({ moveToast: null });
}



export function servicesForPractitioner(name: string, dateKey: string): Service[] {
  return getLiveServices(dateKey)
    .filter((s) => s.practitioner === name)
    .sort((a, b) => a.start - b.start);
}


// ---------- Practitioner panel ----------

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

// ---------- Reservation panel bus ----------
// Lets the practitioner panel (or any component) request that the top-level
// TodayPage open its ReservationPanel for a given service id.

export function openReservation(id: string | null) {
  set({ openReservationId: id });
}

export function consumeOpenReservation(): string | null {
  const id = state.openReservationId;
  if (id) set({ openReservationId: null });
  return id;
}
