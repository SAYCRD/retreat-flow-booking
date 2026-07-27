import { useEffect, useMemo } from "react";
import { X, Phone, Mail, FileText, ShieldAlert, ExternalLink, CalendarRange, User } from "lucide-react";
import { GUESTS, getProtocols } from "@/lib/guestData";
import { roomColor, fmt, type Service } from "@/lib/catalog";

const DISPLAY = "'Inter Tight', Inter, system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const INK = "#0a0a0a";
const ACCENT = "#3730ff";

function tint(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name
    .split(/\s+|\s*&\s*/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[15px] font-semibold text-white shadow-sm"
      style={{ background: color }}
    >
      {initials || <User size={18} />}
    </div>
  );
}

function PanelRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[11.5px] uppercase tracking-[0.14em] text-black/45" style={{ fontFamily: MONO }}>
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
        <div className="text-[10.5px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
          {eyebrow}
        </div>
        {trailing}
      </div>
      {children}
    </section>
  );
}

export function GuestPanel({
  guestName,
  services,
  onClose,
  onNewBooking,
}: {
  guestName: string | null;
  services: Service[];
  onClose: () => void;
  onNewBooking?: (guestName: string) => void;
}) {
  const open = !!guestName;
  const guest = guestName ? GUESTS[guestName] : undefined;

  useEffect(() => {
    if (!guestName) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [guestName, onClose]);

  const journey = useMemo(() => {
    if (!guestName) return [] as Service[];
    return services
      .filter((s) => s.guest === guestName)
      .sort((a, b) => a.start - b.start);
  }, [guestName, services]);

  const firstRoomColor = journey.length > 0 ? roomColor(journey[0].room) : ACCENT;
  const gc = firstRoomColor;

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
        aria-label={guestName ? `${guestName} · Guest profile` : "Guest profile"}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[520px] flex-col bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.25)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: DISPLAY, color: INK }}
      >
        {!guestName ? null : (
          <>
            <div className="h-[3px] w-full shrink-0" style={{ background: gc }} />

            {/* Header */}
            <div className="flex items-start gap-4 px-7 pt-6 pb-5">
              <Avatar name={guestName} color={gc} />
              <div className="min-w-0 flex-1">
                <div className="text-[10.5px] uppercase tracking-[0.16em] text-black/45" style={{ fontFamily: MONO }}>
                  Guest
                </div>
                <h2 className="mt-1 truncate text-[24px] font-semibold tracking-[-0.02em] text-black">
                  {guestName}
                </h2>
                <div className="mt-1 text-[14px] font-medium text-black/55">
                  {journey.length} booking{journey.length === 1 ? "" : "s"} today
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
              {/* Quick actions */}
              <div className="flex items-center gap-2 border-t border-black/[0.08] pt-5">
                {guest && (
                  <>
                    <a
                      href={`tel:${guest.phone.replace(/\s+/g, "")}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold text-black/80 hover:border-black/25 hover:text-black"
                    >
                      <Phone size={14} strokeWidth={2} />
                      Call
                    </a>
                    <a
                      href={`mailto:${guest.email}`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] border border-black/10 bg-white px-3 py-2 text-[13px] font-semibold text-black/80 hover:border-black/25 hover:text-black"
                    >
                      <Mail size={14} strokeWidth={2} />
                      Email
                    </a>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => onNewBooking?.(guestName)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-[8px] px-3 py-2 text-[13px] font-semibold text-white hover:opacity-90"
                  style={{ background: INK }}
                >
                  <CalendarRange size={14} strokeWidth={2} />
                  New booking
                </button>
              </div>

              {/* Contact */}
              {guest && (
                <PanelSection eyebrow="Contact">
                  <dl className="grid grid-cols-[110px_1fr] gap-y-3 text-[14px]">
                    <PanelRow label="Phone">
                      <a
                        href={`tel:${guest.phone.replace(/\s+/g, "")}`}
                        className="font-semibold tabular-nums text-black hover:underline"
                        style={{ fontFamily: MONO }}
                      >
                        {guest.phone}
                      </a>
                    </PanelRow>
                    <PanelRow label="Email">
                      <a href={`mailto:${guest.email}`} className="font-semibold text-black hover:underline">
                        {guest.email}
                      </a>
                    </PanelRow>
                    {guest.pronouns && (
                      <PanelRow label="Pronouns">
                        <span className="text-black/70" style={{ fontFamily: MONO }}>
                          {guest.pronouns}
                        </span>
                      </PanelRow>
                    )}
                  </dl>
                </PanelSection>
              )}

              {/* Notes */}
              {guest?.notes && (
                <PanelSection eyebrow="Notes">
                  <p className="text-[14px] leading-relaxed text-black/80">{guest.notes}</p>
                </PanelSection>
              )}

              {/* Contraindications */}
              {guest && (guest.contraindications?.length ?? 0) > 0 && (
                <PanelSection
                  eyebrow="Contraindications"
                  trailing={
                    <span
                      className="text-[11px] text-black/45"
                      style={{ fontFamily: MONO }}
                    >
                      {guest.contraindications!.length} item
                      {guest.contraindications!.length === 1 ? "" : "s"}
                    </span>
                  }
                >
                  <ul className="space-y-2">
                    {guest.contraindications!.map((c, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-[8px] border border-rose-200/70 bg-rose-50/60 px-3 py-2.5">
                        <ShieldAlert size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-rose-600" />
                        <span className="text-[13.5px] leading-snug text-rose-900">{c}</span>
                      </li>
                    ))}
                  </ul>
                </PanelSection>
              )}

              {/* Waiver */}
              {guest && (
                <PanelSection
                  eyebrow="Waiver"
                  trailing={
                    guest.waiverSignedOn ? (
                      <span className="text-[11px] font-medium text-emerald-700" style={{ fontFamily: MONO }}>
                        Signed {guest.waiverSignedOn}
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-amber-700" style={{ fontFamily: MONO }}>
                        Not signed
                      </span>
                    )
                  }
                >
                  {guest.waiverSignedOn ? (
                    <div className="flex items-center gap-2 text-[13.5px] text-black/70">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                        <FileText size={13} strokeWidth={2.5} />
                      </span>
                      Waiver on file · signed {guest.waiverSignedOn}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-[13.5px] text-amber-800">
                        <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-amber-700">
                          <FileText size={13} strokeWidth={2.5} />
                        </span>
                        Required before session starts
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="inline-flex items-center gap-2 rounded-[8px] bg-amber-600 px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-amber-700">
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
              )}

              {/* Today's journey */}
              {journey.length > 0 && (
                <PanelSection
                  eyebrow="Today's journey"
                  trailing={
                    <span
                      className="rounded-[3px] px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums leading-none"
                      style={{ background: tint(gc, 0.18), color: "#1a1a1a", fontFamily: MONO }}
                    >
                      {journey.length} leg{journey.length === 1 ? "" : "s"}
                    </span>
                  }
                >
                  <ol className="space-y-2">
                    {journey.map((leg, i) => {
                      const legColor = roomColor(leg.room);
                      return (
                        <li
                          key={leg.id}
                          className="flex items-start gap-3 rounded-[8px] px-2.5 py-2"
                          style={{ background: tint(legColor, 0.08) }}
                        >
                          <span
                            className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums text-white"
                            style={{ background: legColor, fontFamily: MONO }}
                          >
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <div className="truncate text-[14px] font-semibold leading-tight text-black">
                                {leg.service}
                              </div>
                              <div className="shrink-0 text-[11.5px] tabular-nums text-black/55" style={{ fontFamily: MONO }}>
                                {fmt(leg.start)}
                              </div>
                            </div>
                            <div className="mt-0.5 truncate text-[12px]" style={{ color: legColor, fontFamily: MONO }}>
                              {leg.room} · {leg.practitioner}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </PanelSection>
              )}

              {/* Session protocols */}
              {journey.length > 0 && (
                <PanelSection
                  eyebrow="Session protocols"
                  trailing={
                    <span className="text-[11px] text-black/45" style={{ fontFamily: MONO }}>
                      {journey.reduce((sum, leg) => sum + getProtocols(leg.service).length, 0)} item
                      {journey.reduce((sum, leg) => sum + getProtocols(leg.service).length, 0) === 1 ? "" : "s"}
                    </span>
                  }
                >
                  <div className="space-y-4">
                    {journey.map((leg) => {
                      const protocols = getProtocols(leg.service);
                      if (protocols.length === 0) return null;
                      const sevMeta = {
                        block: { label: "Blocker", bg: "bg-rose-50/70", border: "border-rose-200/70", dot: "bg-rose-500", text: "text-rose-900" },
                        confirm: { label: "Confirm", bg: "bg-amber-50/60", border: "border-amber-200/70", dot: "bg-amber-500", text: "text-amber-900" },
                        brief: { label: "Brief", bg: "bg-sky-50/60", border: "border-sky-200/70", dot: "bg-sky-500", text: "text-sky-900" },
                      } as const;
                      return (
                        <div key={leg.id}>
                          <div className="mb-2 text-[12.5px] font-semibold text-black">
                            {leg.service}
                            <span className="ml-2 text-[11px] font-normal text-black/50" style={{ fontFamily: MONO }}>
                              {fmt(leg.start)} · {leg.room}
                            </span>
                          </div>
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
                                    <div className={`text-[13px] font-medium leading-snug ${m.text}`}>{p.text}</div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </PanelSection>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  );
}
