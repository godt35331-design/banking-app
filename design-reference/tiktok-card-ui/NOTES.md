# "Premium card UI" wallet demo (TikTok): animation notes

- **Source:** TikTok, @dailyflutterui, video 7706192851104779538. It is a 21.5s screen recording of a Flutter app running in the iPhone 17 Pro Max simulator, with the VS Code editor visible beside it.
- **Purpose:** research only. Don't reuse their branding or assets.
- **How it was studied:** the video was paused and stepped through every 0.5s (every 0.15–0.25s during fast transitions). Each frame was cropped to the phone screen.
  - Timings are approximate (±0.25s).
  - The source video is only 576×746, so fine detail such as exact colours and font sizes is estimated by eye.
  - There is no audio analysis.
- **Frames:** the numbered PNGs in this folder. The `tXX.X` part of each filename is the video timestamp in seconds.

## Overall look

- **Structure:** a **two-tone screen**.
  - Top: a **black header block** (about the top 40% of the screen) with a large rounded bottom edge. It holds the title, the balance or card, and round icon buttons.
  - Bottom: a **white content sheet** below it.
- **Palette:** black, white and greys only. Colour comes from the cards themselves and from a green income amount.
- **Floating tab bar:**
  - a black pill at the bottom, with 4 icons
  - the active tab is a **white circle with a black icon**
- **Typography:** a clean geometric sans (SF-like). Amounts are large and light-to-regular weight, for example a ~30pt balance. Labels are small and grey.
- **Cards:**
  - realistic credit-card artwork: metallic silver, champagne-gold and pale-grey "virtual" versions
  - a contactless icon, a VISA logo with a tier label, and a small uppercase type label (EVERYDAY / ONLINE · VIRTUAL / TRAVEL)
  - rounded corners (~14px) and a soft shadow
  - the other cards **peek out behind the front card** as a stacked deck (2–3 thin edges visible above it)
- **Under the card:** card name + "Physical/Virtual •••• 4821" on the left, and **page dots** on the right (the active dot is a longer pill).

## Screen by screen

1. **Home (0.0s, `01`).** The black header holds a greeting, search and + circle buttons, a small "available balance" label, **$22,000**, and a silver card. Below it, the white sheet shows "Recent transactions": rows with a round icon, a title, a time and an amount, with income shown in green.

2. **Tab switch to Transfers (0.5–1.0s, `02`, `03`).**
   - The screen **cross-fades**. Content in the white area first shows as **faint skeleton placeholders** at 0.5s, then fades in fully by 1.0s.
   - The header gets a segmented **Send / Request** toggle: a white pill on a dark track.
   - "Quick send" is a horizontal row of round avatars with a "New +" circle first.
   - Then a 4-icon action row, "Scheduled" date-chip cards and an Activity list.
   - The tab-bar highlight circle jumps to the new tab.

3. **Tab switch to Cards (2.0s, `04`).**
   - The header shows a **stacked card deck**.
   - Under the deck is a 4-button action row: **Freeze, Details, Limit, PIN**. Each is a round outlined icon with a label.
   - Then a **"Spent this month" card**: a big amount, the limit on the right, a black progress bar, a segmented spending bar (black / grey / light grey) and category rows with % values.
   - **Count-up:** the spent amount **counts up** on entry ($3,168 → $3,240.50 within ~0.5s).

4. **Swiping between cards (3.5–7.0s, `05`–`09`).**
   - Dragging the front card makes it **tilt in 3D toward the pointer**: you can see the perspective skew on the VISA logo at 3.75–4.25s. It then swipes horizontally.
   - **Swap animation** (corrected after frame-by-frame measurement; see `MOTION.md` §3):
     - It is a **horizontal 3D carousel**. The current card slides out sideways, turned slightly away.
     - The next card slides in from the opposite edge, straightens and grows to full size.
     - The two cards are briefly side by side (`07`). It takes ~0.65–0.75s in total: a fast flick followed by a soft spring settle.
   - **Content updates with the card:**
     - The type label, the name ("Online card", "Travel card") and the page dots update.
     - The **spending card re-animates**: the amount and limit count to the new card's numbers (for example $827 → $613 → $1,077 → $1,876), the bars resize, and the category list changes (Shopping becomes Flights for the travel card).
   - **Fanned state:** at 7.0s the cards are shown **fanned out side by side** (gold on the left, silver on the right) while scrolling back. Then the deck snaps back to the Everyday card, and its numbers count back up to $3,240.50.

5. **Freeze (8.5–9.0s, `10`, `11`).**
   - Tapping Freeze fills that button **solid black** and its label changes to "Unfreeze".
   - A black **"Card frozen" pill bar expands** horizontally inside the spending card, growing from the centre.
   - The card gets a **frosted, icy overlay**: lighter and desaturated, with a **sparkle/snow particle texture** and a small dark centred "🔒 Frozen" chip.
   - The status under the card adds "Frozen".

6. **Details: card flip (10.0–12.0s, `12`, `13`).**
   - Tapping Details makes the card **flip 180° around its vertical axis in 3D**. You can see the perspective mid-flip at 10.2s (`12`), and the flip takes ~0.3s.
   - The **back** shows a black magnetic stripe, the full card number, the expiry and CVV, the brand name and a round **copy** button.
   - The Details button label changes to "Hide".
   - Tapping again flips it back to the front, still frosted (~11.5–12.0s).

7. **Limit: bottom sheet (12.0–15.5s, `14`–`16`).**
   - A **bottom sheet slides up** from below with a grab handle, and the screen behind **dims**.
   - The sheet has a title, a subtitle with the amount spent so far, and a **huge centred amount**.
   - A **slider** sits under it with a black knob, plus 4 preset chips ($1,000 / $2,500 / $5,000 / $10,000). The selected chip is solid black.
   - Dragging the slider makes the amount **roll live** ($3,484 → $4,987 → $10,833 → $12,481).
   - Tapping the black **"Save limit"** button slides the sheet down. A black **"✓ Limit set to $12,500" toast pill** appears in the spending card, and the limit figure counts up to $12,500.

8. **PIN: press-and-hold reveal (16.5–19.0s, `17`, `18`).**
   - The same kind of bottom sheet slides up.
   - It shows **4 rounded PIN boxes with dots** and a black **"Hold to reveal"** button.
   - While the button is held, its label switches to "Release to hide" and the dots turn into the digits.
   - Releasing the button turns the digits back into dots.

9. **Card settings (21.0s, `19`).**
   - When the page scrolls, the **black header collapses** into a compact bar showing the title and a tiny card thumbnail.
   - Below: a spending category breakdown, then a "Card settings" list with **iOS-style toggles** (contactless, online purchases, ATM withdrawals, spending abroad). These are greyed out while the card is frozen.
   - At the bottom is a red "Report lost or stolen" text link.

## Motion vocabulary

- **Count-up / rolling numbers:** every money figure animates to its new value (~0.4–0.6s, ease-out) instead of changing instantly.
- **Card deck:**
  - a 3D stack with peeking edges
  - drag tilt (perspective rotate toward the finger)
  - swipe swap: a horizontal 3D carousel with a spring settle (see `MOTION.md`)
  - a fan-out view
- **3D flip** for card details (rotateY 180°, front and back faces).
- **State overlay** on the card for Frozen: frost tint, sparkle particles and a lock chip.
- **Expanding pill feedback:** the black status pills ("Card frozen", "Limit set…") grow out from the centre inside the content card.
- **Bottom sheets** with a dimmed backdrop and spring slide-up, used for both Limit and PIN.
- **Press-and-hold to reveal** sensitive data.
- **Skeleton → content fade** when switching tabs.
- **Collapsing header** on scroll.

## Adapting it for the banking demo (web)

- **Card deck:** absolutely-positioned cards with `transform: translateY / scale / rotate` per depth level. Use `perspective` on the container and `rotateX/rotateY` tied to the pointer for the tilt, and animate the swap with a spring (Framer Motion / GSAP).
- **Flip:** a card wrapper with `transform-style: preserve-3d`. Use two faces with `backface-visibility: hidden` and rotate the wrapper `rotateY(180deg)` over ~0.4s.
- **Frozen state:** a white overlay at about 40% opacity with `backdrop-filter: saturate(0.3) brightness(1.15)`, a sparkle SVG or noise pattern, and a centred chip.
- **Numbers:** a count-up helper that tweens from the old value to the new one on every change.
