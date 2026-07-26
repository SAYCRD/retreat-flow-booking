// ------------------------------------------------------------------
// Practitioner replies — tiny mutable store for the "Notify" cue loop.
// Two moments are tracked:
//   1. "texted"   — front desk sent the heads-up SMS from the panel
//   2. reply      — practitioner responded (confirmed / here / on the way)
// The Coming Up bar and the session card read from here to render the
// loop's current state without extra buttons.
// ------------------------------------------------------------------

import { useEffect, useState } from "react";

export type ReplyStatus = "confirmed" | "here" | "on-way";
export type Reply = { status: ReplyStatus; at: number };
export type Texted = { at: number };

let replies: Record<string, Reply> = {};
let texted: Record<string, Texted> = {};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export const REPLY_META: Record<ReplyStatus, { emoji: string; label: string }> = {
  confirmed: { emoji: "✓", label: "confirmed" },
  here:      { emoji: "📍", label: "here" },
  "on-way":  { emoji: "🏃", label: "on the way" },
};

export function setReply(serviceId: string, status: ReplyStatus) {
  replies = { ...replies, [serviceId]: { status, at: Date.now() } };
  emit();
}

export function getReply(serviceId: string): Reply | undefined {
  return replies[serviceId];
}

export function clearReply(serviceId: string) {
  if (!replies[serviceId]) return;
  const next = { ...replies };
  delete next[serviceId];
  replies = next;
  emit();
}

export function markTexted(serviceId: string) {
  texted = { ...texted, [serviceId]: { at: Date.now() } };
  emit();
}

export function getTexted(serviceId: string): Texted | undefined {
  return texted[serviceId];
}

export function clearTexted(serviceId: string) {
  if (!texted[serviceId]) return;
  const next = { ...texted };
  delete next[serviceId];
  texted = next;
  emit();
}

export function usePractitionerReplies() {
  const [snap, setSnap] = useState({ replies, texted });
  useEffect(() => {
    const fn = () => setSnap({ replies, texted });
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  return snap;
}

const fmtTime = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function replyLine(reply: Reply, practitionerName: string): string {
  const short = practitionerName.replace(/^(Dr\.?|Mr\.?|Ms\.?)\s+/i, "").split(/\s+/)[0];
  const meta = REPLY_META[reply.status];
  return `${meta.emoji} ${short} ${meta.label} · ${fmtTime(reply.at)}`;
}

export function textedLine(t: Texted, practitionerName: string): string {
  const short = practitionerName.replace(/^(Dr\.?|Mr\.?|Ms\.?)\s+/i, "").split(/\s+/)[0];
  return `✓ texted ${short} · ${fmtTime(t.at)}`;
}
