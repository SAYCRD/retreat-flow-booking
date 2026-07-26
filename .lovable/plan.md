## Practitioner panel v2 — bookings, offerings, prep buffer

Four connected changes so the practitioner side becomes a real working surface, not just an availability marker.

### 1. Reservations show on the practitioner timeline

Today the availability calendar in the practitioner panel only draws green blocks. It should also render every reservation this practitioner is on — pulled from the same `SERVICES` list the main Reservations page uses — so opening a practitioner shows their actual day at a glance.

Card visuals mirror the reservation cards on the main timeline:
- Room-colored left rail
- Guest name + service + time
- Status pill: `Confirmed`, `In session`, `Completed` (auto when `end < now`), or `Requested`
- Tiny status line for automated cues, e.g. `✓ Reminder sent 2h before` with a small phone icon
- Cards sit on top of the green availability layer (the green shows the window they said yes to; the cards show the bookings inside it)

Clicking a reservation card inside the panel opens the existing Reservation panel (reuses the same flow).

### 2. Per-offering setup buffer

Each offering gets a `setupMinutes` value (default 15). On both the main room timeline and the practitioner timeline, we draw a soft prep strip immediately before every reservation:

- Muted room-color tint, dashed left border
- Label: `Prep · Room open` with the buffer duration
- Not clickable, not draggable — purely a visual "hands off this time"

This makes it obvious the room isn't actually free right up to the top of the hour.

### 3. Editable offerings in the practitioner panel

Above the notes field, add an **Offerings** section:
- Chips for every offering the practitioner currently provides, each with an × to remove
- A `+ Add offering` dropdown listing offerings this practitioner doesn't yet have (sourced from the full offerings catalog derived from `OFFERINGS_BY_ROOM`)
- Changes persist immediately in the practitioner store and instantly re-filter the picker in the reservation flow

### 4. Rename "Self-marked" → "Front desk"

The availability source `self` was ambiguous. Rename its display label to **Front desk** everywhere it renders (panel legend, block pill). The underlying source key stays `self` so we don't touch the store shape; only the label copy changes. `Phone` and `Text` labels stay as they are.

---

### Technical details

- `src/lib/practitionerStore.ts`
  - Add `SOURCE_LABEL` export or keep colocated in the panel; change `self` label to `"Front desk"`.
  - Add an offerings catalog helper `allOfferings()` derived from `OFFERINGS_BY_ROOM` (imported or duplicated as a small const). Or, cleaner: extract `OFFERINGS_BY_ROOM` and the offerings catalog into `src/lib/spaCatalog.ts` and import from both routes and the store — but that's a bigger refactor. For now: pass the catalog into the panel via props from wherever it mounts, or duplicate a small constant.
  - Add `setupMinutesFor(offering: string): number` helper with a per-offering map and default 15.

- `src/components/PractitionerPanel.tsx`
  - Accept (or import) the day's `SERVICES` list to render reservation cards inside `AvailabilityCanvas`, filtered by practitioner name and selected date.
  - Add a reservation card renderer sitting above the green blocks in z-order; clicking it should call a callback or, simplest path, dispatch an event the index route listens for to open its `ReservationPanel`. Cleanest: add a small `openReservationPanel(serviceId)` to a lightweight app-level bus in the store, symmetric to `openPractitionerPanel`.
  - Add the setup buffer strip renderer.
  - Add the Offerings chip editor above Notes.
  - Update source label copy.

- `src/routes/index.tsx`
  - Draw the per-offering setup strip in the room `Timeline` right before each service card.
  - If we add a reservation-open bus in the store, subscribe here and drive `openServiceId` from it so clicks in the practitioner panel open the reservation panel over the current page.

### Out of scope for this iteration

- No editing setup minutes from the UI yet (defaults + a hardcoded map).
- No completed-reservation archival — `Completed` is just a computed state from `end < now`.
- No push/email actually sent for `Reminder sent` — it's a visual status only for now.
