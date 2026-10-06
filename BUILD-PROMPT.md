# YGA · Your Growth Agency: master build prompt

Build the marketing website for **YGA · Your Growth Agency** as one self-contained `index.html` that deploys to Vercel as a static file with zero build step and zero errors. It must feel like a studio site that wins Site of the Day: three-dimensional in every section, animated between and within sections, on a warm light page. It must not look, read or render like AI output.

The client is a new agency. YGA researches, writes, designs and builds a complete custom digital product (guide, course, workbook) for creators who already have an audience, then helps launch it. The call to action is an Instagram DM with a keyword (`GROWTH`, `CHECKLIST`, `FOUNDING`).

Detailed specs live in `research/`. This prompt is the contract; the specs are the depth. Where they disagree, this prompt wins.
- `research/01-motion-scroll.md`: motion system, exact keyframes, scroll choreography, copy-paste JS
- `research/02-3d-webgl.md`: WebGL engine, materials, the cast of 3D objects, copy-paste engine
- `research/03-typography-art-direction.md`: tokens (§3), fonts (§4), gold rules (§5), inverted sections (§6), per-section art direction (§7)
- `research/04-content-platform.md`: final copy for every section (§1), SEO block (§4), Vercel rules (§5), a11y and performance (§6, §7)

---

## 1. Non-negotiables

1. **One file.** `index.html` at repo root, all CSS and JS inline. The only external requests are Google Fonts. No CDN scripts, no npm runtime, no images to fetch. Zero JS dependencies: no Three.js, no GSAP, no Lenis.
2. **Vercel-safe.** No `package.json` at root, no build command, no `public/` folder, no serverless functions. `vercel.json` carries headers only and **no Content-Security-Policy that blocks inline script or style**. A `.vercelignore` keeps `research/`, `reference/`, `src/`, `tools/` and `.claude/` out of the deploy.
3. **Light page.** Beige is the page. A screenshot at any scroll position must read as a warm, light page.
4. **No AI look.** Banned fonts: Inter, Space Grotesk, Poppins, Montserrat, DM Sans, Manrope, Outfit, Plus Jakarta Sans, Sora, Syne, Clash Display, Satoshi, Playfair Display, Bricolage Grotesque, Instrument Serif, any mono. Banned visuals: gradient blobs, glassmorphism, purple or blue anything, soft floating drop shadows, rounded cards, three equal icon cards, emoji, icon fonts, stock photos, centred-everything hero, particles, glossy spheres, bloom, chrome. Banned copy: em-dash rhythm, `unlock / elevate / seamless / leverage / game-changer / supercharge / cutting-edge / empower / dive in / in today's fast-paced`, triplet taglines, invented stats, testimonials, logos, awards. No `<meta name="generator">`, no "made with", no AI credit anywhere.
5. **Accessible under all that motion.** WCAG 2.2 AA. Every animation is transform/opacity (or clip-path) only and never moves document flow. `prefers-reduced-motion` and a visible Motion on/off toggle stop everything, including WebGL, and leave all content visible. If JS fails, the page renders complete and readable.
6. **Fast.** HTML under 200 KB uncompressed excluding fonts. The render loop stops whenever no 3D object is on screen. No horizontal scroll at 360 px.

---

## 2. Brand system

### Palette (exactly six colours)
| token | hex | role |
|---|---|---|
| `--beige` / `--bg` | `#FFF7E6` | page |
| `--almond` / `--bg-2` | `#F9E9DA` | alternate bands, object stages |
| `--bone` / `--bg-3` | `#E3DAC9` | inset panels, plates |
| `--pine` / `--ink` | `#00311F` | all text, inverted sections. 13.5:1 on Beige |
| `--forest` / `--ink-2` | `#183630` | secondary text, shadow faces |
| `--gold` | `#E5C690` | accent |
| `--pine-deep` | `#002416` | the long pinned inverted section only |

**Gold rule.** Gold on any light surface is 1.18–1.54:1 and is never text, a button fill on light, a hover colour on light, or a state indicator. Gold is legal as: a surface under Pine text (8.78:1); text or button fill on Pine or Forest; decorative fills, shadows, rules and 3D faces. For gold-family text on light use `--gold-ink #7A5A1C` (5.96:1). Enforcement: every `var(--gold)` must be a background, shadow, decorative border, fill, or inside `.inv`. A `color: var(--gold)` outside `.inv` is a defect.

**Inverted sections.** Class `.inv` flips `--ink/--bg/--line` so components need no duplicate CSS. Three dark blocks on the whole page, never adjacent: `#process` (`.inv-deep`, Pine-deep, long and pinned), `#partnership` (`.inv`, Pine), `#final` (`.inv`, Pine). One full-bleed Gold band (`.band-gold`, Pine ink). On Pine the primary button is **Gold fill, Pine label**: the loudest element on the page. Focus rings on Pine are Gold, never Pine.

### Typography
- Display: **Big Shoulders**, variable weight 300–900, caps. Survives 12–20 vw and 3D transforms.
- Text: **Spectral** 400, 600 and 400 italic. Body 18 px, leading 1.6.
- Load: `https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@300..900&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap` with preconnect to both Google hosts.
- Display line-height 0.80–0.85 (not 0.9, the cap height is 0.80 em). At the largest size, keep each line to 11 characters or fewer. Every headline is hand-broken with `<br>`, never left to wrap.
- Accent words inside a headline: `.mark-word` (Gold ground, Pine ink), `.outline-word` (2.5 px Pine stroke, transparent fill), `.serif-word` (Spectral italic at 1.16 em). At most one accent per headline.
- Labels and eyebrows: Big Shoulders 700, caps, tracking 0.12–0.20 em.
- Typographic quotes and apostrophes (’ “ ”) in all copy.

### Tokens
Copy the full token block from `research/03-typography-art-direction.md` §3 verbatim: colour (raw, semantic, inverted), the `--fs-d0`…`--fs-d10` display clamps, the text scale, leading, tracking, measures, the 1.4× spacing ladder, `--gutter: clamp(22px,4.5vw,84px)`, `--shell: 1800px`, radii (`0` everywhere; `50%` only for dots, seals and contact shadows), borders, hard-offset shadows (`--sh-*`) and stepped text-shadow extrusions (`--tsh-gold`, `--tsh-pine`, `--tsh-bone`), perspective (`--persp-near/mid/far/obj` = 850/1000/1100/1400 px), tilt, parallax, motion and z-index tokens, and its reduced-motion override. Use these names everywhere. Shadows are hard offsets in a darker sibling of the object's own colour (`6px 6px 0`), never soft grey blurs.

---

## 3. Page structure and final copy

All copy is in `research/04-content-platform.md` §1. Use it verbatim, **variant [P] (priced levels)**, and delete every `[R]` string. Keep every `[BRACKET]` placeholder visible exactly as written (`[L1 PRICE]`, `[FOUNDER NAME]`, `[IG HANDLE]`, `[CONTACT EMAIL]`, `[SPOTS]`, `[X]`, `[WEEKS]`, `[SHARE]`, `[GUARANTEE…]`, `[LEGAL ENTITY]`, `[COMPANY ID]`, `[ADDRESS]`, `[DOMAIN]`), wrapped in `<span class="ph">` so they are easy to find. Never invent a price, name, number or percentage. In body copy the brand is only ever `YGA`. DM links are `https://ig.me/m/[IG HANDLE]`.

Order of landmarks, with the depth element for each:

| # | id | surface | WebGL anchor | CSS 3D and motion |
|---|---|---|---|---|
| 0 | `masthead` | Beige, sticky | none | gold 3 px reading-progress rail; underline-wipe nav; Motion toggle; mobile menu |
| 1 | `top` | Beige, `48% 52%` grid, sticky stage inside a `calc(100svh + 240px)` parent | `hero` + `data-3d-hold data-3d-drag` | H1 word pop; three act buttons **Audience / Product / Launch** drive the scene; ticker marquee at the base. The next section slides up over the stuck hero. |
| 2 | `gap` | Beige | none | the pull quote; body as a scroll-scrubbed word-fill; three cards as a lifting card stack offset `0 / 18 / 36 px`, card 03 in Pine with a text badge `What we fix` |
| 3 | `what-we-do` | Beige | `mark` beside the section label | five native `<details name="wwd">` rows that tilt forward when open and slide in from alternating sides; the courses clarifier as an indented note |
| 4 | `fit` | Beige, deliberately the quietest section | none | four criteria on keylines whose glyphs sit on a deeper parallax plane; "Right for you" (Almond) and "Not for you yet" (Pine) panels leaning opposite ways; quiz opener; lead magnet |
| 5 | `process` | `.inv-deep`, pinned, `height: 600svh` | `transform` + `data-3d-pin` | six steps cross-fade inside a sticky full-height stage; gold numerals; gold scrub track; colour-band wipe in from Beige |
| 5b | `listen` | Beige | none | "The idea is already in your comments": three comment slips stacked in CSS 3D, a large extruded `?` (`--tsh-bone`) |
| 5c | `slide-06` | `.band-gold` full bleed | none | Slide 06 / 07 CTA, Pine button with Beige label; extruded ✳ behind the type, clipped |
| 6 | `products` | Beige | `card` ×3, variants `0 1 2` | three product cards; each has a native `<details>` "Behind the scenes" with its three pages; the required disclaimer under the cards |
| 7 | `inside` | Almond | `kit`, sticky on the left at desktop | six kit items on the right, sliding in from alternating sides |
| 8 | `partnership` | `.inv` Pine | none | three terms with gold marks; the "Your expertise. Our execution." split as two panels leaning opposite ways; a CSS gold orbit cube |
| 9 | `founding` | Beige | `digit` variant `0` | three founding facts, spots counter, `DM "FOUNDING"` |
| 10 | `levels` | Beige | `tiers` variant `1` | three level cards stepped in height; Level 02 has a ring border and the `Best place to start` badge; a `Your match` ribbon (text, `role="status"`) appears after the quiz |
| 11 | `founder` | Beige | `mark` | founder plate as a tilted frame with a hard gold offset shadow and a visible `[Founder photo]` placeholder; signature |
| 12 | `faq` | Beige, `1fr 1.35fr` | none | 13 native `<details>`; answers fold open from `rotateX(-8deg)` like paper; `+` turns to `×` |
| 13 | `final` | `.inv` Pine, revealed by a clip-path iris | `launch` | H2 with one `.mark-word`; Gold button with Pine label; `DM US "GROWTH" ✳` marquee |
| 14 | footer | Beige | none | stacked wordmark `Your / Growth / Agency`, link columns, legal line; a giant half-cropped Y·G·A monogram extruded with `--tsh-bone`, letters rotated per the art spec |

The quiz is a native `<dialog id="fit-quiz">` opened from `#fit` and from `#levels`. It has 3 questions, 4 results and no data collection. Result → level: `research → 1`, `course → 3`, `workbook → 2`, `guide → 2`.

---

## 4. The DOM contract (the hooks shared by markup, motion and 3D)

Markup emits these hooks; motion.js and scene.js query only these. Do not invent other cross-module hooks.

**Bootstrap.** The first thing in `<head>` after the charset is `<script>document.documentElement.classList.add('js')</script>`. The page must look complete without the `js` class.

**Global bus.** Whichever script runs first creates it with this exact line:
```js
const YGA = window.YGA = window.YGA || { motion: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, stage: null };
```
- Motion state: `document.documentElement.dataset.motion = 'on' | 'off'`. Changes fire `window.dispatchEvent(new CustomEvent('yga:motion', { detail: { on } }))`. Reduced motion starts `off`; the toggle is then disabled and its `aria-label` says why.
- Toggle: `<button class="motion-toggle" data-motion-toggle aria-pressed="true">Motion on</button>`, fixed bottom-left.
- scene.js publishes `YGA.stage = { setValue(name, v), scan(), stats(), pause(), resume() }`.

**Sections.** `<section id="…" class="section [inv|inv-deep|band-gold]" data-section>`. The `<main id="main">` holds every section except the masthead and footer.

**Reveals.** One attribute, six kinds: `data-pop="headline|copy|slide|panel|sculpture|frame"`. Headlines are `h1`/`h2`/`h3` with `data-pop="headline"`; motion.js splits words itself, keeping `.mark-word`/`.outline-word`/`.serif-word` wrappers intact, putting the full text on the parent's `aria-label`, and marking each word span `aria-hidden="true"`. `.pop-pending { opacity: 0 }` is added **by JS only**, never in markup or CSS.

**Scroll effects.**
- `data-wordfill` on a paragraph: word-by-word ink fill from 0.22 opacity, scrubbed.
- `<div class="marquee" data-marquee="left|right" aria-hidden="true"><div class="marquee-track">…content twice…</div></div>`
- `data-depth="1|2|3"`: parallax plane (`--parallax-1/2/3`).
- `data-transition="band|stack|iris"` on a section names how it enters (motion spec §7).
- Scroll-driven CSS animates only the individual `translate`, `scale`, `rotate`, `opacity` or `clip-path` properties, never `transform`, so it composes with the art-directed resting `transform` set in the stylesheet.

**Pinned story (`#process`).**
```html
<section id="process" class="section inv inv-deep story" data-section data-pin data-transition="band">
  <div class="story-sticky">            <!-- position:sticky; top:0; height:100svh -->
    <div class="story-stage" data-3d="transform" data-3d-pin><div class="gl-fallback">…</div></div>
    <ol class="story-steps"><li class="story-step" data-step="0">…</li> … data-step="5"</ol>
    <div class="story-track" aria-hidden="true"><span></span></div>
  </div>
</section>
```
motion.js sets `--p` (0–1) and `data-active="k"` on `[data-pin]` and toggles `.is-active` on the matching `[data-step]`. The CSS draws the track with `scale: var(--p) 1`. Under reduced motion or with no JS, `.story` loses its height and sticky positioning, and all six steps show stacked.

**WebGL anchors.**
- One canvas, first child of `<body>`: `<canvas class="gl-stage" aria-hidden="true"></canvas>`, `position: fixed; inset: 0; pointer-events: none; z-index: var(--z-bg)`.
- Each 3D moment is `<div class="stage-slot" data-3d="hero|mark|transform|kit|card|tiers|digit|launch" [data-3d-variant] [data-3d-pin] [data-3d-hold] [data-3d-drag]>` with a fixed size from CSS (no layout shift) and a child `<div class="gl-fallback" aria-hidden="true">`. That child holds a CSS-3D stand-in for the object (chamfer-look box, hard gold offset shadow) so the section keeps its depth without WebGL.
- scene.js adds `html.gl` on success or `html.no-gl` on failure. CSS: `.gl-fallback` shows by default, hides under `html.js`, and shows again under `html.no-gl`.
- `data-3d-pin`: the anchor sits in a sticky stage, so progress is computed from the closest `[data-pin]` ancestor as `clamp(-rect.top / (rect.height - innerHeight), 0, 1)` instead of the anchor's own rect.

**Hero acts.**
```html
<div class="hero-acts" role="group" aria-label="Scene">
  <button data-act="0" aria-pressed="true" data-caption="…">Audience</button>
  <button data-act="1" aria-pressed="false" data-caption="…">Product</button>
  <button data-act="2" aria-pressed="false" data-caption="…">Launch</button>
</div>
<p class="hero-caption" data-act-caption aria-live="polite"></p>
```
motion.js wires the buttons and calls `YGA.stage?.setValue('hero', act / 2)`.

**Navigation.** `<header class="masthead">` holds the progress rail `<div class="progress" aria-hidden="true"><span></span></div>`, `<nav aria-label="Primary">` with `<a href="#gap" data-nav>…`, and `<button data-menu-toggle aria-expanded="false" aria-controls="mobile-menu">Menu</button>`, which controls `<div id="mobile-menu" hidden>`. motion.js handles scrollspy (`aria-current="true"` on the active link), the menu, and the rail.

**Quiz.** `<button data-open-quiz>` in two places. Inside the dialog: `<fieldset data-q="1|2|3">` with option buttons carrying `data-value`; nav buttons `data-quiz="back|next|restart"`; result blocks `<div data-result="research|course|workbook|guide" data-match-level="1|2|3" hidden>`. Each level card is `<article id="level-1|2|3">` with `<span class="match-ribbon" hidden>Your match</span>`. A `<p data-match-status role="status" class="sr-only">` announces the match.

---

## 5. 3D: the WebGL stage

Implement the engine in `research/02-3d-webgl.md` §7.3. Hand-rolled WebGL1, forked from the reference `scene.js`. Requirements:
- **One context.** For each visible anchor, use its `getBoundingClientRect()` as the `gl.viewport` + `gl.scissor`, give it its own camera and its own scissored depth clear. Layout is read, never written.
- **Geometry.** Four primitives only: `chamferBox`, `cylinder`, annulus, extruded flat profile. Flat per-face normals. About 738 unique triangles for the whole site, instanced by draw call.
- **Colour.** sRGB with no gamma correction, so Pine renders as exactly `#00311F`. Use the per-material 3-stop tone ramp, the five-term analytic light rig (ambient 0.17, key 0.62 at `normalize(-0.42,0.86,0.52)`, fill 0.22, sky dome 0.26, ground 0.10) and directional fresnel (dark materials rim toward Gold, light materials toward Forest). Distance fog mixes to Beige. `gl.clearColor(1, .969, .902, 0)`. Gold metalness 0.85, everything else 0.10 or less. Nothing is chrome.
- **The cast.** `hero` = the Portal (Pine arch with a Gold inner reveal, Bone aperture, Bone plinth with Gold fascia and seven Gold ribs, Forest Y·G·A on a Pine lintel, a Bone laptop with Almond keycaps, a Pine phone whose screen shows the carousel slide "Here’s exactly how we turn your content into your first digital product. Swipe →", a Pine workbook with a Gold foredge, a Gold disc, Pine→Forest→Gold steps, a Gold launch ring). `transform` = five Bone/Almond sheets converge and a Pine case with a Gold band closes over them, keyed to the six pinned steps. `kit` = four slabs nest and a Gold band snaps round them. `card` = a chamfered artwork tile that tilts to the pointer. `tiers` = three plinths, the crowned middle one lifting. `digit` = a sculptural numeral from chamfered Pine bars on a Forest plate inside a Gold ring; it supports `0`–`9`, used here as `0`. `launch` = a Gold 45° arrow out of a Pine base with a Gold ring. `mark` = a monogram cube that yaws with scroll.
- **Motion.** Entrances push objects 16 units back so the fog dissolves them into the paper. No alpha. Camera smoothing is `1 - exp(-dt*7)` and settles. Long lens, `fov 0.50–0.58`. Yaw is bounded: ±0.22 rad from the pointer, ±0.80 from drag. No time-driven spin, no elastic easing in 3D. Everything sits on a plinth or disc with a warm contact shadow.
- **Loop gates.** Stop rendering when: no anchor is in view, the tab is hidden, motion is off, the scene has settled, the context is lost, or the canvas is off-screen. DPR cap 1.65 desktop and 1.35 mobile, with a one-way adaptive step-down to 1.2. On `webglcontextlost` fall back to `html.no-gl`. Re-bake procedural textures after `document.fonts.ready`.
- Touch must still scroll the page over the hero. Drag is horizontal only (`touch-action: pan-y`).

---

## 6. Motion

Implement `research/01-motion-scroll.md` §6 and §12. No libraries. Three layers:
1. **CSS scroll-driven animations** (`animation-timeline: view()` / `scroll()` with `animation-range`, inside `@supports (animation-timeline: view())`) for every continuous scrub: band wipes, the stack recede, marquees, parallax planes, line masks, the progress rail. Scrubbed keyframes are always `linear`.
2. **WAAPI + one IntersectionObserver** for one-shot entrances. Easing everywhere: `cubic-bezier(.2,.75,.2,1)`.
   - `headline`: 780 ms per word; `perspective(850px) translate3d(0,.95em,0) rotateX(-48deg) scale(1.16)` → overshoot at offset .68 `translate3d(0,-.055em,0) rotateX(4deg) scale(1.035)` → rest; per-word stagger 48 ms, capped at 480 ms; `.72em` start on phones.
   - `copy`: 650 ms, from `translate3d(0,48px,0) scale(1.035)`.
   - `slide`: 780 ms, alternating ±82 px (±48 phone), ±1.4 deg, scale .94, with a 4 px counter-kick.
   - `panel`: 780 ms, from `perspective(1100px) translate3d(0,82px,0) rotateX(13deg) scale(.91)`.
   - `sculpture`: 920 ms, from `rotateX(18deg) rotateY(-13deg) scale(.9)`, overshooting to 1.045.
   - `frame`: masked image reveal, mask 880 ms, inner 940 ms.
   - Append the element's computed resting `transform` to every keyframe so entrances compose with art-directed rotations. Use `fill: 'backwards'`.
   - Observer `threshold .08`, `rootMargin` bottom `-min(120px, 13vh)`. Sort entries by `boundingClientRect.top`, group stagger 55 ms capped at 220 ms, then unobserve. Content above the fold plays at load and is never armed.
3. **One rAF read-then-write loop** for the pinned story `--p`, word-fill, scrollspy and the rail fallback. It sleeps when nothing changes.
- **Native scroll.** No smooth-scroll library. `html { scroll-behavior: smooth }` only without reduced motion. `scroll-margin-top: var(--header-h)` on sections.
- `body { overflow-x: clip }` (never `hidden`, which breaks sticky).
- Section transitions follow the motion spec §7.5 rotation plan so no device repeats twice in a row: hero → gap is a stack recede, → process is a band wipe, → slide-06 is a hard cut, → partnership is a band wipe in the other direction, → final is an iris.
- `focusin` on any pending element finishes its animation at once. `.pop-pending:focus-within { opacity: 1 !important }`.
- Pausing runs `settle()`, which finishes every entrance, so nothing is ever left hidden.
- The variation matrix in motion spec §11 is the acceptance test: entrances must vary by role. A page where everything fades up the same way fails.

---

## 7. Head, SEO and deploy

- The `<head>` block from content spec §4.1: title, description, canonical, Open Graph, Twitter, theme-color `#00311F`, inline SVG favicon (Pine square, Gold mark), one JSON-LD `@graph` (Organization, WebSite, WebPage, Service with an OfferCatalog of the three levels, FAQPage with all 13 questions). Every `https://[DOMAIN]` stays as the placeholder.
- `vercel.json`: headers only. HTML `cache-control: public, max-age=0, must-revalidate`; `x-content-type-options: nosniff`; `referrer-policy: strict-origin-when-cross-origin`; `permissions-policy` denying camera, microphone and geolocation. No CSP, no rewrites, no `builds`, no `functions`.
- `robots.txt` and `sitemap.xml` from content spec §4.5–4.6.
- One `<h1>`. Headings in order. A skip link. Every interactive element is a real `<a>` or `<button>` with a visible focus ring (`--focus`, and Gold on `.inv`). Touch targets at least 44 px.

---

## 8. Acceptance tests

The build is done only when all of these pass in a real browser:
1. Zero console errors or warnings, desktop 1440×900 and mobile 390×844, with motion on and with reduced motion.
2. The WebGL canvas renders the hero Portal with at least six visible tones on the arch, and every anchor's object appears when its section is in view.
3. With WebGL disabled, every anchor shows its CSS fallback and no slot is empty. With JS disabled, all content is visible and the pinned story shows as six stacked steps.
4. No horizontal overflow at 360, 390, 768, 1024, 1440 or 1920 px.
5. Every text colour pair passes AA. Grep confirms no `color: var(--gold)` outside `.inv`.
6. Grep finds none of the banned fonts, the banned words, the em-dash character (except in the `YGA — Your Growth Agency` lockup if used), `generator`, or `Generated`.
7. Every `[BRACKET]` placeholder from the content spec register is present and none was invented away.
8. `vercel.json` parses, no `package.json` exists at root, and `index.html` is under 200 KB.
9. Scrolling the full page shows motion in every section: a headline pop, a section transition, a scroll scrub or a 3D object, varying by role.
