## The core insight

Clicking an empty slot has two intents — **book a session** (95% of the time) or **block the room** (rare). Instead of forcing the operator to pick a mode upfront, we let the *gesture itself* declare intent, and we make booking the obvious default.

## The interaction model

**One gesture, one surface — no intermediate popups.**

1. **Click** an empty cell → opens the side panel in "New reservation" mode, pre-filled with room + start time (60 min default). Same slide-in panel we use for viewing a reservation.
2. **Drag** across empty cells → paints a live card in-place (styled exactly like a reservation card, with the room-colored top rail and large time). On release, the side panel opens in "New reservation" mode with that exact time range pre-filled.
3. Inside the side panel, a small segmented toggle at the top: **Reservation · Block**. Switching to Block collapses the form to just "Reason" + time. No second modal, no menu-on-canvas.

The painted card on the canvas stays anchored at the exact drawn time the whole time the panel is open — no jump, no re-render to a different position. If the operator cancels, it disappears.

## The painted card (both modes)

Matches the reservation card format exactly:
- Room-colored top rail (red rail + "Overlaps a session" if invalid)
- **Large time range** top-left (same size as offerings: 17px mono)
- **Room name** in black, large (matches offering card room label)
- Third line: offering name (reservation mode) *or* reason (block mode) *or* "New reservation" placeholder before the panel is filled
- White background, subtle shadow — identical to existing cards

No "ROOM BLOCK" all-caps label, no dashed borders, no hatch. A block is just a card whose third line is the reason.

## The side panel — new reservation flow

Mirrors the existing `ReservationPanel` visual language. Fields in order:

1. **Time** — editable start/end (defaults from the drag)
2. **Room** — pre-selected from the column clicked, changeable
3. **Offering** — dropdown filtered to offerings that room supports (we already have room→offering mapping in config)
4. **Practitioner** — dropdown of practitioners qualified for that offering. Each row shows availability state:
   - *Available* (from their availability calendar) → confirm instantly
   - *Not on calendar* → shows "Request via SMS" — selecting sends a text, reservation is created in **Pending** state
5. **Guest** — search / create
6. Primary action: **Confirm reservation** (or **Send request** if practitioner needs confirmation)

Pending-practitioner reservations render on the timeline with a subtle dashed top rail until the practitioner confirms, then it snaps to solid.

**Block mode** (toggle at top of panel) collapses to just: time, room, reason, Confirm.

## Why this is the most elegant answer

- **One gesture, one surface.** No canvas menu + panel double-modal.
- **Booking is the default**, matching real frequency. Blocking is one toggle away, not a separate motion.
- **The painted card is truthful** — what you drew is what stays there, in the visual language you already know.
- **Practitioner availability is surfaced at the moment of decision**, not after — the SMS request path is inline, not a separate flow.

## Technical notes

- Remove the on-canvas reason menu (`pendingBlock` reason popup) entirely.
- Rename `BlockPanel` → `SlotPanel` with mode: `'reservation' | 'block'`.
- Drag preview and click-to-open both funnel into the same `openSlot({ roomId, start, end, mode: 'reservation' })` state.
- Preview card component is shared between reservations, blocks, and the in-flight drag preview — one `SlotCard` primitive, three data shapes.
- Practitioner availability + SMS request are stubbed frontend-only for now (matches the rest of the prototype's state).

## Out of scope for this pass

- Actual SMS delivery, practitioner availability calendars (stub data only)
- Guest search backend
- Persistence — still in-memory
