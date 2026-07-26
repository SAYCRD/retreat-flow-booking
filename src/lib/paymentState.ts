// ------------------------------------------------------------------
// Payment state — mutable per-service paid flags with a tiny pub/sub so
// cards can render an unpaid 💳 glyph and the reservation panel can
// flip a service to paid. Seeded from the same map that used to live
// inline in src/routes/index.tsx.
// ------------------------------------------------------------------

import { useEffect, useState } from "react";

const seed: Record<string, boolean> = {
  // today (SEED_SERVICES)
  s1: true, s2: true, s3: true, s4: true,
  s5: false, s6: false, s7: true, s8: false, s9: false,
  s10: false, s11: false,
  // tomorrow (SEED_SERVICES_TOMORROW) — one deliberately unpaid all day
  t1: true, t2: true, t3: false, t4: true, t5: true,
  t6: true, t7: true, t8: false, t9: true, t10: true,
};

let paid: Record<string, boolean> = { ...seed };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function isPaid(id: string): boolean {
  return paid[id] ?? false;
}

export function markPaid(id: string, value = true) {
  if (paid[id] === value) return;
  paid = { ...paid, [id]: value };
  emit();
}

export function usePayments() {
  const [snap, setSnap] = useState(paid);
  useEffect(() => {
    const fn = () => setSnap(paid);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return snap;
}
