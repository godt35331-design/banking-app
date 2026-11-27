# Soltio (Framer template): design teardown

Source: https://soltio.framer.website/ (studied 2026-11-25). This is for research only. The copy is paraphrased here, and none of their text or logo should be reused.

**How this was captured**
- Desktop screenshots come from local headless Chrome at **1440 × 900** (the in-app browser pane is only 800px wide, which triggers Framer's tablet layout).
- Phone screenshots are at **390 × 844**, with touch emulation on.
- Values were read with `getComputedStyle` on the live page.
- Animations were measured by sampling every animated element's computed `opacity` / `transform` / `filter` every 80 ms while each section scrolled into view. Timings are therefore ±80 ms.
- The "Made in Framer" pill in the bottom-right of every screenshot is Framer's hosting badge. It isn't part of the design.
- The fixed nav bar overlays the top ~100px of every viewport. Section screenshots are scrolled so the section starts just below it.

---

## Page skeleton (desktop)

- **Canvas:** `body` is light grey `#EFEFEF`. Every section is a separate **rounded panel inset 20px** from the viewport edges, so panels are 1400px wide at 1440. The grey canvas shows between and around them.
  - The hero is a **black panel, radius 40px**.
  - Analytics → Testimonials sit inside one **white panel, radius 30px**. The Analytics part of it is dark.
  - The footer is a **black panel, radius 30px**.
- **Content width:** inner `Container` is **1290px** (1260px content + 15px side padding).
- **Grid:** cards sit in rows with **30px gutters** (for example 410 + 30 + 850 = 1290).
- **Section rhythm:** most sections use **120px top / 130px bottom** padding (some use 120/120). The heading block is followed by ~80px before the card grid.
- **Page height:** ~9,830px at 1440 wide (~11,250px at 390 wide).

| # | Section (Framer layer name) | Screenshot(s) |
|---|---|---|
| 1 | Hero | `01-hero.png` |
| 2 | Logo marquee ("Marquee") | `02-logo-marquee.png` |
| 3 | Features (image + intro + counters) | `03-features.png` |
| 4 | Payments (bento card grid) | `04-payments-a.png`, `04-payments-b.png` |
| 5 | Text marquee (giant scrolling text) | `05-text-marquee.png` |
| 6 | Insight (copy + list + dashboard card) | `06-insight-a.png`, `06-insight-b.png` |
| 7 | Analytics (dark, glow + 3 glass cards) | `07-analytics-a.png`, `07-analytics-b.png` |
| 8 | Tracking (card visual + copy) | `08-tracking-a.png`, `08-tracking-b.png` |
| 9 | Management (4-card bento) | `09-management-a.png`, `09-management-b.png` |
| 10 | Testimonials (3 × 2 masonry) | `10-testimonials-a.png`, `10-testimonials-b.png` |
| 11 | Footer (CTA + link columns) | `11-footer-a.png`, `11-footer-b.png` |
| — | Phone: hero, payments, open menu | `mobile-01-hero.png`, `mobile-02-payments.png`, `mobile-03-menu-open.png` |
| — | Hover off/on pairs | `hover-01…06-*-off.png` / `-on.png` |

---

## Navigation bar

- **Behaviour:** fixed to the top (`position: fixed`, full width, ~100px visible bar). It stays visible the whole time: no hide-on-scroll and no style change on scroll was measured.
- **Surface:** `rgba(0,0,0,0.5)` + `backdrop-filter: blur(50px)`. It looks near-black over the hero and mid-grey over the light sections (see the tops of `02`–`06`).
- **Layout:** three zones on one row.
  - Left: logo (mark + wordmark, white).
  - Centre: 5 text links (Creato Display Medium 16px, white). Two of them have a small ▾ chevron for dropdowns.
  - Right: **pill CTA**, a white pill (radius 100px, padding 7.5px 10px 7.5px 25px, 220 × 60) with a label and a **45px black circle holding a ↗ arrow**.
- **Phone (`mobile-01-hero.png`, `mobile-03-menu-open.png`):** a **white bar, 70px**, with the logo on the left and a **black circular hamburger button** on the right. Opening it drops a white panel down with:
  - the stacked links (chevrons on the dropdown items)
  - a dark rounded promo card holding an app-download pill and 4 circular social icons
  - the hamburger morphs to ✕

---

## 1. Hero (`01-hero.png`)

- **Panel:** black, radius 40px, ~970px tall, padding 214px top / 186px bottom. Soft light streaks come from the top-left, and there is a **deep blue/violet radial glow** on the right behind the cards. A few faint **dark rounded "glass" squares** (≈60px, radius ~12) float at the panel edges as decoration.
- **Left column (530px):**
  - H1 in white on 2 lines (60px), with a small 4-point sparkle glyph after line 1.
  - A 2-line white paragraph.
  - A white pill button with a black circular download-icon badge.
  - Lower down: an overlapping row of 4 circular avatars, then a yellow rounded square with a star next to a 2-line "rated x/5" line.
- **Right column:** a **fanned stack of 3 credit cards**, tilted and overlapping, in blue (front), coral-red and light blue. Each card has a chip, a contactless icon, a number, a name and an expiry. A glossy **purple 3-D sphere** peeks out behind the front card's lower-left.
- **Phone:** the hero becomes a single column. The panel is inset 15px with radius ~30, the card stack moves below the text, and the glow gradient shifts to purple/blue at the bottom.

## 2. Logo marquee (`02-logo-marquee.png`)

- On the grey canvas: one centred line of social proof (20px).
- Below it, a horizontally **scrolling row of 5–6 placeholder brand logos** in grey, at reduced opacity.
- Left and right **edge fade masks**: `linear-gradient(90deg, #EFEFEF 0%, transparent 35%, transparent 65%, #EFEFEF 100%)`.
- A 1px grey hairline divider spans the full width below the row.

## 3. Features (`03-features.png`)

- **Left (630px):** a tall image card (radius 20) showing a phone UI over dark glossy 3-D pebbles. A **frosted-glass CTA card** overlays the bottom of the image:
  - `rgba(255,255,255,0.2)` + `backdrop-filter: blur(28px)`, radius 15, padding 34/22/34/39
  - an avatar trio and a 2-line white title
  - an 82px circular arrow button: translucent grey `rgba(112,113,117,0.84)` with a white outline
- **Right (520px):**
  - H2 (40px, 2 lines), a grey paragraph, and a **black pill button** with a white circle and an **accent-blue ↗**.
  - Under a hairline divider, **2 counter columns** split by a 1px vertical rule. Each column has a big number (40px) with a **suffix in accent blue** (`m`, `+`), a 20px label and a 2-line grey description.

## 4. Payments: bento grid (`04-payments-a.png`, `04-payments-b.png`)

- Centred H2 (2 lines), then a 2-row bento of 4 cards, all radius 20, 443px tall. Row 1 is 410 + 850; row 2 mirrors it as 850 + 410.
  - **Gradient promo card (410):**
    - background `linear-gradient(149deg, #4730B8 7%, rgba(119,42,226,.28) 46%, #FFF 109%)`
    - a white pill tag in uppercase (Creato Display Bold 14px, +1.4px tracking)
    - a white 30px title and a black pill "view more" button
    - a large faint white logo-mark shape bleeding off the bottom-right
  - **White wide card (850):**
    - left side: title (24px), a short gradient hairline, a grey description and a text link with a ↗ arrow
    - right side: a UI mockup (a performance widget with segmented tabs and a top-user profile with an amount)
    - a **black toast** ("payment received" with an avatar and a green check) overlaps and bleeds off the right edge
  - **White wide card, row 2:** a title plus a revenue mock showing a big amount, a green `+12%` pill and two mini stat tiles (income/expenses with round blue icons).
  - **Black card (410):** a white title and copy, a bell icon in a ring with an accent-blue arc, and an "administrator" pill with an avatar.

## 5. Text marquee (`05-text-marquee.png`)

- A full-bleed **giant line of text, 150px Inter Tight Medium, −5.4px tracking**, in black on grey. One short phrase repeats, separated by " - ", and scrolls continuously leftwards.

## 6. Insight (`06-insight-a.png`, `06-insight-b.png`)

- **Left (552px):** H2, a grey paragraph and a black pill CTA. Below that, **2 feature rows** separated by a **dashed** divider. Each row has a 64px lavender rounded-square icon tile (`rgba(84,98,230,0.15)` background, radius 10, blue line icon), a 20px title and a 2-line grey description.
- **Right (463px):** a **dashboard card inside a gradient frame**.
  - Outer frame: radius ~30, purple→lavender gradient.
  - Inner white card: radius ~25, holding a title and ⋮ menu, a big amount (~40px), a legend with blue and black dots, and 2 small bordered subscription tiles (logo, name, price/month, ✓/✕ toggles).
  - A **12-month bar chart made of stacked horizontal pill segments** in light grey / black / accent blue, over dashed gridlines.

## 7. Analytics: dark (`07-analytics-a.png`, `07-analytics-b.png`)

- A dark area at the top of the white panel. A **curved, glowing horizon arc** (light-blue rim) sits at the very top, with a **purple radial glow** under it and a scatter of tiny white "star" dots. A faint **square grid** fades in at the bottom-left.
- Centred white H2 (40px).
- **3 glass cards** (410 wide, 30px gaps):
  - styling: `rgba(255,255,255,0.08)`, `backdrop-filter: blur(100px)`, radius 30, padding 40/24/23, gap 52
  - each has a centred white title (30px) and a 2-line description
  - each has a darker inner panel (radius ~20) with a mini UI: currency rows with flags and progress bars; stat rows with round white icons and `+x%` chips; spending categories with icon circles

## 8. Tracking (`08-tracking-a.png`, `08-tracking-b.png`)

- **Left (580px):** a light-grey **ticket-shaped card** with notches cut on both sides at a dashed perforation line. A **coral→purple gradient credit card** sits on top of it and overhangs the top. Below the perforation is one transaction row (logo, name, date, negative amount). Soft large shadow.
- **Right (620px):**
  - H2, then an H4 sub-heading (24px) ending in a colon, a 3-line grey paragraph and a black pill "start trial" button.
  - A hairline divider, then **2 inline feature items**, each a 64px lavender icon tile with a 2-line 20px label.

## 9. Management: 4-card bento (`09-management-a.png`, `09-management-b.png`)

- Centred H2. All 4 cards are `#F5F5F5`, radius 20, 492px tall, padding 50/20, with a centred 24px caption at the bottom.
  - Row 1: 740 + 520. Row 2: 520 + 740.
  - **Integrations hub:** a 95px black circle with the brand mark in the centre, joined by **dashed lines** to 6 white circular app icons in a hexagon. The lower icons fade out under a gradient mask.
  - **Balance card:** a white card mock with a black currency pill (flag + green live dot), an avatar stack with a `50+` bubble, a big balance, a masked account number and an eye toggle. A bottom gradient fade-out mask goes to `#F5F5F5`: `linear-gradient(rgba(245,245,245,0) 58%, #F5F5F5 90%)`.
  - **Reward progress:** a white card with a balance and 3 vertical bars (accent blue / black / black) labelled with %, on hatched grey tracks.
  - **Biometric:** a light square-grid background with concentric circles (lavender ring → accent-blue disc → white circle holding a shield-check icon).

## 10. Testimonials (`10-testimonials-a.png`, `10-testimonials-b.png`)

- Centred H2, then a **3-column masonry of 6 white cards**. The cards have uneven heights because the quotes are different lengths, and the middle column is offset.
  - Card styling: radius 20, padding 30, gap 70, shadow `0 19px 150px rgba(0,0,0,0.1)`.
  - Each card has a 55px round avatar, name (20px), handle (grey), an X/Twitter glyph on the right, then the quote (16px grey).
- Bottom centre: a black pill holding an overlapping row of 4 avatars, followed by a short line of text.

## 11. Footer (`11-footer-a.png`, `11-footer-b.png`)

- **Panel:** black, radius 30, padding-top 120. A **purple radial glow rises from the bottom centre**.
- **Top row:** a 2-line white CTA heading (40px) on the left and a white "download" pill on the right.
- Full-width hairline, then a **2-part grid** split by a vertical hairline.
  - **Left (534px):** logo, a 2-line blurb, and 4 **outlined circular social buttons** (40px, 1px white border).
  - **Right:** 3 link columns: Quick links / Other pages / Address + Contact. The column titles are 20px white and the links are Creato Display 16px `#EFEFEF`.
- Hairline, then a bottom bar with a credit line on the left and a policy link on the right.

---

## Colours

Framer colour tokens found in the stylesheet, with where each is used:

| Token value | Role |
|---|---|
| `#EFEFEF` | page canvas / body background; light text on dark (footer links) |
| `#FFFFFF` | white panels, cards, pill buttons, text on dark |
| `#F5F5F5` | soft-grey inner cards (Management), fade-mask target |
| `#F8F8F8`, `#EEEEEE` | alternate light surfaces |
| `#000000` | hero/footer panels, black cards and buttons, primary text |
| `#121212`, `#14161F`, `#030028`, `#020E0D`, `#0A2540` | near-black alternates (dark cards, menu promo card) |
| `#565656` | body / secondary text on light |
| `#5D5C5B`, `#BEBEBE` | muted text, hairlines |
| **`#5462E6`** | **primary accent** (indigo-blue): counter suffixes, ↗ icons, chart bars, biometric disc, bullets |
| `rgba(84,98,230,0.15)` / `rgba(85,99,230,0.10)` | accent tint for icon tiles |
| `#3531AC` | deeper indigo (gradient partner) |
| `#4730B8` → `rgba(119,42,226,.28)` → `#FFF` | signature **violet gradient** (149°) on promo / frame cards |
| coral `≈#F05D5D` → purple `≈#5B3CC4` | credit-card gradient (Tracking, hero back card; read from the image) |
| green `≈#22C55E`-ish | positive chips (`+12%`) and live dots (read from screenshots, not tokens) |
| yellow `≈#FFC107`-ish | rating star tile (from screenshot) |

Translucency:

| Value | Use |
|---|---|
| `rgba(0,0,0,0.5)` + blur 50 | nav |
| `rgba(255,255,255,0.2)` + blur 28 | glass CTA |
| `rgba(255,255,255,0.08)` + blur 100 | dark glass cards |
| `rgba(112,113,117,0.84)` | glass arrow button |

Borders are mostly not CSS borders. Dividers are 1px hairlines in `#BEBEBE` / `rgba(255,255,255,.2)`-ish on dark, and there is one dashed divider in Insight.

## Typography

Three custom families, all served by Framer:
- **Inter Tight Medium (500):** every heading, number and button label.
- **Creato Display Regular / Medium / Bold:** body copy, nav links, uppercase tags.
- **Inter Display 500:** a few card titles and big amounts.

Desktop scale at 1440px (size / line-height / letter-spacing):

| Role | Font | Size / LH / tracking | Colour |
|---|---|---|---|
| Marquee display | Inter Tight Medium | **150 / 180 / −5.4px** | #000 |
| H1 (hero) | Inter Tight Medium | **60 / 69.6 (1.16) / −2.4px (−0.04em)** | #FFF |
| H2 (section titles), counters | Inter Tight Medium | **40 / 50 (1.25) / −1.2px (−0.03em)** | #000 or #FFF |
| Card title L / big amount | Inter Display 500 | 30 / 39.9 / −0.6px | — |
| Card title M, H4 | Inter Tight Medium | 24 / 33.8 / −0.48px | — |
| Small title, list title, footer column heads | Inter Tight Medium | 20 / 30 / −0.4px | — |
| Button label | Inter Tight Medium | 17 / 26.9 / normal | — |
| Nav link | Creato Display Medium | 16 / 25.9 | #FFF |
| Body | Creato Display Regular | **16 / 25.9 (1.62)** | #565656 (on light), #FFF / #EFEFEF (on dark) |
| Tag / eyebrow | Creato Display Bold | 14 / 23.9 / **+1.4px, UPPERCASE** | #000 |
| UI micro text (inside mocks) | Inter Tight Regular | 12 / 14.4 | #565656 |

On phones at 390px: H1 35 / 40.6 / −1.4px, H2 25px, body 14px.

The general pattern is **tight negative tracking on every Inter Tight heading (about −0.02 to −0.04em)** and airy 1.6 line-height on body text.

## Spacing, radii, shadows and effects

- **Radii:**
  - 40 for the hero panel
  - 30 for big panels, the footer and dark glass cards
  - 25 for the inner dashboard card
  - 20 for all standard cards
  - 15 for the glass CTA
  - 10 for icon tiles and small chips
  - 8 / 11 for micro UI
  - **100px for every pill button and pill tag**
  - 50% for avatars and icon circles
- **Shadows** (all very soft, large-blur and low-opacity):
  - `0 19px 150px rgba(0,0,0,.10)` for testimonial cards (×6)
  - `40px 140px 200px rgba(0,0,0,.25)` for hero credit cards
  - `0 29px 80px rgba(0,0,0,.12)` and `0 41px 90px rgba(0,0,0,.10)` for mock UI cards
  - `0 109px 120px rgba(0,0,0,.28)` for the tracking card
- **Blur / glow:**
  - `filter: blur(100px)` on 5 large coloured blobs: the hero glow, the analytics purple glow and the footer glow
  - `blur(32px)`, `blur(10px)` and `blur(3px)` on the back credit cards (depth of field)
  - backdrop blurs of 50 / 28 / 100 as listed under Colours
- **Fade masks:** vertical `linear-gradient(rgba(245,245,245,0) 56–72%, #F5F5F5 75–90%)` overlays let mock UIs dissolve into the card background. The marquee uses horizontal edge fades.

---

## Animations

**Engine:** Framer Motion.
- Only **3 elements use Framer "appear" animations** (`data-framer-appear-id`), and these run on page load. The script tag `__framer__appearAnimationsContent` holds them, all identical:
  `initial {opacity: 0.001, scale: 0.5}` → `animate {opacity: 1, scale: 1}`, `transition {type: tween, duration: 1, delay: 0, ease: [0.44, 0, 0.56, 1]}`.
- Everything else is a **scroll-triggered "while in view" animation**. Its starting state is server-rendered as inline styles, and these patterns are counted in the HTML:
  - `opacity:0; transform:translateY(80px)` ×58, the default fade-up
  - `opacity:0; transform:scale(0.8)` ×9
  - `opacity:0; transform:scale(0.3)` ×5
  - `opacity:0; transform:translateX(125px)` ×12, used by avatar rows
  - `opacity:0; transform:translate(-50%,-50%) scale(0.5)` ×5
  - `opacity:0; transform:translateX(-50%) rotate(-38deg); transform-origin:0% 100%` ×2, used by the tracking card
  - `transform:translateX(-40px)` on the marquee list
  - The Framer badge uses `opacity:0.001; translateY(10px)`.

**Reusable motion primitives (measured):**

| Name | From → to | Duration | Easing feel | Stagger |
|---|---|---|---|---|
| **Fade-up** (default reveal) | opacity 0 → 1, translateY **80px** → 0 | **≈0.55–0.65s** | strong ease-out (≈75% done at half-time) | **≈80ms** between siblings |
| **Scale-in** | opacity 0 → 1, scale **0.8** → 1 | ≈0.55s | ease-out | 80ms (analytics cards) |
| **Pop-in** (small icons) | opacity 0 → 1, scale **0.5** → 1 | ≈0.8s | ease-out | ≈80–160ms |
| **Slide-from-right** (avatar stacks) | opacity 0 → 1, translateX **125px** → 0 | ≈0.95s | **spring with a ~2px overshoot** | 80ms per avatar |
| **Swing-in** (tracking card) | opacity 0 → 1, rotate **≈38°** → 0 around bottom-left | ≈0.8s | ease-out | — |

- **Trigger point:** each reveal fires as soon as its element enters the viewport and plays once. It was never seen reversing while the page was still loaded.
- **Parallax:** none. Scrolling 200px moved every settled element exactly 200px.
- **Sticky sections:** none. The only fixed elements are the nav and the Framer badge.
- **Background colour:** a layer named "Background Color Change" exists, but its colour stayed `#FFF` at every scroll position sampled (every 300px). No scroll-driven colour change was observed.

**Page-load intro (hero), times from the load event:**
- 0–0.9s: the decorative glass squares **scale 0.5 → 1 and fade in** (the appear animation above, 1s tween), with slightly different end times per square.
- 0–0.55s: the **H1 fades up from 80px**, with line 1 slightly ahead of line 2. The paragraph and the download button follow, done by ~0.65s.
- 0.08 / 0.16 / 0.24 / 0.32s: the **4 avatars slide in from the right**, one after another (spring with a small overshoot). The rating line fades up at ~0.24s and the whole group settles by ~1.3s.
- **Credit-card stack, looping:** the 3 cards **shuffle positions**, each card moving to the next slot.
  - Front slot: rotate −9°, y −30, sharp.
  - Middle slot: rotate +6°, x +85, y −23, `blur(3px)`.
  - Back slot: rotate +18°, x +173, y +7, `blur(10px)`.
  - So depth is faked with progressive blur and rotation. The first shuffle finished ~2.5s after load, then the stack held still.
- **Behind the cards:** a decorative background element **rotates continuously** at ≈12°/s (≈30s per turn).

**Per section:**
- **Logo marquee:**
  - The heading fades up (0.6s).
  - The logo list fades in while sliding from −100px.
  - It then **scrolls left continuously at ≈100px/s**, looping by teleporting the first item to the end (a `translateX(2626px)` jump was seen).
  - The logos settle to a dimmed state (opacity 0.5 → 0.25 on the wrapper).
- **Features:**
  - The image card **scales in** (0.8 → 1).
  - The heading, paragraph, button and counter row **fade up** together (≈0.56s).
  - **Counters count up** from 0 to 20 and 0 to 100 over **≈1.1s with ease-out**. Sampled values for the 100 counter: 0 → 22 → 54 → 73 → 87 → 94 → 97 → 98 → 99 → 100. It starts ~0.3s after the section enters.
- **Payments:**
  - The heading fades up.
  - The 4 bento cards fade up 80px, row 1 left→right then row 2. The left and right cards in each pair are ~80ms apart, and each takes ~0.56s.
- **Text marquee:** the line **scrolls left continuously at ≈80px/s** and loops seamlessly.
- **Insight:**
  - The left column blocks (heading, copy, button, list rows) fade up together (≈0.5s).
  - The dashboard card **scales in** (0.8 → 1).
- **Analytics:**
  - The star-dot cluster **scales in** (0.5 → 1, ≈0.8s). About 25 dots at opacity 0.7 then **drift continuously**, each wandering up to ±65px, like a particle field.
  - The heading fades up.
  - The 3 glass cards **scale in 0.8 → 1, staggered 80ms** (≈0.56s each).
- **Tracking:**
  - The left card visual **swings in**: rotate ≈38° → 0 from the bottom-left corner plus a fade, ≈0.8s.
  - The right column (heading, sub-heading, paragraph, button, feature items) fades up together, ≈0.56s.
- **Management:**
  - The heading, then the cards **fade up with ~80ms stagger**.
  - In the integrations card, the **central hub scales 0.75 → 1** (slow, ≈1.7s) and the **6 satellite icons pop in one at a time**, each going scale 0.5 → 1 with a fade over ≈0.8s. The pops are spread ~160ms apart, from ~0.5s to ~1.3s after entry.
  - The outer icons keep **pulsing**: their opacity and scale were still changing at the end of the sample window.
  - The 3 reward bars **grow upward** from ~0 to their % height (Framer layout animation, with inverse-scale counter-transforms on their labels).
- **Testimonials:**
  - The heading fades up.
  - The cards fade up 80px in reading order, **80ms apart across the 3 columns**, with the second row following.
  - The avatar row in the bottom pill **slides in from the right**, staggered (spring, ≈1s).
- **Footer:** no entrance animation measured. It is static.

**Hover effects**, each shown as an `-off` / `-on` pair:

| Element | Effect | Timing | Files |
|---|---|---|---|
| **Pill buttons** (all variants: nav CTA, hero download, black pills, card buttons) | 1. **Label roll:** two stacked copies of the label slide **up 20px**, so the old one exits upward and the new one rises in (slot-machine). 2. **Colour flood:** a 30px circle hidden in the arrow badge **expands to cover the whole pill**, inverting colours (white pill → black with white text; black pill → white with black text). 3. The arrow icon cross-fades to its inverted version. | ≈0.3s, ease-out (≈60–80% done at 150ms) | `hover-01-nav-cta-*`, `hover-02-hero-download-btn-*`, `hover-04-dark-pill-btn-*` |
| **Glass circular arrow** (Features CTA) | The translucent grey fills to **solid white**, the ↗ arrow **rotates 45°** (→ →) and inverts to black | ≈0.3s | `hover-03-features-glass-cta-arrow-*` |
| **Text link with ↗** ("view more" style) | The arrow **slides 10px right**; the text stays put | ≈0.2s | `hover-05-card-text-link-*` |
| **Footer social circles** | The outline circle **fills white** and the icon inverts to black (`filter: invert(1)`) | ≈0.3s | `hover-06-footer-social-icon-*` |
| Nav text links, all cards | **No hover change measured.** The cards have no lift or shadow change. Dropdown items (with ▾) were not opened. | — | — |

---

## Components

1. **Section panel:** a full-width rounded container inset 20px from the viewport (radius 30–40), in black, white or transparent over `#EFEFEF`. This is the defining "floating panels" look.
2. **Pill button** (3 colourways): height 60, radius 100, padding 7.5/10/7.5/25, a 17px label, and a 45px circular icon badge on the right in the inverse colour. The ↗ arrow is accent blue on the white badge. It has the roll + flood hover described above.
3. **Text link with arrow:** a 16–17px label with a small ↗ that nudges right on hover.
4. **Uppercase tag pill:** a white pill with 14px bold uppercase text tracked +1.4px.
5. **Avatar stack:** 4 overlapping 40–55px circles with a white ring. Often paired with a rating star tile, or placed in a black pill.
6. **Counter block:** a 40px number with an accent-coloured unit suffix, a 20px label and a grey description, separated by 1px vertical rules.
7. **Bento cards:** white, black, gradient or soft-grey; radius 20; mixed widths 410/520/740/850 on a 1290 grid; each contains a **product-UI mock** that often bleeds off the card edge and fades out through a gradient mask.
8. **Glass card:** translucent white with a heavy backdrop blur. Used both on light (glass CTA over the image) and on dark (Analytics cards, 8% white + blur 100).
9. **Icon tile:** a 64px rounded square in accent tint (`rgba(84,98,230,.15)`) holding a blue line icon. Used in feature lists.
10. **Feature list row:** an icon tile, a 20px title and a grey description, with dashed or solid dividers between rows.
11. **Credit-card visual:** gradient card, chip, contactless icon, number, name and expiry. Used stacked with depth blur in the hero and on a ticket card in Tracking.
12. **Toast / notification chip:** a black rounded rectangle with an avatar, a check badge and an amount, overlapping card edges.
13. **Dashboard mock:** an amount, a legend, subscription mini-tiles and a stacked-pill bar chart, inside a gradient frame.
14. **Hub-and-spoke integrations diagram:** a centre logo circle, dashed connectors and 6 satellite app icons.
15. **Testimonial card:** avatar, name, handle and social glyph on top; quote below; large soft shadow; arranged in a 3-column masonry.
16. **Logo marquee and giant text marquee:** infinite horizontal loops with edge fades.
17. **Footer:** a CTA row, a brand column with outline social circles, 3 link columns, a bottom credit bar and a bottom purple glow.

---

## Notes for adapting to the banking demo

- The strongest reusable ideas are:
  - inset rounded panels on a grey canvas
  - a single indigo accent (`#5462E6`) against black and white
  - big tight-tracked Inter Tight headings over a soft-grey body font
  - bento cards that each show a slice of product UI
  - one consistent motion vocabulary: fade-up 80px / 0.6s / 80ms stagger, plus scale-in 0.8 for media
- Motion stays restrained. Nothing is scroll-linked or parallax; the life comes from a few loops (card shuffle, marquees, particle dots, pulsing icons) and the pill-button hover.
- Both Inter Tight and Creato Display are free fonts that can be self-hosted. Build the demo with your own copy, logo and imagery.
