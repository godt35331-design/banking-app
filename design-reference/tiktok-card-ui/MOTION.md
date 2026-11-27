# Card wallet video: detailed motion breakdown

This file is a companion to `NOTES.md`, and covers exactly how each thing moves. The close-up frames are in `motion/`.

**How this was measured:**
- **Timings:** every frame of the video (30 fps) was compared pixel by pixel with the previous frame, separately for 4 zones of the phone screen: header/card, action row, content, and tab bar. That gives the exact start and end of every movement, accurate to about ±0.03s.
- **Direction and shape:** I looked at close-up frames taken during each movement.
- **Easing words:**
  - *ease-out* means it starts fast and slows into place.
  - *spring/settle* means it overshoots slightly, or keeps drifting a little, before stopping.
- **Distances** are given as a share of the screen, because the recording is too small for exact pixels.

---

## Timeline at a glance

| Time (s) | What moves | Duration |
|---|---|---|
| 0.43 → 1.33 | Home → **Transfers** tab: instant swap, then content fades in top-to-bottom | ~0.9s total |
| 1.60 → 2.43 | Transfers → **Cards** tab: same pattern, then the spending numbers and bars animate | ~0.85s |
| 3.13 → 4.23 | Finger drags the card: **the card leans in 3D** | follows the finger |
| 4.63 → 5.40 | **Swipe to next card** (Everyday → Online) | ~0.75s |
| 5.93 → 6.60 | Swipe to the next card (Online → Travel) | ~0.65s |
| 6.77 → 7.47 | Swipe back to the first card | ~0.7s |
| 8.43 → 9.03 | **Freeze**: button fills black, status bar appears, frost washes over the card | ~0.6s |
| 9.87 → 10.43 | **Flip to back** (Details) | ~0.55s |
| 11.56 → 12.13 | Flip back to front | ~0.55s |
| 12.43 → 12.63 | **Limit sheet slides up** | ~0.2s (very quick) |
| 12.67 → 14.70 | Slider drag: amount rolls live | follows the finger |
| 14.83 → 15.03 | Sheet slides down | ~0.2s |
| 15.07 → 15.60 | "Limit set" pill + limit number count-up | ~0.5s |
| 16.13 → 16.33 | **PIN sheet slides up** | ~0.2s |
| 16.97 → 17.17 | Hold: dots → digits | ~0.2s |
| 17.80 → 18.00 | Release: digits → dots | ~0.2s |
| 19.23 → 19.43 | PIN sheet slides down | ~0.2s |
| 20.00 → 21.20 | Scroll down: **header collapses**, card shrinks to a thumbnail | ~1.2s (with scroll momentum) |

**Overall rhythm:**
- Big "physical" moves (card swipes, flips, page entrances) take **0.55–0.9s**, so they feel weighty.
- Utility UI (bottom sheets, PIN reveal) is **snappy at ~0.2s**.
- Every number change is animated. Nothing ever just pops.

---

## 1. Switching tabs (0.43–1.33s and 1.60–2.43s)

Frames: `motion/a1`–`a5`.

1. **The frame swaps instantly.** On the tap frame, the black header block, the page title and the white sheet change all at once. There is no slide between pages: the shell of the new page is simply there.
2. **The content is empty at first.** For the first ~0.1s the white area shows only faint grey ghost shapes of the content (`a1`).
3. **Content fades in from top to bottom, in a cascade:**
   - First, the segmented Send/Request toggle and the "Quick send" label.
   - Then the **avatars pop in one after another, left → right** (`a2`): the first appears at ~0.6s and the last at ~0.8s. Each one fades and scales up slightly.
   - Then the 4 action icons, then the "Scheduled" cards, then the Activity list.
   - The bottom edge of the "changed" area travels down the screen over ~0.5s. Rows that are further down appear later, roughly **60–80ms apart**.
   - Each item fades from ~0% to 100% opacity while rising a few pixels. It is a soft fade-up, not a slide.
4. **Tab bar:** the white highlight circle **slides horizontally** from the old icon to the new one (`a4` catches it between icons). It takes ~0.3s with a slight ease-out, and the icon inside switches from white to black as the circle arrives.
5. **On the Cards page** (`a4`, `a5`):
   - The card artwork first appears **dark and dim**, as if at ~30% opacity, and brightens to full over ~0.3s.
   - The card name text and page dots fade in after it.
   - The action buttons and the spending card fade in last (~1.9–2.4s).
   - The spending amount counts up, and the progress bar and the coloured segment bar **grow from left to right**.

## 2. Dragging a card: 3D lean (3.13–4.23s)

Frame: `motion/b1`.

- While the finger is on the card, the card **leans in 3D**, as if hinged in the middle. The side being pushed tips away and the other side comes closer, so you can see perspective in the edges and the VISA logo looks skewed.
- The movement is small (a few degrees). It follows the finger continuously, with a slight lag that makes it feel springy.
- The cards stacked behind (2–3 thin edges peeking above) **don't move** during the lean. Only the front card reacts.

## 3. Swiping between cards (4.63–5.40s, then again twice)

Frames: `motion/b2`–`b6`. This is the signature move. It is a **horizontal carousel with 3D perspective**, not a deck shuffle.

- **Start (4.63s):** a quick flick to the left.
- **During the swipe (`b2`–`b4`):**
  - The current card **slides left**, partly off-screen, and turns slightly away (rotating around its vertical axis, so its far edge looks shorter).
  - The **next card slides in from the right edge**, also slightly turned and a little smaller.
  - For ~0.2s both cards are visible side by side, almost touching.
- **Arriving (`b5`, 4.97s):** the new card reaches the centre, straightens out (rotation goes to 0) and grows to full size.
- **Settle (5.0–5.4s):** a gentle **spring settle**. The card keeps drifting a few pixels and the stack edges behind it re-align. There is no hard stop.
- **Easing:** fast at the start (flick), long soft tail. Total ~0.75s, but most of the distance happens in the first ~0.35s.
- **Linked changes during the swipe:**
  - The card label below ("Everyday card" → "Online card") **cross-fades**.
  - The **page-dot indicator** moves: the long active pill slides to the next dot.
  - In the spending panel, the **amount and limit count to the new card's numbers**, finishing ~0.3s after the card lands. The bars **resize smoothly** and the category rows cross-fade (for example, "Shopping" changes to "Flights" for the travel card).
- **Swiping back** (6.77s) does the same motion mirrored: the card leaves to the right and the previous card enters from the left.

## 4. Freeze (8.43–9.03s)

Frames: `motion/c1`–`c4`.

- **Tap (8.43s):** the Freeze button's circle **fills solid black** almost instantly (~60ms), with a white lock icon. Its label changes to "Unfreeze".
- **8.53s:** a black **"Card frozen" status pill** appears inside the spending card. It expands outwards from the centre very quickly (~70ms) and pushes the content below it down.
- **Frost (8.63–9.03s):** the card is covered progressively by a **frosty white layer**.
  - The card's colours wash out, getting lighter and greyer.
  - Small **sparkle/snow dots** appear across the surface.
  - A small dark **"🔒 Frozen" chip** fades in at the centre.
  - The change sweeps from **left to right** across the card: the left half frosts first and the right side ~0.3s later.
  - Total ~0.4s, ease-out.
- After that the frost is static: no twinkling loop was detected.

## 5. Details: card flip (9.87–10.43s; back again at 11.56–12.13s)

Frames: `12-…flip-mid.png`, `13-…card-back.png`.

- **Motion:** the card **rotates 180° around its vertical centre line**, like turning over a real card on a table.
  - **0–0.25s:** it turns away. The card looks narrower and in perspective, with the near edge taller than the far edge.
  - **~0.27s (10.13s):** the card is **edge-on**, almost invisible. This is the moment the front face is swapped for the back face.
  - **0.27–0.55s:** the back face turns into view and straightens.
- **Easing:** smooth ease-in-out; the fastest point is the middle. It does not overshoot.
- **Back face:**
  - black magnetic stripe
  - full card number
  - expiry and CVV labels
  - brand name
  - round copy button
- **After landing (10.53s):** the "Details" button label swaps to "Hide" (instant text change).
- **Flipping back:** the same motion; the frost overlay is still on the front when it returns.

## 6. Limit: bottom sheet (12.43–15.60s)

Frames: `motion/d1`–`d3`, `14`–`16`.

- **Opening (12.43–12.63s, ~0.2s):** a white sheet with a grab handle **slides up from the bottom edge**. It is a short, fast slide with ease-out and no visible bounce.
  - At the same time the rest of the screen **dims** to about 60% darker.
  - The tab bar disappears under the sheet.
- **The big amount counts up as the sheet opens** ($2,923 → $3,484 between `d1` and `d2`), so the number is already "alive" on arrival.
- **Slider drag (12.67–14.70s):**
  - The knob follows the finger.
  - The big amount **rolls continuously** to match ($3,484 → $4,987 → $10,833 → $12,481).
  - The active track (the black part) grows with the knob.
  - When the value passes a preset, that **preset chip turns black** and the previous one turns white again (instant colour swap).
- **Closing (14.83–15.03s, ~0.2s):** the sheet slides straight down and the dim fades out at the same time.
- **Confirmation (15.07–15.60s):**
  - A black pill **"✓ Limit set to $12,500"** appears in the spending card, in the same style as "Card frozen".
  - The limit number on the right **counts up** to $12,500 (~0.5s).

## 7. PIN: hold to reveal (16.13–19.43s)

Frames: `motion/e1`, `e2`, `17`, `18`.

- **The sheet opens** the same way as the limit sheet: slide up in ~0.2s, with the background dimming.
- **On press (16.77s):** the button label **instantly** changes from "Hold to reveal" to "Release to hide".
- **After a short hold (~0.2s), at 16.97–17.17s:** the 4 dots **cross-fade into the digits** inside their rounded boxes. They don't flip or slide. They just fade.
- **On release (17.80–18.00s):** the digits cross-fade back to dots (~0.2s) and the label switches back.
- **Closing (19.23–19.43s):** the sheet slides down (~0.2s).

## 8. Scrolling: header collapse (20.00–21.20s)

Frames: `motion/f1`–`f3`, `19`.

- When the page scrolls up, the **black header block shrinks** from ~40% of the screen to a slim top bar.
- **Shared-element move:** the big card **shrinks and travels up and right**, ending as a **small thumbnail beside the "+" button** in the bar (`f2`, `f3`). It scales down to roughly 25% size, moving smoothly as you scroll.
- The card name and dots under it fade out as the header shrinks.
- The action row and spending card **scroll up underneath** the header bar.
- **Scroll momentum:** the motion is fastest at ~20.1–20.4s and decelerates gradually until ~21.2s (iOS-style momentum scroll).
- Lower down, the "Card settings" list arrives: toggles appear **greyed** while the card is frozen, and the red "Report lost or stolen" link is at the bottom.

---

## Rebuilding these on the web: suggested values

| Effect | How | Values that match the video |
|---|---|---|
| Tab content entrance | fade + translateY(8px → 0), staggered | 250ms each, 60–80ms stagger, ease-out |
| Tab-bar indicator | absolutely-positioned circle, animate `left` / `translateX` | 300ms, `cubic-bezier(.2,.8,.2,1)` |
| Card carousel | horizontal track; per card `rotateY(±15–20deg) scale(.9)` at the sides, `0deg scale(1)` in the centre; `perspective: 1000px` | spring (stiffness ~170, damping ~22) ≈ 0.7s settle |
| Drag lean | `rotateY` from the pointer's x offset, max ~8° | spring follow |
| Count-up numbers | tween from the old value to the new value | 400–600ms, ease-out |
| Freeze frost | overlay with a left-to-right `mask-image` gradient sweep, plus a sparkle SVG and `filter: saturate(.3) brightness(1.15)` | 400ms ease-out |
| Status pill | `scaleX(0 → 1)` from the centre + fade | 120ms |
| Card flip | `rotateY(0 → 180deg)`, `preserve-3d`, `backface-visibility: hidden` | 550ms ease-in-out |
| Bottom sheet | `translateY(100% → 0)` + backdrop opacity 0 → .6 | 200ms ease-out (open), 200ms ease-in (close) |
| PIN reveal | cross-fade dot → digit | 200ms |
| Header collapse | scroll-linked: header height and card `scale` / `translate` mapped to scrollY (0 → ~250px) | follows the scroll |
