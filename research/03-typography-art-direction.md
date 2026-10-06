# 03 — Typography & Art Direction

**Brand:** Your Growth Agency (YGA)
**Reference decoded:** `/home/user/refs/yga-agency-site-/yga-website-2/` (`public/styles.css`, `public/experience.css`, `public/index.html`, `scripts/make-font.py`, `public/pop-reveals.js`)
**Target:** one self-contained `index.html`, static on Vercel, zero build step
**Colourway:** Beige `#FFF7E6` / Almond `#F9E9DA` / Bone `#E3DAC9` / Pine `#00311F` / Forest `#183630` / Gold `#E5C690`

All CSS values below marked "ref" are quoted verbatim from the reference source. All font metrics were measured directly from the actual font binaries with fontTools. All contrast ratios were computed with the WCAG 2.x relative-luminance formula.

---

## 1. THE REFERENCE TYPE SYSTEM — FULL ANALYSIS

### 1.1 The pairing

```css
/* ref public/styles.css — line 1 */
@font-face{
  font-family:'YGA Signal';
  src:url('/fonts/yga-signal.woff') format('woff');
  font-weight:800 900; font-style:normal; font-display:swap
}
:root{
  --display:'YGA Signal','Arial Narrow','Liberation Sans Narrow',sans-serif;
  --body:'Helvetica Neue',Helvetica,Arial,sans-serif;
}
```

Two roles only. A custom monoline condensed display (`yga-signal.woff`, 12,080 bytes) and the system sans for everything readable. No third face, no mono, no serif anywhere on the site. That discipline is a large part of why it reads as designed rather than assembled.

### 1.2 YGA Signal: the numbers that actually drive the layout

Measured from `public/fonts/yga-signal.ttf` and confirmed against `scripts/make-font.py`:

| Metric | Value | Where it comes from |
|---|---|---|
| unitsPerEm | 1000 | `FontBuilder(1000, isTTF=True)` |
| Cap height | **0.900 em** | `sCapHeight=900` |
| x-height | 0.880 em (caps-only font) | `sxHeight=880` |
| Ascent / descent | 950 / −150 | `setupHorizontalHeader(ascent=950,descent=-150)` |
| Weight class | 800 | `usWeightClass=800` |
| Avg CAP advance | **0.405 em** | `metrics[name]=(405,12)` — *every* glyph |
| Stroke width | 148 units (0.148 em) | `stroke(pen,path,width=148)` |
| Horizontal squeeze | **×0.72** | `round(vertices[0][0]*.72)` in `polygon()` |
| **Density (cap ÷ advance)** | **2.22** | — |

Three things follow, and they explain every type decision on the page:

1. **Monospaced display.** Every glyph is 405 units wide. The font is a 0.405 em grid. That is why headline `<br>`-breaks line up so cleanly and why `letter-spacing:-.025em` is enough to make it look kerned.
2. **Cap height 0.900 em.** The glyph nearly fills the em box. That is the *only* reason `line-height:.9` on `h1` works without lines colliding — leading ÷ cap = exactly 1.00.
3. **Density 2.22.** No Google font comes close (see §4). This is the single hardest thing to replace and the number every substitution has to be reasoned against.

The alphabet is uppercase-only; `make-font.py` maps lowercase to the same glyphs:
```python
for c in 'abcdefghijklmnopqrstuvwxyz': cmap[ord(c)]=cmap[ord(c.upper())]
```
So `text-transform:uppercase` in CSS is belt-and-braces — the font physically cannot render lowercase.

### 1.3 Case treatment

One rule carries the whole display voice:

```css
/* ref */
h1,h2,.service-name,.final-cta p,.mid-cta p{
  font-family:var(--display);
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:-.025em
}
```

Note what is *in* that selector list: `.final-cta p` and `.mid-cta p` are paragraphs promoted to display type. The reference treats "a sentence set huge in caps" as a first-class layout element, not a heading. That is the asymmetry engine.

And one explicit opt-*out*, which matters:
```css
/* ref */
.final-cta p{font:12px/1.5 var(--body);text-transform:none;letter-spacing:0;margin-top:20px}
```
The later rule demotes the *second* paragraph in the CTA back to 12px body. Same element, opposite treatment, 40px apart. Deliberate.

### 1.4 The real type scale (every clamp in the reference)

**Display ladder — `styles.css`:**

| Selector | font-size | line-height |
|---|---|---|
| `h1` | `clamp(64px,7.4vw,140px)` | `.9` |
| `h2` | `clamp(52px,5.8vw,108px)` | `.96` |
| `.final-cta h2` | `clamp(60px,7.5vw,130px)` | `.92` |
| `.partnership-grid h2` | `clamp(48px,5.7vw,92px)` | — |
| `.faq h2` | `clamp(50px,5vw,84px)` | — |
| `.application h2` | `clamp(45px,4.5vw,78px)` | — |
| `.role-panel h3` | `clamp(42px,4.7vw,72px)` | `1` |
| `.product-detail h3` | `clamp(40px,4.5vw,70px)` | `1` |
| `.process-text h3` | `clamp(38px,4vw,60px)` | `1.05` |
| `.mid-cta p` | `clamp(35px,4vw,65px)` | `1.04` |
| `.service-name` | `clamp(25px,3.4vw,54px)` | `1.2` |
| `h3` | `25px` (fixed) | `1.15` |

**Display ladder — `experience.css`:**

| Selector | font-size | line-height |
|---|---|---|
| `.route-curtain>span` | `clamp(130px,30vw,400px)` | `1` |
| `.studio-letter` | `clamp(180px,20vw,320px)` | `1` |
| `.kinetic-strip>div` | `clamp(58px,8vw,130px)` | `1` |
| `.route-hero h1` | `clamp(64px,7.1vw,125px)` | `.98` |
| `.route-end h2` | `clamp(60px,7.3vw,120px)` | — |
| `.studio-statement h2` | `clamp(48px,7vw,110px)` | `1.06` |
| `.story-copy h2` | `clamp(52px,6vw,100px)` | `1.02` |
| `.principle-card h3` | `clamp(44px,5vw,80px)` | `1` |
| `.chapter-index h2` | `clamp(48px,5.2vw,85px)` | — |
| `.lab-manifesto h2` | `clamp(46px,5.1vw,80px)` | `1.06` |
| `.device-product>strong` | `clamp(38px,4.3vw,70px)` | `1` |
| `.mini-product strong` | `clamp(32px,4vw,60px)` | `.97` |
| `.chapter-card h3` | `clamp(35px,3vw,54px)` | `1.08` |
| `.device-feed>strong` | `clamp(35px,4vw,60px)` | `1` |
| `.device-launch>strong` | `clamp(33px,3.6vw,54px)` | — |
| `.fit-dialog h2` | `clamp(40px,5vw,60px)` | `1.05` |

**Sculptural type (type used as a 3D object, not as reading matter):**

| Selector | font-size | treatment |
|---|---|---|
| `.arrow-sculpture>span:first-child` | `clamp(420px,46vw,740px)` | Arial 900, 10-step extrude, `rotateY(-25deg) rotate(-10deg)` |
| `.zero-art>span:first-child` | `550px` → `420px` @1100 → `340px` @760 | display face, 12-step extrude, `rotateY(-20deg) rotateZ(-6deg)` |
| `.orbit-core` | `160px` | inside a 180px yellow cube |
| `.fallback-portal>span` | `100px`, `letter-spacing:-8px` | absolute, `top:-60px` — overflows its box on purpose |

**Body ladder:**

| Role | Value |
|---|---|
| `body` | `font:16px/1.5 var(--body)` |
| `p` | `max-width:65ch` |
| `.large-copy` (lede) | `clamp(20px,2.2vw,34px)`, `line-height:1.35`, `font-weight:400`, `letter-spacing:-.035em` |
| `.hero-description` | `clamp(16px,1.45vw,21px)/1.4`, `max-width:400px`, `margin-top:28px` |
| `.route-hero p` | `18px/1.5`, `max-width:400px` |
| `.section-heading>p` | `17px/1.5`, `max-width:370px` |
| `.process-text p` | `16px`, `max-width:420px` |
| `.chapter-card p` / `.principle-card p` | `15px`, `max-width:390px` / `440px` |
| `.fit-grid p` / `.partnership-point p` | `14px` / `13px`, `max-width:250px` / `390px` |
| `.section-top` / `.section-label` | `12px` |
| `.eyebrow` | `11px`, `letter-spacing:.04em` |
| `.offer-line` / `.sculpture-label` | `11px/1.5` / `11px/1.4` |
| `.brand>span` | `9px/1.1`, `letter-spacing:.14em`, `uppercase`, `font-weight:700` |

The display ladder is roughly a **1.09–1.15 ratio** — a tight 12-step ladder, not a 1.25/1.333 modular scale. Tight ratios are what let the page carry twelve different headline sizes without any two reading as "the same size, slightly off".

### 1.5 Tracking — the complete inventory

```
-8px      .fallback-portal>span   (100px decorative monogram)
-3px      .book-brand             (21px italic 900)
-.035em   h3, .large-copy, + 1 more
-.03em    .question-options button, .story-copy-ish
-.025em   the shared display rule (h1,h2,.service-name,...)
-.02em    .kinetic-strip>div
 0        .final-cta p (explicit reset)
+.02em    (experience.css, small label)
+.04em    .eyebrow (11px)
+.14em    .brand>span (9px uppercase)
```

The rule: **negative tracking scales with size, positive tracking scales inversely with size.** Display gets −0.025em; the 11px eyebrow gets +0.04em; the 9px brand lockup gets +0.14em. Nothing in between is tracked at all.

### 1.6 Leading

```
.9    h1              leading ÷ cap = 1.000   (caps exactly touch)
.92   .final-cta h2                    1.022
.94   .hero h1 @760                    1.044
.96   h2                               1.067
.98   .route-hero h1 / h2 @760         1.089
1.0   role-panel h3, product h3, kinetic, studio-letter, mini-product
1.02  .story-copy h2
1.04  .mid-cta p
1.05  .process-text h3
1.06  .studio-statement h2
1.08  .chapter-card h3
1.2   .service-name
1.35  .large-copy (lede)
1.4   .hero-description, 7 more
1.5   body, all reading copy
1.6   / 1.65  longest-measure paragraphs
```

Two clean bands with nothing between 1.2 and 1.35: **display lives at 0.90–1.08, copy lives at 1.35–1.65.** Any intermediate leading reads as a mistake. Keep the gap.

### 1.7 How headlines are split for animation

`public/pop-reveals.js` splits on **words**, never characters, and keeps the text accessible:

```js
function splitHeading(node){
  const text=readableText(node).replace(/\s+/g,' ').trim();
  node.setAttribute('aria-label',text);              // full string for AT
  // walk text nodes, wrap each non-space chunk:
  span.className='pop-word'; span.textContent=chunk; span.setAttribute('aria-hidden','true');
  node.classList.add('pop-headline');
}
```

`readableText()` converts `<BR>` to a space, so `<br>` in the markup does not fuse two words. Each word becomes `.pop-word`:

```css
/* ref experience.css */
.pop-word{display:inline-block;transform-origin:50% 80%;backface-visibility:hidden}
.pop-headline{perspective:1000px;overflow:visible}
.pop-pending{opacity:0}
.pop-pending:focus-within{opacity:1!important}
.line-mask{padding-top:.1em;margin-top:-.1em}
.pop-headline .outline-word{-webkit-text-stroke:1.5px var(--ink)}
```

The headline keyframes (WAAPI, `node.animate`):

```js
words.forEach((word,i)=>track(record,word,[
  {opacity:0,transform:`perspective(850px) translate3d(0,${phone.matches?'.72em':'.95em'},0) rotateX(-48deg) scale(1.16)`,offset:0},
  {opacity:1,transform:'perspective(850px) translate3d(0,-.055em,0) rotateX(4deg) scale(1.035)',offset:.68},
  {opacity:1,transform:'perspective(850px) translate3d(0,0,0) rotateX(0) scale(1)',offset:1}
],{duration:780,delay:delay+Math.min(i*48,480)}));
```

Four details worth copying exactly:
- **Distances are in `em`, not `px`** (`.95em`, `-.055em`). The entrance therefore scales with the clamp. A 140px headline and a 64px headline travel proportionally.
- **`transform-origin:50% 80%`** — words pivot near their baseline, so caps rotate up out of the line rather than tumbling about their centre.
- **Stagger is capped:** `Math.min(i*48,480)`. A 14-word headline finishes in the same time as a 10-word one. No long tail.
- **Overshoot at `offset:.68`** then settle. Three keyframes, never two.

Four other reveal kinds, from the same file:
```
copy       650ms   translate3d(0, 48px|32px, 0) scale(1.035) → -3px/1.006 → rest
slide      780ms   dir = index%2===0 ? -1 : 1
                   translate3d(dir*82px|48px, 32px, 0) rotate(dir*1.4deg) scale(.94)
panel      780ms   perspective(1100px) translate3d(0,82px,0) rotateX(13deg) scale(.91)
sculpture  920ms   perspective(1100px) translate3d(0,82px,0) rotateX(18deg) rotateY(-13deg) scale(.9)
```
`slide` alternating by DOM index is what makes the service rows and FAQ items zip-stitch in from both sides. That is the `asymmetry` rule expressed as motion.

Observer config:
```js
{threshold:.08, rootMargin:`0px 0px -${Math.min(120,Math.round(innerHeight*.13))}px 0px`}
// group stagger when several enter at once:
entering.sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
entering.forEach((entry,i)=>play(record, Math.min(i*55,220)));
```

### 1.8 How oversized type is managed responsively

Five mechanisms, all present in the reference:

1. **Two-regime clamps.** Desktop clamps use a *small* vw coefficient and a *high* ceiling (`h1: 7.4vw, max 140px`). Inside `@media(max-width:760px)` the same selectors are re-clamped with a *large* vw coefficient and a *low* ceiling:
   ```css
   .hero h1{font-size:clamp(58px,12.8vw,94px);line-height:.94}  /* @760 */
   h2{font-size:clamp(46px,11vw,76px);line-height:.98}          /* @760 */
   .route-hero h1{font-size:clamp(45px,12.3vw,85px)}            /* @760 */
   .story-copy h2{font-size:clamp(38px,10.8vw,56px)}            /* @760 */
   .route-end h2{font-size:clamp(46px,12vw,76px)}               /* @760 */
   ```
   7.4vw → 12.8vw. Phones get *proportionally bigger* type, because the condensed face still fits and the impact must survive the narrow column.
2. **Hard overrides at 760 for the mid-ladder.** Where fluidity is not worth it, the reference just states a number: `.final-cta h2{font-size:68px}`, `.faq h2{font-size:58px}`, `.partnership-grid h2{font-size:58px}`, `.role-panel h3{font-size:46px}`, `.application h2{font-size:50px}`, `.process-text h3{font-size:38px}`, `.mid-cta p{font-size:38px}`, `.product-detail h3{font-size:43px}`, `.chapter-card h3{font-size:42px}`, `.principle-card h3{font-size:54px}`, `.studio-statement h2{font-size:56px}` → `48px` @360.
3. **A 360px floor breakpoint** that only touches the worst offenders:
   ```css
   @media(max-width:360px){
     .hero h1{font-size:48px}
     .service-name{font-size:24px}
     .hero-actions{flex-direction:column;align-items:flex-start;gap:12px}
     .hero-bottom>span{max-width:140px}
   }
   ```
4. **Breaks removed, not reflowed:** `.faq h2 br:last-child{display:none}` @760. The headline keeps its desktop `<br>`s and loses only the last one.
5. **Sculptural type gets stepped px, never clamp:** `.zero-art>span` is `550px` → `420px` → `340px`; `.studio-letter` is `clamp(180px,20vw,320px)` → `240px` → `205px`. Sculptures are art-directed per breakpoint because their *container* has a `min-height` that must match (`550px` → `460px` → `300px`).

Plus the structural guards that make any of this safe:
```css
body{overflow-x:clip}
.hero-stage{overflow:hidden}  .product-art{overflow:hidden}  .mid-cta{overflow:hidden}
.final-cta{overflow:hidden}   .chapter-card{overflow:hidden}  .kinetic-strip{overflow:hidden}
.pop-headline{overflow:visible}  /* the one exception, so words can rotate out */
```

---

## 2. THE REFERENCE LAYOUT ARCHITECTURE

### 2.1 The container and the gutter

```css
/* ref */
:root{--gutter:clamp(22px,4.5vw,84px)}
.section{padding:110px var(--gutter);max-width:1800px;margin:0 auto}
@media(max-width:1100px){.section{padding-top:80px;padding-bottom:80px}}
@media(max-width:760px) {.section{padding:70px 22px}}
```

There is no 12-column grid and no grid framework. The page is a **1800px max-width column with a fluid gutter**, and every section declares its own `grid-template-columns` from scratch. That is why no two sections have the same proportions — the asymmetry is structural, not decorative.

### 2.2 Every section's grid, verbatim

| Section | `grid-template-columns` | gap | notes |
|---|---|---|---|
| `.hero-stage` | `48% 52%` | — | sticky, `height:calc(100svh - 100px)`, `min-height:750px`, `max-height:1020px` |
| `.manifesto-grid` | `1fr 1fr` | `12%` | `align-items:center`, `margin-bottom:65px` |
| `.section-heading` | `1.45fr 1fr` | `8%` | **`align-items:end`**, `margin-bottom:65px` |
| `.process-steps` | `repeat(6,1fr)` | 0 | 1px dividers, `min-height:105px` per cell |
| `.process-content` | `1fr 1fr` | 0 | `min-height:420px` |
| `.demand` | `1fr 1fr` | `10%` | `padding-top:45px` |
| `.product-showcase` | `1fr 1fr` | `8%` | `align-items:center` |
| `.partnership-grid` | `1fr 1fr` | `10%` | `align-items:center` |
| `.roles-grid` | `1fr 1fr` | `30px` | **px gap, not %** — panels must touch-adjacent |
| `.fit-grid` | `repeat(4,1fr)` | `40px` | each child `border-top:1px solid var(--line); padding-top:28px` |
| `.faq` | `1fr 1.35fr` | `9%` | `padding-top:55px` |
| `.final-cta` | `1.1fr 1fr` | — | `min-height:640px`, `padding:75px var(--gutter)` |
| `.application` | `1fr 1.2fr` | `9%` | |
| `.form-grid` | `1fr 1fr` | `24px 20px` | |
| `.route-hero` | `1.12fr 1fr` | `5%` | `padding:65px var(--gutter) 90px`, `min-height:720px` |

**The asymmetry rules, stated:**
- A content/copy split is **never** `1fr 1fr`. It is `1.45fr 1fr`, `1.1fr 1fr`, `1fr 1.35fr`, `1fr 1.2fr`, `1.12fr 1fr`, or `48% 52%`. The ratios cluster around **1.1–1.45**, i.e. just far enough from 50/50 to be legible as a decision.
- `1fr 1fr` is reserved for **peer content** — two manifesto halves, two role panels, two product halves. Never for heading-versus-copy.
- Gaps are **percentages (5–12%)** when the two columns are editorial, and **pixels (20–40px)** when the two columns are objects/cards. Percentage gaps grow with the viewport and keep the measure honest; pixel gaps keep cards reading as a set.
- `align-items` is chosen per section: `end` for `.section-heading` (baseline-aligning a 108px headline against a 17px paragraph — the paragraph sits on the headline's last baseline), `center` for the content splits, default stretch for card grids.

### 2.3 Collapse behaviour

At `max-width:1100px` the gaps tighten only (`10% → 6%`, `40px → 24px`, `1fr 1.35fr → 1fr 1.3fr`). Nothing restacks. At `max-width:760px` almost everything becomes `grid-template-columns:1fr` with a px gap:

```
.manifesto-grid   1fr / gap 30px, margin-bottom 45px
.section-heading  1fr / gap 27px, margin-bottom 35px
.partnership-grid 1fr / gap 25px
.roles-grid       1fr / gap 20px
.demand           1fr / gap 40px
.product-showcase 1fr / gap 35px
.process-content  1fr
.faq              1fr / gap 35px
.application      1fr / gap 35px
.final-cta        1fr
.fit-grid         1fr 1fr / gap 35px 25px   ← stays two-up
.process-steps    repeat(3,1fr)             ← stays three-up, becomes 2 rows
.route-hero       1fr / gap 20px
```
Two grids deliberately refuse to go single-column (`.fit-grid`, `.process-steps`) because their content is short labels, and a single column of four short labels looks like a mistake.

### 2.4 The left/right section-label pair

This is the signature device, used on 9 sections:

```css
/* ref */
.section-top{
  display:flex; justify-content:space-between; align-items:center;
  font-size:12px;
  border-top:1px solid var(--line);
  padding-top:18px;
  padding-bottom:25px;
  margin-bottom:42px
}
.section-mark{font-size:30px;color:var(--blue);line-height:1}
@media(max-width:760px){
  .section-top{font-size:10px;margin-bottom:30px;padding-top:15px;padding-bottom:15px}
}
```
```html
<!-- ref index.html -->
<div class="section-top">
  <span>What we do</span>
  <span class="section-mark" aria-hidden="true">✳</span>
</div>
```

A 1px rule across the full column, a 12px label flush left, and a 30px coloured glyph flush right. The glyph is the *only* piece of accent colour in that whole band, and it is 2.5× the label's size. That size jump is the trick — it reads as a printer's mark, not as an icon.

The single-label variant drops the rule entirely:
```css
.section-label{font-size:12px;display:block;margin-bottom:24px}
.eyebrow{display:block;font-size:11px;letter-spacing:.04em;margin-bottom:24px}
```
Used on `.demand`, `.faq`, `.final-cta`, `.application`, `.lab-manifesto`, `.studio-statement`, `.route-end` — i.e. sections that open with an *assertion* rather than a category.

### 2.5 Full-bleed colour-block transitions

The home page rhythm, in order, with its background:

```
 1 .hero              white     100svh + 240px, sticky stage
 2 .manifesto         white     .section (110px pad)
 3 .scroll-story      COBALT    250svh — full-bleed, margin:40px 0 80px
 4 .process           white     .section
 5 .demand            white     .section (inside #4's section)
 6 .mid-cta           YELLOW    band — padding:45px var(--gutter)
 7 .products          white     .section
 8 .explore-pages     white     cards: white / YELLOW / COBALT
 9 .partnership       white     .section
10 .roles             white     panels: YELLOW + COBALT
11 .fit               white     .section
12 .faq               white     .section
13 .final-cta         YELLOW    full-bleed, min-height:640px
14 .application       white     .section
15 .footer            white     border-top
```

**Cadence: one full-bleed flip every 4–5 sections, with a thin band at the midpoint.** Two full flips (#3 cobalt, #13 yellow) + one band (#6) + card-level colour (#8, #10). Never two coloured sections adjacent; never more than five white sections in a row.

The two flips are structurally different:
```css
/* ref experience.css — the long dark immersion */
.scroll-story{height:250svh;min-height:1600px;position:relative;
  background:var(--blue);color:white;margin:40px 0 80px}
```
```css
/* ref styles.css — the bright terminal statement */
.final-cta{position:relative;display:grid;grid-template-columns:1.1fr 1fr;
  min-height:640px;padding:75px var(--gutter);background:var(--yellow);overflow:hidden}
```
One is 2.5 viewports of dark with a scroll-driven 3D story in it. One is 640px of saturated brightness with a giant arrow sculpture. The dark one *absorbs*, the bright one *ejects* you toward the form. `margin:40px 0 80px` on the dark one is the only place in the entire stylesheet where a section has external margin — it floats the colour block off the white, so the transition reads as a hard edge with a sliver of breathing room above and below.

The band and the strip:
```css
.mid-cta{background:var(--yellow);padding:45px var(--gutter);
  display:flex;justify-content:space-between;align-items:center;gap:40px;overflow:hidden}
.kinetic-strip{overflow:hidden;padding:30px 0;background:var(--yellow);border-block:1px solid #1111}
.route-end{padding:80px var(--gutter);background:var(--yellow)}
.blue-end{background:var(--blue);color:white}
.blue-end .button{background:var(--yellow);color:#111}   /* ← the key precedent */
```

That last rule is the whole inverted-section CTA strategy in one line: **on the dark block, the accent colour becomes the button.** See §6.

Card-level colour uses `nth-child`, not classes:
```css
.chapter-card{padding:38px;background:#f5f6f8;min-height:355px;scroll-margin-top:120px}
.chapter-card:nth-child(even){background:var(--yellow)}
.chapter-card:nth-child(3n){background:var(--blue);color:white}
.page-link-card:nth-child(2){background:var(--yellow);border-color:var(--yellow)}
.page-link-card:nth-child(3){background:var(--blue);color:white;border-color:var(--blue)}
.principle-card:nth-child(2){background:var(--yellow);top:135px}
.principle-card:nth-child(3){background:var(--blue);color:white;top:158px}
```
With `even` and `3n` overlapping on a 6-card grid you get a non-repeating pattern (neutral, yellow, blue, yellow, neutral, blue) from two rules. Cheap and it never looks like a loop.

### 2.6 Whitespace scale

The reference's spacing values, sorted, are a **≈1.4× ladder**:

```
7 → 10 → 14 → 18/20 → 25 → 35/40 → 50/55 → 65/75 → 90 → 110/130
```

Where each lands:
| Step | Value | Used for |
|---|---|---|
| 1 | 7px | `.offer-line` dot gap, `.text-link` vertical padding |
| 2 | 10px | icon gaps, `.result-label` margin |
| 3 | 14px | `.brand` gap, `.role-panel li` padding |
| 4 | 18–20px | `.section-top` padding-top, `.text-link` gap, inline gaps |
| 5 | 24–28px | `.section-label` margin-bottom (24), `.hero-description` margin-top (28), `.fit-grid>div` padding-top (28) |
| 6 | 35–42px | `.section-top` margin-bottom (42), `.hero-intro` margin-bottom (34), `.roles-grid` gap (30), `.fit-grid` gap (40), `.product-options` margin-bottom (40) |
| 7 | 45–55px | `.mid-cta` padding (45), `.role-panel` padding (50), `.faq` padding-top (55), `.footer` padding (55) |
| 8 | 65–80px | `.section-heading`/`.manifesto-grid` margin-bottom (65), `.process-text` padding (65), `.final-cta` padding (75), `.route-end` padding (80) |
| 9 | 110px | `.section` padding |

Section-internal vertical rhythm: `.section` has 110px top/bottom, then sections that follow a `.section-top` add a further `42px` margin, and sections with a heading add `65px`. So the distance from one section's last line to the next section's first headline is **110 + 110 + 18 + 25 + 42 = 305px** at desktop. That is the number that makes it feel expensive.

### 2.7 Other structural constants

```css
.header{height:100px}                                 /* styles.css, static */
.header{position:sticky;top:0;height:88px}            /* experience.css, sticky */
html{scroll-behavior:smooth;scroll-padding-top:100px}
.chapter-card{scroll-margin-top:120px}
.principle-card{position:sticky;top:112px}  /* +135px, +158px for 2nd/3rd — 23px stagger */
.reading-progress{position:fixed;inset:0 0 auto;height:3px;z-index:80}

/* radii: effectively zero. The entire stylesheet contains: */
border-radius:50%   ×9   (status dots, product shadow ellipse, seals)
border-radius:0     ×1   (an explicit reset on form inputs)
border-radius:14px  ×1   (one dialog)

/* borders */
--line:#dedfe3;  border:1px solid var(--line)   /* the only border weight on the site */
border-top:1px solid #1113                       /* on yellow panels: ink at 20% */
-webkit-text-stroke:1.5px var(--ink)             /* outline words */

/* focus */
button:focus-visible,a:focus-visible,canvas:focus-visible,summary:focus-visible{
  outline:3px solid var(--blue);outline-offset:6px}
input:focus-visible,textarea:focus-visible,select:focus-visible{
  outline:2px solid var(--blue);outline-offset:2px}

/* breakpoints: 360 / 760 / 1100 / 1700(min-width) — four, and that is all */
```

Shadows are **hard offsets, not blurs**. Every object gets a solid-colour duplicate of itself, offset:
```css
box-shadow:6px 6px 0 #ddd                                   /* fallback book */
box-shadow:35px 20px 0 #b9c900                              /* hero portal */
box-shadow:15px 8px 0 #b6c500, 25px 28px 50px #112b731c     /* process cube: hard + ambient */
box-shadow:6px 3px 0 #b9c900, 14px 20px 28px #1112          /* mini product */
box-shadow:7px 4px #c0ca00, 19px 24px 40px #12192530        /* preview book */
box-shadow:0 25px 0 #173bc5                                 /* arrow base */
box-shadow:12px 10px 2px #dadcdf                            /* sheet */
box-shadow:0 4px 30px #18204910                             /* scene label — the only soft-only */
box-shadow:0 25px 100px #0004                               /* dialog */
```
**The hard shadow colour is always a darker sibling of the object's own colour** (yellow object → `#b9c900`; cobalt object → `#082b98` / `#1935a7` / `#173bc5`; grey object → `#ddd` / `#dadcdf`). That is what reads as extruded ink rather than as a drop shadow.

Extruded display type uses the same idea as a stacked `text-shadow` at 1px increments:
```css
.zero-art>span:first-child{
  text-shadow:1px 1px #c2ce00,2px 2px #c2ce00,3px 3px #c2ce00,4px 4px #c2ce00,
              5px 5px #c2ce00,6px 6px #c2ce00,7px 7px #c2ce00,8px 8px #c2ce00,
              9px 9px #c2ce00,10px 10px #c2ce00,11px 11px #c2ce00,12px 12px #c2ce00,
              20px 26px 40px #2222}
```
12 hard steps + 1 soft ambient. `.arrow-sculpture` uses 10 steps of `#082b98`; `.studio-letter` uses 7 steps at 1/3/5/7/9/14 + `20px 20px 30px #12244822`.

### 2.8 Motion tokens, as found

```css
--ease:cubic-bezier(.2,.75,.2,1)          /* the house ease — 24 uses */
--ease-in-out:cubic-bezier(.77,0,.175,1)  /* page transitions */
--ease-drawer:cubic-bezier(.32,.72,0,1)   /* dialogs/drawers */
```
Durations by frequency: **180ms ×11** (hover, colour, nav), **200ms ×6** (option buttons, process tabs), 250ms ×3 (dialog in), 220ms, 260ms, 350ms, 380ms (page away), 400ms, 500ms (cube phase), 550ms, 580ms ×2 (page arrive).

Reveal durations from `pop-reveals.js`: headline **780**, copy **650**, slide **780**, panel **780**, sculpture **920**. Word stagger `min(i*48,480)`. Group stagger `min(i*55,220)`.

Micro-interaction vocabulary:
```css
.button:hover{background:var(--blue)}
.button:hover>span{transform:translate(3px,-3px)}   /* the arrow moves, diagonally, 3px */
.button:active{transform:scale(.98)}
.desktop-nav a:after{height:2px;background:var(--blue);transform:scaleX(0);transform-origin:left;
                     transition:transform 180ms var(--ease)}
.question-options button.is-active{transform:translateX(-10px)}  /* selected row slides LEFT */
.product-art:hover .book-model{transform:rotateX(4deg) rotateY(-10deg) rotateZ(-3deg)}
```

