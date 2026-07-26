Yes — the practitioner profile becomes a **global side panel** you can open from anywhere their name appears. Same slide-in pattern as the reservation panel. It's always one click away.

## The profile side panel — the reusable core

Opens from any practitioner name click, anywhere in the app.

**Header**
- Name, photo, service color chip
- Phone + email — one tap to call, one tap to text
- Services chips (editable)
- Notes field
- Quick actions row:
  - **Call** — opens tel: link
  - **Text availability request** — pre-composes SMS with the pending reservation's service, date, and time; you tap send
  - **View full page** — jumps to `/practitioners` with them selected (for deeper work like editing recurring availability)

**Availability calendar (main body)**
- Compact today-focused view (mini version of the timeline shell)
- Green blocks = available (with source icon: phone / self / text)
- Blue blocks = booked
- Click-drag on a gap → mark available (pre-filled with phone-source and a note)
- Click a green block → edit/remove/add note
- Scroll for other times of day
- Day arrows at top to browse other dates

**Context-aware footer (when opened from a reservation flow)**
- If you opened the panel from a "no practitioners available" state on a specific request, the footer shows:
  - The requested service, room, date, and time slot
  - "Text this request to Maya" button — one tap sends SMS with the exact ask
  - "Mark Maya available for this slot" — one tap creates the green block AND assigns her to the reservation
  - "Call Maya" — one tap dial

That footer is the magic. You're always one click from either confirming or asking.

## Where the panel opens from

Every place a practitioner name appears becomes clickable:

- Reservation cards on the timeline (name at the bottom)
- The Coming Up bar cues that mention a practitioner
- The ReservationPanel's Practitioner row
- The SlotPanel's practitioner picker (including the "no matches" empty state)
- The roster on the Practitioners page

Click behavior is uniform: name → panel opens with their info + today's availability + context-aware footer if applicable.

## The Practitioners page (dedicated entry point)

Still exists as the deep-work surface. Same shape as before:

- Left rail: roster with search + "+ Add practitioner"
- Main panel: today-focused timeline for the selected practitioner (matching the room-view design language — hero, date navigator, sticky Coming Up bar, vertical scrollable timeline)
- The intelligent bar surfaces cues specific to that practitioner: gaps to fill, pending text confirmations, next sessions, prep prompts

The side panel and the full page share the same practitioner data and edits. What you change in one is reflected in the other.

## The "no available practitioner" moment — end to end

You're creating a reservation for a Deep Tissue Massage at 3pm. The picker shows Maya and Sofia are qualified but neither has a green block at 3pm.

1. You tap Maya's name in the picker.
2. Her profile panel slides in over the SlotPanel.
3. You see her calendar — she's open 2–2:30 and 4pm onward.
4. Footer shows the requested slot: "Deep Tissue Massage · 3:00–4:00pm · Buddha Massage room"
5. You tap **Call Maya**. She answers, says yes.
6. You tap **Mark Maya available for this slot**. Green block appears 3–4pm on her calendar, Maya is auto-assigned to the reservation, panel closes back to a completed SlotPanel.

Or:

5. You tap **Text this request to Maya**. Composed SMS opens with "Hi Maya — can you take a Deep Tissue Massage at 3pm today in Buddha Massage room? Reply YES or NO." You send.
6. Panel shows a "text sent 12s ago, awaiting reply" indicator. Later a YES reply auto-marks the green block and assigns her (phase 3, when SMS is wired).

## What stays out of v1

- Automated SMS send/receive (phase 3 — but the "Text this request" button can open the native SMS composer with the pre-filled message right away, so the muscle memory forms now)
- Practitioner self-service login
- Compliance tracking
- Ranking beyond "has matching availability"

## Build order

1. Build the reusable **PractitionerPanel** component: header, quick actions, availability calendar, context-aware footer.
2. Add practitioner data model: `phone`, `email`, `availability: AvailabilityBlock[]`, `notes`, `colorHue`.
3. Wire the panel to open from every practitioner name click across the app (start with the reservation panel and SlotPanel picker, then Coming Up bar cues, then timeline cards).
4. Create `/practitioners` route with roster + full-page timeline view, sharing components with the main timeline.
5. Wire green-availability into the reservation picker sort (green matches first).
6. Add "+ Add practitioner" flow.
7. Native SMS composer link for "Text this request" (opens `sms:` URL with pre-filled body). Full SMS automation comes later.

## Technical notes

- New component: `src/components/PractitionerPanel.tsx` — receives `practitionerId` and optional `context: { reservation: {...} }` for the footer.
- Extract shared timeline primitives (`minToPx`, `pxToMin`, hero, date navigator, Coming Up bar) from `src/routes/index.tsx` into `src/components/timeline/` so both pages and the mini calendar reuse them.
- New route: `src/routes/practitioners.tsx`.
- `PRACTITIONERS` mock data extended with the new fields.
- Availability blocks stored client-side. Same pattern as reservations and room blocks.
- `sms:` and `tel:` URLs for phase-1 call/text (native, no SMS provider needed).
- Later: swap `sms:` composer for a real SMS connector (Twilio, etc.) and add reply webhook that auto-writes green blocks.