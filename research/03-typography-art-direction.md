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

---

## 3. DESIGN TOKENS — PRODUCTION-READY

Copy-paste block. Faces are chosen and justified in §4; this block assumes **Option A (Big Shoulders + Spectral)**. Swap the two `--ff-*` declarations for Option B and nothing else changes.

```css
/* ============================================================
   YGA — ESTATE COLOURWAY. Design tokens.
   Light background is a hard requirement. Gold is contrast-gated.
   ============================================================ */
:root{
  /* ---- 1. PALETTE: raw ------------------------------------ */
  --beige:        #FFF7E6;   /* L 0.9349 */
  --almond:       #F9E9DA;   /* L 0.8348 */
  --bone:         #E3DAC9;   /* L 0.7069 */
  --pine:         #00311F;   /* L 0.0230 */
  --pine-deep:    #002416;   /* second dark, for the long immersion block */
  --pine-shade:   #001E13;   /* hard-shadow sibling of pine objects */
  --forest:       #183630;   /* L 0.0305 */
  --gold:         #E5C690;   /* L 0.5906 — DECORATIVE on light, LIVE on pine */
  --gold-shade:   #C2A063;   /* hard-shadow sibling of gold objects */
  --gold-edge:    #A88D47;   /* 3.00:1 on beige — lowest legal non-text UI boundary */
  --gold-ink:     #7A5A1C;   /* 5.96:1 on beige — the ONLY gold-family text on light */
  --gold-deep:    #6B5118;   /* 7.00:1 on beige — gold-family text on bone */
  --sage:         #4A6B57;   /* 5.58:1 on beige — secondary/muted text */

  /* ---- 2. PALETTE: semantic (light surfaces) --------------- */
  --bg:           var(--beige);
  --bg-2:         var(--almond);
  --bg-3:         var(--bone);
  --ink:          var(--pine);      /* 13.50:1 on beige */
  --ink-2:        var(--forest);    /* 12.24:1 on beige */
  --ink-muted:    var(--sage);      /*  5.58:1 on beige */
  --line:         var(--bone);      /* the ONE border colour, 1px, like ref --line */
  --line-strong:  #C8BCA6;         /* 1px rule that must read as structural */
  --accent-mark:  var(--gold-ink);  /* the ✳ printer's mark — must be legible */
  --accent-deco:  var(--gold);      /* gold where nothing must be read */

  /* ---- 3. PALETTE: semantic (inverted surfaces) ------------ */
  --inv-bg:       var(--pine);
  --inv-bg-2:     var(--pine-deep);
  --inv-ink:      var(--beige);     /* 13.50:1 on pine */
  --inv-ink-2:    var(--bone);      /* 10.37:1 on pine */
  --inv-accent:   var(--gold);      /*  8.78:1 on pine — LIVE: text, CTA, links */
  --inv-line:     rgba(255,247,230,.22);
  --inv-line-2:   rgba(229,198,144,.38);

  /* ---- 4. FOCUS + SELECTION ------------------------------- */
  --focus:        var(--pine);      /* on light */
  --focus-inv:    var(--gold);      /* on pine, 8.78:1 */
  --select-bg:    var(--gold);
  --select-ink:   var(--pine);      /* 8.78:1 — gold as SURFACE is always safe */

  /* ---- 5. TYPE FAMILIES ----------------------------------- */
  --ff-display: 'Big Shoulders','Big Shoulders Display',
                'Oswald','Arial Narrow','Liberation Sans Narrow',sans-serif;
  --ff-text:    'Spectral',Georgia,'Times New Roman',serif;
  --ff-label:   var(--ff-display);  /* condensed caps double as micro-labels */

  /* ---- 6. TYPE SCALE — DISPLAY (uppercase, Big Shoulders 800) ----
     Derived from the reference clamps x1.125 (cap-height parity:
     YGA Signal cap 0.900em -> Big Shoulders cap 0.800em).            */
  --fs-d0:  clamp(340px, 46vw, 780px);   /* sculptural numeral/arrow  */
  --fs-d0b: clamp(146px, 33vw, 450px);   /* page-transition curtain   */
  --fs-d0c: clamp(203px, 22.5vw, 360px); /* standalone letterforms    */
  --fs-d1:  clamp(72px,  8.3vw, 158px);  /* hero h1        (ref 7.4vw/140) */
  --fs-d2:  clamp(68px,  8.4vw, 146px);  /* closing cta h2 (ref 7.5vw/130) */
  --fs-d3:  clamp(65px,  9.0vw, 146px);  /* kinetic marquee (ref 8vw/130)  */
  --fs-d4:  clamp(58px,  6.5vw, 121px);  /* section h2     (ref 5.8vw/108) */
  --fs-d5:  clamp(54px,  6.4vw, 104px);  /* feature h2     (ref 5.7vw/92)  */
  --fs-d6:  clamp(51px,  5.1vw,  88px);  /* form/faq h2    (ref 4.5vw/78)  */
  --fs-d7:  clamp(47px,  5.3vw,  81px);  /* panel h3       (ref 4.7vw/72)  */
  --fs-d8:  clamp(43px,  4.5vw,  68px);  /* process h3     (ref 4vw/60)    */
  --fs-d9:  clamp(39px,  4.5vw,  73px);  /* band statement (ref 4vw/65)    */
  --fs-d10: clamp(28px,  3.8vw,  61px);  /* accordion name (ref 3.4vw/54)  */

  /* ---- 7. TYPE SCALE — DISPLAY, phone regime (<=760px) ----
     Larger vw coefficient, lower ceiling. Apply inside the query. */
  --fs-d1-sm: clamp(64px, 14.0vw, 104px);
  --fs-d2-sm: clamp(52px, 13.0vw,  84px);
  --fs-d4-sm: clamp(50px, 12.0vw,  84px);
  --fs-d6-sm: 58px;
  --fs-d7-sm: 50px;
  --fs-d9-sm: 42px;
  --fs-d10-sm: 30px;

  /* ---- 8. TYPE SCALE — TEXT (Spectral; x-height 0.450em, so
     base is 18px not 16px — see §4.4) ------------------------ */
  --fs-lede:   clamp(21px, 2.3vw, 36px);  /* ref .large-copy 2.2vw/34 */
  --fs-intro:  clamp(17px, 1.5vw, 23px);  /* ref .hero-description    */
  --fs-lg:     19px;
  --fs-base:   18px;                      /* ref was 16px sans        */
  --fs-sm:     16px;
  --fs-xs:     15px;
  --fs-2xs:    14px;

  /* ---- 9. TYPE SCALE — LABELS (Big Shoulders caps, tracked) --
     Big Shoulders cap is 0.800em vs a grotesque's ~0.72em, so
     these read ~11% larger than the same px in a normal sans. */
  --fs-label:  13px;   /* .section-top, .section-label */
  --fs-micro:  12px;   /* eyebrow, captions            */
  --fs-nano:   11px;   /* brand lockup, legal           */

  /* ---- 10. LEADING -------------------------------------------
     Converted from the reference by cap-height ratio
     (ref leading/cap x Big Shoulders cap 0.800), +6% for warmth. */
  --lh-d1: .84;   /* ref .9  on cap 0.900 */
  --lh-d2: .86;   /* ref .92              */
  --lh-d3: .88;   /* ref .96              */
  --lh-d4: .92;   /* ref 1.0              */
  --lh-d5: .96;   /* ref 1.05-1.08        */
  --lh-lede: 1.3;
  --lh-text: 1.6;    /* ref 1.5 — serif with a 0.450 x-height wants more */
  --lh-tight: 1.45;
  --lh-label: 1.25;

  /* ---- 11. TRACKING ------------------------------------------ */
  --tr-d-xl: -.03em;   /* >=100px display */
  --tr-d:    -.025em;  /* 48-100px  (ref exact) */
  --tr-d-sm: -.015em;  /* 28-48px   */
  --tr-lede: -.015em;  /* ref -.035em was for a sans; a serif needs less */
  --tr-text: 0;
  --tr-label: .12em;   /* 13px caps (ref .04em on 11px, raised for condensed) */
  --tr-micro: .16em;   /* 12px caps */
  --tr-nano:  .20em;   /* 11px caps (ref .14em) */

  /* ---- 12. MEASURE ------------------------------------------- */
  --measure:      62ch;   /* ref p{max-width:65ch}; serif runs wider per ch */
  --measure-lede: 22ch;
  --measure-col:  38ch;   /* ref 370-420px side columns */
  --measure-card: 32ch;

  /* ---- 13. SPACE — the reference's 1.4x ladder -------------- */
  --s1:  7px;   --s2: 10px;  --s3: 14px;  --s4: 20px;  --s5: 26px;
  --s6: 38px;   --s7: 52px;  --s8: 72px;  --s9: 100px; --s10: 140px;
  --gutter:  clamp(22px, 4.5vw, 84px);          /* ref exact */
  --shell:   1800px;                            /* ref exact */
  --pad-section:  clamp(76px, 9vw, 140px);      /* ref 110/80/70 */
  --pad-band:     clamp(38px, 4vw, 62px);       /* ref .mid-cta 45px */
  --pad-bleed:    clamp(56px, 6.5vw, 104px);    /* ref .final-cta 75px */
  --pad-panel:    clamp(30px, 3.4vw, 56px);     /* ref .role-panel 50/35 */
  --pad-card:     clamp(28px, 2.6vw, 44px);     /* ref .chapter-card 38/30 */
  --gap-editorial: 9%;     /* ref 8-12% */
  --gap-object:    30px;   /* ref 30-40px */
  --head-gap:      clamp(38px, 4.4vw, 68px);  /* ref .section-heading mb 65px */
  --rule-gap:      clamp(28px, 2.8vw, 44px);  /* ref .section-top mb 42px */
  --header-h:      92px;
  --scroll-pad:    100px;  /* ref html{scroll-padding-top} */

  /* ---- 14. RADII — the reference is square. Stay square. ---- */
  --r-0:    0;
  --r-dot:  50%;    /* status dots, seals, the blurred contact-shadow ellipse */
  --r-seal: 50%;
  /* NO other radius exists in this design. No rounded cards, no pills. */

  /* ---- 15. BORDERS ------------------------------------------ */
  --bw:          1px;
  --border:      1px solid var(--line);
  --border-strong: 1px solid var(--line-strong);
  --border-inv:  1px solid var(--inv-line);
  --border-gold: 1px solid var(--gold-edge);   /* 3.00:1 — legal UI boundary */
  --stroke-out:  1.5px;                        /* -webkit-text-stroke on outline words */

  /* ---- 16. SHADOWS — hard-offset ink, not blur -------------- */
  --sh-hard-xs: 4px 4px 0 var(--bone);
  --sh-hard-s:  6px 6px 0 var(--bone);
  --sh-hard-m:  12px 10px 2px var(--bone);
  --sh-gold-s:  6px 3px 0 var(--gold-shade), 14px 20px 28px rgba(0,49,31,.14);
  --sh-gold-m:  15px 8px 0 var(--gold-shade), 25px 28px 50px rgba(0,49,31,.12);
  --sh-gold-l:  35px 20px 0 var(--gold-shade);
  --sh-pine-s:  6px 3px 0 var(--pine-shade), 14px 20px 28px rgba(0,49,31,.18);
  --sh-pine-m:  15px 8px 0 var(--pine-shade), 25px 28px 50px rgba(0,49,31,.16);
  --sh-base:    0 25px 0 var(--pine-shade);    /* ref .arrow-base */
  --sh-float:   0 4px 30px rgba(0,49,31,.08);  /* the only soft-only shadow */
  --sh-deep:    0 25px 100px rgba(0,49,31,.26);
  --sh-contact: 0 0 0 rgba(0,0,0,0);           /* use the blurred ellipse instead */

  /* Extruded display type. Gold extrude for gold letters on pine. */
  --tsh-gold: 1px 1px var(--gold-shade), 2px 2px var(--gold-shade),
              3px 3px var(--gold-shade), 4px 4px var(--gold-shade),
              5px 5px var(--gold-shade), 6px 6px var(--gold-shade),
              7px 7px var(--gold-shade), 8px 8px var(--gold-shade),
              9px 9px var(--gold-shade), 10px 10px var(--gold-shade),
              11px 11px var(--gold-shade), 12px 12px var(--gold-shade),
              20px 26px 40px rgba(0,30,19,.28);
  --tsh-pine: 1px 1px var(--pine-shade), 3px 3px var(--pine-shade),
              5px 5px var(--pine-shade), 7px 7px var(--pine-shade),
              9px 9px var(--pine-shade), 14px 15px var(--pine-shade),
              20px 20px 30px rgba(0,49,31,.18);
  --tsh-bone: 1px 1px var(--bone), 2px 2px var(--bone), 3px 3px var(--bone),
              4px 4px var(--bone), 5px 5px var(--bone), 6px 6px var(--bone),
              7px 7px var(--bone), 8px 8px var(--bone), 9px 9px var(--bone),
              10px 10px var(--bone), 11px 11px var(--bone), 12px 12px var(--bone),
              20px 26px 40px rgba(0,49,31,.13);

  /* ---- 17. DEPTH / 3D --------------------------------------- */
  --persp-near:  850px;    /* headline word reveal (ref exact) */
  --persp-mid:   1000px;   /* .pop-headline / .zero-art (ref exact) */
  --persp-far:   1100px;   /* panel + sculpture reveals (ref exact) */
  --persp-obj:   1400px;   /* .product-art book model (ref exact) */
  --tilt-y:      -20deg;   /* house rotateY for objects */
  --tilt-y-hard: -25deg;
  --tilt-z:      -7deg;    /* house rotateZ */
  --tilt-z-alt:   9deg;
  --tilt-x:       8deg;
  --lift-z:      18px;     /* ref .book-cover translateZ */
  --parallax-1:  .06;      /* background layer scroll factor */
  --parallax-2:  .14;      /* mid layer */
  --parallax-3:  .24;      /* foreground object */

  /* ---- 18. MOTION ------------------------------------------- */
  --ease:        cubic-bezier(.2,.75,.2,1);      /* ref house ease */
  --ease-in-out: cubic-bezier(.77,0,.175,1);     /* ref page transitions */
  --ease-drawer: cubic-bezier(.32,.72,0,1);      /* ref dialogs */
  --d-tap:   180ms;   /* hover/colour — ref's most-used */
  --d-ui:    200ms;
  --d-pop:   250ms;
  --d-obj:   350ms;
  --d-phase: 500ms;   /* 3D object phase change */
  --d-page:  580ms;   /* page/section arrive */
  --d-away:  380ms;   /* page/section leave */
  --rv-copy:      650ms;
  --rv-head:      780ms;
  --rv-panel:     780ms;
  --rv-sculpture: 920ms;
  --rv-word-step: 48ms;   --rv-word-cap: 480ms;
  --rv-group-step: 55ms;  --rv-group-cap: 220ms;

  /* ---- 19. Z-INDEX ------------------------------------------ */
  --z-bg:0; --z-object:2; --z-copy:3; --z-band:10; --z-header:20;
  --z-dock:25; --z-progress:80; --z-curtain:90; --z-skip:100;
}

@media(prefers-reduced-motion:reduce){
  :root{
    --d-tap:1ms; --d-ui:1ms; --d-pop:1ms; --d-obj:1ms; --d-phase:1ms;
    --d-page:1ms; --d-away:1ms;
    --rv-copy:1ms; --rv-head:1ms; --rv-panel:1ms; --rv-sculpture:1ms;
    --rv-word-step:0ms; --rv-word-cap:0ms; --rv-group-step:0ms; --rv-group-cap:0ms;
    --parallax-1:0; --parallax-2:0; --parallax-3:0;
  }
  html{scroll-behavior:auto}
}
```

### 3.1 Base element bindings

```css
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:var(--scroll-pad)}
body{
  margin:0;
  background:var(--bg);
  color:var(--ink);
  font:var(--fs-base)/var(--lh-text) var(--ff-text);
  font-feature-settings:"kern" 1,"liga" 1,"onum" 1;  /* old-style figures: heritage */
  overflow-x:clip;
  -webkit-font-smoothing:antialiased;
}
h1,h2,h3,p{margin:0}
p{max-width:var(--measure)}
img{max-width:100%}
a{color:inherit;text-decoration:none}
button{border:0;color:inherit;cursor:pointer;font:inherit}
button,a{-webkit-tap-highlight-color:transparent}
[hidden]{display:none!important}

/* the single display rule, mirroring the reference's one-rule approach */
h1,h2,.display,.band-statement,.accordion-name{
  font-family:var(--ff-display);
  font-weight:800;
  font-variation-settings:"wght" 800;
  text-transform:uppercase;
  letter-spacing:var(--tr-d);
  font-feature-settings:"kern" 1,"lnum" 1;  /* lining figures in caps */
  text-wrap:balance;
}
h1{font-size:var(--fs-d1);line-height:var(--lh-d1);letter-spacing:var(--tr-d-xl)}
h2{font-size:var(--fs-d4);line-height:var(--lh-d3)}
h3{font-family:var(--ff-text);font-size:var(--fs-lg);line-height:1.3;
   font-weight:600;letter-spacing:-.01em;text-transform:none}

::selection{background:var(--select-bg);color:var(--select-ink)}
:where(a,button,summary,canvas,[tabindex]):focus-visible{
  outline:3px solid var(--focus);outline-offset:6px}
input:focus-visible,textarea:focus-visible,select:focus-visible{
  outline:2px solid var(--focus);outline-offset:2px}
.inv :where(a,button,summary,[tabindex]):focus-visible{outline-color:var(--focus-inv)}

/* label primitives */
.label{font-family:var(--ff-label);font-size:var(--fs-label);font-weight:600;
  text-transform:uppercase;letter-spacing:var(--tr-label);line-height:var(--lh-label)}
.eyebrow{display:block;font-family:var(--ff-label);font-size:var(--fs-micro);
  font-weight:600;text-transform:uppercase;letter-spacing:var(--tr-micro);
  margin-bottom:var(--s5)}
.nano{font-family:var(--ff-label);font-size:var(--fs-nano);font-weight:700;
  text-transform:uppercase;letter-spacing:var(--tr-nano);line-height:1.1}

/* the gold highlighter — the direct re-voicing of ref .yellow-word */
.mark-word{
  position:relative;display:inline-block;
  background:var(--gold);color:var(--ink);           /* 8.78:1 */
  padding:0 .05em .04em;margin-top:.04em;
  box-decoration-break:clone;-webkit-box-decoration-break:clone;
}
.outline-word{-webkit-text-stroke:var(--stroke-out) var(--ink);color:transparent}
.inv .outline-word{-webkit-text-stroke-color:var(--inv-ink)}
```

### 3.2 Section primitives

```css
.shell{max-width:var(--shell);margin-inline:auto}
.section{padding:var(--pad-section) var(--gutter);max-width:var(--shell);margin-inline:auto}

/* left/right label pair — ref .section-top */
.section-top{
  display:flex;justify-content:space-between;align-items:center;
  border-top:var(--border);
  padding-top:18px;padding-bottom:26px;margin-bottom:var(--rule-gap);
}
.section-top>span:first-child{font:600 var(--fs-label)/1.2 var(--ff-label);
  text-transform:uppercase;letter-spacing:var(--tr-label)}
.section-mark{font-size:30px;line-height:1;color:var(--accent-mark)}  /* gold-ink, 5.96:1 */
.inv .section-top{border-top-color:var(--inv-line)}
.inv .section-mark{color:var(--gold)}                                  /* 8.78:1 — live */

/* asymmetric heading — ref .section-heading, align-items:end */
.section-heading{
  display:grid;grid-template-columns:1.45fr 1fr;gap:var(--gap-editorial);
  align-items:end;margin-bottom:var(--head-gap);
}
.section-heading>p{font-size:var(--fs-lg);line-height:var(--lh-text);
  max-width:var(--measure-col)}

/* inverted block */
.inv{
  background:var(--inv-bg);color:var(--inv-ink);
  --ink:var(--inv-ink); --ink-2:var(--inv-ink-2); --ink-muted:var(--inv-ink-2);
  --bg:var(--inv-bg); --bg-2:var(--inv-bg-2); --line:var(--inv-line);
  --accent-mark:var(--gold); --accent-deco:var(--gold);
}
.inv-deep{background:var(--inv-bg-2)}

/* buttons — ref .button geometry exactly */
.btn{
  display:inline-flex;align-items:center;justify-content:space-between;gap:38px;
  padding:19px 24px;min-height:58px;border-radius:var(--r-0);
  background:var(--ink);color:var(--bg);
  font:600 15px/1.2 var(--ff-label);text-transform:uppercase;
  letter-spacing:var(--tr-label);
  transition:transform var(--d-tap) var(--ease),background-color var(--d-tap) var(--ease),
             color var(--d-tap) var(--ease);
}
.btn:hover{background:var(--forest)}
.btn:hover>span{transform:translate(3px,-3px)}
.btn:active{transform:scale(.98)}
.btn>span{transition:transform var(--d-tap) var(--ease)}

/* on pine, the CTA becomes gold with pine ink — ref .blue-end .button */
.inv .btn{background:var(--gold);color:var(--pine)}        /* 8.78:1 */
.inv .btn:hover{background:#F0D9AE}                        /* 10.45:1 */

.link{
  display:inline-flex;align-items:center;gap:18px;padding:7px 0;
  border-bottom:1px solid currentColor;line-height:1.45;font-weight:500;
  transition:color var(--d-tap) var(--ease),border-color var(--d-tap) var(--ease);
}
.link:hover{color:var(--ink-2)}
.inv .link:hover{color:var(--gold)}                        /* 8.78:1 */
```

---

## 4. FONT RECOMMENDATION

### 4.0 Banned faces (client hard rule: "no AI fonts, no AI look")

Do not use, anywhere, for any role: **Inter, Space Grotesk, Poppins, Montserrat, DM Sans, Manrope, Outfit, Plus Jakarta Sans, Sora, Syne, Clash Display, Satoshi, Playfair Display**, and the **Bricolage Grotesque + Instrument Serif** pairing from `reference/yga_website_v4.html`. Also avoid, by the same logic even though unlisted: Bebas Neue (template-poster default), Lato, Nunito, Raleway, Work Sans, Figtree, and `system-ui`/`-apple-system` as a *primary* (fine as a last fallback only).

**Fontshare is not recommended.** `api.fontshare.com` is unreachable from this environment (CONNECT tunnel 403), so I cannot verify its CSS endpoints or measure its binaries. Its two best candidates for this brief (Tanker, Zodiak) are also unverifiable. Shipping an unverified third-party font CDN into a zero-build single file is an avoidable single point of failure. Both recommendations below are Google Fonts, and every URL in them returned **HTTP 200** and was byte-measured.

### 4.1 The substitution problem, quantified

Measured with fontTools from the real binaries. `density` = cap height ÷ average uppercase advance — how much cap height each face buys per unit of horizontal space. This is the number that decides whether a headline still looks like the reference.

| Face (uppercase, display weight) | cap/em | avg CAP advance | **density** | latin woff2 |
|---|---|---|---|---|
| **YGA Signal (the reference)** | **0.900** | **0.405** | **2.22** | 12.1 KB (woff) |
| Big Shoulders 300 | 0.800 | 0.3894 | **2.05** | 36.5 KB (var 300–900) |
| Anton 400 | 0.859 | 0.4736 | 1.81 | 18.6 KB |
| Big Shoulders 600 | 0.800 | 0.4630 | **1.73** | — |
| Bricolage Grotesque 96/75/800 | 0.660 | 0.4182 | 1.58 | 131.5 KB — *banned* |
| **Big Shoulders 900** | **0.800** | **0.5143** | **1.56** | — |
| Oswald 700 | 0.810 | 0.5323 | 1.52 | 28.5 KB |
| Archivo wdth62 / wght900 | 0.686 | 0.5029 | 1.36 | 90.1 KB (var) |
| Archivo Narrow 700 | 0.686 | 0.5642 | 1.22 | 18.7 KB |
| Public Sans 400 | 0.723 | 0.6678 | 1.08 | 26.8 KB |
| Libre Caslon Display | 0.690 | 0.6461 | 1.07 | 24.2 KB |
| Fraunces 144/900/WONK | 0.700 | 0.6799 | 1.03 | 121.0 KB |
| Bodoni Moda 96/900 | 0.750 | 0.7693 | 0.97 | 46.3 KB (+54.6 KB w/ italic) |
| Spectral 400 | 0.660 | 0.7075 | 0.93 | 67.3 KB (3 cuts) |
| Newsreader 72/800 | 0.670 | 0.8024 | 0.84 | 122–279 KB |

**Nothing on Google Fonts reaches 2.22.** The closest is Big Shoulders, and only because its weight axis lets you trade weight for width: at wght 300 it is 2.05 (within 8% of the reference), at 900 it is 1.56.

### 4.2 Verdict on inlining a custom .woff — not worth it

The size argument *favours* inlining and I still recommend against it:

- `yga-signal.woff` is 12,080 bytes raw → **16,108 bytes base64** (+33%). That is cheaper than every Google option here. Size is genuinely not the objection.
- The objections that do bite:
  1. **It is the wrong voice.** `make-font.py` builds a monoline geometric with `stroke(...,width=148)`, bounded round joins (`arc(x,y,width/2,width/2,...)`), and a flat `×0.72` squeeze. Uniform stroke weight and round joins are the signature of acid/techno display type. Heritage wants modulated stroke, flat-cut terminals, or at minimum a drawn (not constructed) skeleton. Re-colouring it pine-on-beige produces a cream-coloured brutalist site, which is the failure mode this project exists to avoid.
  2. **Caps only, 58 glyphs.** No lowercase (`cmap[ord(c)]=cmap[ord(c.upper())]`), no `é`, no `&` beyond the one drawn, no real quotes beyond `U+2018/2019` aliased to a single mark. Any copy change risks a tofu or a wrong character. On a one-file static page with no build step there is no subsetting safety net.
  3. **Monospaced at 405/1000.** Fine for the reference's slogan-shaped copy; hostile to real sentences.
  4. **Base64 is render-blocking in practice.** Inlined into `<style>` in the one HTML file, those 16 KB sit ahead of first paint in the critical path and are re-downloaded on every HTML change, with no separate cache entry. Google's woff2 is served from a shared, long-cached origin behind `font-display:swap`.
- **If the client ever commissions a real custom face:** base64-inline it, budget **≤ 28 KB base64** for a caps display subset (`A–Z 0–9 . , : ! ? ' - / & % + —`), ship it as `woff2` (not `woff` — the reference's `.woff` is ~35% larger than the equivalent woff2), and keep `font-display:swap` with the Google display face as the metric-matched fallback.

### 4.3 PRIMARY RECOMMENDATION — "Estate"

**Big Shoulders (display + labels) + Spectral (all reading copy).** Two families, **103.9 KB** of latin woff2, three HTTP requests.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@300..900&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@300..900&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap">
```

Single-line form, exactly as it should appear in `index.html`:
```
https://fonts.googleapis.com/css2?family=Big+Shoulders:wght@300..900&family=Spectral:ital,wght@0,400;0,600;1,400&display=swap
```

| Role | Declaration |
|---|---|
| Display | `font-family:'Big Shoulders'; font-variation-settings:"wght" 800; text-transform:uppercase; letter-spacing:-.025em` |
| Display, hairline variant (eyebrow headlines, chapter numbers) | `"wght" 300` — density 2.05, nearly the reference's economy |
| Micro-labels | `'Big Shoulders'; "wght" 600; uppercase; letter-spacing:.12–.20em` |
| Body / lede / all reading copy | `'Spectral'; weight 400; line-height 1.6; font-feature-settings:"onum" 1` |
| Emphasis inside copy | `Spectral 600` (never italic + bold together) |
| Editorial accent word in a headline | `Spectral italic 400`, see §4.5 |

**Why this, against the heritage / editorial / expensive brief:**

- **Big Shoulders** is a drawn condensed gothic in the American wayfinding / club-board / distillery-label tradition — flat-sided bowls, square terminals, a slightly engineered skeleton. Set in Pine caps on Beige with gold rules under it, that lineage reads *estate and institution*, not *startup*. It is not in the AI rotation (which is Inter/DM Sans/Poppins-shaped), and it is not the poster default (Bebas/Anton).
- **It survives 12–20vw.** Cap height 0.800 em, closed apertures, zero hairlines at wght ≥ 600, flat terminals, no spurs or ball ends to break up. There is no stroke in it thin enough to disappear or to shimmer under a 3D transform at 158px. Verified across wght 300/600/900.
- **Its weight axis is the width axis you don't get.** Need a longer headline to fit? Drop to wght 500–600 and density rises from 1.56 to 1.73. The reference solved that with a 0.72 squeeze; here you solve it with weight, which is the honest typographic move and reads as art direction rather than distortion.
- **Spectral** (Production Type, commissioned for screen reading) is a transitional serif with wedge serifs and a low 0.450 x-height. At 18–19px on cream it reads like a printed page, which is where "expensive" actually lives — in the body copy, not the headline. Pairing a condensed gothic headline against a transitional serif text face is the oldest editorial pairing there is (newspaper masthead over body column) and it is exactly the heritage register the moodboard asks for.
- **The hierarchy is unmistakable at a glance.** Condensed caps gothic vs. wide lowercase serif differ on case, width, contrast and axis. The reference achieved that with condensed-vs-Helvetica; this achieves it harder.
- **Payload:** 36.5 KB + 67.3 KB = **103.9 KB** latin. Under the reference's own JS budget and well inside a single-file page's headroom.

### 4.4 Required metric corrections (do not skip these)

These are the practical consequences of the measured numbers. Dropping the reference's values in unchanged will look wrong.

1. **Display font-size × 1.125.** YGA Signal cap 0.900 em → Big Shoulders cap 0.800 em. Same font-size renders caps 11% shorter. All display clamps in §3 already have this applied (`h1: 7.4vw/140px → 8.3vw/158px`).
2. **Display line-height must come DOWN, not stay.** The reference's `line-height:.9` presumed a 0.900 em cap, i.e. leading ÷ cap = 1.00. With a 0.800 em cap, `.9` leaves 0.10 em of dead air per line and the headline falls apart. Equivalent values: ref `.9 → .80`, `.92 → .82`, `.96 → .85`, `1.0 → .89`. §3 uses `.84 / .86 / .88 / .92 / .96` — the reference's ratios plus ~6% air, which is the warmth the brief wants.
3. **Line length grows ×1.381.** 1.125 (size) × 1.2277 (advance 0.5143 vs 0.405) = **1.381**. A reference headline of 10 characters per line becomes 13.8. **Headline copy must lose roughly one word in four**, or gain an extra `<br>`. Budget **≤ 11 characters per line at `--fs-d1`**. Write headlines to the break; do not let them wrap by accident.
4. **Body base 16px → 18px.** Spectral x-height is 0.450 em vs a grotesque's ~0.510 em. An 18px Spectral has an 8.1px x-height, matching a 16px sans (8.2px). Shipping Spectral at 16px makes the page look small and timid.
5. **Body leading 1.5 → 1.6.** Low x-height plus serif texture plus a 62ch measure.
6. **Lede tracking −0.035em → −0.015em.** The reference's `-.035em` on `.large-copy` was correcting a loose system sans. Spectral is already tightly fitted; −0.035em will collide the serifs.
7. **Micro-label tracking up.** The reference used `+.04em` on an 11px grotesque eyebrow. Condensed caps at 11–13px need more: **`.12em` at 13px, `.16em` at 12px, `.20em` at 11px.** Condensed caps without generous tracking are the single most common way a condensed face looks cheap.
8. **Turn on old-style figures in body, lining figures in display.** `font-feature-settings:"onum" 1` on `body`, `"lnum" 1` on the display rule. Spectral has both. Old-style figures in running text is a heritage tell that costs nothing.
9. **Metric-matched fallback.** `--ff-display` falls back to Oswald → `Arial Narrow` → `Liberation Sans Narrow` (the reference's own chain). `--ff-text` falls back to Georgia (x-height 0.481 — close enough that `swap` does not jolt).

### 4.5 The editorial accent word — replacing `.yellow-word` and `.outline-word`

The reference gives each hero headline two special words:
```html
<h1>Your influence.<br>Your expertise.<br>
  <span class="outline-word">Your next</span><br>
  <span class="yellow-word">big thing.</span></h1>
```
Three treatments are available here, and you should use **exactly one per headline**, never two:

```css
/* A. the gold highlighter — gold as SURFACE, pine as ink: 8.78:1. Always safe. */
.mark-word{background:var(--gold);color:var(--ink);padding:0 .05em .04em;
  margin-top:.04em;box-decoration-break:clone;display:inline-block}

/* B. the outline word — ref -webkit-text-stroke:1.5px */
.outline-word{-webkit-text-stroke:1.5px var(--ink);color:transparent}
/* at >=100px raise the stroke to 2.5px or it reads as a rendering artefact */
@media(min-width:1100px){.outline-word{-webkit-text-stroke-width:2.5px}}

/* C. the serif italic swap — THE heritage move. Use on ONE word, max once per page. */
.serif-word{
  font-family:var(--ff-text);
  font-style:italic;
  font-weight:400;
  text-transform:none;         /* mixed case — that is the point */
  letter-spacing:-.01em;
  font-size:1.16em;            /* Spectral cap 0.660 vs Big Shoulders 0.800 */
  line-height:1;
  padding-right:.04em;         /* italic overhang */
}
```
Treatment C is where "expensive" arrives. One italic serif word, lowercase, inside a wall of condensed pine caps, is a hundred-year-old editorial gesture and it is worth more than any gradient. The `1.16em` correction is required: 0.800 ÷ 0.660 = 1.212, trimmed to 1.16 because italic looks larger than it measures. **Verify optically at `--fs-d1` before shipping.**

### 4.6 ALTERNATE RECOMMENDATION — "Masthead"

**Bodoni Moda (display) + Archivo (copy, UI, labels).** Two families, **117.2 KB** latin, three requests.

```
https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,96,600..900;1,96,500..700&family=Archivo:wdth,wght@62..100,400..700&display=swap
```

| Role | Declaration |
|---|---|
| Display | `'Bodoni Moda'; font-variation-settings:"opsz" 96,"wght" 800; uppercase; letter-spacing:.01em` |
| Display accent | `'Bodoni Moda'` italic `"wght" 600`, mixed case |
| Body / lede | `'Archivo'; "wdth" 100,"wght" 400`; base **17px**, leading 1.55 |
| Micro-labels | `'Archivo'; "wdth" 78,"wght" 600`; uppercase, `letter-spacing:.14em` |

**When to pick it:** if the client reacts to Big Shoulders as too American-signage and wants the fashion-masthead register instead. Bodoni Moda is a properly cut Didone with a real `opsz` axis — pinned at `opsz 96` it is drawn *for* display sizes, so the hairlines are deliberate rather than a scaled-up text cut, and `opsz` pinning collapses that axis and keeps the file to 54.6 KB for roman + italic.

**The trade-offs, stated plainly:**
- **Density 0.97 vs the reference's 2.22.** Lines run **2.3× longer per character**. Headlines must be rewritten to roughly 40% of the reference's word count. `--fs-d1` must drop to about `clamp(60px,6.4vw,118px)` or a three-word headline will wrap to four lines.
- **Tracking flips positive.** Didone caps need `+0.01em` to `+0.02em`, not negative. Keep the display `letter-spacing` token separate from Option A's.
- **Leading goes up, not down.** Cap 0.750 em, so ref `.9 → .84`; and Didone caps need a little more air than a gothic to avoid looking crowded: use `.88 / .92 / .96`.
- **Hairlines and 3D do not mix.** Bodoni's thins are ~0.012 em. Under `rotateY(-20deg)` plus a 12-step extrude they will alias and shimmer. **If you pick Option B, the sculptural type (§7, `--fs-d0/--fs-d0c`) must switch to a solid-weight face or become a drawn SVG object instead.** That is a real constraint on the "everything is 3D" requirement.
- **Archivo earns its place** by having a true `wdth` axis (62–125, verified), so one 62.6 KB file gives you normal-width body copy *and* condensed tracked micro-labels — which is how the reference's labels fit.

### 4.7 Rejected, with reasons

| Face | Why not |
|---|---|
| Anton | Density 1.81 is excellent, 18.6 KB is cheap. But single weight (no 300 for hairline variants, no 500 for long headlines), and it is the single most over-used free poster face on the internet. Fails "no AI look" in spirit. |
| Oswald | Density 1.52, 28.5 KB. Reads newsprint-economy, not heritage-expensive. Its narrow aperture at 150px feels cramped rather than tall. |
| Archivo Narrow | Density 1.22, static, no variable axes. Strictly worse than Archivo variable at the same job. |
| Fraunces | Genuinely heritage (opsz + SOFT + WONK). But 121 KB, density 1.03, and its wonk reads craft-bakery rather than estate. Viable if the client wants *warm* over *institutional*. |
| Libre Caslon Display | 24.2 KB and lovely. Single weight, density 1.07, and its hairlines have the same 3D problem as Bodoni. Good candidate for a pull-quote face only. |
| Newsreader | Beautiful, but 122 KB with `opsz` pinned and 279 KB with the axis live. Not worth 2× Spectral's bytes for a similar job. |
| Instrument Serif / Bricolage Grotesque | Banned by the client. |

---

## 5. GOLD — THE CONTRAST RULES

### 5.1 The full measured matrix

WCAG 2.x relative luminance, computed. **Bold = passes AA for normal text (≥4.5:1).**

| Foreground | on Beige `#FFF7E6` | on Almond `#F9E9DA` | on Bone `#E3DAC9` | on Pine `#00311F` | on Forest `#183630` |
|---|---|---|---|---|---|
| Pine `#00311F` | **13.50** | **12.13** | **10.37** | — | — |
| Forest `#183630` | **12.24** | **11.00** | **9.41** | — | — |
| Sage `#4A6B57` | **5.58** | **5.01** | 4.29 | 2.42 | 2.19 |
| **Gold `#E5C690`** | **1.54** | **1.38** | **1.18** | **8.78** | **7.96** |
| Gold-edge `#A88D47` | 3.00 | 2.70 | 2.31 | **4.50** | 4.08 |
| Gold-ink `#7A5A1C` | **5.96** | **5.35** | **4.58** | 2.27 | 2.05 |
| Gold-deep `#6B5118` | **7.00** | **6.29** | **5.38** | 1.93 | 1.75 |
| Beige `#FFF7E6` | — | — | — | **13.50** | **12.24** |
| Bone `#E3DAC9` | — | — | — | **10.37** | **9.41** |
| Gold-hover `#F0D9AE` | 1.29 | 1.16 | 1.01 | **10.45** | **9.47** |

### 5.2 The one insight that unlocks gold

**Gold fails as INK on light. Gold succeeds as a SURFACE under Pine ink, and as INK on Pine.** Both directions are **8.78:1**, because contrast is symmetric.

So the restriction is narrower than it first looks. You are not banned from using gold on a light page — you are banned from *making gold the foreground on a light background*. A gold panel, a gold band, a gold 3D object face, or a gold highlighter behind Pine text is all fully accessible and should be used freely. That is how the warmth gets into a Beige page without breaking it.

### 5.3 PERMITTED — gold as surface, on light

Pine ink on Gold is 8.78:1 (AAA for everything).

- Gold filled panel / card / inset with Pine headline and Pine body. Keep the panel's own area ≤ roughly a third of the viewport so the page stays Beige-dominant.
- The **gold highlighter** behind a display word (`.mark-word` in §3.1) — the direct re-voicing of the reference's `.yellow-word`. This is the house gesture; use it once in the hero and once in the closing statement.
- **Gold faces on 3D objects** (book covers, cube faces, extruded letterforms, panel edges). Any text that sits on a gold face is Pine.
- A gold **band** with Pine type, as the re-voicing of `.mid-cta`.
- `::selection{background:var(--gold);color:var(--pine)}`.
- Gold as the fill of a solid shape with no text in it at all — rules, blocks, keylines, the blurred contact-shadow ellipse, the printer's-mark glyph *if* it is `aria-hidden` **and** duplicated as text elsewhere. (For the `✳` marks in `.section-top`, §3.2 uses `--gold-ink` instead, so they are legible without needing that exemption.)

### 5.4 PERMITTED — gold as ink, on Pine or Forest only

8.78:1 on Pine, 7.96:1 on Forest. Inside any `.inv` block, gold is a first-class text colour.

- Gold display headlines on Pine.
- Gold body copy on Pine (8.78 passes AA and AAA at 18px).
- Gold links and underlines on Pine.
- **Gold as the primary CTA fill with Pine label**, which is the reference's own move: `.blue-end .button{background:var(--yellow);color:#111}`.
- Gold focus ring on Pine: `outline:3px solid var(--gold)` — 8.78:1 against the 3:1 non-text minimum.
- Gold 1px rules and dividers on Pine (6.37:1 for `--gold-line`, 8.78 for gold itself).
- Gold extruded display type on Pine, using `--tsh-gold`.

### 5.5 FORBIDDEN — no exceptions

Everything in this list fails. There is no size at which a 1.5:1 ratio becomes acceptable, because WCAG's large-text allowance floors at 3:1.

| Forbidden | Ratio | Instead |
|---|---|---|
| Gold body text on Beige / Almond / Bone | 1.54 / 1.38 / 1.18 | `--ink` Pine, or `--gold-ink` `#7A5A1C` (5.96) |
| Gold headline on any light surface | 1.54 max | Pine headline; put the gold *behind* one word as `.mark-word` |
| Gold eyebrow, label, kicker, caption on light | 1.18–1.54 | `--gold-ink` for a gold-family label; `--ink-muted` Sage (5.58) otherwise |
| Gold link or link underline on light | 1.54 | Pine link with a Pine 1px underline; gold only on hover *as a background wash* |
| Gold numerals (`01`, `02`) on light | 1.54 | `--gold-ink`, or Pine at wght 300 |
| Gold icon, arrow, chevron, `+`/`−` glyph on light | 1.54 | Pine. Non-text UI needs 3:1 (WCAG 1.4.11); gold gives 1.54 |
| Gold focus ring on light | 1.54 | `outline:3px solid var(--pine)` |
| Gold form-field border, checkbox, radio, toggle track on light | 1.54 | `--gold-edge` `#A88D47` is exactly 3.00 — the legal floor for a *decorative* boundary. For any border that conveys state (focus, error, selected), use Pine. |
| Gold-on-gold anything | 1.00 | — |
| Gold text on Almond or Bone "because the panel is darker" | 1.38 / 1.18 — *worse* | Darker light surfaces make gold worse, not better |
| Gold 1px hairline used as the only separator on light | 1.54 | `--line` Bone for decorative rules; `--line-strong` `#C8BCA6` where the rule is structural |
| Gold thin-stroke display outline on light (`-webkit-text-stroke:1.5px gold`) | 1.54 | Pine stroke; or invert the section and stroke in gold |

### 5.6 Three failure modes to watch for specifically

1. **The hover trap.** A Pine link that turns gold on hover drops from 13.50 to 1.54 and vanishes. On light, hover gold must arrive as a *background* (`background:var(--gold); color:var(--ink)`), never as a text colour.
2. **The gradient trap.** `linear-gradient(var(--gold),var(--beige))` behind text produces a continuum where the ratio is unknowable and somewhere always below 4.5. No text over a gold gradient on light, ever. (Also see §5.8 — gradients are banned for aesthetic reasons too.)
3. **The 3D-object trap.** A gold extruded letterform on Beige is 1.54:1 — it will read as a faint ghost, not a sculpture. Gold sculptural type belongs **only** in inverted sections. On light, sculptural type is **Pine with a `--tsh-bone` Bone extrude** (Bone on Beige is 1.32, which is fine *because the extrude is a shadow, not the letter* — the letter itself is Pine at 13.50).

### 5.7 Enforcement

Write these two rules into the stylesheet as a standing guard, and treat any need to override one as a design bug:

```css
/* Gold is never a foreground on a light surface. */
:root:not(.inv) :is(h1,h2,h3,p,a,span,li,strong,em,button,label,summary){
  /* do not set color:var(--gold) here — this comment is the contract */
}
/* Gold as a surface always carries pine ink. */
.on-gold,[data-surface="gold"]{background:var(--gold);color:var(--pine)}
.on-gold :is(a,button){color:var(--pine);border-color:var(--pine)}
```
Audit checklist before shipping: grep the file for `var(--gold)`. Every hit must be a `background`, a `box-shadow`, a `text-shadow`, a `border-color` on a decorative rule, a `fill` on a shape with no text, or inside a `.inv` scope. Any `color:var(--gold)` outside `.inv` is a defect.

### 5.8 Banned AI-look visual tells, and what replaces them

The client's "no AI look" rule is a visual rule as much as a type rule. Each ban below has a replacement drawn from the reference, so nothing is merely removed.

| Banned tell | Replacement, from the reference |
|---|---|
| Gradient mesh / blurred colour blobs behind the hero | A hard-edged full-bleed colour block. `.scroll-story{background:var(--blue)}` with a sliver margin (`margin:40px 0 80px`). Flat, honest, edged. |
| Purple→blue or any two-hue gradient | Flat Pine. The palette has exactly six values and no interpolation between any two of them. |
| Glassmorphism cards (`backdrop-filter`, translucent panels) | Opaque Almond / Bone / Gold / Pine panels with a 1px Bone border and a **hard offset shadow** (`--sh-hard-s: 6px 6px 0`). `backdrop-filter` appears in the reference exactly once, on `dialog::backdrop`. Keep it there and nowhere else. |
| Soft diffused drop shadows (`0 10px 30px rgba(0,0,0,.1)`) on everything | Hard offset ink: the shadow is a solid darker sibling of the object's own colour (§2.7). One soft shadow is permitted, on the floating scene label: `--sh-float`. |
| Rounded cards (`border-radius:12px`/`16px`/`2rem`) | `--r-0: 0`. The reference's entire stylesheet contains three radius declarations: `50%` for dots, `0` as a reset, `14px` on one dialog. Square everything. |
| Pill buttons (`border-radius:999px`) | Square buttons, `padding:19px 24px`, `min-height:58px`, `gap:38px` between label and arrow (ref `.button`). |
| Centred-everything hero | Asymmetric split: `.hero-stage{grid-template-columns:48% 52%}`, copy left and pinned low, object right and bleeding out of frame. Nothing on the page is centred except the sculptural objects inside their own `place-items:center` stages. |
| Three equal feature cards with icons above titles | Either the accordion list (`.service-list`: `grid-template-columns:65px 1fr 50px`, 1px rules, `01`–`05` numerals) or the four-up label grid (`.fit-grid`: `repeat(4,1fr)`, each child with `border-top` + `padding-top:28px`). Both are editorial lists, not card decks. |
| Emoji icons | Typographic marks only, as the reference does: `✳` `↗` `↓` `↔` `+` `−` `Ⅱ`. Set in the display face, `aria-hidden="true"`, with real text alongside. Zero icon libraries. |
| Lucide / Feather / Heroicons line icons | Same as above. If a true glyph is needed, hand-draw one inline SVG at 1.5px stroke in `currentColor`. |
| Stock photography / 3D-render hero images / abstract AI art | Procedural CSS-3D objects (§7). The reference ships **zero raster images** — `public/` has only `logo.svg` and `favicon.svg`. Match that. |
| Section-centred `max-width:1200px` with equal columns | `max-width:1800px` with per-section asymmetric grids (`1.45fr 1fr`, `1fr 1.35fr`, `1.1fr 1fr`, `48% 52%`) — §2.2. |
| Dark mode toggle / `prefers-color-scheme` dark variant | The light Beige background is a hard requirement. Ship one colourway. Inverted *sections* supply the dark, under the page's control (§6). |
| Animated gradient borders, glowing edges, neon | Hard offset extrudes and `-webkit-text-stroke` outline words. |
| Infinite looping micro-animations on decorative elements | One-shot viewport entrances only (`pop-reveals.js` unobserves on play: `observer.unobserve(entry.target)`). The one permitted loop is the `.kinetic-strip` marquee, and it pauses under `prefers-reduced-motion`. |
| Floating-label inputs, soft-shadow form fields | `border:1px solid var(--line); border-radius:0; min-height:49px; padding:14px 12px`, label above the field (ref `.application-form`). |
| "Trusted by" logo wall of grey SVGs | A tracked caps `.nano` line of named deliverables, as `.hero-bottom` does. |
| Big centred stat counters that tick up | Sculptural numerals as 3D objects (`.zero-art`, `--fs-d0`), static, extruded, rotated. |
| `system-ui` / Inter as the display face | §4. |

