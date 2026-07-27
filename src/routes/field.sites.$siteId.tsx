// ------------------------------------------------------------------
// The Field — Site workspace.
// A single-site command center: left rail of sites, main stage with
// status, tabs, and tool cards. Mirrors the reservations design
// language: Inter Tight display, JetBrains Mono metadata, pastel
// accents, crisp white cards with hairline borders and soft lift.
// ------------------------------------------------------------------

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, LayoutTemplate, Home, ShoppingBag, CalendarDays, Settings, Sparkles, PenLine } from "lucide-react";

export const Route = createFileRoute("/field/sites/$siteId")({
  head: ({ params }) => {
    const site = SITES.find((s) => s.id === params.siteId);
    const title = site ? `${site.name} — Site workspace` : "Site workspace";
    return {
      meta: [
        { title },
        { name: "description", content: "Edit, curate, and configure a site in The Field." },
        { property: "og:title", content: title },
        { property: "og:description", content: "Edit, curate, and configure a site in The Field." },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: SiteWorkspace,
});

// ---------- Types & seed data ----------

type SiteStatus = "live" | "staging" | "draft";

type Site = {
  id: string;
  name: string;
  domain: string;
  accent: string;
  status: SiteStatus;
  description: string;
  cellsActive: number;
};

type Tool = {
  id: string;
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  accent?: string;
};

const SITES: Site[] = [
  {
    id: "sedona-heartfelt-journeys",
    name: "Sedona Heartfelt Journeys",
    domain: "sedonaheartfeltjourneys.com",
    accent: "#9d8bff",
    status: "live",
    description: "A curated editorial and experience platform exploring the intersection of nature, science, and embodied practice in Sedona, Arizona.",
    cellsActive: 14,
  },
  {
    id: "untapped",
    name: "Untapped",
    domain: "untapped.co",
    accent: "#ff7aa2",
    status: "staging",
    description: "A discovery layer for unmapped places, people, and practices.",
    cellsActive: 6,
  },
  {
    id: "sedonaexperience",
    name: "SedonaExperience",
    domain: "sedonaexperience.com",
    accent: "#3fd6b0",
    status: "draft",
    description: "Immersive itineraries and local guides for the Sedona visitor.",
    cellsActive: 3,
  },
];

const TABS = [
  { id: "editorial", label: "Editorial Layout" },
  { id: "offerings", label: "Offerings" },
  { id: "bookings", label: "Bookings Manager" },
  { id: "config", label: "Site Config" },
] as const;

// ---------- Component ----------

function SiteWorkspace() {
  const { siteId } = Route.useParams();
  const activeSite = useMemo(() => SITES.find((s) => s.id === siteId) ?? SITES[0], [siteId]);
  const [activeTab, setActiveTab] = useState<typeof TABS[number]["id"]>"editorial");

  const tools: Tool[] = useMemo(
    () => [
      {
        id: "curator",
        title: "Editorial Curator",
        description: "Create and curate editions, and use AI assistance to draft and refine content across Sedona Heartfelt Journeys.",
        cta: "Open Curator",
        icon: <PenLine className="h-5 w-5" />,
        accent: activeSite.accent,
      },
      {
        id: "homepage",
        title: "Home Page",
        description: "Manage the offerings and compositions selected for the SHFJ homepage.",
        cta: "Open Manager",
        icon: <Home className="h-5 w-5" />,
      },
      {
        id: "templates",
        title: "Page Templates",
        description: "Reusable editorial layouts and cell arrangements for long-form and landing pages.",
        cta: "Browse Templates",
        icon: <LayoutTemplate className="h-5 w-5" />,
      },
      {
        id: "offerings-tool",
        title: "Offerings",
        description: "Services, sessions, and products available across the site with pricing and availability.",
        cta: "Manage Offerings",
        icon: <ShoppingBag className="h-5 w-5" />,
      },
      {
        id: "bookings-tool",
        title: "Bookings Manager",
        description: "Reservation calendar, practitioner assignments, and daily orchestration.",
        cta: "Open Calendar",
        icon: <CalendarDays className="h-5 w-5" />,
      },
      {
        id: "config-tool",
        title: "Site Config",
        description: "Brand DNA, domain rules, integrations, and publishing rhythms.",
        cta: "Configure",
        icon: <Settings className="h-5 w-5" />,
      },
    ],
    [activeSite.accent]
  );

  const visibleTools = activeTab === "editorial"
    ? tools.filter((t) => ["curator", "homepage", "templates"].includes(t.id))
    : activeTab === "offerings"
    ? tools.filter((t) => ["offerings-tool", "homepage"].includes(t.id))
    : activeTab === "bookings"
    ? tools.filter((t) => ["bookings-tool", "offerings-tool"].includes(t.id))
    : tools.filter((t) => ["config-tool", "templates"].includes(t.id));

  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Utility strip */}
      <div className="flex items-center justify-between px-8 pt-6 text-[11px] uppercase tracking-[0.14em] text-neutral-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        <div className="flex items-center gap-6">
          <Link to="/field" className="font-semibold text-neutral-900 hover:opacity-70">
            The Field
          </Link>
          <span className="text-neutral-300">/</span>
          <Link to="/field" className="hover:text-neutral-900">
            Sites
          </Link>
          <a href="#cell-architecture" className="hover:text-neutral-900">Cell Architecture ↗</a>
          <a href="#dev-guide" className="hover:text-neutral-900">Dev Guide ↗</a>
        </div>
        <a href="#what" className="hover:text-neutral-900 inline-flex items-center gap-1">
          What this is <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <div className="flex min-h-[calc(100vh-88px)]">
        {/* Left rail — sites */}
        <aside className="w-[280px] border-r border-neutral-200 px-6 py-8 flex flex-col">
          <div className="flex items-baseline justify-between mb-6">
            <h2
              className="text-[11px] uppercase tracking-[0.18em] font-semibold text-neutral-900"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Sites
            </h2>
            <span
              className="text-[10px] uppercase tracking-[0.14em] text-neutral-500"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {SITES.length} sites
            </span>
          </div>

          <ul className="space-y-2 flex-1">
            {SITES.map((site) => (
              <li key={site.id}>
                <Link
                  to="/field/sites/$siteId"
                  params={{ siteId: site.id }}
                  className={`block p-4 border transition-all duration-200 ${
                    site.id === activeSite.id
                      ? "bg-neutral-50 border-neutral-900"
                      : "bg-white border-neutral-200 hover:border-neutral-400"
                  }`}
                  style={site.id === activeSite.id ? { borderLeft: `3px solid ${site.accent}` } : undefined}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[15px] font-semibold text-neutral-900 leading-tight"
                      style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.02em" }}
                    >
                      {site.name}
                    </span>
                    <StatusBadge status={site.status} />
                  </div>
                  <div
                    className="mt-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {site.domain}
                  </div>
                  <div
                    className="mt-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {site.cellsActive} cells active
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <button
            className="mt-6 w-full py-4 border border-neutral-900 bg-neutral-900 text-white text-[11px] uppercase tracking-[0.14em] font-medium hover:bg-neutral-800 transition-colors"
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            + Add new site
          </button>
        </aside>

        {/* Main stage */}
        <main className="flex-1 px-10 py-10">
          {/* Site header */}
          <div className="flex items-start justify-between gap-8 pb-8 border-b border-neutral-200">
            <div className="flex items-start gap-5">
              <div
                className="h-14 w-14 flex items-center justify-center text-white text-[22px] font-semibold"
                style={{ background: activeSite.accent, fontFamily: '"Inter Tight", sans-serif' }}
              >
                {activeSite.name.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={activeSite.status} />
                  <span
                    className="text-[11px] uppercase tracking-[0.14em] text-neutral-500"
                    style={{ fontFamily: '"JetBrains Mono", monospace' }}
                  >
                    {activeSite.domain}
                  </span>
                </div>
                <h1
                  className="mt-2 text-[40px] font-semibold text-neutral-900 leading-[1.1]"
                  style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.035em" }}
                >
                  {activeSite.name}
                </h1>
                <p className="mt-3 max-w-2xl text-neutral-600 leading-relaxed">
                  {activeSite.description}
                </p>
              </div>
            </div>

            <a
              href={`https://${activeSite.domain}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 bg-neutral-900 text-white text-[12px] uppercase tracking-[0.12em] font-medium hover:bg-neutral-800 transition-colors"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              View Site <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b border-neutral-200">
            <div className="flex gap-8">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-[13px] font-medium transition-colors relative ${
                    activeTab === tab.id ? "text-neutral-900" : "text-neutral-500 hover:text-neutral-700"
                  }`}
                  style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.01em" }}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: activeSite.accent }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section headline */}
          <div className="mt-10 mb-6">
            <div
              className="text-[11px] uppercase tracking-[0.18em] text-neutral-500"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {activeTab === "editorial" && "Editorial Layout"}
              {activeTab === "offerings" && "Offerings"}
              {activeTab === "bookings" && "Bookings Manager"}
              {activeTab === "config" && "Site Config"}
            </div>
            <p className="mt-2 text-neutral-600">
              {activeTab === "editorial" && "All content management tools for Sedona Heartfelt Journeys. Each tool manages a distinct layer of the site."}
              {activeTab === "offerings" && "Services, sessions, and products available across the site."}
              {activeTab === "bookings" && "Reservation calendar, practitioner assignments, and daily orchestration."}
              {activeTab === "config" && "Brand DNA, domain rules, integrations, and publishing rhythms."}
            </p>
          </div>

          {/* Tool cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {visibleTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} siteAccent={activeSite.accent} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SiteStatus }) {
  const label = status === "live" ? "Live" : status === "staging" ? "Staging" : "Draft";
  const bg = status === "live" ? "#dcfce7" : status === "staging" ? "#fef3c7" : "#f3f4f6";
  const color = status === "live" ? "#15803d" : status === "staging" ? "#b45309" : "#4b5563";

  return (
    <span
      className="inline-flex items-center px-2 py-1 text-[10px] uppercase tracking-[0.12em] font-medium"
      style={{ fontFamily: '"JetBrains Mono", monospace', background: bg, color }}
    >
      {label}
    </span>
  );
}

function ToolCard({ tool, siteAccent }: { tool: Tool; siteAccent: string }) {
  return (
    <div
      className="group relative bg-white border border-neutral-200 p-7 transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.25)]"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -18px rgba(0,0,0,0.15)",
      }}
    >
      <div
        className="h-11 w-11 flex items-center justify-center text-neutral-900 mb-5"
        style={{ background: tool.accent ? `${tool.accent}15` : "#f5f5f5" }}
      >
        {tool.icon}
      </div>

      <h3
        className="text-[22px] font-semibold text-neutral-900"
        style={{ fontFamily: '"Inter Tight", sans-serif', letterSpacing: "-0.02em" }}
      >
        {tool.title}
      </h3>
      <p className="mt-2 text-neutral-600 leading-relaxed text-[15px]">
        {tool.description}
      </p>

      <div className="mt-6 flex items-center gap-1 text-[12px] font-medium" style={{ color: siteAccent, fontFamily: '"JetBrains Mono", monospace' }}>
        <span className="uppercase tracking-[0.12em]">{tool.cta}</span>
        <ArrowUpRight className="h-3.5 w-3.5" />
      </div>
    </div>
  );
}
