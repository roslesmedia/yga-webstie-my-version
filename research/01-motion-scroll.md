# 01 — Motion & Scroll Specification
### Your Growth Agency (YGA) — single-file rebuild

Reverse-engineered from `/home/user/refs/yga-agency-site-/yga-website-2/`.
Primary sources: `public/pop-reveals.js` (8 290 B), `public/experience.js` (16 410 B),
`public/experience-data.js`, `public/app.js`, `public/scene.js`, `public/router.js`,
`public/experience.css`, `public/styles.css`, `DESIGN.md`.

Target: **one self-contained `index.html`**, static on Vercel, zero build step.
Brand: **Your Growth Agency (YGA)** — new colourway, same motion architecture.

Every number below is quoted from the real source. Where I quote code it is verbatim
(the reference is written in a dense, comma-chained style; I have not reformatted the
values).

---

## DECISION SUMMARY — read this first

Brand: **Your Growth Agency (YGA)**. Client brief: motion everywhere — section-to-section
transitions, scrubbed text, image/card reveals, 3D-on-scroll, scroll-linked effects.

| question | decision | one-line reason |
|---|---|---|
| GSAP + ScrollTrigger, or dependency-free? | **Dependency-free.** Native stack: CSS scroll-driven animations + WAAPI + one rAF loop. | Every effect in the brief has a native primitive, and the declarative ones run **off the main thread** — which ScrollTrigger scrub cannot. A CDN failure on a library build is a blank page. §5. |
| Lenis / ScrollSmoother? | **No. Native scroll.** | It intercepts wheel+touch, fights `touch-action:pan-y` on the 3D canvas, desyncs CSS scroll timelines, and adds input latency. Smooth the *consumer*, not the scrollbar: `1-Math.exp(-dt*7)`. §10. |
| Scrub engine | **CSS `animation-timeline: view()/scroll()`** behind `@supports`, with a JS rAF fallback only where math is needed (3D story, WebGL camera, word-fill). | Compositor-thread scrub; degrades to "element at rest, fully visible". §7–§9. |
| One-shot entrances | **WAAPI `element.animate()`** + IntersectionObserver, five archetypes. | `.finished` promises, `.cancel()`, `getAnimations()` — exactly what the focusin short-circuit and pause control need. §1, §3. |
| Pinning / stacking | **`position:sticky` in CSS.** Never a library pin. | No `pin-spacer` DOM mutation, no `svh` / iOS URL-bar bugs, and `prefers-reduced-motion` can un-pin it with two properties. §2.3, §7.2. |
| Anti-AI rule | **No universal fade-up.** Nine element roles, nine distinct motion signatures, five different durations. | §11 is a hard ban list with the variation matrix. |

The three-layer native stack, by job:

```
CSS scroll-driven animations   → continuous, declarative, compositor-thread scrub
  (animation-timeline: view() / scroll(), animation-range)
  band wipes · sticky stack recede · marquee scrub · frame parallax · line masks

WAAPI element.animate()        → one-shot, interruptible, cancellable entrances
  five pop archetypes · clip-path image reveals · dialogs · accordions

one rAF loop (read → write)    → anything needing real maths or cross-element state
  three-act device story · WebGL camera · manifesto word-fill · scrollspy
```

New sections added for this brief: **§7** section-to-section transitions,
**§8** scroll-scrubbed text, **§9** image & card reveals, **§10** the smooth-scroll
decision, **§11** the anti-AI-motion ban list, **§12** the additional copy-paste code.

## 0. The motion token set (quote these into `:root`)

From `public/styles.css` line 2 and `public/experience.css` line 3:

```css
:root{
  --ease:cubic-bezier(.2,.75,.2,1);        /* the ONE signature ease. Used ~40x */
  --ease-out:var(--ease);
  --ease-in-out:cubic-bezier(.77,0,.175,1); /* page-arrive, curtain-in only */
  --ease-drawer:cubic-bezier(.32,.72,0,1);  /* declared; used for sheet-style panels */
}
```

`cubic-bezier(.2,.75,.2,1)` is the entire identity of this site's motion. It is a
fast-out / long-settle curve: 75 % of the distance is covered in the first ~35 % of
time, then it glides. It is hard-coded as a local const in **both** JS modules:

- `pop-reveals.js` line 4: `const ease='cubic-bezier(.2,.75,.2,1)';`
- `experience.js` line 6: `const easing='cubic-bezier(.2,.75,.2,1)';`

Breakpoint tokens that gate motion values:

```js
const phone      = matchMedia('(max-width:760px)');              // pop-reveals.js
const compact    = matchMedia('(max-width:760px)');              // experience.js
const finePointer= matchMedia('(hover:hover) and (pointer:fine)');// experience.js
const preference = matchMedia('(prefers-reduced-motion: reduce)');
```

Sticky offsets that every scroll formula depends on: header is `88px` desktop /
`80px` phone (`experience.css`: `.header{position:sticky;top:0;height:88px}`,
`@media(max-width:760px){.header{height:80px}}`).

---

## 1. The pop-reveal system — complete breakdown

### 1.1 Architecture

`createPopReveals({reducedMotion})` returns
`{enterPage, suspend, settle, resume, replayHeading, dispose}`.

State:

```js
const records=new Map(),liveAnimations=new Set();
let observer=null,disposed=false,suspended=false;
```

`records` is keyed by DOM node → `{node,kind,index,seen,animations:Set}`.
`liveAnimations` is a global registry so `dispose()` can cancel everything.

Registration is **selector-driven at module init**, five archetypes, each with its own
index counter (`index` is used by the `slide` archetype to alternate direction):

```js
// headline — every h1/h2 inside a page, except the live-rewritten story title
document.querySelectorAll('[data-page] h1,[data-page] h2').forEach((node,i)=>{
  if(node.id!=='story-title')register(node,'headline',i);
});

// copy
'.hero-intro,.hero-description,.hero-actions,.offer-line,.manifesto-grid>.large-copy,
 .section-heading>p,.section-heading>div>p,.demand-copy>p,.faq-heading>p,
 .application-heading>p,.route-hero .eyebrow,.route-hero p,.route-hero .text-link,
 .lab-manifesto>div,.studio-statement>p,.route-end>.section-label,.route-end>.button,
 .route-end>.text-link,.final-cta-copy>.section-label,.final-cta-copy>.button,
 .final-cta-copy>p'

// slide
'.service-item,.question-options>button,.partnership-point,.fit-grid>div,
 .faq-list>details,.chapter-card,.page-link-card'

// panel
'.process-explorer,.product-art,.product-detail,.role-panel,.lab-card,
 .principle-card,.application-form'

// sculpture
'.zero-art,.arrow-sculpture,.orbit-composition,.lab-stack,.studio-sculpture,.story-world'
```

Taxonomy in one line: **headline** = display type (word-split), **copy** = running
text and inline CTAs, **slide** = repeated row/grid items (alternating L/R),
**panel** = large flat surfaces (tilt forward on X), **sculpture** = the 3D-ish
art objects (tilt on X *and* Y, biggest entrance).

### 1.2 The animation driver

```js
function track(record,node,frames,options){
  const animation=node.animate(frames,{duration:720,easing:ease,fill:'backwards',...options});
  record.animations.add(animation);liveAnimations.add(animation);
  const release=()=>{record.animations.delete(animation);liveAnimations.delete(animation);
    if(!record.animations.size)record.node.classList.remove('pop-is-running');};
  animation.finished.then(release,release);return animation;
}
```

Three load-bearing decisions:

1. **`fill:'backwards'`** — not `'both'`. The element holds the *start* frame during
   the `delay`, then animates, then is released to its natural CSS. Nothing is
   permanently overridden, so hover transforms (`.mini-product`, `.lab-card:hover`)
   and the CSS scroll-driven animations keep working after the entrance.
2. **`duration:720` is the default** and is overridden by every archetype. No
   archetype actually runs at 720 ms.
3. `pop-is-running` is removed only when the element's *last* animation settles
   (word-split headlines own N animations).

### 1.3 Archetype A — `headline` (word-by-word pop-forward)

Split first (`splitHeading`, idempotent — returns existing `.pop-word` list if the
node is already split):

```js
const text=readableText(node).replace(/\s+/g,' ').trim();
node.setAttribute('aria-label',text);
// TreeWalker over SHOW_TEXT, split on /(\s+)/, whitespace chunks stay as text nodes
span.className='pop-word';span.textContent=chunk;span.setAttribute('aria-hidden','true');
node.classList.add('pop-headline');
```

`readableText` recurses child nodes, maps `<br>` → `' '`, so `aria-label` reads as one
sentence across line breaks. **Words only — never characters.** Character splitting
would multiply the animation count by ~6 and wreck the `aria-label` strategy.

Keyframes (verbatim):

```js
words.forEach((word,i)=>track(record,word,[
  {opacity:0,transform:`perspective(850px) translate3d(0,${phone.matches?'.72em':'.95em'},0) rotateX(-48deg) scale(1.16)`,offset:0},
  {opacity:1,transform:'perspective(850px) translate3d(0,-.055em,0) rotateX(4deg) scale(1.035)',offset:.68},
  {opacity:1,transform:'perspective(850px) translate3d(0,0,0) rotateX(0) scale(1)',offset:1}
],{duration:780,delay:delay+Math.min(i*48,480)}));
```

| property | value |
|---|---|
| duration | **780 ms** |
| easing | `cubic-bezier(.2,.75,.2,1)` |
| per-word stagger | **48 ms**, hard-capped at **480 ms** (`Math.min(i*48,480)`) → words 11+ all fire together |
| group delay | `delay` argument, added *before* the stagger |
| perspective | `850px` (per-word, inline) |
| travel | `.95em` desktop / `.72em` phone — **em-relative, so it scales with the clamp()'d font size** |
| rotateX | `-48deg` → `+4deg` (overshoot past zero) → `0` |
| scale | `1.16` → `1.035` → `1` |
| opacity | `0` → `1` by offset `.68`, i.e. fully opaque **before** the settle |
| overshoot offset | `.68` (68 % of 780 ms = 530 ms), the last 250 ms is pure settle |
| transform-origin | CSS: `50% 80%` desktop, `50% 90%` phone |

Required CSS (`experience.css` line 2):

```css
.pop-word{display:inline-block;transform-origin:50% 80%;backface-visibility:hidden}
.pop-headline{perspective:1000px;overflow:visible}
.pop-pending{opacity:0}
.pop-is-running{z-index:2}
.pop-is-running.pop-headline .pop-word{will-change:transform,opacity}
.pop-is-running:not(.pop-headline){will-change:transform,opacity}
.pop-pending:focus-within{opacity:1!important}
.pop-headline .outline-word{-webkit-text-stroke:1.5px var(--ink)}
@media(max-width:760px){.pop-word{transform-origin:50% 90%}}
```

Note the double perspective: `1000px` on the container *and* `850px` inline per word.
The container value establishes the 3D context so `z-index:2` lifting works; the inline
value is what actually drives the foreshortening. `will-change` is applied **only while
`pop-is-running`** — never statically. That is the whole reason this holds 60 fps with
60+ animated spans on a page.

### 1.4 Archetypes B–E — the shared block-level driver

All four non-headline archetypes share one `track()` call. First, the existing
computed transform is captured and **preserved as a suffix**:

```js
const base=getComputedStyle(node).transform;
const end=base==='none'?'':base;
const distance=phone.matches?48:82;
```

This is the single most important detail in the file. `.mini-product` is authored as
`transform:rotate(-7deg) rotateY(-15deg)`, `.lab-sheet` as
`translate(-70%,-55%) rotate(-18deg) rotateY(-15deg)`. By appending the computed
`matrix3d(...)` to every keyframe, the entrance composes *on top of* the art direction
instead of flattening it. Final keyframe is `end||'none'`.

Shared keyframe shape and offsets:

```js
track(record,node,[
  {opacity:0,transform:start,    offset:0},
  {opacity:1,transform:overshoot,offset:.7},
  {opacity:1,transform:end||'none',offset:1}
],{duration:kind==='sculpture'?920:kind==='copy'?650:780,delay});
```

`distance` = **82 px desktop / 48 px phone**.

**B. `copy`** — straight lift, no rotation:

```js
start    =`translate3d(0,${phone.matches?32:48}px,0) scale(1.035) ${end}`;
overshoot=`translate3d(0,-3px,0) scale(1.006) ${end}`;
```
duration **650 ms** (the fastest archetype — copy must not make the reader wait).
Travel 48 px desktop / 32 px phone. Overshoot −3 px. Scale 1.035 → 1.006 → 1.

**C. `slide`** — alternating left/right, index-driven:

```js
const direction=index%2===0?-1:1;
start    =`translate3d(${direction*distance}px,32px,0) rotate(${direction*1.4}deg) scale(.94) ${end}`;
overshoot=`translate3d(${-direction*4}px,-3px,0) rotate(0deg) scale(1.012) ${end}`;
```
duration **780 ms**. Even indices come from the **left** (−82 px), odd from the
**right** (+82 px). Each carries `±1.4deg` of rotation that unwinds to `0deg`, and the
overshoot kicks **4 px past centre in the opposite direction** — that counter-kick is
what reads as weight. Also lifts 32 px on Y. Scale `.94` → `1.012` → `1`.

**D. `sculpture`** — the heaviest entrance:

```js
start    =`perspective(1100px) translate3d(0,${distance}px,0) rotateX(18deg) rotateY(-13deg) scale(.9) ${end}`;
overshoot=`perspective(1100px) translate3d(0,-9px,0) rotateX(-2deg) rotateY(2deg) scale(1.045) ${end}`;
```
duration **920 ms**. Perspective `1100px`. Two-axis rotation
(`rotateX 18→-2→0`, `rotateY -13→+2→0`), biggest overshoot (`-9px`, `scale 1.045`),
biggest scale-up (`.9` → `1`).

**E. `panel`** (the `else` branch — anything registered as panel):

```js
start    =`perspective(1100px) translate3d(0,${distance}px,0) rotateX(13deg) scale(.91) ${end}`;
overshoot=`perspective(1100px) translate3d(0,-5px,0) rotateX(-1deg) scale(1.025) ${end}`;
```
duration **780 ms**. Single-axis X tilt `13→-1→0`, overshoot `-5px`, scale
`.91 → 1.025 → 1`.

### 1.5 Cheat-sheet table

| archetype | duration | travel (desk/phone) | rotation start → overshoot → end | scale | overshoot offset | per-item stagger |
|---|---|---|---|---|---|---|
| headline (per word) | 780 ms | `.95em` / `.72em` | `rotateX -48° → +4° → 0` | 1.16 → 1.035 → 1 | **.68** | 48 ms, cap 480 ms |
| copy | 650 ms | 48 px / 32 px | none | 1.035 → 1.006 → 1 | .70 | group only |
| slide | 780 ms | ±82 px / ±48 px X + 32 px Y | `rotate ±1.4° → 0°` | .94 → 1.012 → 1 | .70 | group only |
| panel | 780 ms | 82 px / 48 px | `rotateX 13° → −1° → 0` | .91 → 1.025 → 1 | .70 | group only |
| sculpture | 920 ms | 82 px / 48 px | `rotateX 18°→−2°→0`, `rotateY −13°→+2°→0` | .9 → 1.045 → 1 | .70 | group only |

Shared: easing `cubic-bezier(.2,.75,.2,1)`, `fill:'backwards'`, opacity reaches 1 at
the overshoot keyframe, transform + opacity only.

### 1.6 Lifecycle verbs

```js
function finish(record){            // make visible NOW, drop all animation
  record.node.classList.remove('pop-pending','pop-is-running');
  [...record.animations].forEach(a=>a.cancel());
  record.animations.clear();record.seen=true;
}
function play(record,delay=0){
  if(disposed)return;
  if(reducedMotion()||!record.node.animate){finish(record);return;}   // graceful degradation
  [...record.animations].forEach(a=>a.cancel());record.animations.clear();
  record.seen=true;record.node.classList.remove('pop-pending');
  record.node.classList.add('pop-is-running');
  /* ...archetype branch... */
}
function suspend(){suspended=true;records.forEach(finish);}  // before a page transition
function settle(){records.forEach(finish);}                   // on motion pause
function resume(){const root=document.querySelector('[data-page]:not([hidden])');if(root)enterPage(root);}
function replayHeading(node){                                 // for the live-rewritten story title
  if(!node)return;
  if(!records.has(node))register(node,'headline');
  play(records.get(node));
}
```

`replayHeading` is the hook that makes the three-act story title re-pop on every
chapter change — see §2.3.

---

## 2. Scroll choreography

There is **no scroll library and no scroll hijacking**. Three mechanisms only:

1. `position:sticky` inside a tall parent does all pinning, in CSS.
2. **One** rAF-coalesced `scroll` listener reads all geometry in a single batch, then
   writes only `transform` / `opacity`.
3. IntersectionObserver for one-shot entrances (§3).

`DESIGN.md`: *"Native scrolling, visible focus, explicit scene controls, pausing and
reduced-motion preferences remain available."* `experience.css` line 21 comment:
*"A native-scroll, three-act product story. No wheel interception."*

### 2.1 The single scroll loop

```js
function schedule(){if(!disposed&&!scrollFrame&&!document.hidden)scrollFrame=requestAnimationFrame(updateScroll);}
listen(window,'scroll',schedule,{passive:true});
listen(window,'resize',schedule,{passive:true});
listen(document,'visibilitychange',schedule);
const sizeObserver=new ResizeObserver(schedule);sizeObserver.observe(q('#main'));
```

`scrollFrame` acts as the dedupe latch — set in `schedule`, zeroed as the first
statement of `updateScroll`. Events during a pending frame are dropped. Nothing runs
while the tab is hidden.

`updateScroll` is written as **read-all-then-write-all**, with the rule stated in a
comment: *"Read geometry together, then update only transform/opacity in the effect
layers."*

```js
function updateScroll(){
  scrollFrame=0;if(disposed||document.hidden)return;
  const active=router?.current.page||document.body.dataset.route||'home';
  const storyRect     = active==='home'?story.getBoundingClientRect():null;
  const heroRect      = active==='home'?q('.hero').getBoundingClientRect():null;
  const heroSceneRect = active==='home'&&compact.matches?q('#world').getBoundingClientRect():null;
  const stripeRects   = stripes.map(node=>node.closest('[data-page]').hidden?null:node.getBoundingClientRect());
  const chapterRects  = active==='approach'?chapterCards.map(node=>node.getBoundingClientRect()):[];
  const total=Math.max(1,document.documentElement.scrollHeight-innerHeight),
        progress=Math.max(0,Math.min(1,scrollY/total));
  /* writes only below this line */
}
```

### 2.2 Hero — scroll-driven WebGL camera

Geometry (`styles.css` line 6):

```css
.hero{position:relative;min-height:1020px;height:calc(100svh + 240px);max-height:1380px}
.hero-stage{height:calc(100svh - 100px);min-height:750px;max-height:1020px;
            position:sticky;top:0;display:grid;grid-template-columns:48% 52%;
            padding:25px var(--gutter) 75px;isolation:isolate;overflow:hidden}
.world{position:absolute;inset:0 -7% 65px 32%;z-index:1;touch-action:pan-y}
.world canvas{...;touch-action:pan-y}
```

So the hero scrolls for `100svh + 240px` while the stage is pinned — a **240 px scrub
window** on desktop. `touch-action:pan-y` lets the canvas accept horizontal drag-to-orbit
while **never** stealing vertical scroll on touch.

Progress, gated on the hero actually being on screen and motion being on:

```js
if(heroRect&&heroRect.bottom>0&&heroRect.top<innerHeight&&!reduced()){
  const p = compact.matches
    ? Math.max(0,Math.min(1,(innerHeight*.83-heroSceneRect.top)/(heroSceneRect.height+innerHeight*.3)))
    : Math.max(0,Math.min(1,(88-heroRect.top)/Math.max(180,heroRect.height-innerHeight+88)));
  onHeroProgress(p);
}
```

- **Desktop**: `(88 - heroRect.top) / max(180, heroRect.height - innerHeight + 88)`.
  `88` = sticky header height. The `max(…,180)` floor guarantees the denominator never
  collapses on short viewports where `height` is clamped by `max-height:1380px`.
- **Phone**: measured off `#world` (the canvas wrapper), not `.hero` — the scrub starts
  when the canvas top passes **83 % of the viewport** and runs over
  `canvasHeight + 0.3·innerHeight`. Deliberately a longer, later window so the 3D story
  is readable while thumb-scrolling.

`onHeroProgress` (in `app.js`) does three things at once — this is the "scroll drives
the UI, UI drives the scene" link:

```js
function onHeroProgress(progress){
  scene?.setProgress(progress);
  const state=Math.round(progress*2);                 // 0 | 1 | 2
  $$('[data-scene]').forEach(b=>{const active=Number(b.dataset.scene)===state;
    b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));});
  $('#scene-caption').textContent=sceneCaptions[state];
}
const sceneCaptions=['Built around what makes you, you.','Your expertise. A useful product.','A clear path from content to checkout.'];
```

Scroll position therefore keeps the three explicit scene buttons' `aria-pressed` state
in sync, and the caption updates — the scrub is **announced**, not silent.

Inside `scene.js`, scroll progress is never applied directly. It is a *target*:

```js
setProgress(v){targetProgress=clamp(v,0,1);mode=targetProgress*2;schedule();}
```

and the render loop does frame-rate-independent exponential smoothing:

```js
const smoothing=(paused||reduced)?1:1-Math.exp(-dt*7);
yaw+=(targetYaw-yaw)*smoothing;pitch+=(targetPitch-pitch)*smoothing;
modeValue+=(mode-modeValue)*smoothing;progress+=(targetProgress-progress)*smoothing;
```

`1-exp(-dt*7)` ≈ a 143 ms time constant, identical at 60 Hz and 120 Hz.
When motion is paused or reduced, `smoothing` becomes `1` → instant snap, no inertia.
**This is the site's "smooth scroll": the easing lives in the consumer, not in the
scrollbar.** `dt` is clamped: `Math.min((now-last)/1000,.04)`.

Camera derivation:

```js
const mobile=width<650;
const travel=reduced||paused?0:Math.sin(progress*Math.PI);   // 0→1→0 arc over the scrub
const focus=Math.sin(modeValue*Math.PI/2);                   // 0→1 ease-out over modes
const eye=[7.8-focus*2.3-travel*.5, 4.3-focus*1.0, (mobile?14.6:12.3)-focus*2.4-travel*.7];
const view=lookAt(eye,[0,.6,0]);
const projection=perspective(.58,width/height);              // .58 rad ≈ 33° vertical FOV
gl.uniform1f(u.Scroll,tex===feed?progress*.18:0);            // the phone feed texture scrolls too
```

`travel` is a **sine arc**, not linear: the camera pushes in and comes back, so the
start and end of the scrub share a camera position. `focus` pulls the eye 2.3 units
closer on X and 2.4 on Z as the acts advance.

Render loop self-terminates:

```js
const settled=Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch)
             +Math.abs(mode-modeValue)+Math.abs(progress-targetProgress)<.002;
if(!reduced&&!paused||!settled)frame=requestAnimationFrame(render);
```

Plus an IO at `rootMargin:'60px'` that cancels the frame when the canvas leaves the
viewport, and a DPR cap: `Math.min(devicePixelRatio||1, width<650?1.35:1.65)`.

### 2.3 The three-act device sequence (`DESIGN.md`: "a three-act scroll-controlled device sequence")

CSS pin (`experience.css` line 21):

```css
.scroll-story{height:250svh;min-height:1600px;position:relative;background:var(--blue);color:white;margin:40px 0 80px}
.story-stage{position:sticky;top:88px;height:calc(100svh - 88px);min-height:580px;padding:25px var(--gutter);overflow:hidden}
@media(max-width:760px){
  .scroll-story{height:250svh;min-height:1450px}
  .story-stage{position:sticky;top:80px;height:calc(100svh - 80px);min-height:0;padding:16px 22px 10px}
}
```

`250svh` tall container, `calc(100svh - header)` sticky stage → **~150 svh of scrub**.
`svh` (small viewport height) not `vh`, so iOS Safari's collapsing URL bar does not
resize the pin mid-scroll. Phone keeps the full pin — the reference explicitly does
*not* degrade the story on touch (`experience.css` line 30 comment: *"Touch receives
the same entrance choreography and native scroll story."*).

Progress:

```js
if(storyRect&&storyRect.bottom>0&&storyRect.top<innerHeight){
  const p = reduced()
    ? manualStory
    : Math.max(0,Math.min(1,((compact.matches?80:88)-storyRect.top)
                            /Math.max(1,storyRect.height-(innerHeight-(compact.matches?80:88)))));
  drawStory(p);
}
```

Denominator = `containerHeight - (viewportHeight - stickyTop)` = exactly the distance
the container travels while the stage is stuck. Under reduced motion the formula is
bypassed entirely and `manualStory` (set by the three buttons) drives it.

Act mapping (`experience-data.js`):

```js
export function storyState(progress) {
  const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0));
  return {progress:p,
          chapter:p<.34?0:p<.72?1:2,
          product:Math.max(0,Math.min(1,(p-.2)/.19)),
          launch :Math.max(0,Math.min(1,(p-.66)/.19))};
}
```

| track | range | note |
|---|---|---|
| `chapter` | 0 for p<.34, 1 for p<.72, 2 above | discrete; drives copy + counter + `aria-pressed` |
| `product` | ramps 0→1 over **p .20 → .39** | the product card rising inside the device |
| `launch`  | ramps 0→1 over **p .66 → .85** | the launch screen |

The ramps (0.19 wide) **lead** the discrete chapter flips (.34 / .72) — the visual
hand-off starts before the text changes, which is what makes it read as one continuous
motion rather than three slides.

`drawStory` — chapter change branch (text swap + headline replay + control sync):

```js
const state=storyState(progress),n=state.chapter;
if(n!==chapter){
  chapter=n;const heading=q('#story-title');
  heading.replaceChildren(document.createTextNode(storyCopy[n][0]),document.createElement('br'));
  const accent=document.createElement('span');accent.textContent=storyCopy[n][1];heading.append(accent);
  q('#story-copy').textContent=storyCopy[n][2];
  popReveals.replayHeading(heading);                       // ← full word-pop on every act change
  q('.story-count').textContent=`0${n+1} / 03`;
  qa('[data-story]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.story)===n)));
}
q('.story-track>span').style.transform=`scaleX(${state.progress})`;
```

`#story-title` is the one `h2` excluded from pop-reveal auto-registration precisely
because it is rewritten and replayed by hand.

Continuous branch — **all six transforms, verbatim**:

```js
const p=state.progress;
device.style.transform=`translateY(${Math.sin(p*Math.PI)*-18}px) rotateY(${-14+p*23}deg) rotateX(${7-p*11}deg) rotate(${-4+p*7}deg) scale(${1+Math.sin(p*Math.PI)*.08})`;
feed.style.transform=`translateY(${-Math.min(p/.35,1)*150}px)`;
feed.style.opacity=String(1-state.product);
product.style.opacity=String(state.product*(1-state.launch));
product.style.transform=`translateY(${(1-state.product)*90-state.launch*35}px) scale(${.92+state.product*.08})`;
launch.style.opacity=String(state.launch);
launch.style.transform=`translateY(${(1-state.launch)*75}px)`;
halo.style.transform=`translate(-50%,-50%) rotateY(${55-p*105}deg) rotateZ(${p*80}deg)`;
chipA.style.transform=`translate(${-p*20}px,${Math.sin(p*Math.PI)*-22}px) rotate(${6-p*12}deg)`;
chipB.style.transform=`translate(${p*18}px,${Math.sin(p*Math.PI)*18}px) rotate(${-5+p*9}deg)`;
```

| layer | driver | range |
|---|---|---|
| `.story-device` | `p` | `translateY 0→−18→0` (sine arc), `rotateY −14°→+9°`, `rotateX 7°→−4°`, `rotate −4°→+3°`, `scale 1→1.08→1` (sine) |
| `.device-feed` | `min(p/.35,1)` | scrolls up **150 px**, fully consumed by p = .35; fades by `1 − product` |
| `.device-product` | `product`, `launch` | `translateY 90px→0`, then pushed a further `−35px` by `launch`; `scale .92→1`; opacity `product*(1-launch)` — a **cross-fade, not a stack** |
| `.device-launch` | `launch` | `translateY 75px→0`, opacity `0→1` |
| `.story-halo` | `p` | `rotateY 55°→−50°` (105° sweep), `rotateZ 0→80°` |
| `.chip-a` | `p` | `translate(0→−20px, 0→−22→0px)`, `rotate 6°→−6°` |
| `.chip-b` | `p` | `translate(0→+18px, 0→+18→0px)`, `rotate −5°→+4°` |

Chips move in **opposite** directions on both axes — the parallax split that sells the
device as a real object in space. Note `.device-feed{will-change:transform}` is the one
*static* `will-change` in the codebase, justified because it transforms on every frame
of the whole pin.

Required 3D context: `.story-world{perspective:1300px}`,
`.story-device{transform-style:preserve-3d}`, `.studio-sculpture{perspective:900px}`.

Reduced-motion branch — no interpolation at all, just discrete visibility plus the
authored resting transforms:

```js
if(reduced()){
  feed.style.transform='none';feed.style.opacity=n===0?'1':'0';
  product.style.opacity=n===1?'1':'0';launch.style.opacity=n===2?'1':'0';
  product.style.transform=launch.style.transform='none';
  device.style.transform='rotateY(-10deg)';
  halo.style.transform='translate(-50%,-50%) rotateY(55deg)';
  chipA.style.transform='rotate(6deg)';chipB.style.transform='rotate(-5deg)';return;
}
```

Manual act jump — scrolls the page rather than faking the state, so scroll and visual
never disagree:

```js
qa('[data-story]').forEach(button=>listen(button,'click',()=>{
  const p=[0,.53,1][Number(button.dataset.story)];manualStory=p;
  if(reduced()){drawStory(p);return;}
  const rect=story.getBoundingClientRect(),offset=compact.matches?80:88;
  window.scrollTo({top:scrollY+rect.top-offset+p*(rect.height-innerHeight+offset),behavior:'smooth'});
}));
```

Act targets are `[0, .53, 1]` — mid-act centres, not the `.34`/`.72` boundaries.

### 2.4 Other scroll-driven layers

**Reading progress** (document-level):

```js
const total=Math.max(1,document.documentElement.scrollHeight-innerHeight),
      progress=Math.max(0,Math.min(1,scrollY/total));
q('.reading-progress>span').style.transform=`scaleX(${progress})`;
```
```css
.reading-progress{position:fixed;inset:0 0 auto;height:3px;z-index:80;pointer-events:none}
.reading-progress>span{display:block;height:100%;background:var(--blue);transform:scaleX(0);transform-origin:left}
```

**Marquee parallax** — the only true parallax on the site, 7 % of travel:

```js
stripes.forEach((stripe,i)=>{const rect=stripeRects[i];
  if(!rect||rect.bottom<0||rect.top>innerHeight)return;
  stripe.firstElementChild.style.transform=reduced()?'translateX(-3%)':`translateX(${-3-(1-rect.top/innerHeight)*7}%)`;});
```
Resting state `-3%`, drifts to `-10%` as the strip crosses the viewport.
Rest value is authored in CSS too (`.kinetic-strip>div{transform:translateX(-3%)}`)
so it is correct before JS runs.

**Sticky chapter index** (scrollspy, last-match-wins):

```js
if(chapterRects.length){let selected=0;
  chapterRects.forEach((rect,i)=>{if(rect.top<innerHeight*.55)selected=i;});
  qa('.chapter-index nav a').forEach((a,i)=>{a.classList.toggle('is-active',i===selected);
    if(i===selected)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});}
```
Threshold **55 % of viewport**; `aria-current="step"` (not `"true"`) because it is an
ordered process. CSS: `.chapter-index{position:sticky;top:125px}`,
`.chapter-card{scroll-margin-top:120px}`, transition `color/border-color 180ms var(--ease)`.

**Stacked sticky cards** — zero JS, pure CSS offset ladder:

```css
.principle-card{position:sticky;top:112px;min-height:370px}
.principle-card:nth-child(2){top:135px}
.principle-card:nth-child(3){top:158px}
@media(max-width:760px){
  .principle-card{position:sticky;top:96px!important}
  .principle-card:nth-child(2){top:108px!important}
  .principle-card:nth-child(3){top:120px!important}
}
```
23 px desktop / 12 px phone ladder. Each card stops slightly lower, so the stack
fans. **This is how to do card-stacking — never ScrollTrigger pinning.**

**Scroll-driven CSS animations**, feature-detected, for two decorative items only
(`styles.css` line 13):

```css
@supports(animation-timeline:view()){
  .cover-art{animation:cover-shift linear both;animation-timeline:view();animation-range:entry 0% exit 100%}
  .arrow-sculpture>span:first-child{animation:arrow-lift linear both;animation-timeline:view();animation-range:entry 0% cover 55%}
  @keyframes cover-shift{from{transform:translateY(20px) rotate(-14deg)}to{transform:translateY(-20px) rotate(-4deg)}}
  @keyframes arrow-lift{from{transform:translateY(70px) rotateY(-25deg) rotate(-15deg)}to{transform:translateY(0) rotateY(-25deg) rotate(-5deg)}}
}
```

Off the main thread, zero JS cost, and the `@supports` gate plus
`@media(prefers-reduced-motion:reduce){.cover-art{animation:none}}` makes it free to ship.

### 2.5 Page-transition choreography (`router.js`)

Three tiers, feature-detected:

```js
if(reducedMotion()||document.hidden){update();}
else if(typeof document.startViewTransition==='function'){
  transition=document.startViewTransition(update);
  await transition.finished.catch(()=>{});      // update still runs if the snapshot is skipped
}else if(curtain.animate){
  curtain.hidden=false;
  await curtain.animate([{transform:'translateY(101%)'},{transform:'translateY(0)'}],
    {duration:260,easing:'cubic-bezier(.77,0,.175,1)',fill:'forwards'}).finished;
  update();
  await curtain.animate([{transform:'translateY(0)'},{transform:'translateY(-101%)'}],
    {duration:280,easing:'cubic-bezier(.2,.75,.2,1)',fill:'forwards'}).finished;
  curtain.getAnimations().forEach(a=>a.cancel());
}else update();
```

`101%` not `100%` — kills sub-pixel seams. Curtain in uses the *in-out* ease
(`.77,0,.175,1`), curtain out uses the signature ease.

View-transition CSS:

```css
#main{view-transition-name:page}
.header{view-transition-name:header}
::view-transition-group(header){z-index:5}
::view-transition-old(root),::view-transition-new(root){animation:none}
::view-transition-old(page){animation:page-away 380ms var(--ease-out) both}
::view-transition-new(page){animation:page-arrive 580ms var(--ease-in-out) both}
::view-transition-group(page){animation-duration:580ms}
@keyframes page-away{to{opacity:.25;transform:translateY(-35px) scale(.985)}}
@keyframes page-arrive{from{clip-path:inset(100% 0 0);transform:translateY(35px)}to{clip-path:inset(0);transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){::view-transition-old(page),::view-transition-new(page){animation:none!important}}
```

Out 380 ms / in 580 ms, overlapping. The arriving page is **clip-revealed from the
bottom** (`inset(100% 0 0)` → `inset(0)`) while translating 35 px up — the same
pop-forward language as the headlines.

Interruption is handled, not ignored: `if(busy){pending={target,options};transition?.skipTransition();return;}`
and `finally{busy=false;…;if(pending){…navigate(next…)}else onAfter(target,false);}`.

### 2.6 Micro-interaction timings (full inventory)

| interaction | spec |
|---|---|
| `.button` hover | `transition:transform 180ms var(--ease),background-color 180ms var(--ease)`; `>span{transform:translate(3px,-3px)}` 180 ms; `:active{transform:scale(.98)}` |
| `.desktop-nav a:after` | `height:2px;transform:scaleX(0);transform-origin:left;transition:transform 180ms var(--ease)` → `scaleX(1)` on hover / `[aria-current="page"]` |
| `[data-tilt]` | CSS `transition:transform 260ms var(--ease-out)`; JS writes `perspective(1200px) rotateX(${-y*8}deg) rotateY(${x*10}deg)` |
| `.mini-product` | `transition:transform 350ms var(--ease)`; `.lab-card:hover .mini-product{transform:rotate(0) rotateY(0) translateY(-8px)}` |
| `.lab-card:hover` | `box-shadow 220ms var(--ease)` → `0 16px 35px #17274612` |
| `.page-link-card>span:last-child` | `transform 180ms var(--ease)` → `translate(4px,-4px)`; phone `:active{transform:scale(.98)}` |
| `.prompt-spark` | `transform 250ms var(--ease)` → `rotate(60deg)` on hover |
| `<details>` accordion | measured height tween, **220 ms**, see below |
| dialog open | CSS `@keyframes dialog-in{from{opacity:0;transform:translateY(12px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}` |
| dialog close | WAAPI 200 ms `opacity 1→0`, `translateY(0→12px) scale(1→.98)`, then `.close()` |
| generic `animate()` default | 300 ms |
| `enter()` helper | 550 ms, `opacity 0→1`, `translateY(24px→0)`, `fill:'backwards'`, `delay` param |
| `reveal()` helper | 260 ms default, `opacity .2→1`, `translateY(12px→0)` — starts at .2 not 0, so re-renders never flash blank |
| sample page flip | 220 ms, `opacity .3→1`, `translateX(direction*12px→0)` — direction-aware |
| quiz progress bar | `transform 250ms var(--ease-out)`, `scaleX((quizStep+1)/3)` |
| `.word-dim` | `opacity 200ms linear`, resting `.22` |

Accordion (measured, reversible from mid-flight):

```js
e.preventDefault();const start=details.getBoundingClientRect().height;targetOpen=!targetOpen;
animation?.cancel();details.style.height='';details.open=true;
const end=targetOpen?details.getBoundingClientRect().height:summary.getBoundingClientRect().height+1;
details.style.overflow='hidden';
const next=details.animate([{height:`${start}px`},{height:`${end}px`}],{duration:220,easing});
next.finished.then(()=>{if(animation===next){details.open=targetOpen;details.style.overflow='';animation=null;}}).catch(()=>{});
```

Note: `targetOpen` is tracked separately from `details.open`, so a click mid-animation
reverses from the **current measured height**, not from a restart. `+1` on the closed
height avoids a 1 px clip of the summary's border.

Pointer tilt — three guards before it does anything:

```js
listen(node,'pointermove',e=>{
  if(reduced()||node.classList.contains('pop-is-running')||!finePointer.matches||e.pointerType!=='mouse')return;
  pointer={x:e.clientX,y:e.clientY};if(!rect)rect=node.getBoundingClientRect();
  if(raf)return;                                      // one write per frame
  raf=requestAnimationFrame(()=>{raf=0;if(reduced()||!pointer||!rect)return;
    const x=Math.max(-.5,Math.min(.5,(pointer.x-rect.left)/rect.width-.5)),
          y=Math.max(-.5,Math.min(.5,(pointer.y-rect.top)/rect.height-.5));
    node.style.transform=`perspective(1200px) rotateX(${-y*8}deg) rotateY(${x*10}deg)`;});
});
```

Rect is cached on `pointerenter` (no layout read per move). `rotateX` is **negated** so
the surface tips toward the cursor. `pop-is-running` guard enforces the house rule:
*"Avoid applying competing transforms to the same element"* (`LOVABLE-HANDOFF.md`).

---

## 3. IntersectionObserver strategy

```js
function connectObserver(){
  observer?.disconnect();
  observer=new IntersectionObserver(entries=>{
    if(suspended)return;
    // Capture stable geometry first; movement never alters document flow.
    const entering=entries.filter(e=>e.isIntersecting&&records.has(e.target)
      &&!records.get(e.target).seen&& !e.target.closest('[data-page]')?.hidden);
    entering.sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
    entering.forEach((entry,i)=>{const record=records.get(entry.target);
      play(record,Math.min(i*55,220));observer.unobserve(entry.target);});
  },{threshold:.08,rootMargin:`0px 0px -${Math.min(120,Math.round(innerHeight*.13))}px 0px`});
  records.forEach(record=>{if(!record.seen)observer.observe(record.node);});
}
window.addEventListener('resize',resize,{passive:true});   // resize(){connectObserver();}
```

| knob | value | why |
|---|---|---|
| `threshold` | **.08** | 8 % of the element visible. Low enough that tall panels fire on their top edge, high enough that a 1 px sliver does not. |
| `rootMargin` bottom | **`-min(120, round(innerHeight*0.13))px`** | 13 % of viewport height, **capped at 120 px**. Shrinks the trigger line up from the fold so the element is meaningfully on screen before it animates. On a 900 px viewport → −117 px; on a 1400 px viewport → −120 px (the cap bites). Top/left/right are `0px`. |
| sort | `a.boundingClientRect.top - b.boundingClientRect.top` | Entries arrive in **DOM order, not visual order**. Sorting by `boundingClientRect.top` — using the rect the *observer already captured*, so no extra layout read — guarantees the stagger always runs top-to-bottom even in reversed flex/grid layouts or on upward scroll. |
| group stagger | `Math.min(i*55, 220)` | **55 ms** apart, capped at **220 ms**. So only the first 5 elements of a batch get distinct delays; a 12-card grid never has a 660 ms tail. |
| one-shot | `observer.unobserve(entry.target)` immediately after `play` | Fires once, ever. Plus `record.seen=true`. No replay on scroll-back — `DESIGN.md`: *"These are one-shot viewport entrances on both desktop and phones."* |
| suspended | `if(suspended)return;` | Hard gate during page transitions. |
| re-arm on resize | `connectObserver()` | Recomputes `rootMargin` from the new `innerHeight` and re-observes every unseen record. Already-seen records are not re-armed. |

### 3.1 Above-the-fold is handled completely differently

`enterPage(root)` runs on initial load and after every route change. Elements already
in view **never touch the observer** — they play immediately from a measured rect:

```js
function enterPage(root){
  suspended=false;
  const selected=[...records.values()].filter(record=>root.contains(record.node));
  // Arm only elements below the fold. Above-the-fold content never waits on an observer.
  const measured=selected.map(record=>({record,rect:record.node.getBoundingClientRect()}));
  measured.forEach(({record,rect})=>{
    finish(record);record.seen=false;
    const visible=rect.bottom>88&&rect.top<innerHeight*.84;
    if(reducedMotion()){finish(record);return;}
    if(visible)play(record,record.kind==='headline'?20:110);
    else{record.node.classList.toggle('pop-pending',rect.top>=innerHeight*.84);observer.observe(record.node);}
  });
}
```

Three distinct states, decided by one measurement pass:

1. **Visible now** — `rect.bottom > 88 && rect.top < innerHeight*0.84`
   (88 = header height; 84 % of viewport is the "in view" line).
   → `play()` immediately. Delay **20 ms for headlines, 110 ms for everything else**,
   so the h1 leads the hero by ~90 ms. No `pop-pending`, no observer, no flash.
2. **Below the fold** — `rect.top >= innerHeight*0.84` → gets `.pop-pending`
   (`opacity:0`) **and** observed.
3. **Above the viewport** (scrolled past, e.g. restored scroll position) —
   `rect.bottom <= 88` → observed but **not** given `.pop-pending`, so it is visible
   immediately and will still pop if scrolled back up to.

The ordering `measured` → then write is deliberate: all `getBoundingClientRect()` reads
happen in one pass *before* any class or animation write, so there is no forced
reflow per element.

**`.pop-pending{opacity:0}` is only ever added by JS.** It is never in the initial
markup. If JS fails, 404s, or is blocked, the page renders fully visible. This is the
single most important robustness property of the whole system, and it is the property a
library-based rewrite most easily destroys.

---

## 4. Accessibility & performance rules the reference enforces

### 4.1 Reduced motion — three independent layers

**Layer 1 — the JS predicate.** One function, consulted before every animation:

```js
const preference=matchMedia('(prefers-reduced-motion: reduce)');
let paused=false;
const reduced=()=>preference.matches||paused;
```
Passed into `createPopReveals({reducedMotion:reduced})` as a *callback*, never a
snapshot value — so a mid-session OS change or pause click takes effect instantly.
`listen(preference,'change',syncMotion);`

In `play()`: `if(reducedMotion()||!record.node.animate){finish(record);return;}`
— reduced motion and *missing WAAPI* take the same branch: content becomes visible,
no animation.

**Layer 2 — CSS blanket**, `styles.css` line 19:

```css
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*:before,*:after{animation:none!important;transition:none!important}
  .hero{height:auto;min-height:0}
  .hero-stage{position:relative}
  .arrow-sculpture>span:first-child{animation:none}
  .cover-art{animation:none}
}
```

**Layer 3 — CSS structural de-pinning**, `experience.css` lines 29/69:

```css
@media(prefers-reduced-motion:reduce){
  .pop-pending,.pop-word{opacity:1!important;transform:none!important}
  .pop-is-running,.pop-is-running .pop-word{will-change:auto!important}
  .scroll-story{height:auto;min-height:0}
  .story-stage{position:relative;top:auto;height:auto;min-height:0}
  .story-layout{height:auto;min-height:0}
  .story-world{flex:none;height:335px}
  .principle-card{position:relative;top:auto!important}
  .line-mask{overflow:visible}
  .word-dim{opacity:1!important}
  .quick-fit-prompt{animation:none}
  .lab-card .mini-product{transform:rotateY(-10deg)}
  [data-tilt]{transform:none!important}
  .route-curtain{display:none}
  ::view-transition-old(page),::view-transition-new(page){animation:none!important}
}
```

The key move: **the 250 svh scroll-story collapses to `height:auto` and the sticky
stage becomes `position:relative`**. Under reduced motion the three acts are not a
scrub at all — they become a normal-height block driven by the three buttons via
`manualStory`. And `.line-mask{overflow:visible}` undoes the clipping mask so no text
can be cut off.

### 4.2 The global pause control

```js
function syncMotion(resumeEntrances=true){
  const isReduced=reduced();
  document.body.classList.toggle('motion-paused',isReduced);
  scene?.setPaused(isReduced);                       // ← WebGL too
  const control=q('#global-motion');
  control.disabled=preference.matches;               // OS preference wins; button is inert
  control.setAttribute('aria-pressed',String(isReduced));
  control.setAttribute('aria-label',preference.matches?'Reduced motion follows your device settings'
                                   :isReduced?'Resume decorative motion':'Pause decorative motion');
  control.firstChild.textContent=isReduced?'▷ ':'Ⅱ ';
  control.querySelector('span').textContent=preference.matches?'Reduced motion':isReduced?'Motion paused':'Motion on';
  /* …same sync for the in-hero #motion-toggle… */
  if(isReduced){
    popReveals.settle();
    qa('[data-tilt]').forEach(n=>n.style.transform='');
    qa('.line-mask>span,[data-reveal],.lab-card,.page-link-card').forEach(n=>n.getAnimations().forEach(a=>a.cancel()));
  }
  if(!isReduced&&resumeEntrances)popReveals.resume();
  schedule();
}
```

Rules this encodes:
- The pause button is **disabled** when the OS preference is set — the user is told why
  via `aria-label`, instead of being given a control that cannot change anything.
- Pausing runs `popReveals.settle()` → every pending entrance becomes visible. Pausing
  can never hide content.
- Pausing propagates into WebGL (`scene.setPaused`), which sets `smoothing=1`,
  zeroes `travel`, and stops advancing `t`.
- `getAnimations().forEach(a=>a.cancel())` sweeps any stray WAAPI animation.
- Unpausing calls `popReveals.resume()` → re-runs `enterPage` on the visible page.
- Initial call is `syncMotion(false)` — do **not** replay entrances on first paint.

CSS side (`experience.css` lines 28/68):

```css
.motion-paused *,.motion-paused *:before,.motion-paused *:after{animation-play-state:paused!important}
.motion-paused .pop-pending{opacity:1!important}
.motion-paused .pop-word{transform:none!important;opacity:1!important}
.motion-paused .scroll-story{height:auto;min-height:0}
.motion-paused .story-stage{position:relative;top:auto;height:auto}
.motion-paused .story-layout{height:auto;min-height:0;padding-block:40px}
.motion-paused .story-world{flex:none;height:335px}
.motion-paused .principle-card{position:relative;top:auto!important}
.motion-paused .word-dim{opacity:1}
```

`animation-play-state:paused` (not `animation:none`) — CSS animations freeze in place
and genuinely resume, rather than snapping.

### 4.3 The `focusin` short-circuit

```js
function focus(e){
  // Keyboard users can always reach controls before an entrance has completed.
  let target=e.target;
  while(target&&target!==document.body){
    if(records.has(target))finish(records.get(target));
    target=target.parentElement;
  }
}
document.addEventListener('focusin',focus);
```

`focusin` (bubbling), on `document`, walking **the whole ancestor chain** — because the
focused control is usually a descendant of the registered record (a `.button` inside
`.route-end`, a `summary` inside a `details` registered as `slide`). Every matching
ancestor is finished instantly. Belt-and-braces CSS backup:
`.pop-pending:focus-within{opacity:1!important}`.
So tabbing ahead of the scroll can never land focus on an `opacity:0` element.

### 4.4 Split-text accessibility contract

```js
node.setAttribute('aria-label', text);              // on the h1/h2
span.setAttribute('aria-hidden','true');            // on EVERY .pop-word
```

The heading exposes one clean accessible name; the ~8–20 word spans are hidden from
AT entirely. Whitespace is preserved as real text nodes between spans
(`textNode.textContent.split(/(\s+)/)`, whitespace chunks appended as
`document.createTextNode(chunk)`), so native selection, copy-paste and find-in-page
still produce correct text. `<br>` is mapped to a space in `readableText` so the label
is not run together.

`splitHeading` is **idempotent** — `if(node.querySelector('.pop-word'))return [...node.querySelectorAll('.pop-word')];`
— so `replayHeading` and repeated `enterPage` calls never double-split.

### 4.5 "Transform and opacity only, never alter document flow"

Stated in `DESIGN.md`: *"Transform and opacity animation avoids moving the document
flow"*, and in the IO callback comment: *"movement never alters document flow."*

Audit of every property animated by the reveal system: **`transform` and `opacity`.
Nothing else.** No `height`, `top`, `margin`, `width`, `filter`, `box-shadow`.
Consequences the reference depends on:

- Zero CLS from entrances. Elements occupy final layout space from first paint.
- Compositor-only work → no main-thread layout/paint per frame.
- `position:sticky` still works on animating ancestors.
- IntersectionObserver rects stay stable, so the sort order is trustworthy.

The one measured exception is the `<details>` accordion (animates `height`), which is a
deliberate, user-initiated, 220 ms, single-element case — and it sets
`overflow:hidden` for the duration and clears it after.

### 4.6 Performance rules

| rule | implementation |
|---|---|
| one rAF per frame, globally | `scrollFrame` latch in `schedule()`; separate per-node `raf` latch in the tilt handler |
| never run while hidden | `if(disposed\|\|document.hidden)return;` in `updateScroll`; `visibilitychange` → `schedule()`; scene render returns early on `document.hidden` |
| read-then-write | all `getBoundingClientRect()` calls batched at the top of `updateScroll` and at the top of `enterPage` |
| skip off-screen work | `if(!rect\|\|rect.bottom<0\|\|rect.top>innerHeight)return;` per stripe; `heroRect.bottom>0&&heroRect.top<innerHeight`; `storyRect.bottom>0&&storyRect.top<innerHeight`; chapter rects only computed on the `approach` route |
| `will-change` only while running | `.pop-is-running{will-change:transform,opacity}` — added on play, removed when the last animation of the record settles. Only static exception: `.device-feed` |
| cap animation counts | word stagger cap 480 ms, group stagger cap 220 ms |
| self-terminating render loop | scene stops rAF when `settled < .002`, plus an IO at `rootMargin:'60px'` on the canvas |
| DPR cap | `Math.min(devicePixelRatio\|\|1, width<650?1.35:1.65)` |
| passive listeners | `{passive:true}` on every `scroll` and `resize` |
| full teardown | `dispose()` cancels `liveAnimations`, disconnects observers, removes every listener; `window.addEventListener('pagehide',e=>{if(!e.persisted){experience.dispose();scene?.dispose();}})` |
| `overflow-x:clip` not `hidden` | `body{overflow-x:clip}` — keeps `position:sticky` working (`overflow:hidden` on an ancestor silently breaks sticky) |
| `svh` not `vh` | every pin height uses `svh` so the iOS URL bar does not resize the pin mid-scroll |

Also, entrances are **settled before a page transition snapshot** —
`onBefore:(_target,changingPage)=>{if(changingPage)popReveals.suspend();…}` with the
comment *"Navigation snapshots capture complete content, never half-hidden text."*
Without this, `startViewTransition` would photograph `opacity:0` headlines.

---

## 5. Recommendation

### 5.0 Re-run against the "motion everywhere" brief

The client brief is heavier than the reference: section-to-section transitions, scrubbed
text, image/card reveals, 3D-on-scroll, scroll-linked effects throughout. GSAP is now
free including every plugin (SplitText, ScrollSmoother, MorphSVG), which removes the old
licence argument. So the call deserves re-running, not inheriting.

**It still comes out dependency-free, and the motion-heavy brief makes the case
stronger, not weaker.** The reason is the scrub engine.

ScrollTrigger `scrub` works by listening to scroll, computing a progress value on the
**main thread**, and writing inline styles every frame. With one or two scrubs that is
invisible. This brief has, per viewport, potentially: a band wipe, a sticky stack recede,
two marquee scrubs, two frame parallaxes, a word-fill paragraph, and the three-act device
story. Eight concurrent main-thread scrubs on a mid-range Android, during momentum
scrolling, is exactly how a site gets the janky-scroll reputation — and `scrub: 1`
smoothing does not fix it, it adds an extra lerp per frame per trigger.

`animation-timeline: view()` / `scroll()` runs the same scrub on the **compositor
thread**. It costs nothing on the main thread, survives long main-thread tasks (form
validation, WebGL shader compile, font swap) that would visibly stall a ScrollTrigger
scrub, and it keeps working while JS is busy. For a page whose entire proposition is
"scroll feels expensive", that is the decisive property.

Support and fallback: CSS scroll-driven animations ship in Chromium (115+), Safari 26+
and Firefox 144+. Everything is wrapped in `@supports(animation-timeline:view())` — the
reference already does this for `.cover-art` and `.arrow-sculpture`. The fallback is the
element's **resting CSS state**, i.e. fully visible, correctly laid out, just static.
That is an acceptable, content-complete degradation. A missing GSAP CDN is not.

The three effects that genuinely need JS maths — the three-act device story (eleven
coupled transforms off one progress value), the WebGL camera, and the manifesto word-fill
— are already served by the one rAF read-then-write loop in §2.1 at a cost of a few
hundred bytes. Nothing in the brief requires a timeline engine.

One more practical point for a single-file build: GSAP+ScrollTrigger+SplitText is three
separate third-party fetches that must all land before any motion exists. On a cold 4G
connection that is a visible dead window during which either nothing animates (if you
hide via JS) or the page is blank (if you hide via CSS). Inline CSS + WAAPI is live at
first paint.

### Ship the dependency-free WAAPI + CSS-sticky approach. Do not add GSAP, ScrollTrigger or Lenis.

This is not a close call for this specific build. Six reasons, in order of weight:

**1. The library would solve a problem we do not have.** GSAP's value is authoring
leverage for timelines you have not designed yet. We have the finished design, and we
have every number: five archetypes, five durations (650/780/780/920/780 ms), one
easing, two stagger caps, and an eleven-line transform table for the story. Importing
120 KB of animation engine to replay numbers we already hold is pure cost.

**2. The CDN is a single point of total failure, and the failure mode is a blank page.**
A library build inevitably moves the hiding to CSS (`.reveal{opacity:0}`) because
ScrollTrigger needs the element pre-hidden. If `cdnjs.cloudflare.com` is blocked — ad
blockers with aggressive filter lists, corporate proxies, Iran/China/Russia network
conditions (directly relevant: the sibling reference repo is
`security-cams-iran-site-2`) — then `gsap` is `undefined`, no reveal ever fires, and
the user sees an empty white page with a header. The reference cannot fail that way:
`.pop-pending{opacity:0}` is **applied by JS**, so no-JS and failed-JS both render the
complete page. For a single static marketing page whose job is to be readable, this
asymmetry decides the question on its own.

**3. ScrollTrigger pinning is strictly worse than `position:sticky` here.**
ScrollTrigger's `pin` injects a `pin-spacer` wrapper into the DOM, which conflicts with
a `position:sticky` header, needs `pinType` tuning, and is a well-known source of jump
and mis-measure bugs with `svh`/`dvh` units and iOS URL-bar resize. The reference gets
the same result with eight lines of CSS (`.scroll-story{height:250svh}` +
`.story-stage{position:sticky;top:88px;height:calc(100svh - 88px)}`), no DOM mutation,
and it is the mechanism `prefers-reduced-motion` can trivially switch off
(`height:auto;position:relative`). The stacked `.principle-card` ladder is the same
story: three `top` values beat a pinned timeline.

**4. Lenis is actively harmful to this design.** This page depends on native scroll:
`touch-action:pan-y` on the WebGL canvas (drag to orbit horizontally, scroll vertically
— Lenis's wheel/touch interception breaks exactly this), `html{scroll-behavior:smooth}`
+ `scroll-padding-top:100px` for anchor nav, `scroll-margin-top:120px` on chapter
cards, `history.scrollRestoration='manual'` with a per-route position map, and
`window.scrollTo({behavior:'smooth'})` for manual act jumps. Lenis also runs a
permanent rAF loop; the reference's loops all self-terminate. And the "smooth" quality
people attribute to Lenis is already present here, applied in the right place: the
exponential smoother `1-Math.exp(-dt*7)` inside the scene consumer, which smooths the
*camera*, not the *document*. That is the correct architecture — smooth the expensive
continuous thing, leave the scrollbar alone.

**5. WAAPI's object model is what this system's lifecycle actually needs.**
`element.animate()` returns an `Animation` with `.finished` (a promise),
`.cancel()`, and `element.getAnimations()` for discovery. The reference leans on all
three: `animation.finished.then(release,release)` to drop `will-change`,
`[...record.animations].forEach(a=>a.cancel())` for the `focusin` short-circuit, and
`qa('…').forEach(n=>n.getAnimations().forEach(a=>a.cancel()))` in `syncMotion`.
With GSAP you must keep your own tween registry to do any of this. WAAPI also
composites off the main thread for transform/opacity, same as GSAP, and
`fill:'backwards'` gives us the "hold the start frame during the delay, then release to
natural CSS" behaviour that lets entrances compose with hover transforms and
`animation-timeline:view()` — a GSAP `from()` tween leaves inline styles behind unless
you add `clearProps:'all'`.

**6. Single-file budget.** The whole reference motion layer is ~8.3 KB unminified
(`pop-reveals.js`) plus ~4 KB of scroll driver. GSAP core (~71 KB min, ~28 KB gz) +
ScrollTrigger (~44 KB min, ~16 KB gz) + Lenis (~12 KB min, ~4 KB gz) is ~48 KB gzipped
of *third-party, separately-fetched, render-blocking-for-motion* payload against
~3 KB gzipped inline. On a single-file build the inline version is also **zero extra
round trips** — motion is live at parse time, not after three DNS+TLS+fetch cycles.

**What would change this verdict (and only this):** a requirement for text effects that
need per-character layout measurement with proper line-aware masking across responsive
reflow (`SplitText` with `linesClass` + `ScrollTrigger.refresh` on resize), or a
morph/draw-SVG requirement. Word-level splitting — which is all this design uses — is
20 lines of `TreeWalker`, already written, already quoted in §1.3.

### If you are overruled: the exact pins

Pin exact versions, never a floating range, and never `@3` — a silent minor bump into a
single-file page you cannot rebuild is an unacceptable risk. SRI is mandatory because
this is a third-party origin on a page with a form.

```html
<!-- GSAP core + ScrollTrigger. 3.15.0 is the newest version I could confirm published
     (indexed at cdn.jsdelivr.net/npm/gsap@3.15.0/README.md). Network egress is blocked
     in this environment, so VERIFY the version and generate real SRI hashes before use:
       curl -s https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js | openssl dgst -sha384 -binary | openssl base64 -A -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js" integrity="sha384-REPLACE" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js" integrity="sha384-REPLACE" crossorigin="anonymous"></script>
<!-- SplitText is free as of the Webflow acquisition (all bonus plugins, commercial use included) -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js" integrity="sha384-REPLACE" crossorigin="anonymous"></script>

<!-- cdnjs alternative (preferred CDN order: cdnjs → jsdelivr → unpkg) -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/ScrollTrigger.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<!-- Lenis. NOTE the package rename: @studio-freight/lenis is DEPRECATED (last 1.0.42);
     current package is plain `lenis`. Only add this if you accept §5 point 4. -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js" integrity="sha384-REPLACE" crossorigin="anonymous"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.css">
```

Non-negotiable guards if libraries ship:

```html
<!-- preconnect so the motion layer is not three round trips late -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
```
```js
// hard fallback: if the CDN is blocked, make everything visible rather than blank
if(typeof gsap==='undefined'){
  document.documentElement.classList.add('no-gsap');   // CSS: .no-gsap .reveal{opacity:1;transform:none}
}else{
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ignoreMobileResize:true});     // stop iOS URL-bar resize refreshes
  gsap.ticker.lagSmoothing(500,33);
}
```
And still write the `.reveal{opacity:0}` rule **from JS**, not CSS.

---

## 6. Copy-paste JS for the single-file build

Drop this in one `<script>` before `</body>`. No modules, no imports, no CDN. It
implements §1 (five archetypes, exact numbers), §3 (IO strategy), §2.3 (sticky three-act
driver), §2.2 (hero scrub hook), §2.4 (reading progress, marquee parallax, scrollspy),
and §4 (reduced motion, pause, focusin, teardown).

### 6.1 The CSS it requires

```css
:root{
  --ease:cubic-bezier(.2,.75,.2,1);
  --ease-out:var(--ease);
  --ease-in-out:cubic-bezier(.77,0,.175,1);
}
body{overflow-x:clip}                 /* clip, NOT hidden — hidden breaks sticky */
html{scroll-behavior:smooth;scroll-padding-top:100px}

/* pop-reveal runtime */
.pop-word{display:inline-block;transform-origin:50% 80%;backface-visibility:hidden}
.pop-headline{perspective:1000px;overflow:visible}
.pop-pending{opacity:0}               /* class is ONLY ever added by JS */
.pop-is-running{z-index:2}
.pop-is-running.pop-headline .pop-word{will-change:transform,opacity}
.pop-is-running:not(.pop-headline){will-change:transform,opacity}
.pop-pending:focus-within{opacity:1!important}

/* three-act story: CSS does the pinning */
.scroll-story{height:250svh;min-height:1600px;position:relative}
.story-stage{position:sticky;top:88px;height:calc(100svh - 88px);min-height:580px;overflow:hidden}
.story-world{perspective:1300px}
.story-device{transform-style:preserve-3d}
.device-feed{will-change:transform}
.story-track>span{display:block;height:100%;transform:scaleX(0);transform-origin:left}
.reading-progress{position:fixed;inset:0 0 auto;height:3px;z-index:80;pointer-events:none}
.reading-progress>span{display:block;height:100%;transform:scaleX(0);transform-origin:left}
.kinetic-strip>div{transform:translateX(-3%)}   /* resting value lives in CSS */

/* hero scrub window */
.hero{position:relative;min-height:1020px;height:calc(100svh + 240px);max-height:1380px}
.hero-stage{position:sticky;top:0;height:calc(100svh - 100px);min-height:750px;max-height:1020px;overflow:hidden}
.world,.world canvas{touch-action:pan-y}

@media(max-width:760px){
  .pop-word{transform-origin:50% 90%}
  .scroll-story{height:250svh;min-height:1450px}
  .story-stage{position:sticky;top:80px;height:calc(100svh - 80px);min-height:0}
}

/* the pause class and the OS preference must both un-pin and un-hide everything */
.motion-paused *,.motion-paused *:before,.motion-paused *:after{animation-play-state:paused!important}
.motion-paused .pop-pending{opacity:1!important}
.motion-paused .pop-word{transform:none!important;opacity:1!important}
.motion-paused .scroll-story{height:auto;min-height:0}
.motion-paused .story-stage{position:relative;top:auto;height:auto}
.motion-paused .principle-card{position:relative;top:auto!important}
@media(prefers-reduced-motion:reduce){
  html{scroll-behavior:auto}
  *,*:before,*:after{animation:none!important;transition:none!important}
  .pop-pending,.pop-word{opacity:1!important;transform:none!important}
  .pop-is-running,.pop-is-running .pop-word{will-change:auto!important}
  .hero{height:auto;min-height:0}
  .hero-stage{position:relative}
  .scroll-story{height:auto;min-height:0}
  .story-stage{position:relative;top:auto;height:auto;min-height:0}
  .principle-card{position:relative;top:auto!important}
  [data-tilt]{transform:none!important}
}
```

### 6.2 The script

```html
<script>
(function(){
'use strict';
/* ============================================================================
   YGA motion layer — zero dependencies. WAAPI + CSS sticky + IntersectionObserver.
   Numbers are ported verbatim from the reference pop-reveal system.
   ========================================================================== */
var EASE        = 'cubic-bezier(.2,.75,.2,1)';
var HEADER      = 88, HEADER_SM = 80;
var phone       = matchMedia('(max-width:760px)');
var finePointer = matchMedia('(hover:hover) and (pointer:fine)');
var preference  = matchMedia('(prefers-reduced-motion: reduce)');
var paused      = false, disposed = false;
function reduced(){ return preference.matches || paused; }
function offsetTop(){ return phone.matches ? HEADER_SM : HEADER; }

var q  = function(s,r){ return (r||document).querySelector(s); };
var qa = function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var clamp01 = function(v){ return v < 0 ? 0 : v > 1 ? 1 : v; };
var teardown = [];
function listen(t,e,f,o){ t.addEventListener(e,f,o); teardown.push(function(){ t.removeEventListener(e,f,o); }); }

/* ---------------------------------------------------------------- 1. REVEALS */
var records = new Map(), live = new Set(), observer = null, suspended = false;

/* --- selector → archetype. Edit these lists, not the engine. --- */
var GROUPS = [
  ['headline',  'main h1, main h2'],
  ['copy',      '.hero-intro,.hero-description,.hero-actions,.offer-line,.section-heading>p,'
              + '.eyebrow,.route-hero p,.route-hero .text-link,.studio-statement>p,'
              + '.route-end>.section-label,.route-end>.button,.route-end>.text-link,'
              + '.final-cta-copy>.section-label,.final-cta-copy>.button,.final-cta-copy>p'],
  ['slide',     '.service-item,.question-options>button,.partnership-point,.fit-grid>div,'
              + '.faq-list>details,.chapter-card,.page-link-card'],
  ['panel',     '.process-explorer,.product-art,.product-detail,.role-panel,.lab-card,'
              + '.principle-card,.application-form'],
  ['sculpture', '.zero-art,.arrow-sculpture,.orbit-composition,.lab-stack,.studio-sculpture,.story-world']
];
var EXCLUDE_IDS = { 'story-title': 1 };   /* live-rewritten; replayed by hand */

function readableText(node){
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeName === 'BR') return ' ';
  return Array.prototype.map.call(node.childNodes, readableText).join('');
}
function splitHeading(node){
  if (node.querySelector('.pop-word')) return qa('.pop-word', node);
  var text = readableText(node).replace(/\s+/g,' ').trim();
  node.setAttribute('aria-label', text);                  /* one clean accessible name */
  var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  nodes.forEach(function(textNode){
    var frag = document.createDocumentFragment();
    textNode.textContent.split(/(\s+)/).forEach(function(chunk){
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      var span = document.createElement('span');
      span.className = 'pop-word';
      span.textContent = chunk;
      span.setAttribute('aria-hidden','true');            /* words hidden from AT */
      frag.appendChild(span);
    });
    textNode.replaceWith(frag);
  });
  node.classList.add('pop-headline');
  return qa('.pop-word', node);
}
function register(node, kind, index){
  if (records.has(node)) return;
  if (kind === 'headline') splitHeading(node);
  node.dataset.popKind = kind;
  records.set(node, { node:node, kind:kind, index:index||0, seen:false, animations:new Set() });
}
GROUPS.forEach(function(group){
  qa(group[1]).forEach(function(node, i){
    if (node.id && EXCLUDE_IDS[node.id]) return;
    register(node, group[0], i);
  });
});

function track(record, node, frames, options){
  var opts = { duration:720, easing:EASE, fill:'backwards' };
  for (var k in options) opts[k] = options[k];
  var animation = node.animate(frames, opts);
  record.animations.add(animation); live.add(animation);
  var release = function(){
    record.animations.delete(animation); live.delete(animation);
    if (!record.animations.size) record.node.classList.remove('pop-is-running');
  };
  animation.finished.then(release, release);
  return animation;
}
function finish(record){
  record.node.classList.remove('pop-pending','pop-is-running');
  Array.from(record.animations).forEach(function(a){ a.cancel(); });
  record.animations.clear(); record.seen = true;
}
function play(record, delay){
  delay = delay || 0;
  if (disposed) return;
  if (reduced() || !record.node.animate) { finish(record); return; }   /* also covers no-WAAPI */
  Array.from(record.animations).forEach(function(a){ a.cancel(); });
  record.animations.clear();
  record.seen = true;
  record.node.classList.remove('pop-pending');
  record.node.classList.add('pop-is-running');
  var node = record.node, kind = record.kind, index = record.index;

  /* --- A. headline: word-by-word pop-forward --------------------------- */
  if (kind === 'headline') {
    splitHeading(node).forEach(function(word, i){
      track(record, word, [
        { opacity:0, transform:'perspective(850px) translate3d(0,' + (phone.matches ? '.72em' : '.95em') + ',0) rotateX(-48deg) scale(1.16)', offset:0 },
        { opacity:1, transform:'perspective(850px) translate3d(0,-.055em,0) rotateX(4deg) scale(1.035)', offset:.68 },
        { opacity:1, transform:'perspective(850px) translate3d(0,0,0) rotateX(0) scale(1)', offset:1 }
      ], { duration:780, delay: delay + Math.min(i * 48, 480) });        /* 48ms step, 480ms cap */
    });
    return;
  }

  /* --- B–E. block archetypes. Preserve the authored transform as suffix. */
  var base = getComputedStyle(node).transform;
  var end  = base === 'none' ? '' : base;
  var distance = phone.matches ? 48 : 82;
  var start, overshoot, duration;

  if (kind === 'copy') {
    start     = 'translate3d(0,' + (phone.matches ? 32 : 48) + 'px,0) scale(1.035) ' + end;
    overshoot = 'translate3d(0,-3px,0) scale(1.006) ' + end;
    duration  = 650;
  } else if (kind === 'slide') {
    var d = index % 2 === 0 ? -1 : 1;                                   /* alternate L / R */
    start     = 'translate3d(' + (d * distance) + 'px,32px,0) rotate(' + (d * 1.4) + 'deg) scale(.94) ' + end;
    overshoot = 'translate3d(' + (-d * 4) + 'px,-3px,0) rotate(0deg) scale(1.012) ' + end;
    duration  = 780;
  } else if (kind === 'sculpture') {
    start     = 'perspective(1100px) translate3d(0,' + distance + 'px,0) rotateX(18deg) rotateY(-13deg) scale(.9) ' + end;
    overshoot = 'perspective(1100px) translate3d(0,-9px,0) rotateX(-2deg) rotateY(2deg) scale(1.045) ' + end;
    duration  = 920;
  } else {                                                              /* panel */
    start     = 'perspective(1100px) translate3d(0,' + distance + 'px,0) rotateX(13deg) scale(.91) ' + end;
    overshoot = 'perspective(1100px) translate3d(0,-5px,0) rotateX(-1deg) scale(1.025) ' + end;
    duration  = 780;
  }
  track(record, node, [
    { opacity:0, transform:start,            offset:0  },
    { opacity:1, transform:overshoot,        offset:.7 },
    { opacity:1, transform:end || 'none',    offset:1  }
  ], { duration:duration, delay:delay });
}

/* ---------------------------------------------- 2. OBSERVER (one-shot) ----- */
function connectObserver(){
  if (observer) observer.disconnect();
  observer = new IntersectionObserver(function(entries){
    if (suspended) return;
    var entering = entries.filter(function(e){
      return e.isIntersecting && records.has(e.target) && !records.get(e.target).seen;
    });
    /* entries arrive in DOM order — sort by the rect the observer already captured */
    entering.sort(function(a,b){ return a.boundingClientRect.top - b.boundingClientRect.top; });
    entering.forEach(function(entry, i){
      play(records.get(entry.target), Math.min(i * 55, 220));            /* 55ms step, 220ms cap */
      observer.unobserve(entry.target);                                  /* one-shot, forever */
    });
  }, {
    threshold: .08,
    rootMargin: '0px 0px -' + Math.min(120, Math.round(innerHeight * .13)) + 'px 0px'
  });
  records.forEach(function(record){ if (!record.seen) observer.observe(record.node); });
}

/* ------------------------------------------- 3. ARM (fold-aware) ---------- */
function enterPage(root){
  root = root || document.body;
  suspended = false;
  var selected = [];
  records.forEach(function(record){ if (root.contains(record.node)) selected.push(record); });
  /* READ everything first, then write — no forced reflow per element */
  var measured = selected.map(function(record){
    return { record:record, rect:record.node.getBoundingClientRect() };
  });
  measured.forEach(function(item){
    var record = item.record, rect = item.rect;
    finish(record); record.seen = false;
    if (reduced()) { finish(record); return; }
    var visible = rect.bottom > offsetTop() && rect.top < innerHeight * .84;
    if (visible) {
      play(record, record.kind === 'headline' ? 20 : 110);   /* headline leads by ~90ms */
    } else {
      /* below the fold → hide + observe. above the viewport → observe, stay visible. */
      record.node.classList.toggle('pop-pending', rect.top >= innerHeight * .84);
      observer.observe(record.node);
    }
  });
}
function settle(){ records.forEach(finish); }
function suspend(){ suspended = true; records.forEach(finish); }
function resume(){ enterPage(document.body); }
function replayHeading(node){
  if (!node) return;
  if (!records.has(node)) register(node, 'headline', 0);
  play(records.get(node), 0);
}

/* focusin short-circuit: keyboard must never land on an opacity:0 element */
listen(document, 'focusin', function(e){
  var target = e.target;
  while (target && target !== document.body) {
    if (records.has(target)) finish(records.get(target));
    target = target.parentElement;
  }
});
connectObserver();
listen(window, 'resize', connectObserver, { passive:true });   /* recompute rootMargin */

/* ------------------------------------- 4. THREE-ACT STORY (sticky scrub) --- */
var story   = q('.scroll-story'),
    stage   = q('.story-stage'),
    device  = q('.story-device'),
    feed    = q('.device-feed'),
    product = q('.device-product'),
    launch  = q('.device-launch'),
    halo    = q('.story-halo'),
    chipA   = q('.chip-a'),
    chipB   = q('.chip-b'),
    track$  = q('.story-track>span');
var STORY_COPY = [
  ['A question.','An opportunity.','It starts with a question your audience keeps asking—and a niche you know well.'],
  ['Your knowledge.','Our creation.','We research, write, structure and design the whole product around your content and brand.'],
  ['Fully custom.','Ready to share.','A complete product, built behind the scenes. You stay the face of your brand.']
];
var chapter = -1, manualStory = 0;

function storyState(progress){
  var p = clamp01(isFinite(progress) ? progress : 0);
  return {
    progress: p,
    chapter : p < .34 ? 0 : p < .72 ? 1 : 2,
    product : clamp01((p - .20) / .19),     /* ramps over p .20 → .39 */
    launch  : clamp01((p - .66) / .19)      /* ramps over p .66 → .85 */
  };
}
function drawStory(progress){
  if (!story) return;
  var state = storyState(progress), n = state.chapter, p = state.progress;
  if (n !== chapter) {
    chapter = n;
    var heading = q('#story-title');
    if (heading) {
      heading.replaceChildren(document.createTextNode(STORY_COPY[n][0]), document.createElement('br'));
      var accent = document.createElement('span');
      accent.textContent = STORY_COPY[n][1];
      heading.appendChild(accent);
      replayHeading(heading);                            /* full word-pop per act */
    }
    var copy = q('#story-copy'); if (copy) copy.textContent = STORY_COPY[n][2];
    var count = q('.story-count'); if (count) count.textContent = '0' + (n + 1) + ' / 03';
    qa('[data-story]').forEach(function(b){
      b.setAttribute('aria-pressed', String(Number(b.dataset.story) === n));
    });
  }
  if (track$) track$.style.transform = 'scaleX(' + p + ')';

  if (reduced()) {                                        /* discrete, no interpolation */
    if (feed)    { feed.style.transform = 'none'; feed.style.opacity = n === 0 ? '1' : '0'; }
    if (product) { product.style.opacity = n === 1 ? '1' : '0'; product.style.transform = 'none'; }
    if (launch)  { launch.style.opacity  = n === 2 ? '1' : '0'; launch.style.transform  = 'none'; }
    if (device)  device.style.transform = 'rotateY(-10deg)';
    if (halo)    halo.style.transform = 'translate(-50%,-50%) rotateY(55deg)';
    if (chipA)   chipA.style.transform = 'rotate(6deg)';
    if (chipB)   chipB.style.transform = 'rotate(-5deg)';
    return;
  }
  var arc = Math.sin(p * Math.PI);                        /* 0 → 1 → 0 */
  if (device) device.style.transform =
    'translateY(' + (arc * -18) + 'px) rotateY(' + (-14 + p * 23) + 'deg) rotateX(' +
    (7 - p * 11) + 'deg) rotate(' + (-4 + p * 7) + 'deg) scale(' + (1 + arc * .08) + ')';
  if (feed) {
    feed.style.transform = 'translateY(' + (-Math.min(p / .35, 1) * 150) + 'px)';
    feed.style.opacity   = String(1 - state.product);
  }
  if (product) {
    product.style.opacity   = String(state.product * (1 - state.launch));   /* cross-fade */
    product.style.transform = 'translateY(' + ((1 - state.product) * 90 - state.launch * 35) +
                              'px) scale(' + (.92 + state.product * .08) + ')';
  }
  if (launch) {
    launch.style.opacity   = String(state.launch);
    launch.style.transform = 'translateY(' + ((1 - state.launch) * 75) + 'px)';
  }
  if (halo) halo.style.transform =
    'translate(-50%,-50%) rotateY(' + (55 - p * 105) + 'deg) rotateZ(' + (p * 80) + 'deg)';
  if (chipA) chipA.style.transform =
    'translate(' + (-p * 20) + 'px,' + (arc * -22) + 'px) rotate(' + (6 - p * 12) + 'deg)';
  if (chipB) chipB.style.transform =
    'translate(' + (p * 18) + 'px,' + (arc * 18) + 'px) rotate(' + (-5 + p * 9) + 'deg)';
}
/* act buttons move the SCROLL, so scroll and visual never disagree */
qa('[data-story]').forEach(function(button){
  listen(button, 'click', function(){
    var p = [0, .53, 1][Number(button.dataset.story)];
    manualStory = p;
    if (reduced() || !story) { drawStory(p); return; }
    var rect = story.getBoundingClientRect(), off = offsetTop();
    window.scrollTo({
      top: scrollY + rect.top - off + p * (rect.height - innerHeight + off),
      behavior: 'smooth'
    });
  });
});

/* ------------------------------- 5. THE SINGLE SCROLL LOOP (read → write) -- */
var hero    = q('.hero'), world = q('#world'),
    stripes = qa('.kinetic-strip'),
    chapters= qa('.chapter-card'),
    reading = q('.reading-progress>span'),
    chapterLinks = qa('.chapter-index nav a');
var scrollFrame = 0;
var onHeroProgress = (window.YGA && window.YGA.onHeroProgress) || function(){};

function updateScroll(){
  scrollFrame = 0;
  if (disposed || document.hidden) return;

  /* ---- READ: every geometry query happens here, in one batch ---- */
  var heroRect   = hero  ? hero.getBoundingClientRect()  : null;
  var worldRect  = (world && phone.matches) ? world.getBoundingClientRect() : null;
  var storyRect  = story ? story.getBoundingClientRect() : null;
  var stripeRects= stripes.map(function(n){ return n.getBoundingClientRect(); });
  var chapRects  = chapters.map(function(n){ return n.getBoundingClientRect(); });
  var total      = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  var progress   = clamp01(scrollY / total);

  /* ---- WRITE: transform / opacity only, from here down ---- */
  if (reading) reading.style.transform = 'scaleX(' + progress + ')';

  if (heroRect && heroRect.bottom > 0 && heroRect.top < innerHeight && !reduced()) {
    var hp = (phone.matches && worldRect)
      ? clamp01((innerHeight * .83 - worldRect.top) / (worldRect.height + innerHeight * .3))
      : clamp01((HEADER - heroRect.top) / Math.max(180, heroRect.height - innerHeight + HEADER));
    onHeroProgress(hp);
  }
  if (storyRect && storyRect.bottom > 0 && storyRect.top < innerHeight) {
    var off = offsetTop();
    var sp = reduced() ? manualStory
      : clamp01((off - storyRect.top) / Math.max(1, storyRect.height - (innerHeight - off)));
    drawStory(sp);
  }
  stripes.forEach(function(stripe, i){
    var rect = stripeRects[i];
    if (!rect || rect.bottom < 0 || rect.top > innerHeight) return;
    stripe.firstElementChild.style.transform = reduced()
      ? 'translateX(-3%)'
      : 'translateX(' + (-3 - (1 - rect.top / innerHeight) * 7) + '%)';   /* -3% → -10% */
  });
  if (chapRects.length && chapterLinks.length) {
    var selected = 0;
    chapRects.forEach(function(rect, i){ if (rect.top < innerHeight * .55) selected = i; });
    chapterLinks.forEach(function(a, i){
      a.classList.toggle('is-active', i === selected);
      if (i === selected) a.setAttribute('aria-current','step');
      else a.removeAttribute('aria-current');
    });
  }
}
function schedule(){
  if (!disposed && !scrollFrame && !document.hidden) scrollFrame = requestAnimationFrame(updateScroll);
}
listen(window,   'scroll',         schedule, { passive:true });
listen(window,   'resize',         schedule, { passive:true });
listen(document, 'visibilitychange', schedule);
if (window.ResizeObserver) {
  var ro = new ResizeObserver(schedule);
  var main = q('main') || document.body;
  ro.observe(main);
  teardown.push(function(){ ro.disconnect(); });
}

/* --------------------------------------- 6. POINTER TILT (fine pointer) ---- */
qa('[data-tilt]').forEach(function(node){
  var raf = 0, pointer = null, rect = null;
  var reset = function(){ if (raf) cancelAnimationFrame(raf); raf = 0; node.style.transform = ''; };
  listen(node, 'pointerenter', function(){ rect = node.getBoundingClientRect(); });
  listen(node, 'pointermove', function(e){
    if (reduced() || node.classList.contains('pop-is-running')
        || !finePointer.matches || e.pointerType !== 'mouse') return;   /* 3 guards */
    pointer = { x:e.clientX, y:e.clientY };
    if (!rect) rect = node.getBoundingClientRect();
    if (raf) return;                                                    /* one write per frame */
    raf = requestAnimationFrame(function(){
      raf = 0;
      if (reduced() || !pointer || !rect) return;
      var x = Math.max(-.5, Math.min(.5, (pointer.x - rect.left) / rect.width  - .5));
      var y = Math.max(-.5, Math.min(.5, (pointer.y - rect.top)  / rect.height - .5));
      node.style.transform = 'perspective(1200px) rotateX(' + (-y * 8) + 'deg) rotateY(' + (x * 10) + 'deg)';
    });
  });
  listen(node, 'pointerleave', reset);
  listen(node, 'blur', reset);
  teardown.push(reset);
});

/* ------------------------------------ 7. MEASURED <details> ACCORDION ------ */
qa('details').forEach(function(details){
  var summary = details.querySelector('summary');
  if (!summary) return;
  var animation = null, targetOpen = details.open;
  listen(summary, 'click', function(e){
    if (reduced() || !details.animate) { targetOpen = !details.open; return; }
    e.preventDefault();
    var start = details.getBoundingClientRect().height;
    targetOpen = !targetOpen;                      /* tracked separately from details.open */
    if (animation) animation.cancel();
    details.style.height = '';
    details.open = true;
    var end = targetOpen ? details.getBoundingClientRect().height
                         : summary.getBoundingClientRect().height + 1;
    details.style.overflow = 'hidden';
    var next = details.animate([{ height:start + 'px' }, { height:end + 'px' }],
                               { duration:220, easing:EASE });
    animation = next;
    next.finished.then(function(){
      if (animation === next) { details.open = targetOpen; details.style.overflow = ''; animation = null; }
    }).catch(function(){});
  });
  teardown.push(function(){ if (animation) animation.cancel(); });
});

/* ------------------------------------------- 8. GLOBAL MOTION CONTROL ------ */
function syncMotion(resumeEntrances){
  var isReduced = reduced();
  document.body.classList.toggle('motion-paused', isReduced);
  if (window.YGA && window.YGA.scene && window.YGA.scene.setPaused) window.YGA.scene.setPaused(isReduced);
  qa('#global-motion,#motion-toggle').forEach(function(control){
    control.disabled = preference.matches;                 /* OS preference wins */
    control.setAttribute('aria-pressed', String(isReduced));
    control.setAttribute('aria-label',
      preference.matches ? 'Reduced motion follows your device settings'
      : isReduced ? 'Resume decorative motion' : 'Pause decorative motion');
    var label = control.querySelector('span');
    if (label) label.textContent = preference.matches ? 'Reduced motion'
                                 : isReduced ? 'Motion paused' : 'Motion on';
  });
  if (isReduced) {
    settle();                                              /* pausing can never hide content */
    qa('[data-tilt]').forEach(function(n){ n.style.transform = ''; });
    qa('.pop-is-running').forEach(function(n){
      n.getAnimations().forEach(function(a){ a.cancel(); });
    });
  }
  if (!isReduced && resumeEntrances !== false) resume();
  schedule();
}
qa('#global-motion,#motion-toggle').forEach(function(b){
  listen(b, 'click', function(){ paused = !paused; syncMotion(true); });
});
listen(preference, 'change', function(){ syncMotion(true); });
listen(phone,      'change', schedule);

/* --------------------------------------------------------- 9. BOOT / EXIT -- */
syncMotion(false);          /* false = do NOT replay entrances on first paint */
enterPage(document.body);
schedule();

window.YGA = window.YGA || {};
window.YGA.motion = {
  enterPage:enterPage, suspend:suspend, settle:settle, resume:resume,
  replayHeading:replayHeading, drawStory:drawStory, schedule:schedule,
  setHeroProgressHandler:function(fn){ onHeroProgress = fn; },
  dispose:function(){
    disposed = true;
    cancelAnimationFrame(scrollFrame);
    if (observer) observer.disconnect();
    settle();
    live.forEach(function(a){ a.cancel(); });
    teardown.forEach(function(off){ off(); });
  }
};
listen(window, 'pagehide', function(e){ if (!e.persisted) window.YGA.motion.dispose(); });
})();
</script>
```

### 6.3 Integration notes for the build agent

1. **Script position.** Put this script **before `</body>`**, after the markup. It reads
   `getBoundingClientRect()` at boot, so the DOM must be parsed. Do not use `defer` on
   an inline script (it has no effect); do not wrap in `DOMContentLoaded` (that adds a
   frame of delay before `enterPage`, which can flash).
2. **Never put `.pop-pending{opacity:0}` behaviour into the markup.** The class is only
   ever added by `enterPage`. The page must be fully readable with JS disabled.
3. **Register the WebGL/hero consumer before boot** if there is one:
   `window.YGA = {scene: myScene, onHeroProgress: fn}` in an earlier script, or call
   `window.YGA.motion.setHeroProgressHandler(fn)` after. Smooth the camera inside the
   consumer with `1 - Math.exp(-dt * 7)` and clamp `dt` to `.04` — do **not** smooth the
   document scroll.
4. **Edit `GROUPS`, not the engine.** New sections map onto existing archetypes. If a
   selector matches nothing, nothing breaks. Keep `main h1, main h2` for `headline` so
   every display heading is covered by default.
5. **Keep the selector sets disjoint.** An element registered twice would get two
   competing transform animations. `records` is a `Map` keyed by node and `register`
   early-returns on a duplicate, so the *first* archetype in `GROUPS` order wins — order
   the list most-specific-last at your peril. (Reference rule, `LOVABLE-HANDOFF.md`:
   *"Avoid applying competing transforms to the same element."*)
6. **An element with an authored transform must not also be `[data-tilt]`** unless you
   accept that the tilt handler overwrites `style.transform` — the `pop-is-running`
   guard covers the entrance window, nothing covers after.
7. **Sticky requires `overflow-x:clip` on `body`**, not `overflow-x:hidden`. This is a
   silent killer.
8. **Every pin height in `svh`**, never `vh`.
9. **Budget check.** Script ≈ 14 KB raw / ≈ 3.4 KB gzipped inline, zero extra requests,
   zero third-party origins, no blank-page failure mode.

---

## 7. Section-to-section transition techniques

Rule for all of these: **the transition belongs to the boundary, not to the sections.**
A wipe, a recede and an iris are three different boundary devices; use at most **one per
boundary**, and never the same device twice in a row. The reference's own rhythm is
`white → yellow band → white → cobalt story → white → yellow route-end`: colour does the
sectioning, motion only articulates the cut.

### 7.1 Colour-band wipe into an inverted section

The reference already ships the static version (`.kinetic-strip` yellow / `.blue-strip`
cobalt, `border-block:1px solid #1111`). Make the band wipe itself in, then the inverted
section lands behind it.

```css
.band{
  position:relative;overflow:hidden;contain:paint;
  padding:30px 0;background:var(--accent);border-block:1px solid #1111;
  clip-path:inset(0 0 0 0);                 /* resting: fully open (no-JS / no-SDA safe) */
}
@supports(animation-timeline:view()){
  .band{animation:band-wipe-up linear both;animation-timeline:view();
        animation-range:entry 5% entry 85%}
  .band:nth-of-type(even){animation-name:band-wipe-down}
  @keyframes band-wipe-up  {from{clip-path:inset(0 0 100% 0)}to{clip-path:inset(0 0 0 0)}}
  @keyframes band-wipe-down{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0 0 0 0)}}
}
```

| knob | value |
|---|---|
| range | `entry 5% entry 85%` — the band is fully open before it reaches mid-viewport, so the type inside is never read through a moving edge |
| direction | alternates bottom-up / top-down by `:nth-of-type` |
| band height | `padding:30px 0` desktop, `20px 0` phone (reference values) |
| easing | `linear` — **mandatory** for scrubbed animations; an ease curve on a scrub makes the scroll feel like it has a dead zone |
| resting state | `inset(0 0 0 0)` in the base rule, so no-SDA browsers show the band open |

Diagonal-cut variant for the single hardest boundary on the page (use **once**):

```css
@keyframes band-wedge{
  from{clip-path:polygon(0 100%,100% 100%,100% 100%,0 100%)}
  to  {clip-path:polygon(0 0,100% 12%,100% 100%,0 100%)}
}
```
The `12%` skew on the top edge is what makes it read as a cut rather than a slide.

### 7.2 Sticky stacking with scale-down of the outgoing section

The reference's `.principle-card` ladder is the small version of this
(`top:112px / 135px / 158px`, a 23 px fan). The section-scale version:

```css
.stack{position:relative}
.stack>section{
  position:sticky;top:0;min-height:100svh;
  border-radius:0;transform-origin:50% 0%;      /* scale from the TOP edge, not centre */
  will-change:auto;
}
.stack>section::after{                           /* dim via opacity, never filter */
  content:'';position:absolute;inset:0;background:#0b0d12;opacity:0;pointer-events:none;
}
@supports(animation-timeline:view()){
  .stack>section{animation:stack-recede linear both;animation-timeline:view();
                 animation-range:exit -5% exit 100%}
  .stack>section::after{animation:stack-dim linear both;animation-timeline:view();
                        animation-range:exit -5% exit 100%}
  @keyframes stack-recede{to{transform:scale(.925) translateY(-3.5%)}}
  @keyframes stack-dim   {to{opacity:.32}}
}
@media(prefers-reduced-motion:reduce),(max-width:760px){
  .stack>section{position:relative;top:auto;min-height:0;transform:none!important}
  .stack>section::after{opacity:0!important}
}
```

| knob | value | why |
|---|---|---|
| scale | `1 → .925` | the reference's own card/panel scale language sits in `.9–.94`; `.925` matches it |
| translateY | `0 → -3.5%` | small upward drift so the receding section does not just shrink in place |
| transform-origin | `50% 0%` | scaling from the top edge keeps the section's header pinned to the viewport top as it recedes — scaling from centre makes the header drop, which reads as a bug |
| dim | `::after` opacity `0 → .32` | stays inside the transform/opacity-only rule |
| range | `exit -5% exit 100%` | starts 5 % *before* the exit phase, so the recede has begun by the time the next section's top edge appears |
| `border-radius` | **static, never animated** | animating radius forces repaint every frame |
| phone | disabled entirely | 100svh sticky stacking on a phone eats the whole screen and fights momentum scroll |

Hard limit: **at most 3 stacked sections.** Each one is a 100svh sticky element; four or
more and the scroll distance to get through the page becomes punitive.

### 7.3 Clip-path iris / inset reveal of a whole section

One-shot, WAAPI, fired by the IntersectionObserver as a sixth archetype
(`register(node,'curtain',i)`):

```js
/* iris — for the single hero-scale moment per page */
node.animate([
  {clipPath:'circle(0% at 50% 58%)',  offset:0},
  {clipPath:'circle(72% at 50% 58%)', offset:.74},
  {clipPath:'circle(140% at 50% 58%)',offset:1}
],{duration:1040,easing:'cubic-bezier(.2,.75,.2,1)',fill:'backwards'});

/* inset wipe — the cheaper, more repeatable variant */
node.animate([
  {clipPath:'inset(0 0 100% 0)'},
  {clipPath:'inset(0 0 0 0)'}
],{duration:880,easing:'cubic-bezier(.2,.75,.2,1)',fill:'backwards'});
```

The iris has a **three-stop curve with the overshoot at `.74`** — it opens past the
section edge (`140%`) so the last of the motion happens off-screen and the reveal does
not appear to stop. Same philosophy as the headline's `.68` overshoot.

Rules: `contain:paint` on the element, **maximum one clip-path reveal per viewport
height** (clip-path repaints the element; it is not a free compositor property), and
never on a list of cards.

### 7.4 Section swap in place (tabbed / filtered content)

Reuse the route transition from §2.5 for in-page swaps, with no router:

```js
function swapSection(mutate){
  if (reduced() || typeof document.startViewTransition !== 'function') { mutate(); return; }
  document.startViewTransition(mutate);
}
```
```css
.swap-out{view-transition-name:swap}
::view-transition-old(swap){animation:page-away 380ms var(--ease-out) both}
::view-transition-new(swap){animation:page-arrive 580ms var(--ease-in-out) both}
```
380 ms out / 580 ms in, `clip-path:inset(100% 0 0)` → `inset(0)` on arrival — verbatim
the reference's page choreography, so in-page swaps and route changes feel like the same
gesture.

### 7.5 Boundary device rotation plan (prevents the AI look at section scale)

Assign devices in this order down the page and **do not repeat consecutively**:

| boundary | device |
|---|---|
| hero → services | sticky recede (§7.2) — the hero is already sticky |
| services → band | band wipe up (§7.1) |
| band → story | nothing; the cobalt story block + its own sticky pin is the event |
| story → products | band wipe down (§7.1) |
| products → manifesto | word-fill scrub carries it (§8.1); no boundary device |
| manifesto → studio | iris (§7.3) — the one per page |
| studio → final CTA | band wipe up, inverted colour |

---

## 8. Scroll-scrubbed text

### 8.1 Word-by-word opacity fill (the manifesto paragraph)

The reference already defines the resting state: `.word-dim{opacity:.22;transition:opacity 200ms linear}`,
and un-dims it under both reduced motion and pause
(`.motion-paused .word-dim{opacity:1}`, `@media(prefers-reduced-motion:reduce){.word-dim{opacity:1!important}}`).
Dim value is **.22**, not 0 — the text stays legible before it is lit, which is both an
accessibility requirement and the reason it reads as premium rather than as a gimmick.

Split identically to the headline (words, `aria-label` on the parent, `aria-hidden` on
each span) but with `.word-dim` instead of `.pop-word`.

**JS (rAF) implementation — exact maths:**

```js
var FILL_DIM = .22, FILL_OVERLAP = 2.6;   /* 2.6 words lit simultaneously */
/* paragraph progress: crosses from 78% of viewport up to 28% of viewport */
var p = clamp01((innerHeight * .78 - rect.top) / Math.max(1, rect.height + innerHeight * .50));
var lit = p * (words.length + FILL_OVERLAP);
for (var i = 0; i < words.length; i++) {
  var k = clamp01((lit - i) / FILL_OVERLAP);
  words[i].style.opacity = String(FILL_DIM + (1 - FILL_DIM) * k);
}
```

| knob | value | why |
|---|---|---|
| dim floor | `.22` | reference value; contrast still passes on white |
| overlap | `2.6` words | 1 word = a staccato typewriter (the AI look); 6+ = an undifferentiated fade of the whole paragraph. 2.6 is the band where you can see the edge travelling |
| window | paragraph top from `0.78·vh` to `0.28·vh` | the fill completes with the paragraph still high on screen, so the reader finishes reading *after* the effect finishes, never during |
| easing | linear in `k` | scrubbed; any curve creates a dead zone |

**CSS SDA variant** (zero main-thread cost; generate the per-word `animation-range` as
inline styles once at boot, then never touch it again):

```css
.fill-host{view-timeline-name:--fill;view-timeline-axis:block}
.word-dim{opacity:.22}
@supports(animation-timeline:view()){
  .word-dim{animation:word-light linear both;animation-timeline:--fill}
  @keyframes word-light{to{opacity:1}}
}
```
```js
/* per-word window, 2.6-word overlap, inside contain 6%→88% */
var n = words.length, span = 82 / n, win = span * 2.6;
words.forEach(function(w,i){
  var a = 6 + i * span;
  w.style.animationRange = 'contain ' + a.toFixed(2) + '% contain ' + Math.min(96, a + win).toFixed(2) + '%';
});
```

### 8.2 Line-mask reveal (scrubbed and one-shot)

The reference's mask primitive, which must be copied **including the descender fix**:

```css
.line-mask{display:block;overflow:hidden;padding-bottom:.09em;margin-bottom:-.09em}
.line-mask>span{display:block}
/* route-hero variant uses the other direction */
.route-hero .line-mask{padding-top:.1em;margin-top:-.1em}
@media(prefers-reduced-motion:reduce){.line-mask{overflow:visible}}
```

The `padding-bottom:.09em` / `margin-bottom:-.09em` pair gives the mask 0.09 em of extra
room so `overflow:hidden` does not shear descenders (g, y, p) off the display font, while
the negative margin cancels the layout effect. Without this pair the mask looks like a
rendering bug. `overflow:visible` under reduced motion so nothing can ever be clipped.

Scrubbed version:

```css
.line-mask>span{transform:translateY(0)}
@supports(animation-timeline:view()){
  .line-mask>span{animation:line-rise linear both;animation-timeline:view();
                  animation-range:entry 12% entry 82%}
  .line-mask:nth-child(2)>span{animation-range:entry 18% entry 88%}
  .line-mask:nth-child(3)>span{animation-range:entry 24% entry 94%}
  @keyframes line-rise{from{transform:translateY(102%)}to{transform:translateY(0)}}
}
```
`102%` not `100%` — same sub-pixel-seam reason as the route curtain's `101%`. Per-line
ranges offset by **6 %** produce the stagger without any JS.

Use the line-mask for **sub-headings and pull-quotes**. Do **not** stack it on an element
that already has the `headline` word-pop: that is the "competing transforms" violation the
reference explicitly forbids.

### 8.3 Marquee scrub

Reference baseline: `translateX(-3%)` resting, drifting to `-10%` (7 % of travel), driven
from `rect.top`. For a deliberate scrub marquee, widen the travel and alternate direction
per strip:

```css
.kinetic-strip>div{width:max-content;white-space:nowrap;transform:translateX(-3%)}
@supports(animation-timeline:view()){
  .kinetic-strip>div{animation:strip-scrub linear both;animation-timeline:view();
                     animation-range:cover 0% cover 100%}
  .blue-strip>div{animation-name:strip-scrub-rev}
  @keyframes strip-scrub    {from{transform:translateX(-3%)} to{transform:translateX(-24%)}}
  @keyframes strip-scrub-rev{from{transform:translateX(-24%)}to{transform:translateX(-3%)}}
}
@media(prefers-reduced-motion:reduce){.kinetic-strip>div{transform:translateX(-3%)!important}}
```

| knob | value |
|---|---|
| travel | `-3% → -24%` (21 % of strip width) — enough that a long marquee visibly moves across one viewport pass |
| range | `cover 0% cover 100%` — the full time the strip is anywhere on screen |
| direction | yellow strip left, cobalt strip right. **Alternating direction is the whole point**; two strips drifting the same way read as a template |
| duplication | repeat the phrase enough times that `width:max-content` ≥ `100vw + 24%`, or the right edge enters frame |
| outline words | `.kinetic-strip i{font-style:normal;color:transparent;-webkit-text-stroke:1.5px #111}` — alternate solid/outline words so the motion has texture to read against |

Keep the JS rAF version (§2.4) as the no-SDA fallback **only if** you want motion there
at all; the static `-3%` resting state is a perfectly good degradation.

### 8.4 Counter / number scrub

```js
var shown = -1;
function drawCounter(p){                   /* p from the same rAF loop */
  var v = Math.round(p * target);
  if (v === shown) return;                 /* never write the same text twice */
  shown = v;
  node.textContent = String(v).padStart(2,'0');
}
```
`aria-live` must **not** be set on a scrubbed counter — it would spam the screen reader on
every scroll tick. Put the final value in a `visually-hidden` sibling instead, matching
the reference's `.visually-hidden` utility and its one-shot
`#route-announcement` pattern.

---

## 9. Image and card reveals

### 9.1 Frame parallax (image drifts inside a fixed frame)

```css
.frame{position:relative;overflow:hidden;contain:paint}
.frame>img{display:block;width:100%;height:112%;object-fit:cover;transform:translateY(-5.35%)}
@supports(animation-timeline:view()){
  .frame>img{animation:frame-drift linear both;animation-timeline:view();
             animation-range:entry 0% exit 100%}
  @keyframes frame-drift{from{transform:translateY(-10.7%)}to{transform:translateY(0%)}}
}
@media(prefers-reduced-motion:reduce){.frame>img{transform:translateY(-5.35%)!important}}
```

The maths that must not be guessed: image height `112%`, drift `-10.7% → 0%` of **its
own** height. At `-10.7%` the image spans `-0.12F → 1.00F`; at `0%` it spans
`0 → 1.12F`. Both extremes fully cover the frame `0 → F`, so **no white edge can ever
appear** — the failure mode of nearly every hand-rolled parallax. Resting value is the
midpoint `-5.35%`, so the no-SDA state is centred.

12 % overscan is also the ceiling: more than ~15 % and the apparent scale difference
between the top and bottom of a column of frames becomes visible as inconsistency.

Alternating direction per frame (`:nth-of-type(even)` → `from 0% to -10.7%`) is required
by §11.

### 9.2 Masked image reveal (one-shot, directional)

A sixth archetype, `frame`, slotted into the §1 engine. Two animations on two elements —
mask on the wrapper, counter-scale on the image — so neither fights the other:

```js
/* wrapper: the mask opens */
var d = index % 2 === 0;
track(record, node, [
  {clipPath: d ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)', offset:0},
  {clipPath: 'inset(0 0 0 0)',                              offset:1}
], {duration:880, easing:EASE});

/* inner image: settles out of an over-scale as the mask opens */
track(record, node.querySelector('img'), [
  {transform:'scale(1.085) translateY(2.2%)', offset:0},
  {transform:'scale(1.012) translateY(-.4%)', offset:.72},
  {transform:'scale(1) translateY(0)',        offset:1}
], {duration:940, easing:EASE});
```

| knob | value |
|---|---|
| mask duration | **880 ms** |
| image duration | **940 ms** — deliberately 60 ms longer, so the picture is still settling after the mask has finished. Equal durations are what makes a reveal feel mechanical |
| direction | even index: bottom-up `inset(0 0 100% 0)`; odd index: left-to-right `inset(0 100% 0 0)` |
| counter-scale | `1.085 → 1.012 → 1` with the overshoot at `.72` (matches the §1 block archetypes' `.7`) |
| drift | `translateY 2.2% → -0.4% → 0` — the image rises slightly as the mask opens downward |
| opacity | **none.** The mask is the reveal; adding a fade makes it mushy |

The image must carry `width`/`height` attributes and `object-fit:cover` so the mask never
animates over an unsized box (CLS).

### 9.3 Card archetypes — which card gets which motion

| card type | archetype | signature |
|---|---|---|
| process / service rows (repeated, same width) | `slide` (§1.4 C) | alternating ±82 px X, `±1.4deg`, 780 ms |
| large flat panels (`.lab-card`, `.principle-card`) | `panel` (§1.4 E) | `rotateX 13° → −1° → 0`, 780 ms |
| 3D-ish art objects (`.orbit-composition`, `.lab-stack`) | `sculpture` (§1.4 D) | two-axis rotation, 920 ms |
| image cards | `frame` (§9.2) | clip-path mask + counter-scale, 880/940 ms |
| text blocks and inline CTAs | `copy` (§1.4 B) | straight 48 px lift, 650 ms, no rotation |
| display headings | `headline` (§1.3) | per-word, 780 ms, 48 ms stagger |

Hover/press, from the reference (do not invent new ones):

```css
.lab-card{transition:box-shadow 220ms var(--ease)}
.mini-product{transition:transform 350ms var(--ease)}
@media(hover:hover) and (pointer:fine){
  .lab-card:hover .mini-product{transform:rotate(0) rotateY(0) translateY(-8px)}
  .lab-card:hover{box-shadow:0 16px 35px #17274612}
  .lab-card:hover .round-arrow{background:var(--blue);color:#fff}
  .page-link-card:hover>span:last-child{transform:translate(4px,-4px)}
}
@media(max-width:760px){
  .lab-card:active .mini-product{transform:rotate(0) rotateY(0) scale(1.04)}
  .page-link-card:active{transform:scale(.98)}
}
```

The move worth copying: the card's **resting** state is the rotated one
(`rotate(-7deg) rotateY(-15deg)`) and hover *un-rotates* it. Hover resolves tension
instead of adding it — and it is why §1.4's computed-transform suffix is non-negotiable:
the entrance must compose onto that resting rotation, not replace it.

### 9.4 3D object on scroll

Two tiers, both already specified:

1. **WebGL** (§2.2): scroll → `setProgress(p)` → `targetProgress`; the render loop
   smooths with `1-Math.exp(-dt*7)` and derives the camera from
   `travel=sin(p·π)` and `focus=sin(mode·π/2)`. The sine arc means scrub start and end
   share a camera position, so entering and leaving the hero are both calm.
2. **CSS 3D** (§2.3): the three-act device. `perspective:1300px` on the parent,
   `transform-style:preserve-3d` on the device, eleven coupled transforms off one `p`.
   This is the pattern to reuse for any non-WebGL 3D object: one progress value, several
   elements, each with its own derived expression — never one transform shared.

Both cap DPR (`min(dpr, width<650 ? 1.35 : 1.65)`), both stop their rAF when settled
(`< .002`), both gate on an IntersectionObserver (`rootMargin:'60px'`) and on
`document.hidden`.

---

## 10. Smooth scroll: native. No Lenis, no ScrollSmoother.

### The decision

**Use the browser's native scroll.** Add `html{scroll-behavior:smooth;scroll-padding-top:100px}`
for anchor navigation (both already in the reference's `styles.css` line 3) and
`@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}`. Nothing else.

### Why not Lenis

1. **It breaks the 3D canvas.** `.world canvas{touch-action:pan-y}` is how the hero lets
   a horizontal drag orbit the camera while a vertical drag scrolls the page. Lenis
   attaches its own `wheel` and `touch` handlers to the scroll container and calls
   `preventDefault`; the canvas's pointer handlers and the browser's `touch-action`
   arbitration stop being the source of truth. You end up choosing between orbit and
   scroll.
2. **It desyncs CSS scroll-driven animations.** Our entire scrub layer (§7–§9) is
   `animation-timeline`, which reads the real scroll offset on the compositor. Lenis
   animates the scroll offset from JS on each rAF. The compositor-thread timelines and the
   main-thread scroll writes then disagree by a frame or two, which shows up as shimmer on
   exactly the effects we care most about. Lenis and off-thread scroll timelines are
   architecturally opposed.
3. **Accessibility and native behaviour.** Even with Lenis's good-citizen features, you
   still take on: Ctrl/Cmd+F find-in-page scroll-to-match, screen-reader virtual-cursor
   scroll, `scroll-margin-top` / `scroll-padding-top` interaction, `:target`,
   `history.scrollRestoration='manual'` plus the per-route position map in `router.js`,
   browser back-forward cache restore, and keyboard Space/PageDown step size. Each is a
   known Lenis bug class. Native has none of them.
4. **Mobile.** iOS momentum and rubber-banding are tuned by the OS and cannot be
   reproduced. Lenis on iOS trades a native-feeling scroll for a slightly laggy
   JS-interpolated one. On a brief where phones must get the full story (`DESIGN.md`:
   *"Mobile keeps the full scroll-driven 3D story and WebGL camera journey; it uses native
   touch scrolling"*) this is a straight downgrade.
5. **It never stops.** Lenis runs a permanent rAF. Every loop in this spec self-terminates
   (`scrollFrame` latch, scene `settled < .002`, tilt per-node latch). Battery on phone
   matters for a page people scroll slowly.
6. **The reference is explicit.** `experience.css` line 21:
   *"A native-scroll, three-act product story. No wheel interception."*

### What to do instead — smooth the consumer, not the scrollbar

The perceived smoothness people attribute to Lenis comes from *the thing being animated*
easing toward a target, not from the scrollbar easing. Apply it where it belongs:

```js
/* frame-rate-independent exponential smoothing. 7 ≈ 143ms time constant. */
var dt = Math.min((now - last) / 1000, .04) || .016;
var k  = (paused || reduced) ? 1 : 1 - Math.exp(-dt * 7);
current += (target - current) * k;
```

- WebGL camera: `yaw`, `pitch`, `mode`, `progress` all smoothed this way (§2.2).
- The three-act device story: **not** smoothed — it is a direct 1:1 scrub, because the
  device must feel physically attached to the scroll. Smoothing it would make it feel
  loose.
- CSS scrubs: nothing to smooth; the compositor interpolates them.

That split — smooth the camera, hard-link the device — is a deliberate contrast and part
of why the reference's hero reads as expensive. Lenis would smooth both and flatten it.

```css
html{scroll-behavior:smooth;scroll-padding-top:100px}
.chapter-card,[id]{scroll-margin-top:120px}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
```

Last point: `window.scrollTo({behavior:'smooth'})` is used for the manual act jumps
(§2.3) — native smooth scrolling, and it respects the OS reduced-motion setting for free.

---

## 11. Anti-AI-look rules (hard bans)

The tell of AI-generated motion is **one animation applied to everything**:
`opacity 0→1, translateY(20px)→0, 600ms, ease-out, 100ms stagger`, on every heading, every
paragraph, every card, every image, in every section. The reference avoids this by giving
each element role its own physics. Reproduce that discipline.

### Banned

1. **Banned: a single reveal for all elements.** If `grep` finds one keyframe set applied
   to headings, copy, cards and images alike, the build has failed.
2. **Banned: identical durations across roles.** The reference ships **five**: 650 (copy),
   780 (headline / slide / panel), 880 (mask), 920 (sculpture), 940 (masked image inner).
   No two roles share a duration *and* a transform signature.
3. **Banned: `translateY`-only motion.** Only one of six archetypes (`copy`) is a pure Y
   lift. Everything else carries rotation, two-axis rotation, X displacement, a mask, or
   a perspective change.
4. **Banned: uncapped stagger.** `i * 100ms` on a 12-item grid is a 1.2 s tail that
   screams generated. Caps are mandatory: **48 ms/word capped at 480 ms**,
   **55 ms/item capped at 220 ms**.
5. **Banned: everything moving in the same direction.** `slide` alternates L/R by index;
   marquees alternate direction per strip; frame parallax alternates by `:nth-of-type`;
   band wipes alternate up/down; the two story chips move on opposite axes.
6. **Banned: no overshoot.** Every entrance in this spec passes its resting state and
   comes back — at offset `.68` (headline) or `.70` (blocks). A monotonic 0→1 ease is
   what a default library tween looks like.
7. **Banned: easing on a scrub.** Scrubbed animations are `linear`, always. An ease curve
   on a scroll-linked animation produces a stretch of scrolling where nothing appears to
   happen.
8. **Banned: replaying reveals on scroll-back.** One-shot, `observer.unobserve()` on fire.
   Re-triggering entrances is the single loudest template signal there is.
9. **Banned: animating anything but `transform`, `opacity` and `clip-path`.** No `height`
   (except the one measured, user-initiated accordion), no `top`, no `margin`, no
   `filter`, no `box-shadow`, no `width`.
10. **Banned: stacking two motion systems on one element.** No word-pop plus line-mask; no
    entrance transform plus `[data-tilt]` without the `pop-is-running` guard; no CSS
    `animation-timeline` on an element that WAAPI is also transforming.
    (`LOVABLE-HANDOFF.md`: *"Avoid applying competing transforms to the same element."*)
11. **Banned: blur as a reveal.** `filter:blur()` on entering text is both the most
    common AI-slop effect and a per-frame repaint of the text.
12. **Banned: hover states that add tension.** Cards rest rotated and *un-rotate* on hover
    (`rotate(-7deg) rotateY(-15deg)` → `rotate(0) rotateY(0) translateY(-8px)`).

### The variation matrix — the one table to check the build against

| role | trigger | property signature | duration | stagger |
|---|---|---|---|---|
| display heading | one-shot IO | per-word `rotateX -48°→+4°→0`, `scale 1.16→1`, `.95em` rise, `perspective(850px)` | 780 ms | 48 ms / cap 480 |
| sub-heading, pull-quote | scrub | line mask `translateY 102%→0` | scrub | 6 % range offset per line |
| body copy, inline CTA | one-shot IO | `translateY 48px→0`, `scale 1.035→1`, no rotation | **650 ms** | group only |
| manifesto paragraph | scrub | per-word `opacity .22→1`, 2.6-word overlap | scrub | windowed |
| repeated rows / small cards | one-shot IO | alternating `translateX ±82px`, `rotate ±1.4°→0`, `+32px` Y | 780 ms | 55 ms / cap 220 |
| large flat panels | one-shot IO | `rotateX 13°→−1°→0`, `scale .91→1`, `perspective(1100px)` | 780 ms | 55 ms / cap 220 |
| 3D art objects | one-shot IO | `rotateX 18°→−2°→0` **and** `rotateY −13°→+2°→0`, `scale .9→1` | **920 ms** | 55 ms / cap 220 |
| images | one-shot IO | `clip-path` mask (direction alternates) + inner `scale 1.085→1` | 880 / **940 ms** | 55 ms / cap 220 |
| images, continuous | scrub | `translateY −10.7%→0%` inside 112 % overscan, direction alternates | scrub | — |
| marquee strips | scrub | `translateX −3%→−24%`, direction alternates per strip | scrub | — |
| section boundaries | scrub | band `clip-path` wipe, direction alternates | scrub | — |
| outgoing sections | scrub | `scale 1→.925`, `translateY 0→−3.5%`, overlay `opacity 0→.32` | scrub | — |
| the one hero moment | one-shot IO | `clip-path circle(0%→72%→140%)` | 1040 ms | — |
| 3D device story | hard scrub | 11 coupled transforms off one `p` | scrub, unsmoothed | — |
| WebGL camera | smoothed scrub | `sin(p·π)` arc, `1-exp(-dt*7)` smoothing | — | — |
| buttons, links | hover / press | `translate(3px,-3px)`, `scaleX(0→1)` underline, `scale(.98)` press | **180 ms** | — |
| dialogs | user action | `translateY 12px`, `scale .98`, opacity | 250 in / 200 out | — |

Fifteen roles, fifteen signatures, eight distinct durations. That is what "not generic"
means operationally.

---

## 12. Additional copy-paste code for §7–§9

Add to the `<script>` from §6.2. The `frame` archetype plugs into the existing engine; the
word-fill and stack-dim hooks plug into the existing rAF loop.

### 12.1 The `frame` archetype (masked image reveal)

Add `['frame', '.frame, .image-card, figure[data-reveal]']` to `GROUPS`, then insert this
branch in `play()` **before** the `getComputedStyle` block:

```js
  /* --- F. frame: clip-path mask + inner counter-scale (two animations) ----- */
  if (kind === 'frame') {
    var openDown = index % 2 === 0;
    track(record, node, [
      { clipPath: openDown ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)', offset:0 },
      { clipPath: 'inset(0 0 0 0)',                                     offset:1 }
    ], { duration:880, delay:delay });
    var img = node.querySelector('img,picture,video,.frame-inner');
    if (img) track(record, img, [
      { transform:'scale(1.085) translateY(2.2%)', offset:0  },
      { transform:'scale(1.012) translateY(-.4%)', offset:.72},
      { transform:'scale(1) translateY(0)',        offset:1  }
    ], { duration:940, delay:delay });
    return;
  }
```

### 12.2 Scrubbed word-fill, wired into the rAF loop

```js
/* ---- setup once at boot ---------------------------------------------- */
var FILL_DIM = .22, FILL_OVERLAP = 2.6;
var fills = qa('[data-fill]').map(function(host){
  /* split into .word-dim spans, same a11y contract as the headline */
  var text = readableText(host).replace(/\s+/g,' ').trim();
  host.setAttribute('aria-label', text);
  var walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  nodes.forEach(function(tn){
    var frag = document.createDocumentFragment();
    tn.textContent.split(/(\s+)/).forEach(function(chunk){
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      var s = document.createElement('span');
      s.className = 'word-dim'; s.textContent = chunk; s.setAttribute('aria-hidden','true');
      frag.appendChild(s);
    });
    tn.replaceWith(frag);
  });
  return { host:host, words:qa('.word-dim', host), last:-1 };
});

/* ---- inside updateScroll(), in the WRITE phase ----------------------- */
fills.forEach(function(f){
  var rect = f.host.getBoundingClientRect();              /* hoist into the READ phase */
  if (rect.bottom < 0 || rect.top > innerHeight) return;
  if (reduced()) { f.words.forEach(function(w){ w.style.opacity = '1'; }); return; }
  var p = clamp01((innerHeight * .78 - rect.top) / Math.max(1, rect.height + innerHeight * .50));
  if (Math.abs(p - f.last) < .002) return;                /* skip sub-pixel re-writes */
  f.last = p;
  var lit = p * (f.words.length + FILL_OVERLAP);
  for (var i = 0; i < f.words.length; i++) {
    var k = clamp01((lit - i) / FILL_OVERLAP);
    f.words[i].style.opacity = String(FILL_DIM + (1 - FILL_DIM) * k);
  }
});
```

Hoist `f.host.getBoundingClientRect()` up into the READ batch at the top of
`updateScroll` in the real build — it is written inline above only to keep the snippet
readable. The `Math.abs(p - f.last) < .002` guard is what stops this from writing N
inline styles on every single frame of a slow scroll.

### 12.3 CSS-SDA feature flag + no-SDA fallback class

```js
/* let CSS and JS agree on who owns the scrubs */
var SDA = CSS.supports && CSS.supports('animation-timeline','view()');
document.documentElement.classList.toggle('has-sda', !!SDA);
document.documentElement.classList.toggle('no-sda',  !SDA);
```
```css
/* resting states live in the base rules, so .no-sda needs no extra work:
   bands open, frames centred, strips at -3%, stacks unscaled. */
.no-sda .stack>section{position:relative;top:auto;min-height:0}
```

Only wire the JS rAF fallback for an effect if its static resting state is genuinely not
good enough. For bands, stacks and strips it is.

### 12.4 Section-boundary helper (iris, one per page)

```js
/* register the single iris moment as a seventh archetype if you need it,
   or just fire it directly from the observer group it belongs to */
function iris(node, delay){
  if (reduced() || !node.animate) return;
  node.animate([
    { clipPath:'circle(0% at 50% 58%)',   offset:0  },
    { clipPath:'circle(72% at 50% 58%)',  offset:.74},
    { clipPath:'circle(140% at 50% 58%)', offset:1  }
  ], { duration:1040, easing:EASE, fill:'backwards', delay:delay || 0 });
}
```

### 12.5 Build checklist

- [ ] `.pop-pending{opacity:0}` and `.word-dim{opacity:.22}` resting states — the first
      added by JS only, the second safe in CSS because `.22` is still readable.
- [ ] Every scrub wrapped in `@supports(animation-timeline:view())`, every resting state
      authored in the base rule.
- [ ] Every scrubbed keyframe uses `linear`.
- [ ] `body{overflow-x:clip}`, every pin height in `svh`, `transform-origin:50% 0%` on
      stacked sections.
- [ ] Max 3 sticky-stacked sections; max 1 clip-path reveal per viewport height; exactly
      1 iris per page; sticky section stacking disabled under 760 px.
- [ ] Reduced-motion block un-pins `.scroll-story`, `.hero`, `.stack>section` and
      `.principle-card`, forces `.pop-pending`/`.pop-word`/`.word-dim` visible, sets
      `.line-mask{overflow:visible}`, kills `[data-tilt]`.
- [ ] `focusin` short-circuit present; `aria-label` on every split parent; `aria-hidden`
      on every word span; no `aria-live` on a scrubbed counter.
- [ ] Check the §11 matrix: no two roles sharing a duration *and* a transform signature.
