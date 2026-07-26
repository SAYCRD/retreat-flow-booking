import { useEffect, useMemo, useRef, useState } from "react";
import { X, Phone, MessageSquare, Sparkles, Trash2, Plus, Check } from "lucide-react";
import {
  usePractitioners,
  closePractitionerPanel,
  availabilityFor,
  addAvailability,
  removeAvailability,
  updatePractitioner,
  dateKeyOf,
  type AvailabilityBlock,
  type AvailabilitySource,
} from "@/lib/practitionerStore";

const DISPLAY = "'Inter Tight', Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const INK = "#0a0a0a";
const ACCENT = "#3730ff";
const AVAILABLE = "#16a34a"; // green
const AVAILABLE_TINT = "rgba(22,163,74,0.14)";

// Same timeline coordinate system as routes/index.tsx
const DAY_START_MIN = 5 * 60;
const DAY_END_MIN = 24 * 60;
const DAY_SPAN = DAY_END_MIN - DAY_START_MIN;
const PX_PER_MIN = 2.4;
const TOP_PAD = 12;
const TRACK_HEIGHT = DAY_SPAN * PX_PER_MIN + TOP_PAD * 2;
const TIME_COL = 60;

const fmtTime = (mins: number) => {
  const abs = mins + DAY_START_MIN;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 24) return `12:${String(m).padStart(2, "0")} AM`;
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
};

const clampMin = (m: number) => Math.max(0, Math.min(DAY_SPAN, m));
const snap15 = (m: number) => Math.round(m / 15) * 15;
const minToPx = (m: number) => TOP_PAD + m * PX_PER_MIN;
const pxToMin = (px: number) => clampMin(snap15((px - TOP_PAD) / PX_PER_MIN));

const SOURCE_LABEL: Record<AvailabilitySource, string> = {
  self: "Self-marked",
  phone: "Called in",
  text: "Text reply",
};

export function PractitionerPanel() {
  const { panelOpen, panelContext, practitioners } = usePractitioners();
  const practitioner = panelOpen ? practitioners.find((p) => p.id === panelOpen) : null;
  const open = !!practitioner;

  const [date, setDate] = useState<Date>(() => new Date());

  useEffect(() => {
    if (panelContext?.date) {
      const [y, m, d] = panelContext.date.split("-").map(Number);
      if (Number.isFinite(y)) setDate(new Date(y, m - 1, d));
    } else if (panelOpen) {
      setDate(new Date());
    }
  }, [panelOpen, panelContext?.date]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePractitionerPanel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const dateKey = dateKeyOf(date);
  const blocks = practitioner ? availabilityFor(practitioner.id, dateKey) : [];

  const isToday = dateKey === dateKeyOf(new Date());
  const dateLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const contextCovered = useMemo(() => {
    if (!practitioner || !panelContext?.start || !panelContext?.end) return false;
    return blocks.some((b) => b.start <= panelContext.start! && b.end >= panelContext.end!);
  }, [blocks, panelContext, practitioner]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  };

  const handleAdd = (start: number, end: number, source: AvailabilitySource) => {
    if (!practitioner || start >= end) return;
    // Merge overlapping same-day blocks so the calendar stays clean.
    const same = availabilityFor(practitioner.id, dateKey);
    const overlapping = same.filter((b) => b.start < end && b.end > start);
    overlapping.forEach((b) => removeAvailability(b.id));
    const mergedStart = Math.min(start, ...overlapping.map((b) => b.start));
    const mergedEnd = Math.max(end, ...overlapping.map((b) => b.end));
    addAvailability({ practitionerId: practitioner.id, date: dateKey, start: mergedStart, end: mergedEnd, source });
  };

  const assignForContext = () => {
    if (!practitioner || !panelContext?.onAssign) return;
    panelContext.onAssign(practitioner.id, practitioner.name);
    closePractitionerPanel();
  };

  const markContextAvailable = (source: AvailabilitySource) => {
    if (!practitioner || panelContext?.start == null || panelContext?.end == null) return;
    handleAdd(panelContext.start, panelContext.end, source);
  };

  return (
    <>
      <div
        aria-hidden
        onClick={closePractitionerPanel}
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={practitioner ? practitioner.name : "Practitioner"}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[560px] flex-col bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: DISPLAY, color: INK }}
      >
        {!practitioner ? null : (
          <>
            <div className="h-[3px] w-full shrink-0" style={{ background: practitioner.colorHue }} />

            <div className="flex items-start gap-4 px-7 pt-6 pb-5">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-white"
                style={{ background: practitioner.colorHue }}
              >
                {practitioner.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                  Practitioner
                </div>
                <h2 className="mt-1 truncate text-[24px] font-semibold tracking-[-0.02em] text-black">
                  {practitioner.name}
                </h2>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {practitioner.offerings.slice(0, 4).map((o) => (
                    <span
                      key={o}
                      className="rounded-full border border-black/10 bg-black/[0.03] px-2 py-0.5 text-[11px] font-medium text-black/70"
                    >
                      {o}
                    </span>
                  ))}
                  {practitioner.offerings.length > 4 && (
                    <span className="text-[11px] text-black/45">+{practitioner.offerings.length - 4}</span>
                  )}
                </div>
              </div>
              <button
                aria-label="Close"
                onClick={closePractitionerPanel}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-black/50 hover:bg-black/[0.05] hover:text-black"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contact actions */}
            <div className="flex shrink-0 items-center gap-2 px-7 pb-4">
              {practitioner.phone && (
                <>
                  <a
                    href={`tel:${practitioner.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black hover:border-black/30"
                  >
                    <Phone size={13} />
                    Call
                  </a>
                  <a
                    href={`sms:${practitioner.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black hover:border-black/30"
                  >
                    <MessageSquare size={13} />
                    Text
                  </a>
                  <span className="text-[12px] tabular-nums text-black/50" style={{ fontFamily: MONO }}>
                    {practitioner.phone}
                  </span>
                </>
              )}
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6">
              {/* Reservation-in-flight context */}
              {panelContext?.service && panelContext.start != null && panelContext.end != null && (
                <div
                  className="mb-5 rounded-[10px] border p-3.5"
                  style={{
                    borderColor: contextCovered ? "rgba(22,163,74,0.28)" : "rgba(55,48,255,0.20)",
                    background: contextCovered ? "rgba(22,163,74,0.06)" : "rgba(55,48,255,0.04)",
                  }}
                >
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-black/50" style={{ fontFamily: MONO }}>
                    For this reservation
                  </div>
                  <div className="mt-1 text-[14px] font-semibold text-black">
                    {panelContext.service}
                    {panelContext.room ? <span className="text-black/50"> · {panelContext.room}</span> : null}
                  </div>
                  <div className="mt-0.5 text-[12.5px] tabular-nums text-black/60" style={{ fontFamily: MONO }}>
                    {fmtTime(panelContext.start)} – {fmtTime(panelContext.end)}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {panelContext.onAssign && (
                      <button
                        onClick={assignForContext}
                        className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
                        style={{ background: ACCENT }}
                      >
                        <Check size={13} strokeWidth={2.5} />
                        Assign to this reservation
                      </button>
                    )}
                    {!contextCovered && (
                      <>
                        <button
                          onClick={() => markContextAvailable("phone")}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black hover:border-black/30"
                        >
                          <Phone size={13} />
                          Called — mark available
                        </button>
                        <button
                          onClick={() => markContextAvailable("text")}
                          className="inline-flex items-center gap-1.5 rounded-[8px] border border-black/10 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-black hover:border-black/30"
                        >
                          <MessageSquare size={13} />
                          Texted — mark available
                        </button>
                      </>
                    )}
                    {contextCovered && (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: AVAILABLE }}>
                        <Sparkles size={13} />
                        Available for this slot
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Date navigator */}
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-[10.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
                    Availability
                  </div>
                  <div className="mt-0.5 text-[15px] font-semibold text-black">
                    {isToday ? "Today · " : ""}{dateLabel}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => shiftDate(-1)}
                    className="rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[12px] font-semibold text-black/70 hover:border-black/30"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setDate(new Date())}
                    className="rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[11.5px] font-semibold text-black/70 hover:border-black/30"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => shiftDate(1)}
                    className="rounded-[6px] border border-black/10 bg-white px-2 py-1 text-[12px] font-semibold text-black/70 hover:border-black/30"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="mb-2 flex items-center gap-3 text-[11.5px] text-black/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: AVAILABLE }} />
                  Available
                </span>
                <span className="text-black/40">Drag on the timeline to add · click a block to remove</span>
              </div>

              <AvailabilityCanvas
                blocks={blocks}
                onAdd={(s, e) => handleAdd(s, e, "self")}
                onRemove={(id) => removeAvailability(id)}
              />

              {/* Notes */}
              <div className="mt-6">
                <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
                  Notes
                </div>
                <textarea
                  value={practitioner.notes ?? ""}
                  onChange={(e) => updatePractitioner(practitioner.id, { notes: e.target.value })}
                  rows={3}
                  placeholder="Preferences, contact quirks, anything the front desk should know…"
                  className="w-full resize-none rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[13px] text-black placeholder:text-black/35 focus:border-black/40 focus:outline-none"
                />
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// ------------------------------------------------------------------
// Availability canvas — vertical timeline scoped to one practitioner /
// one day. Click-drag empty space to create a green availability block;
// click an existing block to remove it.
// ------------------------------------------------------------------

function AvailabilityCanvas({
  blocks,
  onAdd,
  onRemove,
}: {
  blocks: AvailabilityBlock[];
  onAdd: (start: number, end: number) => void;
  onRemove: (id: string) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<{ anchor: number; cursor: number } | null>(null);

  const hours = useMemo(() => Array.from({ length: 20 }, (_, i) => 5 + i), []); // 5am..12am

  const yToMin = (clientY: number) => {
    const el = surfaceRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return pxToMin(clientY - rect.top);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-av-block]")) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const m = yToMin(e.clientY);
    setDraft({ anchor: m, cursor: m });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draft) return;
    setDraft({ ...draft, cursor: yToMin(e.clientY) });
  };

  const commit = () => {
    if (!draft) return;
    const s = Math.min(draft.anchor, draft.cursor);
    const e = Math.max(draft.anchor, draft.cursor);
    if (e - s >= 15) onAdd(s, e);
    setDraft(null);
  };

  return (
    <div className="overflow-hidden rounded-[10px] border border-black/[0.08] bg-white">
      <div className="max-h-[440px] overflow-y-auto">
        <div className="flex" style={{ position: "relative" }}>
          {/* Time gutter */}
          <div className="shrink-0 select-none" style={{ width: TIME_COL, height: TRACK_HEIGHT, position: "relative" }}>
            {hours.map((h) => {
              const top = minToPx(h * 60 - DAY_START_MIN);
              const label = h === 24 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
              return (
                <div
                  key={h}
                  className="absolute text-[10.5px] text-black/45"
                  style={{ top: top - 6, right: 8, fontFamily: MONO }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Interactive surface */}
          <div
            ref={surfaceRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={commit}
            onPointerCancel={() => setDraft(null)}
            className="relative flex-1 cursor-crosshair"
            style={{ height: TRACK_HEIGHT, background: "repeating-linear-gradient(to bottom, transparent 0, transparent 59px, rgba(0,0,0,0.05) 59px, rgba(0,0,0,0.05) 60px)" }}
          >
            {/* hour ticks */}
            {hours.map((h) => {
              const top = minToPx(h * 60 - DAY_START_MIN);
              return <div key={h} className="pointer-events-none absolute left-0 right-0" style={{ top, height: 1, background: "rgba(0,0,0,0.05)" }} />;
            })}

            {/* existing blocks */}
            {blocks.map((b) => {
              const top = minToPx(b.start);
              const h = Math.max(14, (b.end - b.start) * PX_PER_MIN);
              return (
                <div
                  key={b.id}
                  data-av-block
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove availability ${fmtTime(b.start)} – ${fmtTime(b.end)}?`)) onRemove(b.id);
                  }}
                  className="group absolute left-1 right-2 cursor-pointer rounded-[6px] px-2 py-1 text-[11.5px] font-semibold transition hover:brightness-95"
                  style={{
                    top,
                    height: h,
                    background: AVAILABLE_TINT,
                    borderLeft: `3px solid ${AVAILABLE}`,
                    color: "#065f46",
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular-nums" style={{ fontFamily: MONO }}>
                      {fmtTime(b.start)} – {fmtTime(b.end)}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                      {SOURCE_LABEL[b.source]}
                    </span>
                  </div>
                  {b.note && <div className="mt-0.5 text-[10.5px] font-normal text-emerald-900/70">{b.note}</div>}
                </div>
              );
            })}

            {/* drag draft */}
            {draft && (() => {
              const s = Math.min(draft.anchor, draft.cursor);
              const e = Math.max(draft.anchor, draft.cursor);
              const top = minToPx(s);
              const h = Math.max(4, (e - s) * PX_PER_MIN);
              return (
                <div
                  className="pointer-events-none absolute left-1 right-2 rounded-[6px] px-2 py-1 text-[11.5px] font-semibold"
                  style={{
                    top,
                    height: h,
                    background: AVAILABLE_TINT,
                    borderLeft: `3px solid ${AVAILABLE}`,
                    color: "#065f46",
                  }}
                >
                  <span className="tabular-nums" style={{ fontFamily: MONO }}>
                    {fmtTime(s)} – {fmtTime(e)}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
