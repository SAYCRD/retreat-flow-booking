import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Phone, Mail, Plus, ArrowRight, AlertCircle, ShieldCheck, FileText, ChevronLeft } from "lucide-react";
import { GUESTS, type GuestInfo } from "@/lib/guestData";
import { SEED_SERVICES, type Service } from "@/lib/catalog";

const DISPLAY = "'Inter Tight', 'Inter', system-ui, sans-serif";
const MONO = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace";
const SURFACE = "#ffffff";
const INK = "#0a0a0a";

const GUEST_COLORS: Record<string, string> = {
  "Elena Vives": "#4f46e5",
  "Nadia Farrow": "#0891b2",
  "Thomas Wren": "#059669",
  "Gerald & June Pierce": "#d946ef",
  "Amara Okonkwo": "#ea580c",
  "Marcus Hale": "#7c3aed",
  "Priya Anand": "#db2777",
  "Lena Costa": "#65a30d",
};

function initials(name: string) {
  const parts = name.split(/\s+/);
  if (parts.length >= 2 && parts[0] !== "Gerald") {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white shadow-sm"
      style={{ background: color }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}

function GuestRow({
  name,
  info,
  visits,
  onClick,
}: {
  name: string;
  info: GuestInfo;
  visits: number;
  onClick: () => void;
}) {
  const color = GUEST_COLORS[name] ?? "#4f46e5";
  const hasWaiver = !!info.waiverSignedOn;
  const hasContraindications = (info.contraindications?.length ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 border-b border-black/[0.05] bg-white px-6 py-4 text-left transition hover:bg-black/[0.015]"
    >
      <Avatar name={name} color={color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-black" style={{ fontFamily: DISPLAY }}>
            {name}
          </span>
          {info.pronouns && (
            <span className="rounded-sm bg-black/[0.04] px-1.5 py-0.5 text-[10px] text-black/45" style={{ fontFamily: MONO }}>
              {info.pronouns}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-[12px] text-black/50" style={{ fontFamily: DISPLAY }}>
          <span className="flex items-center gap-1">
            <Phone size={12} />
            {info.phone}
          </span>
          <span className="flex items-center gap-1">
            <Mail size={12} />
            {info.email}
          </span>
        </div>
      </div>
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        {hasContraindications && (
          <span
            className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium text-rose-700"
            style={{ background: "rgba(244,63,94,0.08)" }}
          >
            <AlertCircle size={12} />
            {info.contraindications!.length} note{info.contraindications!.length > 1 ? "s" : ""}
          </span>
        )}
        {hasWaiver ? (
          <span
            className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium text-emerald-700"
            style={{ background: "rgba(16,185,129,0.08)" }}
          >
            <ShieldCheck size={12} />
            Waiver
          </span>
        ) : (
          <span
            className="flex items-center gap-1 rounded-sm px-2 py-1 text-[11px] font-medium text-amber-700"
            style={{ background: "rgba(245,158,11,0.08)" }}
          >
            <FileText size={12} />
            Missing waiver
          </span>
        )}
        <span className="rounded-sm bg-black/[0.04] px-2 py-1 text-[11px] text-black/55" style={{ fontFamily: MONO }}>
          {visits} visit{visits === 1 ? "" : "s"}
        </span>
      </div>
      <ArrowRight
        size={16}
        className="shrink-0 text-black/20 transition group-hover:translate-x-0.5 group-hover:text-black/40"
      />
    </button>
  );
}

function GuestsPage() {
  const [query, setQuery] = useState("");
  const guests = useMemo(() => Object.entries(GUESTS), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter(([name, info]) => {
      return (
        name.toLowerCase().includes(q) ||
        info.email.toLowerCase().includes(q) ||
        info.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    });
  }, [guests, query]);

  const visitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SERVICES.forEach((s) => {
      counts[s.guest] = (counts[s.guest] ?? 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen antialiased" style={{ background: SURFACE, color: INK, fontFamily: DISPLAY }}>
      <header className="sticky top-0 z-20 border-b border-black/[0.06] backdrop-blur-md" style={{ background: "rgba(255,255,255,0.82)" }}>
        <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-5 w-5 place-items-center rounded-[5px] bg-[#0a0a0a] text-[10px] font-semibold text-white">S</div>
            <span className="text-[13px] font-medium tracking-tight text-black/80">Seondya</span>
          </div>
          <nav className="flex items-center gap-4 text-[12.5px]">
            <Link to="/" className="text-black/50 hover:text-black">Reservations</Link>
            <Link to="/practitioners" className="text-black/50 hover:text-black">Practitioners</Link>
            <Link to="/guests" className="font-semibold text-black">Guests</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              to="/"
              className="mb-2 inline-flex items-center gap-1 text-[11px] text-black/40 hover:text-black/70"
              style={{ fontFamily: MONO }}
            >
              <ChevronLeft size={12} /> Back to reservations
            </Link>
            <h1 className="text-[32px] font-semibold tracking-[-0.02em] text-black" style={{ fontFamily: DISPLAY }}>
              Guests
            </h1>
            <p className="mt-1 text-[13px] text-black/50" style={{ fontFamily: DISPLAY }}>
              {guests.length} people on file · contact, notes, waivers and visit history
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-[8px] bg-[#0a0a0a] px-4 py-2.5 text-[13px] font-medium text-white shadow-sm hover:bg-black/80"
          >
            <Plus size={15} />
            Add guest
          </button>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email or phone"
              className="w-full rounded-[8px] border border-black/[0.08] bg-white py-2.5 pl-9 pr-4 text-[13px] text-black placeholder:text-black/30 focus:border-black/20 focus:outline-none"
              style={{ fontFamily: DISPLAY }}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[12px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3 border-b border-black/[0.06] bg-black/[0.02] px-6 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-black/40" style={{ fontFamily: MONO }}>
            <span className="w-[56px]">Guest</span>
            <span className="flex-1">Contact</span>
            <span className="hidden w-[200px] sm:block">Status</span>
            <span className="w-6" />
          </div>
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[14px] text-black/50">No guests match “{query}”</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-3 text-[13px] font-medium text-black underline-offset-2 hover:underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            filtered.map(([name, info]) => (
              <GuestRow
                key={name}
                name={name}
                info={info}
                visits={visitCounts[name] ?? 0}
                onClick={() => {
                  // Future: open a dedicated guest detail view or side panel.
                  // For now, navigate back to reservations filtered by this guest.
                }}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/guests")({
  component: GuestsPage,
  head: () => ({
    title: "Guests · Seondya",
    meta: [
      { name: "description", content: "Guest directory for Seondya front desk — contact, notes, waivers and visit history." },
      { property: "og:title", content: "Guests · Seondya" },
      { property: "og:description", content: "Guest directory for Seondya front desk — contact, notes, waivers and visit history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
