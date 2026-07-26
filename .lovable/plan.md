## Coming Up v2 — emojis, presence, payments, tomorrow seed

No new pages. No new engine. Four small passes that make the intelligence layer more expressive and populate tomorrow so the icons are visible as the day progresses.

### 1. Emoji glyph set for cues

Swap the lucide icons in the Coming Up bar (and their echoes on the cards) for warm emoji glyphs. Kept as small `<span>`s so they sit on the baseline with the display font. Lucide icons stay imported as a fallback only.

| Cue | Glyph |
| --- | --- |
| Escort / arrival | 👣 |
| Notify practitioner | ✨ |
| Handoff / pickup | 🤝 |
| Elixir break | 🫖 |
| Room reset | 🧹 (real broom emoji, replaces the lucide `Brush`) |
| Payment / checkout | 💳 |
| IV / Myers Cocktail | 💧 (only when the cue's service is an IV) |
| Orchestration open | 🌀 |
| Turnover / setup / conflict | keep current lucide icons |

Applied everywhere the cue icon appears: the Coming Up bar, the timeline "active-cue" marker card, and the "whisper" glyphs already drawn near each session.

### 2. Practitioner reply loop — three-button row + card meta line

Every `notify` cue's single primary button becomes three:

```text
  [ ✓ Confirmed ]   [ 📍 Here ]   [ 🏃 On the way ]
```

- Clicking one resolves the cue and writes `{ status, at }` into a tiny module store (`src/lib/practitionerReplies.ts`, same pattern as the existing move-toast state).
- The linked session card renders a **tiny meta line directly under the practitioner name**: `🏃 Maya on the way · 2:14 PM`, mono font, dark grey, one line. Disappears once the session starts (state auto-clears when `s.start ≤ nowMin`).
- Also mirrored inside the Reservation panel so the front desk can see it there.

### 3. Unpaid indicator — a small 💳 on the card

- Every session card whose `SERVICE_PAID[id]` is false gets a small `💳` glyph in the top-right corner, sitting above the time. No badge, no ring — just the emoji at ~14px, low opacity until hover on the card.
- Clicking it opens the Reservation panel scrolled to Checkout (reuses existing behaviour).
- Once paid (toggled from the panel), the glyph disappears. `SERVICE_PAID` moves into a small mutable store so the panel can flip it and the card re-renders.

### 4. Orchestration 🌀 badge on every session of a multi-service guest

- Detect guests with 2+ sessions today (Amara, the Pierces).
- Every one of that guest's session cards gets a small `🌀` badge next to the guest name — subtle, mono, in the room color.
- No separate Coming Up cue for the journey open (kept out for now — the badge alone is the tell).

### 5. Seed tomorrow with a rich set of reservations

Add a `SEED_SERVICES_TOMORROW` list in `src/lib/catalog.ts` mirroring the seed shape today has, and switch the live-services function to return the right day's set based on the currently-selected date. Tomorrow's list is designed so every cue kind fires visibly across the day:

- A morning walk-in that triggers an **escort** (👣) at 9:50 → 10:00.
- A **couple's Ayurvedic** at 11:00 (two-guest orchestration → 🌀 on both cards).
- Amara-style **three-part journey** in the afternoon for a new guest (Infrared → Tea → Sound Healing) with 20-minute gaps → **elixir** (🫖) and **handoff** (🤝) cues between them; 🌀 on all three cards.
- A **Myers Cocktail IV** at 15:00 so the 💧 glyph is visible.
- A tight back-to-back in Buddha Massage → **turnover** cue with `Quick reset before …`.
- One session left **unpaid** all day → persistent 💳 on the card and payment cue in Coming Up.
- One session where the practitioner status will be exercised end-to-end (notify → here → walked in) so the meta line pattern is demonstrable.

Since the store's "today" filter is currently a stub, this pass wires `servicesForDate(dateKey)` so tomorrow's seed shows up when the date picker is on tomorrow. Today's set is untouched.

### Out of scope

- No notification "settings" page.
- No real SMS — reply buttons just stamp local state.
- No payment provider — 💳 is visual + local toggle.

---

### Technical notes

- `src/lib/catalog.ts`
  - Add `SEED_SERVICES_TOMORROW: Service[]` alongside `SEED_SERVICES`.
  - Add `dateKeyOffset(0|1)` helper if not present, or use the existing `dateKeyOf` from the store.
  - Add a `CUE_EMOJI: Partial<Record<WhisperKind, string>>` table (or colocated in `index.tsx` if easier — WhisperKind lives there).

- `src/lib/practitionerReplies.ts` — new. Shape:
  ```ts
  type Reply = { status: "confirmed" | "here" | "on-way"; at: number };
  ```
  Exports `setReply(serviceId, status)`, `getReply(serviceId)`, `usePractitionerReplies()`. Auto-prunes entries whose service has already started.

- `src/lib/paymentState.ts` — new. Wraps the current `SERVICE_PAID` seed as mutable state; exports `isPaid(id)`, `markPaid(id)`, `usePayments()`. Move `SERVICE_PAID` seed values from `src/routes/index.tsx` into the store's initializer.

- `src/lib/practitionerStore.ts`
  - `getLiveServices()` becomes `getLiveServices(dateKey?)` that picks the right seed for the given day (defaults to today for backward compat). `servicesForPractitioner` already accepts a dateKey — start using it.

- `src/routes/index.tsx`
  - Replace `WHISPER_ICON` usages in the Coming Up bar + active-cue marker with an emoji span when `CUE_EMOJI[kind]` exists; otherwise fall back to the current lucide icon.
  - Notify cue body → three-button row; on click, call `setReply` and `confirmCue`.
  - Session card: add practitioner-reply meta line under the practitioner name; add `💳` corner glyph when unpaid; add `🌀` next to guest name for orchestration guests.
  - Reservation panel: show the same reply meta line; the existing "mark paid" action calls `markPaid`.
  - Pass the currently-selected `dateKey` into `getLiveServices` so tomorrow's seed drives the timeline.

- `src/components/PractitionerPanel.tsx` — no functional change; picks up the reply meta line and 💳 glyph automatically because it renders reservation cards through the shared shape.

### Order

1. Payment state + 💳 corner glyph on cards.
2. Practitioner reply store + three-button row + card meta line.
3. Emoji swap in Coming Up (including 🧹 broom replacement).
4. Orchestration 🌀 badge on multi-session guest cards.
5. Tomorrow seed + date-aware `getLiveServices`.
