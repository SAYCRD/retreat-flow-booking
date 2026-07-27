// ------------------------------------------------------------------
// The Field — Portfolio home.
// Three bands: Today hero (with clock + stats), Field Intelligence strip
// (verb-first curation cues, mirrors "Coming Up"), Sites ledger.
// Purely presentational — mock data lives inline so this route can grow
// without new dependencies. Mirrors the reservations design language:
// Inter Tight display, JetBrains Mono metadata, pastel accents, flat
// white cards with hairline borders and soft shadow.
// ------------------------------------------------------------------

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/field")({
  head: () => ({
    meta: [
      { title: "The Field — Portfolio home" },
      { name: "description", content: "Cross-site intelligence and curation for every site in The Field." },
      { property: "og:title", content: "The Field — Portfolio home" },
      { property: "og:description", content: "Cross-site intelligence and curation for every site in The Field." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FieldHome,
});

// ---------- Types & seed data ----------

type Site = {
  id: string;
  name: string;
  domain: string;
  accent: string;         // pastel hue for the site
  nextPublish: string;    // human date
  drafts: number;
  pending: number;
  status: "healthy" | "attention" | "quiet";
};

type Cue = {
  id: string;
  siteId: string;
  kind: "approve" | "request" | "notes" | "curation";
  emoji: string;
  verb: string;           // "Approve", "Review", "Curate"
  headline: string;       // full cue sentence
};

const SITES: Site[] = [
  { id: "seondya", name: "Seondya", domain: "seondya.co", accent: "#ff7aa2", nextPublish: "Aug 1", drafts: 3, pending: 1, status: "attention" },
  { id: "temple", name: "Temple Notes", domain: "templenotes.field", accent: "#9d8bff", nextPublish: "Aug 4", drafts: 2, pending: 0, status: "healthy" },
  { id: "land", name: "Land Journal", domain: "landjournal.field", accent: "#8fd14f", nextPublish: "Aug 6", drafts: 5, pending: 2, status: "attention" },
  { id: "buddha", name: "Buddha Room", domain: "buddha.field", accent: "#3fd6b0", nextPublish: "Aug 9", drafts: 1, pending: 0, status: "quiet" },
  { id: "ayurveda", name: "Ayurveda Daily", domain: "ayurveda.field", accent: "#f5b544", nextPublish: "Aug 12", drafts: 4, pending: 1, status: "healthy" },
  { id: "om", name: "Om Space", domain: "omspace.field", accent: "#e57ac8", nextPublish: "Aug 14", drafts: 2, pending: 0, status: "healthy" },
];

const CUES: Cue[] = [
  { id: "c1", siteId: "seondya", kind: "approve", emoji: "📚", verb: "Approve", headline: "Approve monthly Field Library for Seondya" },
  { id: "c2", siteId: "land", kind: "request", emoji: "🌱", verb: "Review", headline: "Land Journal cell requests topic input · 3 candidates" },
  { id: "c3", siteId: "ayurveda", kind: "notes", emoji: "📝", verb: "Read", headline: "New site notes from Ayurveda Daily curator" },
  { id: "c4", siteId: "temple", kind: "curation", emoji: "✨", verb: "Curate", headline: "Temple Notes queued 4 pieces awaiting curation approval" },
  { id: "c5", siteId: "om", kind: "request", emoji: "🫖", verb: "Reply", headline: "Om Space cell asks: continue the tea-ritual thread?" },
];

// ---------- Component ----------

function FieldHome() {
  const [cueIndex, setCueIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const totals = useMemo(() => ({
    sites: SITES.length,
    drafts: SITES.reduce((s, x) => s + x.drafts, 0),
    pending: SITES.reduce((s, x) => s + x.pending, 0),
  }), []);

  const cue = CUES[cueIndex];
  const cueSite = SITES.find((s) => s.id === cue.siteId)!;

  const goPrev = () => setCueIndex((i) => (i - 1 + CUES.length) % CUES.length);
  const goNext = () => setCueIndex((i) => (i + 1) % CUES.length);

  const clock = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const dateLong = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Utility strip */}
      <div className="flex items-center justify-between px-8 pt-6 text-[11px] uppercase tracking-[0.14em] text-neutral-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        <div className="flex items-center gap-6">
          <span className="font-semibold text-neutral-900">The Field</span>
          <a href="#dev-guide" className="hover:text-neutral-900">Dev Guide ↗</a>
          <a href="#cell-architecture" className="hover:text-neutral-900">Cell Architecture ↗</a>
        </div>
        <a href="#what" className="hover:text-neutral-900 inline-flex items-center gap-1">
          What this is <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      {/* BAND 1 — Today hero */}
      <section className="px-8 pt-10 pb-12">
        <div className="flex items-start justify-between gap-8">
          <div>
            <span
              className="text-sm uppercase tracking-[0.18em] text-neutral-500"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Today
            </span>
            <p
              className="mt-2 text-[72px] leading-[0.95] text-neutral-900"
              style={{ fontFamily: '"Instrument Serif", serif', fontStyle: "italic", letterSpacing: "-0.03em" }}
            >
              {dateLong} · {clock}
            </p>
          </div>

          <div className="flex gap-8 pt-6" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <Stat label="Sites" value={totals.sites} />
            <Stat label="Drafts" value={totals.drafts} />
            <Stat label="Pending review" value={totals.pending} accent="#ff7aa2" />
          </div>
        </div>
      </section>

      {/* BAND 2 — Field Intelligence strip */}
      <section className="sticky top-0 z-20 border-y border-neutral-200" style={{ background: "#f8f5ff" }}>
        <div className="px-8 py-7 flex items-center gap-5">
          <div className="flex items-center gap-2 min-w-[168px]">
            <Sparkles className="h-4 w-4 text-neutral-900" />
            <span
              className="text-[11px] uppercase tracking-[0.18em] font-semibold text-neutral-900"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Field Intelligence
            </span>
          </div>

          <button
            onClick={goPrev}
            className="h-9 w-9 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 flex items-center justify-center"
            aria-label="Previous cue"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 flex items-center gap-4">
            <span className="text-2xl">{cue.emoji}</span>
            <div className="flex-1">
              <div
                className="text-[10px] uppercase tracking-[0.18em] text-neutral-500"
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                <span className="relative inline-block mr-2 align-baseline">
                  <span
                    aria-hidden
                    className="absolute inset-x-[-4px] bottom-[1px] h-[70%] -z-0"
                    style={{
                      background: cueSite.accent,
                      transform: "skewX(-6deg) rotate(-1.2deg)",
                      opacity: 0.9,
                      borderRadius: "1px 3px 2px 4px",
                    }}
                  />
                  <span className="relative z-10 px-[2px] text-neutral-900">{cueSite.name}</span>
                </span>
                {cue.verb}
              </div>
              <div
                className="text-[22px] leading-tight text-neutral-900 mt-1"
                style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.02em" }}
              >
                {cue.headline}
              </div>
            </div>
            <span
              className="text-[11px] uppercase tracking-[0.18em] text-neutral-500"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {cueIndex + 1} / {CUES.length}
            </span>
          </div>

          <button
            onClick={goNext}
            className="h-9 w-9 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 flex items-center justify-center"
            aria-label="Next cue"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* BAND 3 — Sites ledger */}
      <section className="px-8 py-14">
        <div className="flex items-baseline justify-between mb-8">
          <h2
            className="text-[40px] font-semibold text-neutral-900"
            style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.035em" }}
          >
            Sites
          </h2>
          <span
            className="text-[11px] uppercase tracking-[0.18em] text-neutral-500"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {SITES.length} in the field
          </span>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SITES.map((site) => (
            <li key={site.id}>
              <SiteRow site={site} cueCount={CUES.filter((c) => c.siteId === site.id).length} />
            </li>
          ))}
        </ul>
      </section>

      {/* Dev Guide */}
      <section id="dev-guide" className="px-8 py-16 border-t border-neutral-200">
        <h3
          className="text-[28px] font-semibold text-neutral-900"
          style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.03em" }}
        >
          Dev Guide
        </h3>
        <p className="mt-3 max-w-2xl text-neutral-600 leading-relaxed">
          How The Field is built, deployed, and extended. Conventions for cells, sites,
          publish rhythms, and the intelligence layer that surfaces requests up to this home.
        </p>
      </section>

      {/* Cell Architecture */}
      <section id="cell-architecture" className="px-8 py-16 border-t border-neutral-200">
        <h3
          className="text-[28px] font-semibold text-neutral-900"
          style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.03em" }}
        >
          Cell Architecture
        </h3>
        <p className="mt-3 max-w-2xl text-neutral-600 leading-relaxed">
          The anatomy of a site: content cells, curation cells, orchestration cells, and the
          reporting agent that decides what rises to Field Intelligence.
        </p>
      </section>

      {/* What this is */}
      <section id="what" className="px-8 py-16 border-t border-neutral-200">
        <h3
          className="text-[28px] font-semibold text-neutral-900"
          style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.03em" }}
        >
          What this is
        </h3>
        <p className="mt-3 max-w-2xl text-neutral-600 leading-relaxed">
          The Field is a portfolio of living sites. Each site has cells that request curation,
          publish rhythms that need approval, and notes that surface up here. This home shows
          the whole field at a glance — the strip above is where cross-site intelligence lives,
          the ledger below is where you enter a site.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="text-right">
      <div
        className="text-[10px] uppercase tracking-[0.18em] text-neutral-500"
      >
        {label}
      </div>
      <div
        className="text-[44px] leading-none font-semibold mt-1"
        style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.03em", color: accent ?? "#0a0a0a" }}
      >
        {value}
      </div>
    </div>
  );
}

function SiteRow({ site, cueCount }: { site: Site; cueCount: number }) {
  const statusLabel = site.status === "attention" ? "Attention" : site.status === "quiet" ? "Quiet" : "Healthy";
  const statusColor = site.status === "attention" ? "#ff7aa2" : site.status === "quiet" ? "#9ca3af" : "#3fd6b0";

  return (
    <div
      className="group relative bg-white border border-neutral-200 p-6 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.25)]"
      style={{
        borderLeft: `3px solid ${site.accent}`,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -18px rgba(0,0,0,0.15)",
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.18em] text-neutral-500"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {site.domain}
          </div>
          <h3
            className="text-[32px] font-semibold text-neutral-900 mt-1"
            style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.03em" }}
          >
            {site.name}
          </h3>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-neutral-700"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
          {statusLabel}
        </span>
      </div>

      <div
        className="mt-5 grid grid-cols-3 gap-4 text-[11px] uppercase tracking-[0.14em] text-neutral-500"
        style={{ fontFamily: '"JetBrains Mono", monospace' }}
      >
        <MiniStat label="Next publish" value={site.nextPublish} />
        <MiniStat label="Drafts" value={site.drafts} />
        <MiniStat label="Cues" value={cueCount} accent={cueCount > 0 ? site.accent : undefined} />
      </div>

      <div className="mt-5 flex items-center justify-end">
        <span
          className="inline-flex items-center gap-1 text-[12px] text-neutral-500 group-hover:text-neutral-900"
          style={{ fontFamily: '"JetBrains Mono", monospace' }}
        >
          Enter site <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div>
      <div>{label}</div>
      <div
        className="text-[20px] font-semibold mt-1 normal-case tracking-normal"
        style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.02em", color: accent ?? "#0a0a0a" }}
      >
        {value}
      </div>
    </div>
  );
}
