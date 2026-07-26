## Inline room blocking on the timeline

Add the ability to block out a room directly on the Reservations view — no separate settings page, no permissions gating (yet). The operator interacts with the same timeline they're already reading.

### The interaction

1. **Click an empty slot** in any room column → a small floating menu appears at the cursor with two choices:
   - **Block this time** (creates a block starting at the clicked 15-min slot, default 30 min)
   - **New reservation** (placeholder for the future booking engine — disabled with a "coming soon" hint for now)
2. **Drag across empty slots** in a room column → live preview of the range → release to open the same menu pre-filled with that range.
3. **Blocks render as** a soft diagonal-hatched band in the room's color, with a small label ("Blocked · 2:00–4:00 PM") and an optional reason ("Group booking", "Maintenance", "Deep clean", "Private event", or custom).
4. **Click an existing block** → side panel opens (same slide-in pattern as `ReservationPanel`) with: room, time range, reason, notes, and a **Remove block** button.
5. Blocks respect the same non-linear time scale and the sticky "Now" line already on the timeline.

### Guardrails

- Blocks cannot overlap an existing reservation on that room. If the drag range touches a booking, the menu shows a red note ("Overlaps Amara's session") and disables the confirm button.
- Blocks CAN sit in the past — useful for logging retroactive closures — but past blocks render at 60% opacity to stay quiet.
- Coming Up strip and living whispers ignore blocks entirely; a block is not a cue, it's absence of availability.

### Visual language

- Diagonal hatch pattern using the room's own hue at ~14% alpha over white (keeps the room identity, reads clearly as "not a booking").
- No shadow, no card chrome — flatter than reservations so the eye separates the two.
- Reason label in the same JetBrains Mono uppercase small-caps used elsewhere for meta.

### Data (frontend-only for now)

- New `Block` type: `{ id, room, start, end, reason, note? }` stored in local React state alongside `SERVICES`.
- No backend wiring in this pass — this is a UX prototype layer. When the booking engine + persistence land, blocks become rows in the same table (or a sibling table) and this UI already speaks the right shape.

### What this does NOT include

- No Rooms settings page.
- No recurring blocks ("every Monday") — one-off only for now.
- No role/permission gating.
- No reservation creation flow (the menu shows the option but it's disabled — this plan is scoped to blocking).

### Files touched

- `src/routes/index.tsx` — add `Block` type, state, click/drag handlers on each room column, hatched render layer, floating action menu, and a small `BlockPanel` (or extend `ReservationPanel` to handle both).