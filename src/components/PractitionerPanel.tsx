import { useEffect, useMemo, useRef, useState } from "react";
import { X, Phone, MessageSquare, Mail, Plus, Search } from "lucide-react";
import {
  usePractitioners,
  closePractitionerPanel,
  availabilityFor,
  addAvailability,
  removeAvailability,
  updatePractitioner,
  addPractitionerOffering,
  removePractitionerOffering,
  servicesForPractitioner,
  openReservation,
  dateKeyOf,
  type AvailabilityBlock,
  type AvailabilitySource,
} from "@/lib/practitionerStore";
import {
  roomColor,
  allOfferings,
  setupMinutesFor,
  fmt,
  type Service,
} from "@/lib/catalog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// --- typography tokens matched to routes/index.tsx ------------------
const DISPLAY = "'Inter Tight', Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = "'Instrument Serif', 'Cormorant Garamond', Georgia, serif";
const INK = "#0a0a0a";
const META = "#475569";

// --- day coordinates (identical to the room timeline) --------------
const DAY_START_MIN = 5 * 60;
const DAY_END_MIN = 24 * 60;
const DAY_SPAN = DAY_END_MIN - DAY_START_MIN;
const PX_PER_MIN = 2.4;
const TOP_PAD = 16;
const TRACK_HEIGHT = DAY_SPAN * PX_PER_MIN + TOP_PAD * 2;
const TIME_COL = 58;

const SOURCE_LABEL: Record<AvailabilitySource, string> = {
  self: "Front desk",
  phone: "Called in",
  text: "Text reply",
};

const clampMin = (m: number) => Math.max(0, Math.min(DAY_SPAN, m));
const snap15 = (m: number) => Math.round(m / 15) * 15;
const minToPx = (m: number) => TOP_PAD + m * PX_PER_MIN;
const pxToMin = (px: number) => clampMin(snap15((px - TOP_PAD) / PX_PER_MIN));

// Hex → soft tint (mix toward white by ratio).
function tint(hex: string, ratio: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * ratio);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

// Marker-pen highlight — identical to the home-page <Highlight/> band.
function Highlight({
  children,
  color,
  className = "",
}: {
  children: React.ReactNode;
  color: string;
  className?: string;
}) {
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

// Subtract booked spans from an availability block; return the remaining
// pieces so a reservation *replaces* availability visually.
function subtract(block: AvailabilityBlock, spans: Array<{ start: number; end: number }>) {
  let pieces: Array<{ start: number; end: number }> = [{ start: block.start, end: block.end }];
  for (const cut of spans) {
    const next: typeof pieces = [];
    for (const p of pieces) {
      if (cut.end <= p.start || cut.start >= p.end) { next.push(p); continue; }
      if (cut.start > p.start) next.push({ start: p.start, end: Math.min(p.end, cut.start) });
      if (cut.end < p.end) next.push({ start: Math.max(p.start, cut.end), end: p.end });
    }
    pieces = next;
  }
  return pieces.filter((p) => p.end - p.start >= 10);
}

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
  const rawBlocks = practitioner ? availabilityFor(practitioner.id, dateKey) : [];
  const bookings = practitioner ? servicesForPractitioner(practitioner.name, dateKey) : [];
  const bookingSpans = bookings.map((b) => ({ start: b.start, end: b.end }));

  // Availability actually shown = raw blocks minus booked time.
  const shownAvailability = useMemo(
    () => rawBlocks.flatMap((b) => subtract(b, bookingSpans).map((seg) => ({ ...b, ...seg }))),
    [rawBlocks, bookings],
  );

  const isToday = dateKey === dateKeyOf(new Date());
  const dateLabel = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const contextCovered = useMemo(() => {
    if (!practitioner || !panelContext?.start || !panelContext?.end) return false;
    return shownAvailability.some((b) => b.start <= panelContext.start! && b.end >= panelContext.end!);
  }, [shownAvailability, panelContext, practitioner]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  };

  const handleAdd = (start: number, end: number, source: AvailabilitySource) => {
    if (!practitioner || start >= end) return;
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

  const openBooking = (id: string) => {
    closePractitionerPanel();
    setTimeout(() => openReservation(id), 60);
  };

  const availableOfferings = useMemo(() => {
    if (!practitioner) return [];
    const cat = allOfferings();
    const have = new Set(practitioner.offerings);
    return cat.filter((o) => !have.has(o));
  }, [practitioner]);

  return (
    <>
      <div
        aria-hidden
        onClick={closePractitionerPanel}
        className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={practitioner ? practitioner.name : "Practitioner"}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[600px] flex-col bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.20)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: DISPLAY, color: INK }}
      >
        {!practitioner ? null : (
          <>
            {/* Match main-page interface line: thin colored rail across the top */}
            <span
              aria-hidden
              className="h-[2px] w-full shrink-0"
              style={{ background: practitioner.colorHue }}
            />

            {/* Header row — matches ReservationPanel */}
            <div className="flex items-start gap-4 px-7 pt-6 pb-2">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] uppercase tracking-[0.18em] text-black/45" style={{ fontFamily: MONO }}>
                  Practitioner
                </div>
                <h2
                  className="mt-2 text-[30px] font-semibold leading-[1.05] tracking-[-0.025em]"
                  style={{ fontFamily: DISPLAY, color: INK }}
                >
                  {practitioner.name}
                </h2>
              </div>
              <button
                aria-label="Close"
                onClick={closePractitionerPanel}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-none text-black/50 hover:bg-black/[0.04] hover:text-black"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            {/* Contact row — mono numbers, italic serif labels, matches card language */}
            <div className="flex shrink-0 flex-col gap-1.5 border-b border-black/[0.06] px-7 pb-5 pt-3">
              {practitioner.phone && (
                <div className="flex items-center gap-3">
                  <span
                    className="w-14 shrink-0 text-[13px] italic leading-none"
                    style={{ fontFamily: SERIF, color: META, opacity: 0.75 }}
                  >
                    phone
                  </span>
                  <span
                    className="text-[17px] font-semibold tabular-nums leading-none tracking-tight"
                    style={{ fontFamily: MONO, color: INK }}
                  >
                    {practitioner.phone}
                  </span>
                  <a
                    href={`tel:${practitioner.phone.replace(/\s+/g, "")}`}
                    className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-black/70 underline decoration-black/25 underline-offset-4 hover:decoration-black"
                  >
                    <Phone size={12} strokeWidth={2} /> Call
                  </a>
                  <a
                    href={`sms:${practitioner.phone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-1 text-[12.5px] font-medium text-black/70 underline decoration-black/25 underline-offset-4 hover:decoration-black"
                  >
                    <MessageSquare size={12} strokeWidth={2} /> Text
                  </a>
                </div>
              )}
              {practitioner.email && (
                <div className="flex items-center gap-3">
                  <span
                    className="w-14 shrink-0 text-[13px] italic leading-none"
                    style={{ fontFamily: SERIF, color: META, opacity: 0.75 }}
                  >
                    email
                  </span>
                  <a
                    href={`mailto:${practitioner.email}`}
                    className="truncate text-[15px] font-medium leading-none text-black hover:underline"
                    style={{ fontFamily: MONO }}
                  >
                    {practitioner.email}
                  </a>
                  <a
                    href={`mailto:${practitioner.email}`}
                    className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-medium text-black/70 underline decoration-black/25 underline-offset-4 hover:decoration-black"
                  >
                    <Mail size={12} strokeWidth={2} /> Send
                  </a>
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8">
              {/* Reservation-in-flight context (assignment picker) */}
              {panelContext?.service && panelContext.start != null && panelContext.end != null && (
                <div className="mt-5 border-t border-b border-black/[0.08] py-4">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                    For this reservation
                  </div>
                  <div className="mt-1.5 text-[17px] font-semibold text-black" style={{ fontFamily: DISPLAY }}>
                    {panelContext.service}
                    {panelContext.room && <span className="text-black/45"> · {panelContext.room}</span>}
                  </div>
                  <div className="mt-0.5 text-[13px] tabular-nums" style={{ fontFamily: MONO, color: META }}>
                    {fmt(panelContext.start)} – {fmt(panelContext.end)}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
                    {panelContext.onAssign && (
                      <button
                        onClick={assignForContext}
                        className="font-semibold text-black underline decoration-black/40 decoration-2 underline-offset-4 hover:decoration-black"
                      >
                        Assign to this reservation →
                      </button>
                    )}
                    {!contextCovered && (
                      <>
                        <button
                          onClick={() => markContextAvailable("phone")}
                          className="text-black/70 underline decoration-black/25 underline-offset-4 hover:text-black hover:decoration-black"
                        >
                          Called — mark available
                        </button>
                        <button
                          onClick={() => markContextAvailable("text")}
                          className="text-black/70 underline decoration-black/25 underline-offset-4 hover:text-black hover:decoration-black"
                        >
                          Texted — mark available
                        </button>
                      </>
                    )}
                    {contextCovered && (
                      <span className="text-black/60">
                        <Highlight color={tint(practitioner.colorHue, 0.7)}>Available for this slot</Highlight>
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Offerings — marker-pen highlighter chips + elegant popover */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                    Offerings
                  </div>
                  <AddOfferingPopover
                    options={availableOfferings}
                    onAdd={(o) => addPractitionerOffering(practitioner.id, o)}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-2 gap-y-3 text-[16px] leading-[1.9]" style={{ fontFamily: DISPLAY }}>
                  {practitioner.offerings.length === 0 && (
                    <span className="text-[13.5px] italic text-black/45" style={{ fontFamily: SERIF }}>
                      no offerings yet — add one →
                    </span>
                  )}
                  {practitioner.offerings.map((o) => (
                    <span key={o} className="group inline-flex items-center gap-1">
                      <Highlight color={tint(practitioner.colorHue, 0.72)}>{o}</Highlight>
                      <button
                        type="button"
                        aria-label={`Remove ${o}`}
                        onClick={() => removePractitionerOffering(practitioner.id, o)}
                        className="ml-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X size={11} strokeWidth={2} className="text-black/40 hover:text-black" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Day header */}
              <div className="mt-8 flex items-baseline justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                    Schedule
                  </div>
                  <div className="mt-1.5 text-[20px] font-semibold tracking-[-0.02em]" style={{ fontFamily: DISPLAY }}>
                    {isToday ? "Today · " : ""}{dateLabel}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[12.5px] font-medium text-black/60" style={{ fontFamily: MONO }}>
                  <button onClick={() => shiftDate(-1)} className="hover:text-black">‹ Prev</button>
                  <button onClick={() => setDate(new Date())} className="hover:text-black">Today</button>
                  <button onClick={() => shiftDate(1)} className="hover:text-black">Next ›</button>
                </div>
              </div>

              <div className="mt-2 text-[12px] italic text-black/50" style={{ fontFamily: SERIF }}>
                drag empty space to mark available · click a block to remove
              </div>

              <ScheduleCanvas
                practitionerHue={practitioner.colorHue}
                availability={shownAvailability}
                bookings={bookings}
                onAdd={(s, e) => handleAdd(s, e, "self")}
                onRemove={(id) => removeAvailability(id)}
                onOpenBooking={openBooking}
              />

              {/* Notes */}
              <div className="mt-8">
                <div className="text-[11px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                  Notes
                </div>
                <textarea
                  value={practitioner.notes ?? ""}
                  onChange={(e) => updatePractitioner(practitioner.id, { notes: e.target.value })}
                  rows={3}
                  placeholder="Preferences, contact quirks, anything the front desk should know…"
                  className="mt-2 w-full resize-none border-b border-black/15 bg-transparent px-0 py-1.5 text-[14px] leading-relaxed text-black placeholder:italic placeholder:text-black/35 focus:border-black focus:outline-none"
                  style={{ fontFamily: DISPLAY }}
                />
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

// -------------------------------------------------------------------
// Elegant offering picker — searchable popover, not a wall of pills.
// -------------------------------------------------------------------
function AddOfferingPopover({
  options,
  onAdd,
}: {
  options: string[];
  onAdd: (o: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => options.filter((o) => o.toLowerCase().includes(q.toLowerCase())),
    [options, q],
  );
  if (options.length === 0) return null;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-black/70 underline decoration-black/25 underline-offset-4 hover:text-black hover:decoration-black"
          style={{ fontFamily: DISPLAY }}
        >
          <Plus size={12} strokeWidth={2.25} />
          Add offering
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-72 rounded-none border border-black/10 bg-white p-0 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-center gap-2 border-b border-black/[0.08] px-3 py-2.5">
          <Search size={13} strokeWidth={2} className="text-black/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search offerings…"
            className="flex-1 border-0 bg-transparent p-0 text-[13.5px] outline-none placeholder:italic placeholder:text-black/35"
            style={{ fontFamily: DISPLAY }}
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-[13px] italic text-black/45" style={{ fontFamily: SERIF }}>
              no matches
            </div>
          )}
          {filtered.map((o) => (
            <button
              key={o}
              onClick={() => { onAdd(o); setQ(""); setOpen(false); }}
              className="block w-full px-3 py-1.5 text-left text-[14px] text-black hover:bg-black/[0.04]"
              style={{ fontFamily: DISPLAY }}
            >
              {o}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// -------------------------------------------------------------------
// Schedule canvas — white surface, mono hour gutter, availability as
// bordered white blocks labeled "Available" (no green fill), and
// reservations rendered as small versions of the main timeline card.
// Booked spans are already subtracted from availability upstream.
// -------------------------------------------------------------------
function ScheduleCanvas({
  practitionerHue,
  availability,
  bookings,
  onAdd,
  onRemove,
  onOpenBooking,
}: {
  practitionerHue: string;
  availability: Array<AvailabilityBlock & { start: number; end: number }>;
  bookings: Service[];
  onAdd: (start: number, end: number) => void;
  onRemove: (id: string) => void;
  onOpenBooking: (id: string) => void;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<{ anchor: number; cursor: number } | null>(null);
  const hours = useMemo(() => Array.from({ length: 20 }, (_, i) => 5 + i), []);

  const yToMin = (clientY: number) => {
    const el = surfaceRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return pxToMin(clientY - rect.top);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-blocker]")) return;
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

  const nowMin = (() => {
    const now = new Date();
    const wall = now.getHours() * 60 + now.getMinutes() - DAY_START_MIN;
    return wall >= 0 && wall <= DAY_SPAN ? wall : null;
  })();

  return (
    <div className="mt-4 overflow-hidden border-t border-b border-black/[0.08] bg-white">
      <div className="max-h-[520px] overflow-y-auto">
        <div className="flex" style={{ position: "relative" }}>
          {/* time gutter */}
          <div
            className="shrink-0 select-none border-r border-black/[0.06]"
            style={{ width: TIME_COL, height: TRACK_HEIGHT, position: "relative" }}
          >
            {hours.map((h) => {
              const top = minToPx(h * 60 - DAY_START_MIN);
              const label = h === 24 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
              return (
                <div
                  key={h}
                  className="absolute text-[10.5px] tabular-nums text-black/45"
                  style={{ top: top - 6, right: 8, fontFamily: MONO }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* interactive surface */}
          <div
            ref={surfaceRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={commit}
            onPointerCancel={() => setDraft(null)}
            className="relative flex-1 cursor-crosshair bg-white"
            style={{ height: TRACK_HEIGHT }}
          >
            {/* hour + quarter-hour rules */}
            {hours.flatMap((h) =>
              [0, 15, 30, 45].map((m) => {
                const min = h * 60 + m - DAY_START_MIN;
                if (min < 0 || min > DAY_SPAN) return null;
                const top = minToPx(min);
                const isHour = m === 0;
                return (
                  <div
                    key={`${h}-${m}`}
                    className="pointer-events-none absolute left-0 right-0"
                    style={{
                      top,
                      height: 1,
                      background: isHour ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.03)",
                    }}
                  />
                );
              }),
            )}

            {/* now line */}
            {nowMin != null && (
              <div
                className="pointer-events-none absolute left-0 right-0 z-20"
                style={{ top: minToPx(nowMin), height: 1, background: INK, opacity: 0.35 }}
              />
            )}

            {/* Availability — plain white block, thin inner border, "Available" label */}
            {availability.map((b, i) => {
              const top = minToPx(b.start);
              const h = Math.max(20, (b.end - b.start) * PX_PER_MIN);
              return (
                <div
                  key={`av-${b.id}-${i}`}
                  data-blocker
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Remove availability ${fmt(b.start)} – ${fmt(b.end)}?`)) onRemove(b.id);
                  }}
                  className="group absolute inset-x-2 z-[1] cursor-pointer bg-white transition-shadow"
                  style={{
                    top,
                    height: h,
                    boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.08)`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 0 0 1px rgba(0,0,0,0.20)`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 0 0 1px rgba(0,0,0,0.08)`;
                  }}
                >
                  <div className="flex h-full flex-col justify-between px-3 py-2">
                    <div
                      className="text-[11px] uppercase tracking-[0.16em]"
                      style={{ color: INK, fontFamily: MONO }}
                    >
                      Available
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <span
                        className="text-[12px] tabular-nums"
                        style={{ color: META, fontFamily: MONO }}
                      >
                        {fmt(b.start)} – {fmt(b.end)}
                      </span>
                      <span
                        className="text-[11px] italic"
                        style={{ color: META, opacity: 0.7, fontFamily: SERIF }}
                      >
                        {SOURCE_LABEL[b.source]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Reservation cards — mirror the main timeline card exactly */}
            {bookings.map((s) => {
              const top = minToPx(s.start);
              const h = Math.max(64, (s.end - s.start) * PX_PER_MIN);
              const rc = roomColor(s.room);
              const now = new Date();
              const wallMin = now.getHours() * 60 + now.getMinutes() - DAY_START_MIN;
              const isLive = s.start <= wallMin && s.end > wallMin;
              const isPast = s.end <= wallMin;
              const isRequest = s.status === "requested";
              const duration = s.end - s.start;
              const serviceColor = isPast ? tint(rc, 0.5) : rc;
              const metaColor = isPast ? "#4a4a4a" : "#2a2a2a";
              const baseShadow = isLive
                ? `2px 3px 0 -1px rgba(15,23,42,0.05), 4px 8px 18px -10px ${tint(rc, 0.45)}, 0 0 0 1px ${tint(rc, 0.15)}`
                : isRequest
                  ? "2px 3px 0 -1px rgba(15,23,42,0.05), 4px 8px 16px -10px rgba(217,119,6,0.35)"
                  : "2px 3px 0 -1px rgba(15,23,42,0.04), 3px 5px 12px -8px rgba(15,23,42,0.14)";
              const hoverShadow = `2px 4px 0 -1px rgba(15,23,42,0.05), 8px 14px 28px -12px ${tint(rc, 0.26)}, 0 0 0 1px ${tint(rc, 0.18)}`;
              return (
                <div
                  key={s.id}
                  data-blocker
                  onClick={(e) => { e.stopPropagation(); onOpenBooking(s.id); }}
                  className="group absolute inset-x-2 z-[3] flex flex-col cursor-pointer bg-white transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-[1px]"
                  style={{
                    top: top + 1,
                    minHeight: Math.max(h - 2, 96),
                    boxShadow: baseShadow,
                    opacity: isPast ? 0.9 : 1,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = hoverShadow; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = baseShadow; }}
                >
                  {/* top rail — same as main card */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[2px] transition-[height] duration-200 ease-out group-hover:h-[3px]"
                    style={{
                      background: isRequest
                        ? "repeating-linear-gradient(to right, #d97706 0 6px, transparent 6px 10px)"
                        : rc,
                    }}
                  />

                  <div className="relative z-10 flex flex-1 flex-col px-3 pt-3 pb-2.5">
                    {/* Time — from / to on separate lines, big */}
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

                    {/* Offering — the heading, in room chroma */}
                    <div
                      className="mt-2.5 text-[21px] font-semibold leading-[1.05] tracking-[-0.025em]"
                      style={{ color: serviceColor, fontFamily: DISPLAY }}
                    >
                      {s.service}
                    </div>

                    {/* Room — secondary, black */}
                    <div
                      className="mt-1 text-[15px] font-semibold leading-[1.15] tracking-[-0.015em]"
                      style={{ color: "#0a0a0a", fontFamily: DISPLAY }}
                    >
                      {s.room}
                    </div>

                    {/* for {guest} */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      {isLive && (
                        <span className="relative inline-flex h-2.5 w-2.5 shrink-0">
                          <span
                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                            style={{ background: rc }}
                          />
                          <span
                            className="relative inline-flex h-2.5 w-2.5 rounded-full"
                            style={{ background: rc }}
                          />
                        </span>
                      )}
                      <span
                        className="text-[13px] italic leading-tight"
                        style={{ color: META, fontFamily: SERIF, opacity: 0.7 }}
                      >
                        for
                      </span>
                      <div
                        className="truncate text-[15px] font-semibold leading-tight"
                        style={{ color: INK, fontFamily: DISPLAY }}
                      >
                        {s.guest}
                        {s.partySize ? ` +${s.partySize - 1}` : ""}
                      </div>
                      {isRequest && (
                        <span
                          className="ml-auto rounded-sm px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.14em]"
                          style={{ color: "#b45309", background: "rgba(217,119,6,0.10)", fontFamily: MONO }}
                        >
                          Request
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* drag draft */}
            {draft && (() => {
              const s = Math.min(draft.anchor, draft.cursor);
              const e = Math.max(draft.anchor, draft.cursor);
              const top = minToPx(s);
              const h = Math.max(6, (e - s) * PX_PER_MIN);
              return (
                <div
                  className="pointer-events-none absolute inset-x-2 z-[4] bg-white"
                  style={{
                    top,
                    height: h,
                    boxShadow: `inset 0 0 0 1px ${practitionerHue}`,
                  }}
                >
                  <div className="flex items-center justify-between px-3 pt-1.5">
                    <span className="text-[10.5px] uppercase tracking-[0.16em]" style={{ color: INK, fontFamily: MONO }}>
                      Available
                    </span>
                    <span className="text-[11px] tabular-nums" style={{ color: META, fontFamily: MONO }}>
                      {fmt(s)} – {fmt(e)}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
