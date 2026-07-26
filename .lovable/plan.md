# Export the calendar + intelligence code as a downloadable bundle

I'll package every file that powers the Reservations timeline, the Coming Up intelligence strip, the Practitioners view, the reservation/practitioner side panels, and all their supporting stores/styles into a single zip you can download.

## What goes in the zip

**Routes**
- `src/routes/__root.tsx` — font loading + shell
- `src/routes/index.tsx` — Reservations timeline, Coming Up strip, gap markers, drag-to-create, drag-to-reschedule, DateNavigator, ReservationPanel, SlotPanel (3919 lines — the bulk of the intelligence lives here)
- `src/routes/practitioners.tsx` — practitioner roster view

**Components**
- `src/components/PractitionerPanel.tsx` — practitioner side panel with SMS drafts and notify flow

**State + logic**
- `src/lib/catalog.ts` — services, rooms, room colors, cue emoji
- `src/lib/practitionerStore.ts` — services CRUD, moves, cancellations, notifyDraft, localStorage persistence
- `src/lib/practitionerReplies.ts` — texted / confirmed / here / on-way state
- `src/lib/paymentState.ts` — payment status per reservation
- `src/lib/utils.ts` — cn helper

**Styles + config so it actually runs standalone**
- `src/styles.css` — Tailwind v4 tokens
- `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` — so a developer can `npm install && npm run dev` and see it work

**A short README.md** at the root of the zip explaining:
- what each file does
- which fonts to load (Inter Tight, JetBrains Mono)
- where the "intelligence" lives (`generatePrompts` in `src/routes/index.tsx`)
- where seed data lives (`src/lib/catalog.ts`)

## Delivery

- Written to `/mnt/documents/sedona-calendar.zip`.
- I'll surface the download path in chat so you can grab it.
- Excludes error-reporting glue (`error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts`) and generated files (`routeTree.gen.ts`) — those are platform scaffolding, not part of the calendar.

## Not doing

- No code changes to the running app.
- Not exporting `node_modules` or lockfiles — the README lists the dependencies to install.
