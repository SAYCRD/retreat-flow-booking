// ------------------------------------------------------------------
// Guest data — contact, waiver, contraindications, and session protocols.
// Shared between the reservation timeline and the guest directory so both
// surfaces read the same profile.
// ------------------------------------------------------------------

export type GuestInfo = {
  phone: string;
  email: string;
  pronouns?: string;
  waiverSignedOn?: string; // ISO date, undefined = not signed
  notes?: string;
  contraindications?: string[];
};

export const GUESTS: Record<string, GuestInfo> = {
  "Elena Vives": {
    phone: "+1 (415) 555-0132",
    email: "elena.vives@hey.com",
    pronouns: "she/her",
    waiverSignedOn: "2026-06-14",
    notes: "Prefers arm rest under IV. Slight vein anxiety — talk her through the tap.",
    contraindications: [
      "History of vasovagal response — recline fully",
      "Avoid B-complex flush at high rate",
    ],
  },
  "Nadia Farrow": {
    phone: "+1 (628) 555-0177",
    email: "nadia@farrowstudio.com",
    pronouns: "she/her",
    waiverSignedOn: "2026-07-02",
    notes: "Deep pressure OK on shoulders, light on lower back.",
    contraindications: [
      "Recent cortisone in right shoulder (May) — avoid direct work",
      "No cupping over lumbar tattoo (still healing)",
    ],
  },
  "Thomas Wren": {
    phone: "+1 (206) 555-0104",
    email: "twren@northlight.co",
    waiverSignedOn: "2026-05-20",
    contraindications: ["Pacemaker — confirm BEMER protocol distance"],
  },
  "Gerald & June Pierce": {
    phone: "+1 (312) 555-0155",
    email: "pierces@fastmail.com",
    waiverSignedOn: "2026-07-25",
    notes: "25th anniversary. Champagne + card in the room.",
    contraindications: [
      "June: right hip replacement 2019 — no deep hip work, side-lying only",
    ],
  },
  "Amara Okonkwo": {
    phone: "+44 20 7946 0432",
    email: "amara.o@studio.london",
    pronouns: "she/her",
    waiverSignedOn: "2026-07-25",
    notes: "Sensory sensitive. Low light, minimal chat on arrival. Journey of 3.",
    contraindications: [
      "Migraine trigger — no strong essential oils in reading room",
    ],
  },
  "Marcus Hale": {
    phone: "+1 (503) 555-0198",
    email: "marcus.hale@proton.me",
    waiverSignedOn: undefined,
    notes: "First visit — greet at the door, walk him through the space.",
    contraindications: ["Tinnitus — check bowl proximity before session"],
  },
  "Priya Anand": {
    phone: "+1 (917) 555-0121",
    email: "priya.a@lantern.co",
    waiverSignedOn: undefined,
    notes: "Awaiting confirmation on Medicine Walk. Bring water + light jacket.",
    contraindications: [],
  },
  "Lena Costa": {
    phone: "+1 (415) 555-0187",
    email: "lena@costafolio.com",
    waiverSignedOn: "2026-04-11",
    contraindications: [
      "Second trimester pregnancy — supine only briefly, side-lying preferred",
    ],
  },
};

export type Protocol = {
  text: string;
  severity: "brief" | "confirm" | "block";
};

export const SESSION_PROTOCOLS: Record<string, Protocol[]> = {
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
  Cupping: [
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

export function getProtocols(serviceName: string): Protocol[] {
  return SESSION_PROTOCOLS[serviceName] ?? [];
}
