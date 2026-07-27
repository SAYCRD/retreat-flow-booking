// ------------------------------------------------------------------
// The Field — Layout shell.
// Wraps every /field/* route with the shared top utility strip and
// renders child routes through <Outlet />. The home content lives in
// field.index.tsx; the site workspace lives in field.sites.$siteId.tsx.
// ------------------------------------------------------------------

import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/field")({
  component: FieldLayout,
});

function FieldLayout() {
  return (
    <div className="min-h-screen bg-white text-neutral-900" style={{ fontFamily: '"Inter", system-ui, sans-serif' }}>
      {/* Utility strip */}
      <div className="flex items-center justify-between px-8 pt-6 text-[11px] uppercase tracking-[0.14em] text-neutral-500" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
        <div className="flex items-center gap-6">
          <Link to="/field" className="font-semibold text-neutral-900 hover:opacity-70">
            The Field
          </Link>
          <Link to="/field" className="hover:text-neutral-900" activeProps={{ className: "text-neutral-900 font-medium" }}>
            Sites
          </Link>
          <a href="#cell-architecture" className="hover:text-neutral-900">Cell Architecture ↗</a>
          <a href="#dev-guide" className="hover:text-neutral-900">Dev Guide ↗</a>
        </div>
        <a href="#what" className="hover:text-neutral-900 inline-flex items-center gap-1">
          What this is <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>

      <Outlet />
    </div>
  );
}
