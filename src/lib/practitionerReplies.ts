// ------------------------------------------------------------------
// Practitioner replies — tiny mutable store for the "Notify" cue loop.
// When the front desk clicks Confirmed / Here / On the way, we stamp
// the reply here so the linked session card can show a meta line
// under the practitioner name.
// ------------------------------------------------------------------

import { useEffect, useState } from "react";

export type ReplyStatus = "confirmed" | "here" | "on-way";
export type Reply = { status: ReplyStatus; at: number };

let replies: Record<string, Reply> = {};
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

export function usePractitionerReplies() {
  const [snap, setSnap] = useState(replies);
  useEffect(() => {
    const fn = () => setSnap(replies);
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
