# Kestrel Bank: design proposal based on the Soltio study

This proposal is based on `soltio/TEARDOWN.md` and its 36 screenshots. Nothing has been built yet. Decide the open questions at the end, and then I'll implement it.

## The idea in one paragraph

Keep Soltio's structure and motion, and put our own banking content and brand in it. The page becomes a set of **rounded panels floating on a light-grey canvas**. The hero and footer are dark panels with a soft coloured glow. Between them sit light sections with **bento cards**, and each card shows a small slice of the real Kestrel app: a balance, a transfer receipt, a loan calculator, a recovery claim tracker. Motion stays calm and consistent: items fade up as you scroll, numbers count up, and the hero card stack shuffles. This suits a bank, which should look trustworthy rather than flashy.

## Section map: their page → our landing page

| # | Soltio section | Kestrel version | What it shows |
|---|---|---|---|
| 1 | Hero: dark panel, headline, fanned card stack | **Hero** | Headline + "Open Account" pill + "Sign in" link. On the right, 3 shuffling Kestrel cards (we already draw cards in CSS in the Cards page), with glow behind them. |
| 2 | Logo marquee | **Trust strip** | A scrolling row of trust points instead of fake brand logos: "AES-256 encryption · Multi-currency USD/EUR/GBP · 24/7 support · PIN-protected login · Instant transfers". |
| 3 | Features: image + counters | **Why Kestrel** | Left: a phone mock of our dashboard Home screen. Right: heading, short copy, and counters (e.g. "3 currencies", "0% local transfer fees", "5 min account opening"). |
| 4 | Payments bento (4 cards) | **Move money** | Local transfer · International transfer · Deposits (bank / check / cash) · Currency swap. Each card holds a mini mock of our real form or receipt, plus a "Transfer received" toast. |
| 5 | Giant text marquee | **Text marquee** | One huge scrolling line, e.g. "Bank smarter — Save faster — Send anywhere —". |
| 6 | Insight: list + dashboard card | **Virtual cards** | Create a card, freeze/unfreeze, spending limits. Right side: a card-management mock. |
| 7 | Analytics: dark section, 3 glass cards | **Services** (dark) | 3 glass cards: **Loans**, **Tax Recovery**, **Fund Recovery**. This gives the two recovery services a prominent spot of their own, as you asked. |
| 8 | Tracking: card on a ticket + copy | **Transaction tracking** | A receipt-style ticket with a real-looking transaction row; copy about live status (Pending → Completed). |
| 9 | Management 4-card bento | **Security & control** | PIN login · Multi-currency wallets · Card controls · Admin approvals for large transfers. The "hub" diagram becomes Kestrel in the centre with USD/EUR/GBP and the services around it. |
| 10 | Testimonials masonry | **How it works** (recommended) | 3 steps: Open account → Fund your wallet → Bank anywhere. See open question 3. |
| 11 | Dark footer with CTA + glow | **Footer** | "Ready to bank with Kestrel?" CTA, link columns (Personal / Services / Company), and the demo-mode notice. |

The logged-in dashboard keeps its current layout, but gets the same fonts, colours, card radius and button style, so the landing page and the app feel like one product.

## Visual style

- **Canvas and panels:** grey page background `#EFEFEF`. Sections are rounded panels inset 20px from the edge (radius 40 for the hero, 30 for other big panels, 20 for cards). On phones, the inset is 12px.
- **Colours:** black, white and greys from Soltio, plus **one accent colour** (open question 1). The accent is used sparingly: arrow icons, counter suffixes, chart bars, icon tiles.
- **Fonts:** **Inter Tight** (free, Google Fonts) for all headings, numbers and buttons, with tight letter-spacing. Soltio's body font is Creato Display; I'd check its licence first and otherwise use **Inter** for body text, which looks close.
- **Sizes:** H1 60px (35px on phone), section headings 40px (25px on phone), body 16px with relaxed line spacing.
- **Signature components:**
  - **Pill button** with a round arrow badge on the right. On hover, the label rolls up and the colour floods across the pill.
  - **Glass cards** (translucent white + heavy blur) on the dark Services section.
  - **Accent icon tiles**: 64px rounded squares in a light tint of the accent.
  - Soft, large, low-opacity shadows; no hard borders.

## Motion (one consistent set)

| Effect | Where | Settings |
|---|---|---|
| Fade-up | Headings, text, cards everywhere | from 80px below, 0.6s, ease-out, 80ms between siblings, plays once |
| Scale-in | Mock screens and images | from 0.8 to 1, 0.55s |
| Count-up | Counters in "Why Kestrel" | 0 → value over 1.1s, ease-out |
| Card shuffle | Hero card stack | cards rotate through 3 slots; back cards blurred for depth |
| Marquees | Trust strip, giant text line | continuous leftward loop with faded edges |
| Glow + drifting dots | Dark Services section | slow, subtle |
| Button hover | All pill buttons | label roll + colour flood, 0.3s |

No parallax or scroll-jacking, so the page stays smooth on a projector or an older laptop during the pitch. Animations will be switched off for anyone whose system asks for reduced motion.

**How I'd build it:** the `motion` library (the React version of Framer Motion) for reveals and the card shuffle, CSS animations for the marquees, and Tailwind for styling. That adds one small package to the web app.

## Things I'd deliberately not copy

- Their text, logo, illustrations and 3-D renders. Our visuals will be built in code from our own UI (cards, receipts, balances), which also keeps them consistent with the real app.
- Fake customer reviews and "Rated 4.9/5 from 600 reviews". Kestrel has no customers yet, and invented reviews in front of investors would be risky if anyone asks. See open question 3.

## Open questions for you

1. **Accent colour.** Kestrel currently uses a green (`#0E7C66`). Soltio uses indigo (`#5462E6`) with violet gradients.
   - **Recommendation:** keep a Kestrel colour so it doesn't look like a copy, but let the client's real brand colour replace it later. If the bank has a logo or colours already, send them and I'll use those.
2. **Bank name.** Still "Kestrel Bank" as a placeholder. Do you have the real name or logo yet?
3. **Testimonials section.** Replace with "How it works" (recommended), or keep testimonials clearly marked as sample content?
4. **Scope.** Landing page only first (recommended, since it's the investor's first impression), or the landing page plus restyling the login, register and dashboard screens in the same pass?

Reply with your answers (even "go with your recommendations") and I'll build it.
