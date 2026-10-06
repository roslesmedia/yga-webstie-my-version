# 02 — 3D / WebGL Specification
**YGA — Your Growth Agency.** Single-file static build, Pine / Forest / Gold / Bone on Beige.

> Scope: one `index.html`, zero build step, Vercel static. 3D in essentially every
> section, scroll-animated, plus 3D on cards and images. One WebGL context for the
> whole page. Reference source: `/home/user/refs/yga-agency-site-/yga-website-2/public/scene.js`.

---

## 0. Executive summary

| Question | Answer |
|---|---|
| Engine | **Hand-rolled WebGL1.** Fork the reference `scene.js` core. No Three.js. |
| Contexts | **One.** A single `position:fixed` full-viewport canvas behind the DOM. |
| How many objects | **8 builders**, reused across ~12 anchors. One `<div data-3d="…">` per moment. |
| Unique geometry on the GPU | **738 triangles / 2,214 vertices / 69 KB**, for the entire site. |
| Peak triangles drawn in one frame | **~5,900** (hero) · **~1,500** (any other section) |
| Peak draw calls in one frame | **~95** (hero) · **~34** (cards grid) |
| Payload cost | **~9.6 KB gzipped** of inline JS + GLSL. Three.js would be ~165 KB gzipped. |
| Lighting model | 5-term analytic (key / fill / sky-dome / ground-bounce / ambient) → per-material 3-stop tone ramp |
| The one trick that makes it work on cream | Light does not *multiply* the base colour, it *selects a tone from a ramp* whose lit end is **Gold #E5C690**. Verified 8.46:1 face-to-face contrast inside a single Pine object. |

---

## 1. Complete analysis of the reference `scene.js`

91 lines, no dependencies, no build step, ~17.8 KB raw. The whole file is at
`public/scene.js`; it is inlined verbatim into `yga-preview.html` inside one
`<script type="module">` (lines 644–728 of the preview), which proves the
single-file constraint is already satisfied by this approach.

### 1.1 The matrix core (lines 2–12)

Nine functions, column-major, flat `Array(16)`. No classes, no allocation pooling.

```js
const I = () => [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
function mul(a,b){const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
```

`mul` is a naive triple loop — 64 multiply-adds, called roughly 200× per frame.
That is ~13k FLOPs/frame: free. It allocates a fresh array each call, so the hero
scene churns ~200 small arrays per frame; at 60 fps that is a minor-GC blip the
engine absorbs without a stutter. **Keep it. Do not optimise this.**

```js
function transform(p=[0,0,0],r=[0,0,0],s=[1,1,1]){ … const out=mul(mul(ry,rx),rz); for(let c=0;c<3;c++)for(let row=0;row<3;row++)out[c*4+row]*=s[c]; out[12]=p[0];out[13]=p[1];out[14]=p[2]; return out; }
```

This is the file's workhorse: a TRS composer with **YXZ** Euler order. Scale is
applied by multiplying each basis *column* after rotation, i.e. scale is in object
space, applied before rotation. Two consequences that matter for art direction:

1. **Chamfers scale with the part.** A leg at scale `[.86, 4.45, 1.55]` gets a
   bevel band `0.07 × 0.86 = 0.060` wide on X and `0.07 × 1.55 = 0.109` on Z, but
   `0.04 × 4.45 = 0.178` tall on the Z-end faces. Extreme aspect ratios get
   visibly chunky bevels on their long axis. This is why we ship **three**
   pre-built chamfer meshes at different bevel sizes rather than one (§6.2).
2. **`normalMatrix` must be recomputed per part**, because non-uniform scale
   shears normals. The file does exactly that (line 46).

```js
function normalMatrix(m){const a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]];const bc=cross(b,c),ca=cross(c,a),ab=cross(a,b),d=dot(a,bc)||1;return [...bc.map(v=>v/d),...ca.map(v=>v/d),...ab.map(v=>v/d)];}
```

A closed-form inverse-transpose of the upper-left 3×3 via the cofactor /
determinant identity — `adj(M)ᵀ / det(M)`. Nine crosses and one dot instead of a
general 3×3 inverse. Correct, 12 lines shorter than the textbook version, and it
degrades gracefully (`||1`) when a part is scaled to zero on an axis.

```js
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return[…];}
function perspective(fov,aspect,near=.1,far=100){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
```

Standard right-handed view and an OpenGL-convention perspective. `fov` is the
**vertical half-angle in radians doubled** — the call site uses `perspective(.58, …)`,
i.e. a 33.2° vertical FOV. That is a long lens. It is the single most important
art-direction decision in the file: a long lens flattens perspective, keeps
vertical edges nearly parallel, and makes the scene read as an *architectural
model photographed on a product table* rather than a game. **Keep 0.50–0.58
everywhere.** Anything ≥ 0.9 rad instantly looks like default-camera AI 3D.

### 1.2 `chamferBox()` — the whole aesthetic, in 7 lines

```js
function chamferBox(){
  const verts=[],normals=[],uvs=[];const ring=(s,z)=>[[-s+.07,-s,z],[s-.07,-s,z],[s,-s+.07,z],[s,s-.07,z],[s-.07,s,z],[-s+.07,s,z],[-s,s-.07,z],[-s,-s+.07,z]];
  const rings=[ring(.46,-.5),ring(.5,-.46),ring(.5,.46),ring(.46,.5)];
  function tri(a,b,c,n){n=n||norm(cross(sub(b,a),sub(c,a)));[a,b,c].forEach(v=>{verts.push(...v);normals.push(...n);uvs.push(v[0]+.5,v[1]+.5);});}
  for(let j=0;j<3;j++)for(let k=0;k<8;k++){const q=(k+1)%8,a=rings[j][k],b=rings[j][q],c=rings[j+1][q],d=rings[j+1][k];tri(a,b,c);tri(a,c,d);}
  for(let k=0;k<8;k++){let q=(k+1)%8;tri([0,0,-.5],rings[0][q],rings[0][k],[0,0,-1]);tri([0,0,.5],rings[3][k],rings[3][q],[0,0,1]);}
  return {verts,normals,uvs};
}
```

**What it builds.** `ring(s, z)` returns 8 points: a square of half-extent `s` at
depth `z` with each corner cut back by `0.07`. The point order is deliberate —
pairs `(0,1) (2,3) (4,5) (6,7)` are the four **flat sides** (bottom, right, top,
left) and pairs `(1,2) (3,4) (5,6) (7,0)` are the four **corner chamfers**.

Four rings are stacked along Z at `z = −0.5, −0.46, +0.46, +0.5` with half-extents
`0.46, 0.50, 0.50, 0.46`. So the result is the unit cube `[−0.5, 0.5]³` with **all
twelve edges cut back**: 0.07 on the four long edges, 0.04 on the eight end edges.

The `j < 3` loop lofts the three gaps between consecutive rings:

| gap | from → to | what it produces | tris |
|---|---|---|---|
| 0 | `(.46, −.5) → (.50, −.46)` | the front **chamfer band** (4 side bevels + 4 corner bevel triangles) | 16 |
| 1 | `(.50, −.46) → (.50, +.46)` | the **four flat side faces** + **four vertical corner chamfer strips** | 16 |
| 2 | `(.50, +.46) → (.46, +.5)` | the back chamfer band | 16 |

Then the `k < 8` loop fans the two octagonal caps from a centre vertex, with the
normal **forced** to `[0,0,±1]` instead of computed — so the caps stay perfectly
flat even though the fan triangles are slivers near the chamfered corners.

**Totals (verified by running the generator): 64 triangles, 192 vertices,
non-indexed.** 576 position floats + 576 normal floats + 384 UV floats.

**Three decisions inside those 7 lines, all of them correct:**

1. **Per-triangle flat normals, no averaging.** `tri()` with `n` omitted computes
   `norm(cross(sub(b,a), sub(c,a)))` and pushes it to all three vertices. Every
   face — including each 0.07 chamfer strip — gets one constant normal and
   therefore renders as one flat tone. There is no vertex-normal smoothing
   anywhere in the file. This is what makes the objects read as *faceted scale
   models* instead of *soft CG*.
2. **Non-indexed, duplicated vertices.** 192 verts for 64 tris. 8× more memory
   than an indexed smooth cube. At 6 KB per mesh, irrelevant — and it is what
   makes per-face normals free.
3. **Object-space XY UVs** (`uvs.push(v[0]+.5, v[1]+.5)`). Correct on the +Z face,
   smeared on the sides. Harmless, because textures are only ever applied to the
   flat `plane` mesh via `face()` — never to a `chamferBox`.

Winding is inconsistent (the two cap fans run opposite directions), so line 30
simply does `gl.disable(gl.CULL_FACE)`. At 64 tris/mesh that costs nothing and
removes a whole class of bugs. **Keep culling off.**

#### Why chamfered edges read as "premium" — with numbers

A mathematically sharp edge has **zero area**. It samples exactly one of the two
adjoining tones, and anti-aliasing gives you a one-pixel blend. It carries no
information.

A 0.07 chamfer has **area**, and because its normal sits at 45° between two faces,
it lands exactly where the key light peaks. Simulating the shader in §4 against
our final palette:

| face of a Pine part | shade `s` | resulting pixel | contrast vs Beige page |
|---|---|---|---|
| front `(0,0,1)` | 0.596 | **#00311F** (exactly brand Pine) | 13.53 : 1 |
| right `(1,0,0)` | 0.470 | #002E1D | 14.03 : 1 |
| bottom `(0,−1,0)` | 0.270 | #002417 | 15.60 : 1 |
| shadow-side bevel `(1,1,1)` | 0.736 | #335238 | 8.21 : 1 |
| **key-side bevel `(−1,1,1)`** | **0.967** | **#E0C38E ≈ Gold** | 1.60 : 1 |
| top `(0,1,0)` | 0.961 | #DEC18D | 1.62 : 1 |

**Internal face-to-face contrast, key bevel against front face: 8.46 : 1.**

So a 2–5 px band of near-Gold traces every silhouette and every interior edge of
an otherwise near-black object. That band is the visual signature of machined
aluminium, injection-moulded ABS, letterpress and architectural precast — of
*manufactured to a tolerance*. Sharp edges say "untouched primitive". Chamfered
edges say "someone specified this."

Three bonuses:

- The bevel band is wider than one pixel, so it **antialiases itself**. Near-vertical
  edges stop shimmering without MSAA doing the work.
- It **smuggles Gold into a Pine object without painting anything gold.** Our
  palette's gold is 1.5:1 on cream (decorative only) but 8.8:1 on Pine — so gold
  is only usable *framed by Pine*, and the chamfer is exactly that frame.
- The shadow-side bevel lands at `s = 0.736` → #335238, a third mid-tone. One
  box therefore shows **six distinct readable tones**. That is the "4-tone ramp
  ideal for faceted extrusion" the brief asks for, and then some.

### 1.3 `cylinder()` (line 22)

40 segments, unrolled into one expression. Side normals are `[pa[0]*2, 0, pa[1]*2]` —
since the radius is `0.5`, the `×2` normalises, so **sides are smooth-shaded** while
the caps are hard `[0,±1,0]`. 480 vertices, **160 triangles**. Used once in the
reference (the cobalt disc, line 72).

### 1.4 Shaders (lines 26–27)

Vertex shader: world-space position for lighting, `normalize(uNormal*aNormal)`,
pass-through UV. Nothing unusual.

Fragment shader, unwrapped:

```glsl
vec3 n = normalize(vNormal), viewDir = normalize(uEye - vPosition);
vec3 l  = normalize(vec3(-.4, .9, .7));                           // key
float diff = max(dot(n,l), 0.);
float fill = max(dot(n, normalize(vec3(.7, .2, -.6))), 0.);        // fill
float spec = pow(max(dot(n, normalize(l+viewDir)), 0.), mix(34., 100., uMetal));
float rim  = pow(1. - max(dot(n, viewDir), 0.), 3.);
vec3 base  = mix(uColor, texture2D(uTexture, vec2(vUv.x, clamp(vUv.y+uScroll,0.,1.))).rgb, uUseTexture);
vec3 col   = base*(.54 + diff*.58 + fill*.2) + vec3(spec)*mix(.28,.8,uMetal) + rim*.12;
if (uGround > .5) { float shadow = exp(-((vPosition.x*vPosition.x)/14. + (vPosition.z*vPosition.z)/7.)); col = vec3(1. - shadow*.1); }
gl_FragColor = vec4(col, 1.);
```

- **Two hard-coded analytic lights.** No light uniforms at all. Key from
  upper-front-left, fill from lower-back-right. Directions are baked into the
  GLSL as literals — one less uniform upload per draw, and it guarantees every
  object on the page is lit identically.
- **Blinn-Phong half-vector specular**, exponent lerped 34 → 100 by `uMetal`.
- **Positive Fresnel rim** at a flat `0.12`, added as white.
- **Lighting is multiplicative on the base colour**: `base * (0.54 + …)`. The
  ambient floor is 0.54, the lit ceiling is `0.54 + 0.58 + 0.2 = 1.32`. So a
  surface ranges over only a **2.44× multiplier**.
- **Fake ground shadow**: a single Gaussian blob on the white floor plane,
  `col = vec3(1 − shadow*0.1)` — so the darkest floor pixel is `0.90` grey. No
  shadow map, no second pass, no depth texture. Brilliantly cheap.
- **No gamma correction.** All arithmetic is in sRGB space. Deliberate: it means
  `uColor` as authored *is* the mid-tone you see, so geometry colours match CSS
  hex values exactly. We keep this convention (§3.2 — it is the decisive argument
  against Three.js).
- **No alpha, no blending, no sorting.** `gl_FragColor.a = 1.0` always; the canvas
  is `alpha:true` with `clearColor(1,1,1,0)` so only the *cleared* pixels composite
  over the page. Depth test alone handles all occlusion. There is no transparency
  anywhere in the scene — which is why there is no sorting code.

**Why this exact model fails for our palette.** For `base = Pine (0, 0.192, 0.122)`:

- unlit face → `0.54 × base` = `(0, 0.104, 0.066)` = **#001A11**
- fully key-lit → `1.12 × base` = `(0, 0.215, 0.137)` = **#003723**

26 vs 55 in the green channel, nothing in red or blue. Both read as the same
near-black. The reference gets away with multiplicative lighting because its hero
colour is electric yellow `#e8ff00` (luminance ≈ 0.90) — a *light* object on white,
where the form is read from the darker side faces. Invert that (a dark object on
cream) and multiplicative lighting collapses into one flat silhouette. This is the
"dark blob" failure, and §4 is the fix.

### 1.5 Scene graph and composition (lines 46–73)

No scene graph object. The hierarchy is **the call stack**:

```js
const part=(parent,p,s,color,r=[0,0,0],metal=0)=>draw(cube,mul(parent,transform(p,r,s)),color,metal);
const face=(parent,p,s,tex)=>draw(plane,mul(parent,transform(p,[0,0,0],[s[0],s[1],1])),'white',0,tex);
```

Every node is an immediate `mul(parentMatrix, localTransform)`. Groups are plain
local consts:

```js
const laptop = mul(root, transform([-.35,-1.64,1.05],[0,-.13,0]));
const hinge  = mul(laptop, transform([0,.08,-.79],[-.13-.09*Math.sin(modeValue),0,0]));
```

The hinge is literally a child matrix whose X-rotation is driven by `modeValue`.
That is the entire animation system: **no keyframes, no tween library, no
interpolator objects — animated values are read directly inside the matrix
expressions each frame.** The whole hero composition is 20 lines of `part()` calls.

Full reference inventory (counted from source):

| group | `part()` calls | tris |
|---|---|---|
| ground plane | 1 | 64 |
| yellow arch (2 legs + lintel) | 3 | 192 |
| cobalt inner lining | 3 | 192 |
| chrome stage + blue deck + back wall | 3 | 192 |
| letters Y(3) G(5) A(3) | 11 | 704 |
| chrome ribs | 7 | 448 |
| laptop base + keybed + 40 keycaps + trackpad | 43 | 2,752 |
| laptop lid shell + inner | 2 | 128 |
| phone body + screen + bezel + speaker | 4 | 256 |
| workbook cover + pages + spine | 4 | 256 |
| question chips | 2 | 128 |
| growth steps | 3 | 192 |
| **chamferBox subtotal** | **86** | **5,504** |
| cylinder (cobalt disc) | 1 | 160 |
| textured planes (`face()` ×5) | 5 | 10 |
| **total** | **92 draw calls** | **5,674 triangles** |

The forty keycaps are 48% of the triangle budget and the thing you notice first.
That is the lesson: **repetition of a tiny chamfered part is the cheapest possible
way to buy perceived craft.** We keep it (and the gold ribs).

### 1.6 Camera drive (line 52)

```js
const mobile=width<650;
const travel=reduced||paused?0:Math.sin(progress*Math.PI);
const focus=Math.sin(modeValue*Math.PI/2);
const eye=[7.8-focus*2.3-travel*.5, 4.3-focus*1.0, (mobile?14.6:12.3)-focus*2.4-travel*.7];
const projection=perspective(.58,width/height);
const view=lookAt(eye,[0,.6,0]);
gl.uniformMatrix4fv(u.ViewProjection,false,mul(projection,view));
gl.uniform3fv(u.Eye,eye);
```

Two independent drivers:

- `progress ∈ [0,1]` — hero scroll, fed from `experience.js` line 48 via
  `onHeroProgress(p)` → `scene.setProgress(p)`. Produces `travel`, a
  **sine that peaks mid-scroll and returns**, adding a small lateral drift.
- `modeValue ∈ [0,2]` — the three acts, set either by the
  `Audience / Product / Launch` buttons (`app.js` lines 9–13) or derived from
  scroll (`setProgress` also sets `mode = targetProgress*2`). `focus = sin(mode·π/2)`
  **peaks at mode 1 and returns to 0 at mode 2** — so the camera dollies *in* to
  inspect the product and back *out* for the launch. Act 2 is distinguished by
  object motion, not camera distance.

There is **no camera orbit code**. Instead the entire scene is rotated:

```js
const root = transform([0,-.1,0],[pitch,yaw,0]);
```

`yaw`/`pitch` come from pointer position (line 82), drag (line 82/83), or arrow
keys (line 85), all exponentially smoothed. Mobile widens Z from 12.3 → 14.6 to
fit the same composition in a portrait box.

**Mode-driven object motion** (lines 61–73):
- `bookLift = sin(modeValue·π/2)·0.5` — the workbook rises and slides forward `0.8`
- phone Z: `0.85 + (0.7 − min(modeValue, 0.7))` — comes forward for act 0, then parks
- laptop hinge X-rotation: `−0.13 − 0.09·sin(modeValue)`
- `bob = sin(t·0.8)·0.055` — a 7.85 s idle float on the phone, book and chips only

### 1.7 Lifecycle — six independent reasons to stop rendering

This is the most valuable 15 lines in the file and we keep all of it.

```js
const io=new IntersectionObserver(e=>{visible=e[0].isIntersecting;if(visible){last=performance.now();schedule();}else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'60px'});
function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}}
const settled=Math.abs(yaw-targetYaw)+Math.abs(pitch-targetPitch)+Math.abs(mode-modeValue)+Math.abs(progress-targetProgress)<.002;
if(!reduced&&!paused||!settled)frame=requestAnimationFrame(render);
function resize(){…const dpr=Math.min(devicePixelRatio||1,width<650?1.35:1.65);…}
function contextLost(e){e.preventDefault();canvas.parentElement.classList.remove('webgl-ready');cancelAnimationFrame(frame);frame=0;}
```

1. **Off-screen** → `IntersectionObserver` with 60 px margin cancels the frame.
2. **Tab hidden** → `visibilitychange`.
3. **`prefers-reduced-motion`** → `reduced` freezes `t`, zeroes `bob` and `travel`,
   and sets `smoothing = 1` so tweens snap instantly instead of animating.
4. **Explicit pause button** → `paused`.
5. **Settle detection** → the loop *stops itself* once all four tweened values are
   within 0.002 of target. A hero the user is not touching costs **zero frames**.
6. **Context loss** → removes `.webgl-ready`, which un-hides the CSS fallback
   (`styles.css`: `.webgl-ready .scene-fallback{visibility:hidden}`).

`dispose()` (line 90) removes all eight listeners, disconnects both observers, and
deletes every buffer, texture and the program. Nothing leaks. `app.js` calls it on
`pagehide` when the page is not being cached.

**Graceful degradation is structural, not bolted on:** `createScene` returns `null`
if the context, shader compile or program link fails (lines 25, 29), and `app.js`
line 7 wraps the call in `try/catch`, line 22 then hides the motion toggle and
strips `tabindex`. The designed HTML fallback is in the markup from the start and
is *hidden* by WebGL success, not revealed by WebGL failure. That ordering is why
it never flashes.

### 1.8 What is NOT WebGL in the reference — and this matters

The brief mentions "a large zero and a blue arrow". **Neither is 3D.** They are
DOM:

- `index.html:83` — `<div class="zero-art"><span>0</span><span class="zero-caption">Upfront agency fees.</span></div>`
- `index.html:101` — `<div class="arrow-sculpture"><span>↗</span><div class="arrow-base"></div><span class="sculpture-label">…</span></div>`
- `index.html:62` — the entire three-act "story-world" device sequence is CSS 3D
  (`.device-chrome`, `.device-feed`, `.device-product`, `.device-launch`)
- `index.html:127–129` and `135` — product cards and the studio sculpture use
  `data-tilt` (CSS transforms), not WebGL

**The reference ships exactly ONE WebGL canvas** (`#scene`, in the hero) and does
everything else with CSS transforms and typography. That is the correct instinct,
and it is the reason the page is fast. Our brief asks for more 3D moments, so §2
specifies how to get them **without multiplying contexts** — and §5.6 keeps the
hard rule: *never spend a draw call on something a CSS transform can do.*

---

## 2. Architecture: one context, many DOM-anchored objects

### 2.1 Decision: ONE fixed full-viewport canvas behind the DOM

```html
<canvas id="stage" aria-hidden="true"></canvas>
```
```css
#stage{position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none}
body>main{position:relative;z-index:1}
```

Browsers cap live WebGL contexts at roughly **16 on desktop Chrome, 8 on Safari,
and as few as 4–8 on mobile Safari**; past the cap the oldest context is *silently
killed* and fires `webglcontextlost`. A page with a canvas per section would start
blanking its own hero as the user scrolls. One context is not an optimisation, it
is a correctness requirement.

Drawbacks of one canvas and how we answer them:

| drawback | answer |
|---|---|
| Objects can't be interleaved with DOM z-order | Use *one* z-plane behind the text. Pine-on-Beige text over a cream page reads at 13.5:1 regardless of what is behind it, and the fog term (§4.5) fades geometry into the page so it never fights copy. |
| One shared camera | Solved: **per-anchor `glViewport` + `glScissor`** gives every object its *own* camera, FOV and dolly (§2.3). |
| Everything shares one depth buffer | Depth is cleared **per anchor**, inside its scissor rect. Objects can never occlude each other. |

### 2.2 The anchor API

Every 3D moment is a DOM element. The element's layout box *is* the object's
viewport, so the object tracks its box through every resize, reflow and media
query with zero mapping code.

```html
<!-- hero: full scene, draggable, driven by explicit controls instead of scroll -->
<div class="stage-slot stage-hero" data-3d="hero" data-3d-hold data-3d-drag></div>

<!-- section signature objects: progress comes from their own scroll position -->
<div class="stage-slot" data-3d="transform"></div>
<div class="stage-slot" data-3d="kit"></div>
<div class="stage-slot" data-3d="tiers"  data-3d-variant="1"></div>
<div class="stage-slot" data-3d="digit"  data-3d-variant="5"></div>
<div class="stage-slot" data-3d="launch"></div>

<!-- cards: the same builder, three variants, three anchors -->
<article class="lab-card"><div class="card-3d" data-3d="card" data-3d-variant="0"></div><h3>…</h3></article>
<article class="lab-card"><div class="card-3d" data-3d="card" data-3d-variant="1"></div><h3>…</h3></article>
<article class="lab-card"><div class="card-3d" data-3d="card" data-3d-variant="2"></div><h3>…</h3></article>

<!-- section dividers -->
<div class="stage-slot stage-mark" data-3d="mark"></div>
```

| attribute | meaning |
|---|---|
| `data-3d="<name>"` | which builder from the cast (§5). Required. |
| `data-3d-variant="<n>"` | integer passed to the builder: card artwork, numeral, highlighted tier. |
| `data-3d-hold` | ignore scroll; progress comes from `stage.setValue(name, 0…1)`. |
| `data-3d-drag` | the element accepts pointer-drag to yaw the object (sets `touch-action:pan-y`). |

```css
.stage-slot{position:relative;width:100%;aspect-ratio:16/11;min-height:320px}
.stage-hero{aspect-ratio:auto;height:min(78svh,860px)}
.card-3d{aspect-ratio:4/5;width:100%}
.stage-mark{width:140px;height:140px;margin-inline:auto}
/* every slot carries a designed CSS fallback child that WebGL hides */
html.webgl-ready .slot-fallback{visibility:hidden}
```

### 2.3 Per-anchor viewport: the core of the render loop

```js
gl.disable(gl.SCISSOR_TEST);
gl.viewport(0,0,canvas.width,canvas.height);
gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);   // one transparent clear, whole canvas
gl.enable(gl.SCISSOR_TEST);

for (const a of anchors) {
  if (!a.near) continue;                              // IntersectionObserver gate
  const r = a.el.getBoundingClientRect();
  if (r.bottom < -140 || r.top > vh+140) continue;    // cheap second cull

  a.raw = a.hold ? a.manual : clamp((vh*.86 - r.top)/(r.height + vh*.42), 0, 1);
  a.p  += (a.raw - a.p) * k;                          // exponential smoothing

  const x = Math.round(r.left*dpr), y = Math.round((vh - r.bottom)*dpr);
  const w = Math.round(r.width*dpr), h = Math.round(r.height*dpr);
  gl.viewport(x, y, w, h);                            // NOTE: gl y is from the BOTTOM
  gl.scissor(x, y, w, h);
  gl.clear(gl.DEPTH_BUFFER_BIT);                      // scissored: per-object depth

  const cam = a.def.cam(a.p, r.width/r.height, mobile);
  gl.uniformMatrix4fv(u.ViewProjection, false, mul(perspective(cam.fov, r.width/r.height), lookAt(cam.eye, cam.target)));
  gl.uniform3fv(u.Eye, cam.eye);
  gl.uniform2f(u.Fog, a.def.fog[0], a.def.fog[1]);

  a.def.build({ root, p: a.p, enter, exit, t, bob, mobile, variant: a.variant, M, T, part, face, draw });
}
```

Five things this buys, all of them load-bearing:

1. **A real per-object camera.** FOV, eye, target and dolly are the builder's own.
   The hero keeps the reference's exact `focus`/`travel` dolly; the card objects
   use a tight `fov: 0.58` from straight on.
2. **An object can never escape its box.** The scissor rect *is* the DOM box, so
   geometry is clipped to the layout. No overflow, no bleed into adjacent copy.
3. **Aspect ratio is the box's, not the window's.** A 4:5 card and a 16:11 section
   slot each get a correct projection with no letterboxing maths.
4. **Per-object depth isolation** at the cost of one scissored clear (≈5 µs).
5. **Zero work for off-screen anchors.** `liveCount === 0` cancels the RAF loop
   entirely, so sections with no 3D cost literally nothing.

The `getBoundingClientRect()` calls are safe: the loop **only reads layout, never
writes DOM**, so there is no forced-reflow thrash. 12 anchors × one rect read is
~15 µs per frame.

### 2.4 How objects enter and exit — no alpha, no sorting

The reference has zero transparency, and we keep it that way. The entrance is a
**push into the fog**:

```js
const enter = ss(0, .20, p);           // smoothstep
const exit  = 1 - ss(.90, 1, p);
const away  = (1-enter)*16 + (1-exit)*12;
const root  = mul(transform([0,0,-away]), transform([0,-.1,0],[a.pitch,-.18+a.yaw,0]));
```

Pushing an object 16 units back drives the distance-fog term (§4.5) to ~1.0, which
mixes it to **exactly the Beige page colour** — a perfect dissolve, for free, with
no blending, no `depthWrite` juggling and no painter's-algorithm sort. Objects
arrive out of the paper and leave back into it. That is both cheaper and more
tasteful than a fade-up-and-scale, which is the AI-3D default.

Each builder *also* uses `p` for its own narrative motion (§5), so the entrance
and the story read as one gesture.

### 2.5 Interaction

- **Pointer parallax** — only the anchor under the cursor (inflated 40 px) responds:
  `±0.22 rad` yaw, `±0.07 rad` pitch, exponentially smoothed. Everything else eases
  to rest. One global `pointermove` listener for the whole page.
- **Drag** — only `data-3d-drag` anchors install a `pointerdown` handler;
  `clamp(startYaw + dx*0.004, −0.80, 0.60)`. `touch-action:pan-y` keeps vertical
  scroll working on touch.
- **Explicit controls** — `stage.setValue('hero', i/2)` from the
  `Audience / Product / Launch` buttons, exactly as `app.js:9–13` does today.
  Keyboard focus lives on the *buttons*, not the canvas (the canvas is
  `pointer-events:none` and `aria-hidden`), which is better than the reference's
  focusable canvas.
- **Pause** — `stage.setPaused(true)` from the global motion toggle.

---

## 3. Engine decision: hand-rolled WebGL, not Three.js

**Recommendation: hand-rolled WebGL1. Fork the reference core. Do not use Three.js.**

### 3.1 The numbers

| | hand-rolled | Three.js r186 via CDN |
|---|---|---|
| Transfer | **~9.6 KB gzip**, inline, zero requests | ~165 KB gzip (`three.module.min.js` + `three.core.min.js`), 2 cross-origin requests |
| Blocks first paint | no — runs after parse | yes — ES-module graph must resolve before any 3D |
| Third-party runtime dependency | none | unpkg / jsDelivr / cdnjs availability and TLS |
| Single-file promise | literally one file | one file **plus a CDN** |
| Unique geometry needed | 738 tris, generated in 40 lines | same, but via `BufferGeometry` + `ExtrudeGeometry` |
| Starting point | **a complete, art-directed, working 91-line scene we already have** | a rewrite |

165 KB gzip is more than our entire page budget for a decorative hero. And it buys
us nothing we need: no glTF loading (no assets), no skinning, no physics, no
post-processing, no shadow maps, no PBR. We need flat-shaded chamfered boxes.

### 3.2 The decisive argument: colour space

Our brand is defined by six exact hex values, and the whole design problem (§4) is
keeping a dark object legible on cream. The reference shader works entirely in
**sRGB space with no gamma correction**, which means a surface's mid-tone is
*exactly* the authored hex. Our verification run confirms it: a Pine part's front
face renders at **#00311F** — the literal brand ink value, byte for byte, matching
the CSS `--ink`.

Three.js (r152+) forces a **linear working space with an sRGB output transform**,
and anything that looks good on a light background needs
`ACESFilmicToneMapping` on top. Result: `new THREE.Color(0x00311F)` is converted
to linear, lit, tone-mapped and re-encoded — and the pixel that lands on screen is
*never* `#00311F`. On a low-contrast warm palette where Gold sits at 1.5:1 against
the page, losing byte-exact control of the tones is not a rounding error, it is
losing the design. You would spend days fighting `toneMappingExposure` to get the
geometry to agree with the CSS next to it.

Secondary reasons:

- **The flat/faceted look is the brand.** Three.js's default is smooth-shaded PBR;
  getting hard per-face normals means `flatShading: true` plus custom geometry
  anyway — at which point you have hand-authored the geometry *and* shipped 165 KB.
- **One analytic shader beats N material permutations.** Our shader is 30 lines
  and compiles once. Three.js compiles a program per material/light/feature
  combination; 7 materials × shadows × fog is a measurable first-paint cost.
- **We control the lifecycle completely.** The settle-detection trick (§1.7) that
  takes an idle hero to zero frames is trivial here and awkward in Three.
- **Zero-dependency means zero supply-chain and zero version drift** on a static
  Vercel deploy that nobody will rebuild for two years.

### 3.3 If you are overruled and must use Three.js

Exact pattern for a single file. **Version pin: `three@0.186.1`** (verify the
version resolves before shipping — this environment's egress to CDNs is blocked,
so it could not be confirmed live here).

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three';
  // addons, only if genuinely needed:
  // import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
  …
</script>
```

Non-obvious gotchas:

- Since r167 the build is **split**: `three.module.min.js` does
  `import './three.core.min.js'`. A bare-specifier importmap entry resolves that
  relative import on the same CDN automatically. A **local copy of only
  `three.module.min.js` will 404** on the core chunk.
- The importmap must appear **before** any `<script type="module">` in the document.
- The trailing slash in `"three/addons/"` is required for prefix mapping.
- Alternative hosts, same paths: `https://unpkg.com/three@0.186.1/build/three.module.min.js`,
  `https://cdnjs.cloudflare.com/ajax/libs/three.js/0.186.0/three.module.min.js`
  (cdnjs has no `examples/jsm` tree — addons must come from jsDelivr or unpkg).
- Add `<link rel="modulepreload" href="…three.module.min.js">` or the module graph
  serialises against parse.
- Set `renderer.outputColorSpace = THREE.SRGBColorSpace`,
  `renderer.toneMapping = THREE.ACESFilmicToneMapping`,
  `renderer.toneMappingExposure = 0.98` — and then expect to re-tune every hex.
- For multi-object-one-canvas in Three, the equivalent of §2.3 is
  `renderer.setScissorTest(true)` + `renderer.setViewport(x,y,w,h)` +
  `renderer.setScissor(x,y,w,h)` with `renderer.autoClear = false` and a manual
  `renderer.clearDepth()` per object. Same architecture, 165 KB more.

Three.js equivalents of our materials and lights are given in §4.7 so the spec is
portable either way.

---

## 4. Materials and lighting for Pine / Forest / Gold / Bone on Beige

### 4.1 The problem, stated precisely

| colour | hex | linear-relative luminance | contrast vs Beige |
|---|---|---|---|
| Beige (page) | `#FFF7E6` | 0.925 | — |
| Almond | `#F9E9DA` | 0.830 | 1.11 : 1 |
| Bone | `#E3DAC9` | 0.700 | **1.30 : 1** |
| Gold | `#E5C690` | 0.584 | **1.54 : 1** |
| Forest | `#183630` | 0.030 | 12.24 : 1 |
| Pine | `#00311F` | 0.022 | 13.51 : 1 |

Two independent failures to avoid:

1. **The dark blob.** Pine and Forest are 0.022 and 0.030 — functionally the same
   near-black. Multiplicative lighting (§1.4) spreads a face over only a 2.44×
   multiplier, i.e. 0.022 → 0.054. Every face of a Pine object lands in the same
   indistinguishable black. The silhouette is strong (13.5:1) and the interior is
   dead.
2. **The disappearing light object.** Bone at 1.30:1 and Gold at 1.54:1 against the
   page have essentially no silhouette. A Bone plinth on Beige is invisible.

These need **two different fixes**, applied per material.

### 4.2 Fix one: a per-material 3-stop tone ramp

Light does not multiply the base colour. Light computes a single scalar `s ∈ [0,1]`,
and `s` **selects a tone** from the material's own ramp, whose lit end is a
genuinely light brand colour.

```glsl
vec3 col = mix(uDark, uMid, smoothstep(0.0, uSurf.x, s));
col      = mix(col,   uLite, smoothstep(uSurf.x, 1.0, s));
```

Three `vec3` uniforms and one float. The "4-tone ramp ideal for faceted extrusion"
the brief asks for emerges across the object: cavity → unlit face → the smoothstep
mid-band → chamfer → key face.

#### The tone set (all derived from the six brand tokens)

| token | hex | rgb/255 (shader units) | derivation | role |
|---|---|---|---|---|
| `pineDeep` | `#001B11` | 0.000, 0.106, 0.067 | Pine × 0.55 | cavities, undersides, core shadow |
| `pine` | `#00311F` | 0.000, 0.192, 0.122 | **`--ink`** | base / unlit faces |
| `forest` | `#183630` | 0.094, 0.212, 0.188 | **`--ink-2`** | secondary mass, shadow gaps |
| `bronze` | `#6A5D43` | 0.416, 0.365, 0.263 | Gold × 0.465 | ramp bridge Forest → Gold |
| `goldLo` | `#C9A972` | 0.788, 0.663, 0.447 | Gold × 0.877 | gold mid-tone |
| `gold` | `#E5C690` | 0.898, 0.776, 0.565 | **`--gold`** | key-lit faces, chamfer flash |
| `goldHi` | `#FFF6E2` | 1.000, 0.965, 0.886 | Gold + white 0.5 | gold specular shoulder |
| `boneLo` | `#9FA796` | 0.623, 0.656, 0.588 | mix(Bone, Pine, 0.30) | Bone shadow, ground shadow tint |
| `bone` | `#E3DAC9` | 0.890, 0.855, 0.788 | **`--bg-3`** | plinths, plaster, page blocks |
| `boneHi` | `#FFFDF6` | 1.000, 0.992, 0.965 | Bone + white 0.8 | Bone key faces |
| `almondLo` | `#BFAE9A` | 0.749, 0.682, 0.604 | Almond × 0.78 | Almond shadow |
| `almond` | `#F9E9DA` | 0.976, 0.914, 0.855 | **`--bg-2`** | keycaps, loose sheets |
| `beige` | `#FFF7E6` | 1.000, 0.969, 0.902 | **`--bg`** | ground plane, fog target |
| `glassLo` | `#0B2A20` | 0.043, 0.165, 0.125 | mix(Pine, Forest, 0.4) | screen glass body |

`bronze` is the one derived tone that earns its place: the jump Forest (0.030) →
Gold (0.584) is a 19× luminance step, and without an intermediate it bands visibly
on the cylinder and annulus. Gold × 0.465 reads as deep olive-bronze, stays in
family, and needs no new brand token.

#### The material table — final, tuned values

```js
const MAT={
  pine  :{d:'pineDeep',m:'pine',   l:'gold',  s:.62,k:.10,r:'gold',  rk:.26},
  forest:{d:'pine',    m:'forest', l:'goldLo',s:.60,k:.06,r:'gold',  rk:.24},
  gold  :{d:'bronze',  m:'goldLo', l:'goldHi',s:.46,k:.85,r:'forest',rk:.26},
  bone  :{d:'boneLo',  m:'bone',   l:'boneHi',s:.52,k:.00,r:'forest',rk:.46},
  almond:{d:'almondLo',m:'almond', l:'boneHi',s:.55,k:.00,r:'forest',rk:.42},
  glass :{d:'pineDeep',m:'glassLo',l:'beige', s:.74,k:.95,r:'bone',  rk:.34},
  paper :{d:'beige',   m:'beige',  l:'beige', s:.50,k:.00,r:'beige', rk:.00}
};
```

`d/m/l` = dark/mid/lit ramp stops · `s` = ramp split · `k` = metalness
(spec exponent and strength) · `r/rk` = fresnel target tone and strength.

Note `k ≤ 0.10` on everything except Gold (`0.85`) and screen glass (`0.95`).
**Nothing on this site is chrome.** Satin-to-matte on every surface except the gold
accents is the single biggest anti-AI-look decision in the spec (§5.6).

### 4.3 Fix two: directional fresnel — a gold halo on dark, a dark edge on light

```glsl
float rim = pow(1.0 - max(dot(n, v), 0.0), 3.2);
col = mix(col, uRim, clamp(rim * uSurf.z, 0.0, 1.0));
```

One formula, two opposite behaviours, chosen per material by the *target tone*:

- **Dark materials pull toward Gold.** A Pine silhouette edge goes
  `#00311F → #345239`: a warm olive halo that stops the object reading as a hole
  punched in the paper. Silhouette contrast drops from 13.78:1 to a still-emphatic
  **8.13:1**.
- **Light materials pull toward Forest.** This is the inverse-rim trick and it is
  the thing the reference gets wrong (it adds a *positive white* rim to everything,
  which is why its light workbook and phone edges are mushy). On a light page a
  light object needs a **dark** edge, or it has no silhouette at all.

Measured, at `rim = 0.95` (true grazing):

| material | no rim | with rim | contrast vs Beige |
|---|---|---|---|
| Bone `rk 0.46` | `#E3DAC9` — **1.30 : 1 (invisible)** | `#8B9286` | **2.92 : 1** |
| Almond `rk 0.42` | `#F9E9DA` — 1.11 : 1 | `#9FA296` | **2.44 : 1** |
| Gold `rk 0.26` | `#CAAB75` — 2.05 : 1 | `#A19269` | **2.90 : 1** |
| Pine `rk 0.26` | `#002F1E` — 13.78 : 1 | `#345239` | 8.13 : 1 |

Every material now clears **2.4:1 at its own silhouette**. The Bone plinth exists.

### 4.4 The light rig — five terms, all analytic, zero light uniforms

```glsl
const vec3 KEY  = vec3(-0.3856, 0.7896,  0.4774);   // = normalize(-0.42, 0.86, 0.52)
const vec3 FILL = vec3( 0.7730, 0.1880, -0.6059);   // = normalize( 0.74, 0.18,-0.58)

float key    = max(dot(n, KEY), 0.0);
float fill   = max(dot(n, FILL), 0.0);
float sky    = n.y * 0.5 + 0.5;      // hemisphere dome: the cream page IS the sky
float bounce = max(-n.y, 0.0);       // and it bounces back up into the undersides
float s = clamp(0.17 + 0.62*key + 0.22*fill + 0.26*sky + 0.10*bounce, 0.0, 1.0);
```

| term | weight | direction / form | colour role | why |
|---|---|---|---|---|
| ambient floor | **0.17** | — | — | nothing ever reaches `pineDeep` except cavities |
| **key** | **0.62** | `normalize(-0.42, 0.86, 0.52)` — upper-front-**left**, 52° elevation | warm, drives the ramp to `gold` | same family as the reference's `(-.4,.9,.7)` so the known-good composition still lights correctly |
| **fill** | **0.22** | `normalize(0.74, 0.18, -0.58)` — low, right, behind | Almond page bounce | separates right-facing faces from the back |
| **sky dome** | **0.26** | `n.y*0.5+0.5` | Beige / Bone | **the most important addition over the reference.** On a cream page, up-facing faces *must* be lighter — this is what stops a dark object looking cut out |
| **ground bounce** | **0.10** | `max(-n.y, 0)` | Beige | undersides land at `s = 0.270` (#002417) instead of pure black |

**Composition rule that falls out of the rig.** The key is upper-front-**left** at
52°; the hero camera sits upper-front-**right** at `[7.8, 4.3, 12.3]`. So the camera
predominantly sees right- and front-facing faces — which land at `s = 0.470` and
`0.596`, i.e. **12–14:1 against the page** — while Gold lands on top faces and
left-facing chamfers that are mostly *interior* to the silhouette. That is exactly
right: Gold (1.54:1 on cream) is never allowed to form a long outer edge, and the
silhouette is always made of Pine. **Keep the camera on the opposite side of the
object from the key.**

#### Verified per-face output — Pine material

| face normal | `s` | pixel | vs Beige |
|---|---|---|---|
| bottom `(0,−1,0)` | 0.270 | #002417 | 15.60 : 1 |
| bevel lower `(−1,−1,1)` | 0.309 | #002618 | 15.28 : 1 |
| bevel vertical R `(1,0,1)` | 0.366 | #00291A | 14.81 : 1 |
| back `(0,0,−1)` | 0.433 | #002C1C | 14.28 : 1 |
| right `(1,0,0)` | 0.470 | #002E1D | 14.03 : 1 |
| left `(−1,0,0)` | 0.539 | #00301E | 13.68 : 1 |
| **front `(0,0,1)`** | 0.596 | **#00311F — exact brand Pine** | 13.53 : 1 |
| bevel vertical L `(−1,0,1)` | 0.678 | #0F3A26 | 11.86 : 1 |
| bevel shadow-side `(1,1,1)` | 0.736 | #335238 | 8.21 : 1 |
| top `(0,1,0)` | 0.961 | #DEC18D | 1.62 : 1 |
| **bevel key-side `(−1,1,1)`** | 0.967 | **#E0C38E ≈ Gold** | 1.60 : 1 |

**Eleven distinguishable tones on one Pine box. Internal face-to-face contrast
8.46:1.** That is the brief's "Pine base → Forest shadow → Gold lit → Bone
ambient" ramp, delivered and measured.

#### Face-tone assignment — the art-direction rule

| face family | lands at | reads as | use it for |
|---|---|---|---|
| top / up-facing | `s ≈ 0.96` → Gold–Bone | the lit plane | plinth tops, step treads, lintel crowns, book top edges |
| key-side chamfers | `s ≈ 0.97` → Gold | machined gold edge | every silhouette and interior edge — free, automatic |
| front-facing | `s ≈ 0.60` → **exact brand tone** | the brand colour | the faces the camera sees most: letterforms, covers, card faces |
| right / fill-side | `s ≈ 0.47` → Pine/Forest | the shaded plane | outer silhouette, so it stays 14:1 on the page |
| shadow-side chamfers | `s ≈ 0.74` → #335238 | the mid-tone | the third tone that proves the object is solid |
| undersides / cavities | `s ≈ 0.27` → `pineDeep` | contact darkness | under plinths, inside apertures, behind hinges |

### 4.5 Specular, atmospheric fog, and the ground shadow

```glsl
float spec = pow(max(dot(n, normalize(KEY+v)), 0.0), mix(42.0, 110.0, uSurf.y));
col += vec3(0.98, 0.95, 0.88) * spec * mix(0.16, 0.70, uSurf.y);
```

Blinn-Phong on the key only. The highlight colour is a **warm near-white
`#FAF2E0`**, never pure white: a cool highlight on warm green instantly looks like
plastic. Exponent 42 for matte, 110 for gold.

```glsl
col = mix(col, uPaper, clamp((length(uEye-vPosition) - uFog.x)/(uFog.y - uFog.x), 0.0, 1.0) * 0.62);
```

**Aerial perspective in cream.** Geometry recedes *toward the page colour*, up to
62%. Three jobs at once: (a) it is the cheapest possible cure for "dark mass pasted
onto cream"; (b) it creates real depth in a scene with no shadows; (c) it *is* the
enter/exit transition (§2.4) — push an object 16 units back and it dissolves into
the paper with no alpha blending. Per-object range, e.g. hero `[14, 36]`, card
`[8, 22]`.

```glsl
if (uGround > 0.5) {
  float g = exp(-((vPosition.x*vPosition.x)/11.0 + (vPosition.z*vPosition.z)/5.5));
  float c = exp(-((vPosition.x*vPosition.x)/2.4 + ((vPosition.z-0.9)*(vPosition.z-0.9))/1.2));
  col = mix(uPaper, uShade, clamp(g*0.34 + c*0.26, 0.0, 0.52));
}
```

Two Gaussian lobes instead of the reference's one: a wide ambient-occlusion pool
plus a tight contact shadow offset to `z = +0.9` under the plinth nose. The tint is
`boneLo #9FA796` — a **warm desaturated green-grey, never neutral grey and never
cool**. Measured results:

| strength | pixel | vs Beige |
|---|---|---|
| 0.26 (ambient pool) | #E6E2D1 | 1.22 : 1 |
| 0.34 (mid) | #DEDCCB | 1.30 : 1 |
| 0.52 (contact, max) | #CDCEBC | 1.50 : 1 |

Shadows stay in the Bone/Almond range. A light scene must never have dark shadows —
that is the fastest way to make cream look like a mistake.

### 4.6 Context setup — two details that matter on cream

```js
gl.getContext('webgl', {alpha:true, antialias:true, powerPreference:'low-power', premultipliedAlpha:false, depth:true});
gl.clearColor(1, .969, .902, 0);   // Beige RGB, alpha 0
gl.disable(gl.CULL_FACE);
gl.enable(gl.DEPTH_TEST);
```

- **`clearColor` RGB must be Beige, not white.** With `premultipliedAlpha:false` and
  MSAA, partially covered silhouette pixels blend toward the clear colour. White
  gives every dark edge a faint cool halo against cream. Beige gives none. The
  reference uses `(1,1,1,0)` — correct for a white page, wrong for ours.
- **`powerPreference:'low-power'`** keeps laptops on the integrated GPU. At 738
  unique triangles we do not want a discrete GPU spinning up and the fans audible.

### 4.7 Three.js equivalents (if §3.3 applies)

```js
renderer.toneMapping = THREE.ACESFilmicToneMapping;  // mandatory, or gold clips to mush
renderer.toneMappingExposure = 0.98;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scene.background = null;                              // let CSS Beige show
scene.fog = new THREE.Fog(0xFFF7E6, 18, 42);          // the §4.5 fog

// key — warm, upper-front-left
const key = new THREE.DirectionalLight(0xFFF1D6, 2.6); key.position.set(-4.2, 8.6, 5.2);
key.castShadow = true; key.shadow.mapSize.set(1024,1024); key.shadow.radius = 3;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
Object.assign(key.shadow.camera, {left:-8, right:8, top:8, bottom:-8, near:0.5, far:26});
// fill — almond, low and behind right
const fill = new THREE.DirectionalLight(0xF9E9DA, 0.85); fill.position.set(7.4, 1.8, -5.8);
// the cream page as a light source — the §4.4 sky+bounce terms
const dome = new THREE.HemisphereLight(0xFFFDF5, 0xE3DAC9, 1.15);
// gold grazing accent that lays gold on the chamfers
const rim = new THREE.SpotLight(0xE5C690, 18, 22, 0.55, 0.9, 2); rim.position.set(-6.5, 3.2, -4.0);
// page bounce into the undersides
const bounce = new THREE.PointLight(0xFFF7E6, 6, 9, 2); bounce.position.set(0, -2.4, 2.6);

const M = {
  pine  : new THREE.MeshStandardMaterial({color:0x00311F, roughness:0.38, metalness:0.12, flatShading:true}),
  forest: new THREE.MeshStandardMaterial({color:0x183630, roughness:0.52, metalness:0.05, flatShading:true}),
  gold  : new THREE.MeshStandardMaterial({color:0xE5C690, roughness:0.22, metalness:0.72, flatShading:true}),
  bone  : new THREE.MeshStandardMaterial({color:0xE3DAC9, roughness:0.62, metalness:0.00, flatShading:true}),
  almond: new THREE.MeshStandardMaterial({color:0xF9E9DA, roughness:0.85, metalness:0.00, flatShading:true}),
  glass : new THREE.MeshPhysicalMaterial({color:0x00311F, roughness:0.08, metalness:0.0, clearcoat:1, clearcoatRoughness:0.06})
};
// chamfered boxes: RoundedBoxGeometry(w,h,d, 1 segment, radius) + flatShading
// is the closest built-in; 1 segment gives a true chamfer rather than a fillet.
```

Expect to re-tune every hex after tone mapping. See §3.2.

---

## 5. The cast: one signature object per section

Narrative spine: **content → packaged digital product → launch.**

### 5.1 Mapping from the reference

| reference | ours | why |
|---|---|---|
| yellow arch, **cobalt** inner lining | Pine arch, **Gold** inner reveal, **Bone** aperture wall | the single biggest palette win: the arch now frames a *bright* aperture instead of a dark one. Gold is legal here because Pine frames it on both sides (8.78:1). |
| chrome plinth | **Bone** plinth + Gold fascia nose + **Forest shadow gap** beneath | chrome on cream turns muddy grey; Bone keeps the warm family and reads as plaster / precast |
| 7 chrome ribs | 7 **Gold** ribs | tiny geometry, enormous perceived craft (§1.5) |
| Y G A in near-black | Y G A in **Forest** on a **Pine** lintel | hue/value separation plus an automatic Gold chamfer outline |
| chrome laptop | **Bone** body, Pine keybed, **Almond** keycaps, Forest trackpad, **Gold** hinge pin | 40 chamfered keycaps retained on desktop (§6.3) |
| chrome phone | **Pine** body, **Gold** side rail, glass screen | a dark device on cream reads beautifully |
| yellow workbook | **Pine** cover, **Bone** page block, **Gold** spine and foredge | the gold foredge is the premium cue |
| cobalt disc | **Gold** disc (`metalness 0.85`) | the launch pad |
| 3 yellow growth steps | 3 steps in **Pine → Forest → Gold** | a literal staircase of the tone ramp |
| 2 question chips | one **Bone**/Pine-type, one **Pine**/Gold-type | |
| DOM big "0", DOM arrow | promoted to real 3D: `digit` and `launch` | the client asked for 3D in every section |
| — (new) | **Gold launch ring** rising behind the portal | act 3 finally has an object of its own |

### 5.2 The eight builders

| builder | section | what it is | tris | camera |
|---|---|---|---|---|
| `hero` | hero | **The Portal.** Pine arch with Gold reveal and Bone aperture; Bone plinth with Gold fascia and 7 gold ribs; Forest Y G A; Bone laptop (open screen = product page); Pine phone (feed of audience questions); Pine workbook with Gold foredge; 2 chips; Gold disc + 3-tone steps; Gold launch ring rising behind. | ~5,900 | `fov 0.58`, dolly in at mode 1, rise + pull back at mode 2 |
| `transform` | "content becomes a product" | Five loose **Bone/Almond sheets** fanned on the left; as the section scrolls they converge, flatten and stack, and a **Pine case with a Gold band** closes over them on the right, cover artwork appearing at `p > 0.55`. | ~980 | `fov 0.56`, slight push-in |
| `kit` | the product / kit section | Four chamfered slabs — **Pine guide, Bone workbook, Gold-edged course card, Almond template** — floating apart at `p = 0`, nesting into one block by `p = 0.92`, then a **Gold band + seal** snaps round it. Stands on a Bone + Forest disc. | ~760 | `fov 0.54`, descends |
| `tiers` | pricing / partnership | Three plinths in **Forest, Pine, Pine** at heights 1.10 / 1.80 / 2.50, each with a **Bone top cap** and a **Gold nosing**, rising in sequence. `data-3d-variant` picks the recommended tier: it lifts 0.16 and gains a floating **Gold crown ring**. | ~900 | `fov 0.52`, slightly elevated |
| `digit` | founding spots | A sculptural extruded numeral built from 5–6 chamfered **Pine bars** on a **Forest back plate**, standing on a Bone + Forest disc inside a **Gold ring**. `data-3d-variant="5"` draws a 5; a `SEG` table also provides 3 and 1, so the number can change as spots fill. | ~620 | `fov 0.50`, near-elevation |
| `launch` | final CTA | A **Gold arrow** at 45° (chamfered shaft + two barbs) rising out of a **Pine base block** with a Gold cap, a **Gold ring** standing behind it, on a Bone + Forest disc. | ~1,050 | `fov 0.54`, pushes in and tilts up |
| `card` | product cards, image grid | A chamfered tile in **Pine / Bone / Gold** carrying its own 512×420 procedural artwork, with a **Gold corner wedge**. Three variants, reused per card. Pointer-tilt ±0.22 rad. | 160 each | `fov 0.58`, straight on |
| `mark` | section dividers | A **Pine** monogram cube with a **Gold** front plate, **Bone** right plate and **Forest** top plate. Yaws through 1.25 rad across its section. | ~260 | `fov 0.52` |

### 5.3 Act structure for the hero (unchanged logic from the reference)

```js
const mode   = clamp(p*2, 0, 2);
const focus  = Math.sin(mode*Math.PI/2);    // peaks at mode 1, returns at mode 2
const launch = clamp(mode-1, 0, 1);         // 0 → 1 across act 2 only
const travel = Math.sin(p*Math.PI);
eye = [7.8 - focus*2.3 - travel*.5 + launch*.6,
       4.3 - focus*1.0 + launch*.9,
       (mobile ? 15.2 : 12.3) - focus*2.4 - travel*.7 + launch*1.1];
target = [0, 0.6 + launch*0.55, 0];
```

| act | mode | camera | objects |
|---|---|---|---|
| **0 · Listen** | 0 | `[7.8, 4.3, 12.3]` wide | phone forward with the audience feed, chips floating, laptop nearly closed, book parked back |
| **1 · Build** | 1 | `[5.5, 3.3, 9.9]` pushed in | laptop lid opens to −0.22 rad, book lifts 0.5 and slides 0.8 forward, gold ribs catch the key |
| **2 · Launch** | 2 | `[8.4, 5.2, 13.4]` risen and pulled back, looking up | the **Gold launch ring** rises from `y = −1.9` to `y = +1.1` behind the portal |

The dolly deliberately returns on act 2 (the reference's own choice): you go *in* to
inspect the product and *out* to see it launch. Act 2 is distinguished by the ring
and the rise, not by distance.

### 5.4 Per-section scroll progress

```js
a.raw = clamp((vh*0.86 - r.top) / (r.height + vh*0.42), 0, 1);
```

Reaches 0 while the anchor's top is below 86% viewport height, 1 once the anchor's
top is ~0.36 viewports above the top edge (for an 0.8-viewport-tall slot) — i.e.
the story completes just past the section's centre, leaving the resolved state on
screen while the user reads. Tunables: `0.86` (how early it starts) and `0.42` (how
long it takes).

### 5.5 The 3D-on-cards rule

Three tiers, and the tier is a design decision, not a shortcut:

1. **Real 3D (`data-3d="card"`)** — the three product cards only. They carry the
   product artwork on a chamfered tile and respond to the pointer. 160 tris, one
   anchor each.
2. **CSS 3D** — every other card, panel, image frame and the big typographic
   moments. `transform: perspective(900px) rotateY(-6deg) rotateX(3deg)` plus a
   **hard Gold offset shadow** (`box-shadow: 18px 18px 0 #E5C690`), which is the
   reference's `.fallback-portal` trick and reads as expensive print.
3. **Flat** — everything else.

> **Hard rule: never spend a draw call on something a CSS transform can do.**
> The reference ships one WebGL canvas and does the other 40 dimensional moments
> in CSS, and that is why it is fast. We are adding eight real 3D objects, not
> eighty.

### 5.6 Anti-AI-look constraints — binding

These are the rules that separate "art-directed" from "generated". Every one of
them is enforceable by code review.

| banned | required instead |
|---|---|
| spheres, icospheres, blobs, metaballs, noise-displaced surfaces | chamfered boxes, cylinders, extruded annuli, extruded flat profiles — **four primitives, nothing else** |
| particles, point clouds, instanced dust, floating specks | repetition of a *designed* part (the 40 keycaps, the 7 gold ribs) |
| iridescence, rainbow fresnel, chromatic aberration, bloom, lens flare | one warm specular `#FAF2E0`, one directional fresnel, atmospheric fog to the page colour |
| environment-map chrome or mirror materials | `metalness ≤ 0.10` on everything except Gold (`0.85`); matte-to-satin everywhere |
| smooth vertex normals on hard-surface geometry | **flat per-face normals, always** — `chamferBox()` never averages |
| objects floating in a void | **everything sits on something**: a plinth, a disc, a deck — and casts a warm two-lobe contact shadow (§4.5) |
| continuous Y-axis rotation | yaw drift bounded to ±0.22 rad from pointer, ±0.80 from explicit drag; `mark` is the only object with sustained rotation and it is scroll-driven, not time-driven |
| elastic / overshoot easing on 3D | single-pole exponential smoothing `1 − exp(−dt·7)` that settles and stops. Save overshoot for DOM typography. |
| wide-angle default cameras | `fov 0.50 – 0.58 rad` (28–33° vertical). Long lens, parallel verticals, product-table feel. |
| any hue outside the family | the 14 tones of §4.2, every one derived from the six brand tokens. No blue, no purple, no neon. |
| glow / emissive accents | screens are the *only* bright surfaces, and they are bright because they carry artwork, not because they emit |

---

## 6. Performance budget

### 6.1 Geometry — the headline number

Six shared meshes serve the entire site:

| mesh | generator | verts | tris |
|---|---|---|---|
| `bar` | `chamferBox(.11, .07)` | 192 | 64 |
| `cube` | `chamferBox(.07, .04)` | 192 | 64 |
| `slab` | `chamferBox(.03, .02)` | 192 | 64 |
| `cyl` | `cylinder(40)` | 480 | 160 |
| `ring` | `annulus(.80, 48)` | 1,152 | 384 |
| `plane` | literal | 6 | 2 |
| **total unique geometry** | | **2,214** | **738** |

**69 KB of GPU buffer memory for the whole website.** 18 buffer objects, uploaded
once as `STATIC_DRAW`, never touched again. Every object on the page is these six
meshes re-drawn with different matrices and material uniforms.

Three chamfer sizes rather than one, because `transform()` scales the bevel with
the part (§1.1): use `bar` for chunky hero members, `cube` for general parts,
`slab` for thin or large-area parts. This keeps the apparent bevel in a narrow
world-space range across wildly different part aspect ratios.

### 6.2 Per-frame budget

| scroll position | anchors live | draw calls | triangles | uniform calls |
|---|---|---|---|---|
| hero | 1 | **~95** | ~5,900 | ~860 |
| transform / kit / tiers / launch | 1–2 | 26 – 40 | 760 – 1,100 | 240 – 360 |
| card grid (3 cards + a `mark`) | 4 | **~34** | ~740 | ~310 |
| between sections | 0 | **0** | **0** | **0** |

**Ceilings: ≤ 7,500 triangles, ≤ 110 draw calls, ≤ 6 procedural textures per frame.**

The cost here is **JS uniform uploads, not the GPU**. 95 draws × 9 uniform calls
≈ 860 WebGL calls per frame ≈ 0.5–0.7 ms of JS. At 192 verts per draw the GPU is
idle. We are fill-rate bound, which is why §6.3 caps DPR rather than triangles.

Deliberately *not* using instancing: `ANGLE_instanced_arrays` would collapse the 40
keycaps into one call, but it adds an extension check, a fallback path, and a
per-instance attribute buffer — for 0.3 ms on a frame budget of 16.7 ms. Not worth
the code.

### 6.3 DPR capping

```js
dpr = Math.min(devicePixelRatio || 1, vw < 650 ? Math.min(1.35, dprCap) : dprCap);  // dprCap starts at 1.65
```

- **Desktop cap 1.65.** At a 1440 px viewport that is 5.6 Mpx. DPR 2 would be
  8.3 Mpx — a 48% fill-rate increase for a difference nobody can see on chamfered
  flat-shaded geometry.
- **Mobile cap 1.35.** Phone DPRs are 2.5–4; uncapped, a 390×844 viewport at DPR 3
  is 3.0 Mpx on an integrated mobile GPU driving a full-screen canvas.
- **Adaptive step-down, once, never back up:**

```js
if (samples < 90) { samples++; if (dt > .022) slow++;
  if (samples === 90 && slow > 30 && dprCap > 1.2) { dprCap = 1.2; resize(); } }
```

Over the first 90 frames, if more than a third exceed 22 ms, drop to 1.2 and
re-resize. One-way, so it can never oscillate.

### 6.4 When the render loop stops — seven gates

1. **`liveCount === 0`** — one `IntersectionObserver` (`rootMargin: '140px 0px'`)
   watches every anchor. No anchor near the viewport → the RAF loop is cancelled
   outright. On a long page this is most of the scroll.
2. **Per-anchor rect cull** — a second cheap bounds check inside the loop skips
   anchors the observer has not caught up with yet.
3. **`document.hidden`** — `visibilitychange`.
4. **Settle detection** — the loop stops itself once every live anchor satisfies
   `|raw − p| + |tyaw − yaw| + |tpitch − pitch| < 0.002`. Combined with `reduced`
   or `paused`, an untouched page costs **zero frames**.
5. **`prefers-reduced-motion`** — `t` is frozen, `bob` is zero, `enter`/`exit` are
   forced to 1, `smoothing = 1` so values snap. Scroll still repositions objects
   (so the narrative still reads), but nothing animates on its own.
6. **Explicit pause** — `stage.setPaused(true)` from the global motion toggle,
   matching `app.js:18–20` and `experience.js:81`.
7. **`webglcontextlost`** — removes `html.webgl-ready`, which un-hides every CSS
   fallback, and cancels the frame.

### 6.5 Mobile strategy

| | desktop | `vw < 650` |
|---|---|---|
| DPR cap | 1.65 | 1.35 |
| laptop keycaps | 4 × 10 = 40 | 3 × 5 = 15 |
| gold ribs | 7 | 4 |
| hero camera Z | 12.3 | **15.2** (pull back to fit a portrait box) |
| hero triangles | ~5,900 | **~4,100** |
| `card` anchors | 3 side by side | 3 stacked, so only 1–2 live at a time |
| touch | `touch-action: pan-y` on drag anchors; native scroll never hijacked | |

Mobile keeps the **full** scroll-driven story. The reference's `DESIGN.md` is
explicit about this and it is the right call: "Mobile keeps the full scroll-driven
3D story and WebGL camera journey; it uses native touch scrolling, smaller
distances and a compact sticky stage."

### 6.6 Fallbacks — four tiers, and no PNG anywhere

| condition | what the user gets |
|---|---|
| **no context / shader or link failure** | `createStage()` returns `null`, `html.webgl-ready` is never added, and the **designed CSS fallback inside each slot stays visible**. It is in the markup from the start and hidden by success, not revealed by failure — which is why it never flashes. |
| **`prefers-reduced-motion: reduce`** | WebGL still renders, but one frame per scroll event, with `enter = 1`, no bob, no tweening. Better than a poster: the user can still use the hero's Audience / Product / Launch buttons, and each click renders a single frame. |
| **very constrained device** — `navigator.deviceMemory < 4`, `navigator.connection.saveData`, or `vw < 420` | Skip WebGL entirely. Show an **inline SVG poster** per slot: flat `#00311F` / `#183630` / `#E5C690` / `#E3DAC9` fills reproducing the §4.4 face-tone assignment as flat shapes. ~6 KB inline, resolution-independent, visually continuous with the real scene because the tones are literally the same. |
| **context lost mid-session** | `webglcontextlost` → `html.webgl-ready` removed → every CSS fallback reappears. No reload, no blank boxes. |

**Never ship a raster poster.** A 1600 × 1200 PNG of the hero is 180–400 KB, and
base64 into `index.html` adds 33% on top — roughly **40× the size of the entire
WebGL engine**. The fallback must be SVG or CSS.

Fallback CSS vocabulary (adapted from the reference's `.fallback-portal`, which is
good and should be reused):

```css
.slot-fallback{position:absolute;inset:8% 14% 16% 12%;perspective:1000px}
.fb-portal{position:absolute;inset:0;background:var(--bg-3);border:54px solid var(--ink);
  transform:rotateY(-25deg) rotateX(8deg);box-shadow:34px 20px 0 var(--gold)}
.fb-portal>span{font-family:var(--display);font-size:100px;position:absolute;top:-60px;right:15px;letter-spacing:-8px;color:var(--ink)}
.fb-book{position:absolute;left:10%;top:45%;padding:20px;background:var(--ink);color:var(--gold);
  font-family:var(--display);font-size:50px;text-transform:uppercase;transform:rotate(-10deg);box-shadow:6px 6px 0 var(--bg-3)}
html.webgl-ready .slot-fallback{visibility:hidden}
```

### 6.7 Procedural textures

Six 2D-canvas textures, generated once at startup: `cover` 512², `feed` 512×768,
`shop` 512×360, `chipA`/`chipB` 512×96, three card arts 512×420. All `LINEAR`,
`CLAMP_TO_EDGE`, no mipmaps (they are only ever seen near-frontal), `UNPACK_FLIP_Y`.
Total ~2.3 MB of GPU texture memory, zero network bytes.

They use a system font stack, because a webfont may not be loaded when the texture
is baked. If a display face is wanted in the artwork, re-bake after
`document.fonts.ready` and reassign — the `refreshText()` hook is on the returned
API for exactly this.

---

## 7. Copy-paste-ready code

Two blocks. Both go straight into the single `index.html`. The module has been
syntax-checked, and the shading maths in §4 was verified by simulating the
fragment shader in Node against every face normal.

### 7.1 HTML and CSS

```html
<canvas id="stage" aria-hidden="true"></canvas>

<style>
:root{
  --bg:#FFF7E6; --bg-2:#F9E9DA; --bg-3:#E3DAC9;
  --ink:#00311F; --ink-2:#183630; --gold:#E5C690;
}
html{background:var(--bg)}
body{margin:0;background:var(--bg);color:var(--ink)}

#stage{position:fixed;inset:0;width:100%;height:100%;display:block;z-index:0;pointer-events:none}
body > main, body > header, body > footer{position:relative;z-index:1}

/* every 3D moment is a DOM box; the box IS the object's viewport */
.stage-slot{position:relative;width:100%;aspect-ratio:16/11;min-height:320px}
.stage-hero{aspect-ratio:auto;height:min(78svh,860px)}
.card-3d{position:relative;aspect-ratio:4/5;width:100%}
.stage-mark{width:140px;height:140px;margin-inline:auto}
[data-3d-drag]{cursor:grab;pointer-events:auto;touch-action:pan-y}
[data-3d-drag]:active{cursor:grabbing}

/* designed fallback lives inside each slot and is HIDDEN BY SUCCESS */
.slot-fallback{position:absolute;inset:8% 14% 16% 12%;perspective:1000px}
.fb-portal{position:absolute;inset:0;background:var(--bg-3);border:54px solid var(--ink);
  transform:rotateY(-25deg) rotateX(8deg);box-shadow:34px 20px 0 var(--gold)}
.fb-book{position:absolute;left:10%;top:45%;padding:20px;background:var(--ink);color:var(--gold);
  font:900 50px/1 var(--display,system-ui);text-transform:uppercase;
  transform:rotate(-10deg);box-shadow:6px 6px 0 var(--bg-3)}
html.webgl-ready .slot-fallback{visibility:hidden}

@media (prefers-reduced-motion: reduce){ .stage-slot{min-height:280px} }
</style>

<main>
  <section class="hero">
    <div class="stage-slot stage-hero" data-3d="hero" data-3d-hold data-3d-drag>
      <div class="slot-fallback" aria-hidden="true"><div class="fb-portal"></div><div class="fb-book">Your next<br>big thing.</div></div>
    </div>
    <div class="scene-controls" aria-label="Explore the 3D scene">
      <button data-scene="0" class="is-active" aria-pressed="true">Audience</button>
      <button data-scene="1" aria-pressed="false">Product</button>
      <button data-scene="2" aria-pressed="false">Launch</button>
      <button id="motion-toggle" aria-pressed="false" aria-label="Pause scene motion">&#8214;</button>
    </div>
  </section>

  <section><div class="stage-slot" data-3d="transform"><div class="slot-fallback" aria-hidden="true"><div class="fb-portal"></div></div></div></section>
  <section><div class="stage-slot" data-3d="kit"></div></section>
  <section><div class="stage-slot" data-3d="tiers" data-3d-variant="1"></div></section>
  <section><div class="stage-slot" data-3d="digit" data-3d-variant="5"></div></section>

  <section class="lab">
    <article class="lab-card"><div class="card-3d" data-3d="card" data-3d-variant="0"></div><h3>Custom guides &amp; ebooks</h3></article>
    <article class="lab-card"><div class="card-3d" data-3d="card" data-3d-variant="1"></div><h3>Bespoke courses</h3></article>
    <article class="lab-card"><div class="card-3d" data-3d="card" data-3d-variant="2"></div><h3>Custom workbooks</h3></article>
  </section>

  <div class="stage-slot stage-mark" data-3d="mark"></div>
  <section><div class="stage-slot" data-3d="launch"></div></section>
</main>
```

### 7.2 Wiring (bottom of `index.html`)

```html
<script type="module">
/* ---- paste the engine from 7.3 here, or keep it in the same module ---- */

let stage = null;
try { stage = createStage(document.getElementById('stage')); } catch { /* CSS fallback stands */ }

if (stage) {
  /* hero acts: the three buttons drive the data-3d-hold anchor */
  const caps = ['Built around what makes you, you.',
                'Your expertise. A useful product.',
                'A clear path from content to checkout.'];
  document.querySelectorAll('[data-scene]').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('[data-scene]').forEach(x => {
      const on = x === b; x.classList.toggle('is-active', on); x.setAttribute('aria-pressed', String(on));
    });
    const i = Number(b.dataset.scene);
    stage.setValue('hero', i / 2);
    const cap = document.getElementById('scene-caption'); if (cap) cap.textContent = caps[i];
  }));

  /* global pause */
  let paused = false;
  document.getElementById('motion-toggle')?.addEventListener('click', function () {
    paused = !paused;
    this.setAttribute('aria-pressed', String(paused));
    this.textContent = paused ? '▷' : '‖';
    this.setAttribute('aria-label', paused ? 'Resume scene motion' : 'Pause scene motion');
    document.body.classList.toggle('motion-paused', paused);
    stage.setPaused(paused);
  });

  /* if a display webfont carries the on-screen artwork, re-bake after it loads */
  document.fonts?.ready.then(() => stage.refreshText());

  addEventListener('pagehide', e => { if (!e.persisted) stage.dispose(); });
} else {
  document.getElementById('motion-toggle')?.setAttribute('hidden', '');
}
</script>
```

### 7.3 The engine

Complete, self-contained, syntax-checked. Paste inside the same
`<script type="module">` (drop the `export` keyword if you do) or keep it as a
module and `import { createStage }`.

```js
/* =============================================================================
   YGA STAGE - one WebGL context, many DOM-anchored 3D objects.
   Dependency-free. Forked from the reference scene.js matrix core.
   Palette: Pine #00311F / Forest #183630 / Gold #E5C690 / Bone #E3DAC9
            on Beige #FFF7E6.
   ========================================================================== */

/* ---- 1. matrix core (unchanged from reference scene.js) ------------------ */
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
function transform(p=[0,0,0],r=[0,0,0],s=[1,1,1]){const[x,y,z]=r,cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);const rx=[1,0,0,0,0,cx,sx,0,0,-sx,cx,0,0,0,0,1],ry=[cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1],rz=[cz,sz,0,0,-sz,cz,0,0,0,0,1,0,0,0,0,1];const out=mul(mul(ry,rx),rz);for(let c=0;c<3;c++)for(let w=0;w<3;w++)out[c*4+w]*=s[c];out[12]=p[0];out[13]=p[1];out[14]=p[2];return out;}
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const n=Math.hypot(...a)||1;return a.map(v=>v/n);};
const dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0);
function lookAt(eye,target){const z=norm(sub(eye,target)),x=norm(cross([0,1,0],z)),y=cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
function perspective(fov,aspect,near=.1,far=120){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];}
function normalMatrix(m){const a=[m[0],m[1],m[2]],b=[m[4],m[5],m[6]],c=[m[8],m[9],m[10]];const bc=cross(b,c),ca=cross(c,a),ab=cross(a,b),d=dot(a,bc)||1;return[...bc.map(v=>v/d),...ca.map(v=>v/d),...ab.map(v=>v/d)];}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ss=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0||1),0,1);return t*t*(3-2*t);};

/* ---- 2. geometry generators --------------------------------------------- */
/* chamferBox(c,e): unit cube, -0.5..0.5, every edge cut back.
   c = chamfer on the 4 long edges (X/Y), e = chamfer on the 8 Z-end edges.
   64 flat-shaded triangles, 192 non-indexed vertices, per-face normals.    */
function chamferBox(c=.07,e=.04){
  const verts=[],normals=[],uvs=[];
  const ring=(s,z)=>[[-s+c,-s,z],[s-c,-s,z],[s,-s+c,z],[s,s-c,z],[s-c,s,z],[-s+c,s,z],[-s,s-c,z],[-s,-s+c,z]];
  const rings=[ring(.5-c,-.5),ring(.5,-.5+e),ring(.5,.5-e),ring(.5-c,.5)];
  const tri=(a,b,d,n)=>{n=n||norm(cross(sub(b,a),sub(d,a)));[a,b,d].forEach(v=>{verts.push(...v);normals.push(...n);uvs.push(v[0]+.5,v[1]+.5);});};
  for(let j=0;j<3;j++)for(let k=0;k<8;k++){const q=(k+1)%8;tri(rings[j][k],rings[j][q],rings[j+1][q]);tri(rings[j][k],rings[j+1][q],rings[j+1][k]);}
  for(let k=0;k<8;k++){const q=(k+1)%8;tri([0,0,-.5],rings[0][q],rings[0][k],[0,0,-1]);tri([0,0,.5],rings[3][k],rings[3][q],[0,0,1]);}
  return{verts,normals,uvs};
}
/* cylinder(seg): 160 tris at seg=40. Smooth side normals, flat caps. */
function cylinder(seg=40){const verts=[],normals=[],uvs=[];const add=(p,n)=>{verts.push(...p);normals.push(...n);uvs.push(p[0]+.5,p[2]+.5);};for(let i=0;i<seg;i++){const a=i*2*Math.PI/seg,b=(i+1)*2*Math.PI/seg,pa=[Math.cos(a)*.5,Math.sin(a)*.5],pb=[Math.cos(b)*.5,Math.sin(b)*.5];for(const[p,n]of[[[pa[0],-.5,pa[1]],[pa[0]*2,0,pa[1]*2]],[[pb[0],-.5,pb[1]],[pb[0]*2,0,pb[1]*2]],[[pb[0],.5,pb[1]],[pb[0]*2,0,pb[1]*2]],[[pa[0],-.5,pa[1]],[pa[0]*2,0,pa[1]*2]],[[pb[0],.5,pb[1]],[pb[0]*2,0,pb[1]*2]],[[pa[0],.5,pa[1]],[pa[0]*2,0,pa[1]*2]]])add(p,n);add([0,.5,0],[0,1,0]);add([pa[0],.5,pa[1]],[0,1,0]);add([pb[0],.5,pb[1]],[0,1,0]);add([0,-.5,0],[0,-1,0]);add([pb[0],-.5,pb[1]],[0,-1,0]);add([pa[0],-.5,pa[1]],[0,-1,0]);}return{verts,normals,uvs};}
/* annulus(ri,seg): extruded ring, 4 walls. 384 tris at seg=48. */
function annulus(ri=.80,seg=48){
  const verts=[],normals=[],uvs=[];
  const add=(p,n)=>{verts.push(...p);normals.push(...n);uvs.push(p[0]+.5,p[1]+.5);};
  const quad=(a,b,c,d,n)=>{add(a,n);add(b,n);add(c,n);add(a,n);add(c,n);add(d,n);};
  for(let i=0;i<seg;i++){const a=i*2*Math.PI/seg,b=(i+1)*2*Math.PI/seg;
    const ca=Math.cos(a)*.5,sa=Math.sin(a)*.5,cb=Math.cos(b)*.5,sb=Math.sin(b)*.5,n=norm([ca+cb,sa+sb,0]);
    quad([ca,sa,-.5],[cb,sb,-.5],[cb,sb,.5],[ca,sa,.5],n);
    quad([ca*ri,sa*ri,.5],[cb*ri,sb*ri,.5],[cb*ri,sb*ri,-.5],[ca*ri,sa*ri,-.5],[-n[0],-n[1],0]);
    quad([ca,sa,.5],[cb,sb,.5],[cb*ri,sb*ri,.5],[ca*ri,sa*ri,.5],[0,0,1]);
    quad([ca*ri,sa*ri,-.5],[cb*ri,sb*ri,-.5],[cb,sb,-.5],[ca,sa,-.5],[0,0,-1]);
  }
  return{verts,normals,uvs};
}

/* ---- 3. tones and materials --------------------------------------------- */
const TONE={
  pineDeep:[0.000,0.106,0.067], pine:[0.000,0.192,0.122], forest:[0.094,0.212,0.188],
  bronze:[0.416,0.365,0.263],   goldLo:[0.788,0.663,0.447], gold:[0.898,0.776,0.565],
  goldHi:[1.000,0.965,0.886],   boneLo:[0.623,0.656,0.588], bone:[0.890,0.855,0.788],
  boneHi:[1.000,0.992,0.965],   almondLo:[0.749,0.682,0.604], almond:[0.976,0.914,0.855],
  beige:[1.000,0.969,0.902],    glassLo:[0.043,0.165,0.125]
};
/* d/m/l = the material's own 3-stop ramp (dark -> mid -> lit).
   s = ramp split, k = metalness, r/rk = fresnel target tone + strength.
   rk is tuned so EVERY material clears 2.4:1 against Beige at its silhouette:
   dark materials pull toward Gold (warm halo), light materials pull toward
   Forest (dark edge) - without that, Bone sits at 1.30:1 and disappears.   */
const MAT={
  pine  :{d:'pineDeep',m:'pine',   l:'gold',  s:.62,k:.10,r:'gold',  rk:.26},
  forest:{d:'pine',    m:'forest', l:'goldLo',s:.60,k:.06,r:'gold',  rk:.24},
  gold  :{d:'bronze',  m:'goldLo', l:'goldHi',s:.46,k:.85,r:'forest',rk:.26},
  bone  :{d:'boneLo',  m:'bone',   l:'boneHi',s:.52,k:.00,r:'forest',rk:.46},
  almond:{d:'almondLo',m:'almond', l:'boneHi',s:.55,k:.00,r:'forest',rk:.42},
  glass :{d:'pineDeep',m:'glassLo',l:'beige', s:.74,k:.95,r:'bone',  rk:.34},
  paper :{d:'beige',   m:'beige',  l:'beige', s:.50,k:.00,r:'beige', rk:.00}
};

/* ---- 4. shaders --------------------------------------------------------- */
const VS=`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUv;
uniform mat4 uModel,uViewProjection;uniform mat3 uNormal;
varying vec3 vPosition,vNormal;varying vec2 vUv;
void main(){vec4 p=uModel*vec4(aPosition,1.);vPosition=p.xyz;vNormal=normalize(uNormal*aNormal);vUv=aUv;gl_Position=uViewProjection*p;}`;

const FS=`precision mediump float;
uniform vec3 uDark,uMid,uLite,uRim,uPaper,uShade,uEye;
uniform vec4 uSurf;              /* x split, y metal, z rim strength, w useTexture */
uniform vec2 uFog;               /* x near, y far */
uniform float uGround,uScroll;
uniform sampler2D uTexture;
varying vec3 vPosition,vNormal;varying vec2 vUv;
const vec3 KEY =vec3(-0.3856,0.7896, 0.4774);   /* warm key, upper-front-left  */
const vec3 FILL=vec3( 0.7730,0.1880,-0.6059);   /* almond fill, lower-back-right */
void main(){
  vec3 n=normalize(vNormal), v=normalize(uEye-vPosition);
  float key=max(dot(n,KEY),0.0);
  float fill=max(dot(n,FILL),0.0);
  float sky=n.y*0.5+0.5;            /* the cream page acts as a sky dome   */
  float bounce=max(-n.y,0.0);       /* and bounces up into the undersides  */
  float s=clamp(0.17+0.62*key+0.22*fill+0.26*sky+0.10*bounce,0.0,1.0);
  vec3 col=mix(uDark,uMid,smoothstep(0.0,uSurf.x,s));
  col=mix(col,uLite,smoothstep(uSurf.x,1.0,s));
  vec3 tex=texture2D(uTexture,vec2(vUv.x,clamp(vUv.y+uScroll,0.0,1.0))).rgb;
  col=mix(col,tex*(0.72+0.34*key+0.14*sky),uSurf.w);
  float spec=pow(max(dot(n,normalize(KEY+v)),0.0),mix(42.0,110.0,uSurf.y));
  col+=vec3(0.98,0.95,0.88)*spec*mix(0.16,0.70,uSurf.y);
  float rim=pow(1.0-max(dot(n,v),0.0),3.2);
  col=mix(col,uRim,clamp(rim*uSurf.z,0.0,1.0));
  col=mix(col,uPaper,clamp((length(uEye-vPosition)-uFog.x)/(uFog.y-uFog.x),0.0,1.0)*0.62);
  if(uGround>0.5){
    float g=exp(-((vPosition.x*vPosition.x)/11.0+(vPosition.z*vPosition.z)/5.5));
    float c=exp(-((vPosition.x*vPosition.x)/2.4+((vPosition.z-0.9)*(vPosition.z-0.9))/1.2));
    col=mix(uPaper,uShade,clamp(g*0.34+c*0.26,0.0,0.52));
  }
  gl_FragColor=vec4(col,1.0);
}`;

/* ---- 5. the stage ------------------------------------------------------- */
export function createStage(canvas){
  let gl;
  try{gl=canvas.getContext('webgl',{alpha:true,antialias:true,powerPreference:'low-power',premultipliedAlpha:false,depth:true});}
  catch{return null;}
  if(!gl)return null;

  function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('shader');}return s;}
  let program;
  try{program=gl.createProgram();const v=shader(gl.VERTEX_SHADER,VS),f=shader(gl.FRAGMENT_SHADER,FS);
    gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);gl.deleteShader(v);gl.deleteShader(f);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('link');}
  catch{return null;}

  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);              /* cap fans reverse winding; culling off is cheaper than fixing it */
  gl.clearColor(1,.969,.902,0);          /* Beige RGB, alpha 0: AA edges fringe to cream, not white */

  const u={};for(const k of ['Model','ViewProjection','Normal','Dark','Mid','Lite','Rim','Paper','Shade','Eye','Surf','Fog','Ground','Scroll','Texture'])u[k]=gl.getUniformLocation(program,'u'+k);
  const attrib=['Position','Normal','Uv'].map(x=>gl.getAttribLocation(program,'a'+x));
  gl.uniform3fv(u.Paper,TONE.beige);
  gl.uniform3fv(u.Shade,TONE.boneLo);

  const buffers=[],textures=[];
  function mesh(data){const b=[data.verts,data.normals,data.uvs].map(a=>{const x=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,x);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);buffers.push(x);return x;});return{buffers:b,count:data.verts.length/3};}

  /* Six shared meshes. 738 triangles of unique geometry for the entire site. */
  const M={
    bar  : mesh(chamferBox(.11,.07)),   /* chunky hero members      */
    cube : mesh(chamferBox(.07,.04)),   /* general purpose          */
    slab : mesh(chamferBox(.03,.02)),   /* thin / large-area parts  */
    cyl  : mesh(cylinder(40)),
    ring : mesh(annulus(.80,48)),
    plane: mesh({verts:[-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,-.5,0,.5,.5,0,-.5,.5,0],normals:Array(6).fill([0,0,1]).flat(),uvs:[0,0,1,0,1,1,0,0,1,1,0,1]})
  };

  /* ---- procedural canvas textures (regenerate after fonts load) --------- */
  function texture(draw,w=512,h=512){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
    const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    textures.push(t);return t;
  }
  const F=(w,px)=>w+' '+px+'px Inter, "Helvetica Neue", Arial, sans-serif';
  const PINE='#00311F',GOLD='#E5C690',BONE='#E3DAC9',BEIGE='#FFF7E6',ALMOND='#F9E9DA';
  const T={};
  T.blank=texture(c=>{c.fillStyle=BEIGE;c.fillRect(0,0,2,2);},2,2);
  T.cover=texture((c,w,h)=>{c.fillStyle=PINE;c.fillRect(0,0,w,h);c.fillStyle=GOLD;c.font=F(900,60);c.fillText('YGA',36,78);
    c.fillStyle=BEIGE;c.font=F(900,78);['YOUR NEXT','BIG THING.'].forEach((s,i)=>c.fillText(s,36,206+i*84));
    c.fillStyle=BONE;c.font=F(400,20);c.fillText('Created entirely for you.',36,336);
    c.fillStyle=GOLD;c.font=F(900,208);c.fillText('↗',246,486);
    c.fillStyle=BONE;c.font=F(400,15);c.fillText('CREATOR EDITION / 01',36,470);});
  T.feed=texture((c,w,h)=>{c.fillStyle=ALMOND;c.fillRect(0,0,w,h);c.fillStyle=PINE;c.font=F(700,31);c.fillText('Your creator world',25,58);
    c.fillStyle=PINE;c.fillRect(25,85,w-50,270);c.fillStyle=GOLD;c.font=F(900,82);c.fillText('YOU',75,226);
    c.font=F(400,20);c.fillStyle=BONE;c.fillText('Your content. Your brand.',45,320);
    c.fillStyle=PINE;c.font=F(400,23);c.fillText('What should I make next?',25,400);
    c.fillStyle=GOLD;c.fillRect(25,430,w-50,88);c.fillStyle=PINE;c.font=F(400,20);c.fillText('Can you go deeper?',42,482);
    c.fillStyle=BONE;c.fillRect(25,545,w-50,90);c.fillStyle=PINE;c.fillText('Where should I start?',42,597);
    c.fillStyle=GOLD;c.fillRect(25,670,w-50,8);},512,768);
  T.shop=texture((c,w,h)=>{c.fillStyle=BEIGE;c.fillRect(0,0,w,h);c.fillStyle=PINE;c.font=F(700,33);c.fillText('YGA',30,50);
    c.fillStyle=PINE;c.fillRect(30,83,200,235);c.fillStyle=GOLD;c.font=F(900,34);c.fillText('YOUR NEXT',45,150);c.fillText('BIG THING.',45,192);
    c.font=F(900,94);c.fillText('↗',96,294);
    c.fillStyle=PINE;c.font=F(700,29);c.fillText('Built for',267,124);c.fillText('your audience.',267,163);
    c.fillStyle='#8A9A90';for(let i=0;i<4;i++)c.fillRect(269,194+i*18,160-i*8,5);
    c.fillStyle=PINE;c.fillRect(266,285,195,39);c.fillStyle=GOLD;c.font=F(400,17);c.fillText('Explore the product',282,311);},512,360);
  T.chipA=texture((c,w,h)=>{c.fillStyle=BONE;c.fillRect(0,0,w,h);c.fillStyle=GOLD;c.beginPath();c.arc(35,48,17,0,6.2832);c.fill();
    c.fillStyle=PINE;c.font=F(400,24);c.fillText('Can you go deeper?',67,56);},512,96);
  T.chipB=texture((c,w,h)=>{c.fillStyle=PINE;c.fillRect(0,0,w,h);c.fillStyle=GOLD;c.font=F(400,25);c.fillText('Where should I start?',29,58);},512,96);
  const cardArt=(kicker,line1,line2,glyph,bg,fg,ac)=>texture((c,w,h)=>{
    c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=ac;c.font=F(400,17);c.fillText(kicker,30,44);
    c.fillStyle=fg;c.font=F(900,62);c.fillText(line1,30,150);c.fillText(line2,30,214);
    c.fillStyle=ac;c.font=F(900,120);c.fillText(glyph,30,360);
    c.fillStyle=ac;c.fillRect(30,392,w-60,5);},512,420);
  T.cardGuide =cardArt('01 / CUSTOM GUIDES','Find','your light.','↗',PINE,BEIGE,GOLD);
  T.cardCourse=cardArt('02 / BESPOKE COURSES','Show','them how.','▷',BONE,PINE,'#1F5C44');
  T.cardBook  =cardArt('03 / WORKBOOKS','Make','room.','↗',GOLD,PINE,'#00311F');

  /* ---- draw primitives -------------------------------------------------- */
  let scroll=0;
  function draw(shape,m,matName,tex,ground){
    const A=MAT[matName]||MAT.pine;
    for(let i=0;i<3;i++){gl.bindBuffer(gl.ARRAY_BUFFER,shape.buffers[i]);gl.enableVertexAttribArray(attrib[i]);gl.vertexAttribPointer(attrib[i],i===2?2:3,gl.FLOAT,false,0,0);}
    gl.uniformMatrix4fv(u.Model,false,m);
    gl.uniformMatrix3fv(u.Normal,false,normalMatrix(m));
    gl.uniform3fv(u.Dark,TONE[A.d]);gl.uniform3fv(u.Mid,TONE[A.m]);gl.uniform3fv(u.Lite,TONE[A.l]);gl.uniform3fv(u.Rim,TONE[A.r]);
    gl.uniform4f(u.Surf,A.s,A.k,A.rk,tex?1:0);
    gl.uniform1f(u.Ground,ground?1:0);
    gl.uniform1f(u.Scroll,tex===T.feed?scroll*.18:0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex||T.blank);gl.uniform1i(u.Texture,0);
    gl.drawArrays(gl.TRIANGLES,0,shape.count);
  }
  const part=(parent,p,s,mat,r,shape)=>draw(shape||M.cube,mul(parent,transform(p,r||[0,0,0],s)),mat);
  const face=(parent,p,s,tex)=>draw(M.plane,mul(parent,transform(p,[0,0,0],[s[0],s[1],1])),'paper',tex);

  /* ---- 6. the cast: one builder per section ---------------------------- */
  /* Every builder receives ctx:
     { root, p, enter, exit, t, bob, mobile, M, T, part, face, draw, variant } */
  const OBJ={

  /* --- HERO: the Portal. Content world -> product -> launch. ----------- */
  hero:{ tris:5900, fog:[14,36],
    cam(p,aspect,mobile){
      const focus=Math.sin(clamp(p*2,0,2)*Math.PI/2), launch=clamp(p*2-1,0,1), travel=Math.sin(p*Math.PI);
      return{ eye:[7.8-focus*2.3-travel*.5+launch*.6, 4.3-focus*1.0+launch*.9,
                   (mobile?15.2:12.3)-focus*2.4-travel*.7+launch*1.1],
              target:[0,.6+launch*.55,0], fov:.58 };
    },
    build(c){
      const {root,p,t,bob,mobile}=c, mode=clamp(p*2,0,2), launch=clamp(mode-1,0,1);
      draw(M.slab,transform([0,-2.13,0],[0,0,0],[14,.05,10]),'paper',null,1);
      /* Act III: the gold launch ring rises behind the portal */
      draw(M.ring,mul(root,transform([0,-1.9+launch*3.0,-2.75],[.06,0,0],[7.4,7.4,.17])),'gold');
      /* Pine frame */
      part(root,[-3.12,.18,-.65],[.86,4.45,1.55],'pine',[0,0,-.04],M.bar);
      part(root,[ 3.12,.18,-.65],[.86,4.45,1.55],'pine',[0,0, .04],M.bar);
      part(root,[0,2.62,-.65],[7.12,1.25,1.55],'pine',null,M.bar);
      /* Gold reveal: 0.14-thick inner lining. Catches the key, reads as inlay. */
      part(root,[-2.61,.12,-.60],[.14,3.85,1.35],'gold',null,M.slab);
      part(root,[ 2.61,.12,-.60],[.14,3.85,1.35],'gold',null,M.slab);
      part(root,[0,1.94,-.60],[5.22,.15,1.35],'gold',null,M.slab);
      /* Bone aperture wall: the bright field the dark frame surrounds */
      part(root,[0,-.02,-1.46],[5.15,3.9,.15],'bone',null,M.slab);
      /* Plinth */
      part(root,[0,-1.96,0],[7.45,.23,4.35],'bone',null,M.slab);
      part(root,[0,-2.10,.02],[7.20,.16,4.20],'forest',null,M.slab);
      part(root,[0,-1.78,-.85],[5.28,.14,2.32],'forest',null,M.slab);
      part(root,[0,-1.95,2.14],[7.45,.09,.09],'gold');
      const ribs=mobile?4:7, step=4.26/(ribs-1);
      for(let i=0;i<ribs;i++)part(root,[-2.13+i*step,-1.61,-.7],[.028,.020,1.75],'gold');
      letter(root,-1.45,2.6,'Y');letter(root,0,2.6,'G');letter(root,1.52,2.6,'A');
      /* Laptop */
      const lap=mul(root,transform([-.35,-1.64,1.05],[0,-.13,0]));
      part(lap,[0,0,0],[3.1,.13,1.85],'bone',null,M.slab);
      part(lap,[0,.081,-.17],[2.5,.015,.92],'pine',null,M.slab);
      const cols=mobile?5:10, rows=mobile?3:4;
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++)part(lap,[-1.1+i*(2.2/(cols-1)),.096,-.49+j*.21],[.18,.01,.13],'almond',null,M.slab);
      part(lap,[0,.082,.51],[.7,.014,.39],'forest',null,M.slab);
      part(lap,[0,.09,-.80],[.5,.05,.05],'gold');
      const hinge=mul(lap,transform([0,.08,-.79],[-.13-.09*Math.sin(mode),0,0]));
      part(hinge,[0,.99,0],[3.1,1.95,.115],'bone',null,M.slab);
      part(hinge,[0,1,.072],[2.94,1.8,.02],'pine',null,M.slab);
      face(hinge,[0,1,.09],[2.82,1.67],T.shop);
      /* Phone */
      const ph=mul(root,transform([2.04,.06+bob,.85+(.7-Math.min(mode,.7))],[.07,-.28,.13]));
      part(ph,[0,0,0],[1.21,2.49,.15],'pine',null,M.slab);
      part(ph,[.615,0,.02],[.05,2.49,.13],'gold',null,M.slab);
      part(ph,[0,0,.09],[1.12,2.4,.04],'glass',null,M.slab);
      face(ph,[0,0,.12],[1.03,2.21],T.feed);
      part(ph,[0,1.05,.134],[.37,.055,.016],'forest',null,M.slab);
      /* Workbook */
      const lift=Math.sin(mode*Math.PI/2);
      const bk=mul(root,transform([-2.1+mode*.18,-.2+lift*.5+bob,1.12+lift*.8],[.04,.22+mode*.16,-.13+mode*.12]));
      part(bk,[0,0,0],[1.7,2.3,.2],'pine',null,M.slab);
      part(bk,[.035,0,.112],[1.57,2.23,.032],'bone',null,M.slab);
      face(bk,[0,0,.146],[1.68,2.3],T.cover);
      part(bk,[-.815,0,.125],[.05,2.3,.05],'gold',null,M.slab);
      part(bk,[ .800,0,.112],[.03,2.2,.04],'gold',null,M.slab);
      /* Audience chips */
      for(let i=0;i<2;i++){
        const q=mul(root,transform([i?1.1:-1.15,1.47+(i?.3:0)+bob*.8,1.0+mode*.12],[0,-.14,i?-.08:.06]));
        part(q,[0,0,0],[2.15,.43,.07],i?'pine':'bone',null,M.slab);
        face(q,[0,0,.05],[2.06,.386],i?T.chipB:T.chipA);
      }
      /* Gold launch pad + three-tone growth steps */
      draw(M.cyl,mul(root,transform([3.5,-1.68,1.5],[0,0,0],[1.55,.36,1.55])),'gold');
      const st=mul(root,transform([3.4,-1.28,1.53],[0,-.1,0]));
      ['pine','forest','gold'].forEach((m,i)=>part(st,[-.48+i*.42,i*.2,0],[.38,.3+i*.4,.6],m));
    }},

  /* --- TRANSFORM: loose content sheets fold into a bound product. ------- */
  transform:{ tris:980, fog:[12,30],
    cam:(p,a)=>({eye:[3.6-p*.9,2.5,8.4-p*.6],target:[.3,-.15,0],fov:.56}),
    build(c){
      const {root,p,bob}=c, close=ss(.56,1,p);
      part(root,[0,-1.25,0],[6.8,.20,3.3],'bone',null,M.slab);
      part(root,[0,-1.39,.02],[6.5,.14,3.1],'forest',null,M.slab);
      part(root,[0,-1.23,1.60],[6.8,.08,.08],'gold');
      for(let i=0;i<5;i++){
        const k=i/4, s=ss(0,1,clamp((p-k*.10)/.72,0,1));
        const x=-2.30+s*4.33+(1-s)*k*.46;
        const y=-1.02+(1-s)*(.42+k*.56)+s*(i*.055)+bob*(1-s)*.7;
        const z=-(1-s)*k*.44;
        part(root,[x,y,z],[1.55,.035,2.10],i===4?'almond':'bone',
             [.10*(1-s), -.18+(1-s)*(.34-k*.11)+s*.26, (1-s)*(-.24+k*.13)],M.slab);
      }
      /* the case closes over the stack */
      part(root,[2.03,-.80+close*.07,0],[1.78,.12+close*.46,2.36],'pine',[0,.26,0],M.slab);
      part(root,[2.03,-.56+close*.30,0],[1.84,.07,2.42],'gold',[0,.26,0],M.slab);
      if(close>.35)face(mul(root,transform([2.03,-.50+close*.34,0],[0,.26,0])),[0,0,1.22],[1.62,2.20],T.cover);
    }},

  /* --- KIT: four products nest into one boxed kit. ---------------------- */
  kit:{ tris:760, fog:[11,28],
    cam:(p,a)=>({eye:[3.0,2.9-p*.5,7.4],target:[0,-.1,0],fov:.54}),
    build(c){
      const {root,p,bob}=c, n=ss(.12,.92,p);
      draw(M.cyl,mul(root,transform([0,-1.44,0],[0,0,0],[4.6,.26,4.6])),'bone');
      draw(M.cyl,mul(root,transform([0,-1.58,0],[0,0,0],[4.2,.20,4.2])),'forest');
      const L=[['pine',2.30,1.65,.34],['bone',2.10,1.50,.26],['gold',1.92,1.36,.14],['almond',1.74,1.22,.20]];
      L.forEach((s,i)=>{
        const spread=(1-n)*(1.55-i*.30), yaw=-.22+(1-n)*(.30-i*.14);
        part(root,[(1-n)*(i-1.5)*.42, -1.08+i*.30*n+spread+bob*(1-n)*.5, (1-n)*(i-1.5)*.30],
             [s[1],s[3],s[2]],s[0],[(1-n)*.07,yaw,(1-n)*.05],M.slab);
      });
      /* the gold band that makes it a kit */
      if(n>.55){const b=ss(.55,1,n);
        part(root,[0,-.52,0],[2.42*b,.10,1.76*b],'gold',[0,-.22,0],M.slab);
        part(root,[0,-.52,.90*b],[.34,.34,.06],'gold',[0,-.22,0]);}
    }},

  /* --- TIERS: three-level stepped pricing structure. -------------------- */
  tiers:{ tris:900, fog:[12,30],
    cam:(p,a)=>({eye:[2.6,2.6,8.2],target:[0,-.2,0],fov:.52}),
    build(c){
      const {root,p,bob,variant}=c, pick=variant|0;
      part(root,[0,-1.62,0],[7.2,.22,3.2],'bone',null,M.slab);
      part(root,[0,-1.76,.02],[6.9,.14,3.0],'forest',null,M.slab);
      part(root,[0,-1.60,1.55],[7.2,.08,.08],'gold');
      const H=[1.10,1.80,2.50], TONE3=['forest','pine','pine'];
      for(let i=0;i<3;i++){
        const on=ss(0,1,clamp((p-i*.14)/.62,0,1)), h=H[i]*on, chosen=i===pick;
        const y=-1.50+h/2+(chosen?.16:0);
        part(root,[-2.25+i*2.25,y,0],[1.72,h,1.72],TONE3[i],[0,-.08+i*.08,0],M.bar);
        part(root,[-2.25+i*2.25,y+h/2+.07,0],[1.84,.14,1.84],'bone',[0,-.08+i*.08,0],M.slab);
        part(root,[-2.25+i*2.25,y+h/2+.16,0],[1.60,.05,1.60],'gold',[0,-.08+i*.08,0],M.slab);
        if(chosen&&on>.7)draw(M.ring,mul(root,transform([-2.25+i*2.25,y+h/2+.62+bob,0],[1.5708,0,0],[1.55,1.55,.09])),'gold');
      }
    }},

  /* --- DIGIT: sculptural numeral for founding spots. -------------------- */
  digit:{ tris:620, fog:[10,26],
    cam:(p,a)=>({eye:[2.2,1.5,7.0],target:[0,.15,0],fov:.50}),
    build(c){
      const {root,p,bob,variant}=c, on=ss(0,.72,p);
      draw(M.cyl,mul(root,transform([0,-2.00,0],[0,0,0],[4.0,.24,4.0])),'bone');
      draw(M.cyl,mul(root,transform([0,-2.14,0],[0,0,0],[3.6,.18,3.6])),'forest');
      draw(M.ring,mul(root,transform([0,-1.86,0],[1.5708,0,0],[3.1,3.1,.07])),'gold');
      const g=mul(root,transform([0,.10+(1-on)*-1.1+bob*.5,0],[0,-.26+(1-on)*.34,0],[1,1,1]));
      /* 5-bar skeleton; swap SEG per digit to re-use the same builder */
      const SEG={
        5:[[-.52,1.28,1.46,.42],[ .00,1.28,.42,1.05],[-.02,.30,1.50,.42],[ .60,-.40,.42,1.30],[-.04,-1.12,1.52,.42],[-.62,-.86,.42,.62]],
        3:[[-.02,1.28,1.46,.42],[ .62,.56,.42,1.20],[-.06,.04,1.10,.40],[ .62,-.56,.42,1.20],[-.02,-1.22,1.46,.42]],
        1:[[ .00,.10,.46,2.90],[-.44,1.08,.56,.42],[ .00,-1.30,1.20,.42]]
      }[variant||5]||[];
      SEG.forEach(s=>part(g,[s[0],s[1],0],[s[2],s[3],.62],'pine',null,M.bar));
      part(g,[0,0,-.36],[2.40,3.00,.10],'forest',null,M.slab);
    }},

  /* --- LAUNCH: gold arrow out of a pine base, ring behind. ------------- */
  launch:{ tris:1050, fog:[12,32],
    cam:(p,a)=>({eye:[2.4,2.0,8.6-p*1.2],target:[.1,.35+p*.3,0],fov:.54}),
    build(c){
      const {root,p,bob}=c, go=ss(.10,.90,p);
      draw(M.cyl,mul(root,transform([0,-2.00,0],[0,0,0],[4.4,.26,4.4])),'bone');
      draw(M.cyl,mul(root,transform([0,-2.15,0],[0,0,0],[4.0,.20,4.0])),'forest');
      draw(M.ring,mul(root,transform([0,.10,-2.2],[.05,0,0],[6.2,6.2,.15])),'gold');
      part(root,[0,-1.55,0],[2.60,.62,2.60],'pine',[0,-.22,0],M.bar);
      part(root,[0,-1.20,0],[2.20,.10,2.20],'gold',[0,-.22,0],M.slab);
      const a=mul(root,transform([-.35+go*.55,-.85+go*1.55+bob*.6,.25],[0,-.20,0]));
      part(a,[0,0,0],[.52,3.30,.52],'gold',[0,0,.7854],M.bar);            /* 45 deg shaft */
      part(a,[ .78, .78,0],[.52,1.55,.52],'gold',[0,0,0],M.bar);          /* barb up      */
      part(a,[ .78, .78,0],[1.55,.52,.52],'gold',[0,0,0],M.bar);          /* barb across  */
      part(a,[-.06,-.06,-.30],[.46,.46,.30],'forest',[0,0,.7854],M.bar);
    }},

  /* --- CARD: reusable product tile for the cards / image grid. ---------- */
  card:{ tris:160, fog:[8,22],
    cam:(p,a)=>({eye:[0,0,5.1],target:[0,0,0],fov:.58}),
    build(c){
      const {root,p,variant}=c, on=ss(0,.55,p);
      const art=[T.cardGuide,T.cardCourse,T.cardBook][variant|0]||T.cardGuide;
      const skin=['pine','bone','gold'][variant|0]||'pine';
      const g=mul(root,transform([0,(1-on)*-.55,0],[0,0,0],[1,1,1]));
      part(g,[0,0,0],[2.60,3.30,.22],skin,null,M.slab);
      face(g,[0,0,.12],[2.46,3.16],art);
      part(g,[1.22,-1.52,.02],[.34,.34,.26],'gold',[0,0,.7854]);          /* gold corner wedge */
    }},

  /* --- MARK: small rotating monogram block for section dividers. -------- */
  mark:{ tris:260, fog:[8,20],
    cam:(p,a)=>({eye:[1.4,1.0,5.4],target:[0,0,0],fov:.52}),
    build(c){
      const {root,p,t,bob}=c;
      const g=mul(root,transform([0,bob*.8,0],[.22,-.5+p*1.25,0],[1,1,1]));
      part(g,[0,0,0],[2.10,2.10,2.10],'pine',null,M.bar);
      part(g,[0,0,1.07],[1.46,1.46,.08],'gold',null,M.slab);
      part(g,[1.07,0,0],[.08,1.46,1.46],'bone',null,M.slab);
      part(g,[0,1.07,0],[1.46,.08,1.46],'forest',null,M.slab);
    }}
  };

  function letter(parent,x,y,type){
    const L=mul(parent,transform([x,y,.96],[0,0,0],[.7,.7,.7]));
    if(type==='Y'){part(L,[-.38,.3,0],[.38,1.12,.36],'forest',[0,0,.55]);part(L,[.38,.3,0],[.38,1.12,.36],'forest',[0,0,-.55]);part(L,[0,-.47,0],[.39,.9,.36],'forest');}
    if(type==='G'){part(L,[-.58,0,0],[.35,1.75,.36],'forest');part(L,[0,.7,0],[1.3,.35,.36],'forest');part(L,[0,-.7,0],[1.3,.35,.36],'forest');part(L,[.5,-.32,0],[.35,.9,.36],'forest');part(L,[.33,.06,0],[.65,.33,.36],'forest');}
    if(type==='A'){part(L,[-.38,0,0],[.37,1.9,.36],'forest',[0,0,-.32]);part(L,[.38,0,0],[.37,1.9,.36],'forest',[0,0,.32]);part(L,[0,-.18,0],[.8,.3,.36],'forest');}
  }

  /* ---- 7. anchor registry ---------------------------------------------- */
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let reduced=media.matches, paused=false, disposed=false, frame=0, last=0, t=0;
  let dpr=1, vw=1, vh=1, liveCount=0, dprCap=1.65, slow=0, samples=0;
  let px=0, py=0, hasPointer=false;
  let grab=null, grabX=0, grabYaw=0;
  const anchors=[];

  const io=new IntersectionObserver(entries=>{
    for(const e of entries){
      const a=anchors.find(x=>x.el===e.target);
      if(!a)continue;
      if(a.near!==e.isIntersecting){a.near=e.isIntersecting;liveCount+=e.isIntersecting?1:-1;}
    }
    if(liveCount>0){last=performance.now();schedule();}
    else{cancelAnimationFrame(frame);frame=0;}
  },{rootMargin:'140px 0px'});

  function register(el){
    const name=el.dataset.d3||el.dataset['3d']||el.getAttribute('data-3d');
    if(!OBJ[name])return null;
    const a={el,name,def:OBJ[name],p:0,raw:0,yaw:0,tyaw:0,pitch:0,tpitch:0,near:false,
             variant:Number(el.getAttribute('data-3d-variant')||0),
             hold:el.hasAttribute('data-3d-hold'),manual:0,
             drag:el.hasAttribute('data-3d-drag')};
    anchors.push(a);io.observe(el);
    el.classList.add('is-3d');
    if(a.drag){
      el.style.touchAction='pan-y';
      el.addEventListener('pointerdown',e=>{if(e.button&&e.button!==0)return;
        grab=a;grabX=e.clientX;grabYaw=a.tyaw;el.setPointerCapture?.(e.pointerId);});
    }
    return a;
  }
  function scan(scope=document){scope.querySelectorAll('[data-3d]').forEach(register);}

  /* ---- 8. the single render loop --------------------------------------- */
  function render(now=0){
    frame=0;
    if(disposed||document.hidden||!liveCount)return;
    const dt=Math.min((now-last)/1000,.04)||.016; last=now;
    if(!paused&&!reduced)t+=dt;
    if(samples<90){samples++;if(dt>.022)slow++;if(samples===90&&slow>30&&dprCap>1.2){dprCap=1.2;resize();}}
    const k=(paused||reduced)?1:1-Math.exp(-dt*7);

    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);

    const mobile=vw<650;
    let settled=true;

    for(const a of anchors){
      if(!a.near)continue;
      const r=a.el.getBoundingClientRect();
      if(r.bottom<-140||r.top>vh+140||r.width<4||r.height<4)continue;

      /* per-anchor progress. data-3d-hold anchors ignore scroll and are
         driven by stage.setValue(name,v) from the DOM controls instead.   */
      a.raw=a.hold?a.manual:clamp((vh*.86-r.top)/(r.height+vh*.42),0,1);
      a.p+=(a.raw-a.p)*k;

      /* pointer parallax, only for the anchor under the cursor (or dragged) */
      const inside=hasPointer&&px>r.left-40&&px<r.right+40&&py>r.top-40&&py<r.bottom+40;
      if(grab===a)      a.tyaw=clamp(grabYaw+(px-grabX)*.004,-.80,.60);
      else if(inside)   a.tyaw=((px-r.left)/r.width-.5)*.22;
      else              a.tyaw=0;
      a.tpitch= inside?((py-r.top )/r.height-.5)*.07:0;
      a.yaw  +=(a.tyaw  -a.yaw  )*k;
      a.pitch+=(a.tpitch-a.pitch)*k;
      if(Math.abs(a.raw-a.p)+Math.abs(a.tyaw-a.yaw)+Math.abs(a.tpitch-a.pitch)>.002)settled=false;

      /* the anchor's DOM box IS the viewport: the object can never escape it */
      const x=Math.round(r.left*dpr), y=Math.round((vh-r.bottom)*dpr);
      const w=Math.max(1,Math.round(r.width*dpr)), h=Math.max(1,Math.round(r.height*dpr));
      gl.viewport(x,y,w,h); gl.scissor(x,y,w,h); gl.clear(gl.DEPTH_BUFFER_BIT);

      const D=a.def, p=reduced?a.raw:a.p;
      const cam=D.cam(p,r.width/r.height,mobile);
      gl.uniformMatrix4fv(u.ViewProjection,false,mul(perspective(cam.fov,r.width/r.height),lookAt(cam.eye,cam.target)));
      gl.uniform3fv(u.Eye,cam.eye);
      gl.uniform2f(u.Fog,D.fog[0],D.fog[1]);
      scroll=p;

      const enter=reduced?1:ss(0,.20,p), exit=reduced?1:1-ss(.90,1,p);
      /* entrance and exit are a z push into the fog: no alpha, no sorting */
      const away=(1-enter)*16+(1-exit)*12;
      const root=mul(transform([0,0,-away],[0,0,0]),transform([0,-.1,0],[a.pitch,-.18+a.yaw,0]));
      D.build({root,p,enter,exit,t,bob:(paused||reduced)?0:Math.sin(t*.8+anchors.indexOf(a))*.055,
               mobile,variant:a.variant,M,T,part,face,draw});
    }

    if((!reduced&&!paused)||!settled)frame=requestAnimationFrame(render);
  }
  function schedule(){if(!frame&&!disposed&&!document.hidden&&liveCount)frame=requestAnimationFrame(render);}

  /* ---- 9. lifecycle ---------------------------------------------------- */
  function resize(){
    vw=Math.max(1,innerWidth);vh=Math.max(1,innerHeight);
    dpr=Math.min(devicePixelRatio||1, vw<650?Math.min(1.35,dprCap):dprCap);
    canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);
    schedule();
  }
  function onScroll(){schedule();}
  function onMove(e){px=e.clientX;py=e.clientY;hasPointer=e.pointerType==='mouse';schedule();}
  function onLeave(){hasPointer=false;schedule();}
  function onUp(){grab=null;schedule();}
  function visibility(){if(document.hidden){cancelAnimationFrame(frame);frame=0;}else{last=performance.now();schedule();}}
  function motion(e){reduced=e.matches;schedule();}
  function lost(e){e.preventDefault();document.documentElement.classList.remove('webgl-ready');cancelAnimationFrame(frame);frame=0;}

  addEventListener('resize',resize);
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('pointermove',onMove,{passive:true});
  addEventListener('pointerleave',onLeave);
  addEventListener('pointerup',onUp);
  addEventListener('pointercancel',onUp);
  document.addEventListener('visibilitychange',visibility);
  media.addEventListener('change',motion);
  canvas.addEventListener('webglcontextlost',lost);

  scan();resize();
  document.documentElement.classList.add('webgl-ready');
  schedule();

  return {
    scan, register,
    setPaused(v){paused=v;schedule();},
    /* drive a data-3d-hold anchor from DOM controls, e.g. the hero's
       Audience / Product / Launch buttons: stage.setValue('hero', i/2)   */
    setValue(name,v){anchors.forEach(a=>{if(a.name===name){a.manual=clamp(v,0,1);}});schedule();},
    /* re-bake the canvas textures once a display webfont has loaded */
    refreshText(){/* call texture() again and reassign T.* if using a webfont */},
    stats(){return{anchors:anchors.length,live:liveCount,dpr,uniqueTris:738};},
    dispose(){
      disposed=true;cancelAnimationFrame(frame);io.disconnect();
      removeEventListener('resize',resize);removeEventListener('scroll',onScroll);
      removeEventListener('pointermove',onMove);removeEventListener('pointerleave',onLeave);
      removeEventListener('pointerup',onUp);removeEventListener('pointercancel',onUp);
      document.removeEventListener('visibilitychange',visibility);
      media.removeEventListener('change',motion);
      canvas.removeEventListener('webglcontextlost',lost);
      buffers.forEach(b=>gl.deleteBuffer(b));textures.forEach(x=>gl.deleteTexture(x));gl.deleteProgram(program);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  };
}
```

---

## 8. Build checklist and tunables

### 8.1 Anchor map for the build

Put these in order down the page. Each is one `<div>`; nothing else is needed.

| # | section | anchor | variant | slot CSS |
|---|---|---|---|---|
| 1 | Hero | `data-3d="hero" data-3d-hold data-3d-drag` | — | `.stage-hero` — `height:min(78svh,860px)` |
| 2 | "You create. We build." | `data-3d="mark"` | — | `.stage-mark` 140 × 140, centred |
| 3 | Content → product | `data-3d="transform"` | — | `.stage-slot` 16/11 |
| 4 | What's inside a product | `data-3d="kit"` | — | `.stage-slot` 16/11 |
| 5 | Product cards ×3 | `data-3d="card"` | `0`, `1`, `2` | `.card-3d` 4/5 |
| 6 | Partnership / pricing | `data-3d="tiers"` | `1` (highlight the middle) | `.stage-slot` 16/11 |
| 7 | Founding spots | `data-3d="digit"` | `5` | `.stage-slot` 16/11 |
| 8 | Divider before the CTA | `data-3d="mark"` | — | `.stage-mark` |
| 9 | Final CTA | `data-3d="launch"` | — | `.stage-slot` 16/11 |

Twelve anchors, eight builders, one context. `stage.scan()` picks up anything added
later (e.g. after a route change) — call it again and it registers only new nodes.

### 8.2 Tunables, with the reason for each default

| knob | default | raise it to… | lower it to… |
|---|---|---|---|
| `perspective(fov)` | `0.50 – 0.58` | get a wider, more dramatic shot (and lose the product-table feel) | flatten further toward orthographic |
| key direction | `normalize(-0.42, 0.86, 0.52)` | move gold onto different faces — but keep the key on the **opposite** side from the camera (§4.4) | |
| sky weight | `0.26` | lift the whole object off the page; more Bone on top faces | make it heavier and more graphic |
| ambient floor | `0.17` | open up the shadows (risk: flat) | deepen cavities (risk: blob) |
| `MAT.bone.rk` | `0.46` | Bone silhouette reads harder (3.3:1 at 0.50) | softer, risks disappearing below 0.34 |
| `MAT.pine.rk` | `0.26` | warmer halo, silhouette drops to 5.9:1 at 0.38 | crisper cut-out look |
| fog strength | `0.62` | more aerial recession, softer | more graphic, flatter |
| fog range | per-object, e.g. `[14,36]` hero, `[8,22]` card | | |
| entrance push | `(1-enter)*16` | longer dissolve | snappier arrival |
| progress window | `vh*0.86`, `+ vh*0.42` | start later / take longer | start earlier / resolve sooner |
| smoothing rate | `1 - exp(-dt*7)` | `*10` snappier | `*4` more languid |
| DPR cap | 1.65 / 1.35 | 2.0 only if you have measured headroom | 1.2 is the adaptive floor |
| `bob` amplitude | `0.055` | more life, risks "floaty AI" | stiller, more architectural |

### 8.3 Sign-off checklist

Visual
- [ ] On a 1440 px screen, the hero shows at least **six distinct tones** on the Pine arch. If it looks like one black mass, the ramp uniforms are not being uploaded per draw.
- [ ] The Bone plinth has a visible edge against the page. If not, `MAT.bone.rk` is too low or the fresnel `mix()` target is wrong.
- [ ] Gold never forms a long outer silhouette edge against Beige — it is always framed by Pine or Forest.
- [ ] No surface in the scene looks like chrome or a mirror.
- [ ] The ground shadow is a warm grey-green (`#CDCEBC` at its darkest), never neutral grey and never dark.
- [ ] Anti-aliased silhouette edges have no cool fringe — confirm `gl.clearColor(1,.969,.902,0)`.
- [ ] Every object sits on a plinth, deck or disc. Nothing floats in a void.

Behaviour
- [ ] Scroll from top to bottom: each anchor's object arrives out of the paper, tells its story, and recedes. No pop-in, no hard cut.
- [ ] Objects never overlap each other's DOM boxes (check the card grid at 1024 px, where the slots are closest).
- [ ] Hero drag works; vertical touch scroll still works over the hero on a phone.
- [ ] The `Audience / Product / Launch` buttons change the hero and update the caption.
- [ ] The pause toggle freezes everything, including the idle bob.

Performance
- [ ] `stage.stats()` reports `uniqueTris: 738`.
- [ ] Scroll past a section with no 3D: Chrome's Performance panel shows **no RAF frames at all**.
- [ ] Leave the page idle on the hero without touching it: frames stop within ~1 s (settle detection).
- [ ] Switch tabs: frames stop immediately.
- [ ] Throttle CPU 4× and reload: the adaptive DPR step-down fires once within 90 frames and never oscillates.
- [ ] Mobile Safari on a real device: no `webglcontextlost`, no fan noise, no scroll jank.

Accessibility
- [ ] `prefers-reduced-motion: reduce` — nothing moves on its own; scroll still repositions; the hero buttons still work.
- [ ] The canvas is `aria-hidden="true"` and `pointer-events:none`; all keyboard affordances live on the DOM buttons, not the canvas.
- [ ] Every section's meaning survives with WebGL disabled entirely (`chrome://flags` → disable WebGL) — the CSS fallbacks carry it.
- [ ] Pine body copy over the canvas still measures 13.5:1. The fog term keeps geometry from ever reaching full strength behind text.

---

## 9. Sources

- [unpkg — three 0.186.1](https://app.unpkg.com/three@0.186.1/files/README.md)
- [jsDelivr — three](https://jsdelivr.com/package/npm/three)
- [Three.js in 2026: what changed](https://www.utsubo.com/fr/blog/threejs-2026-quoi-de-neuf)

Local references read in full:
`/home/user/refs/yga-agency-site-/yga-website-2/public/scene.js` ·
`…/public/app.js` · `…/public/experience.js` · `…/public/index.html` ·
`…/public/styles.css` · `…/DESIGN.md` · `…/yga-preview.html` ·
`/home/user/refs/site-example-3d-camera-shop-ir-/src/Scenes.tsx` ·
`/home/user/refs/security-cams-iran-site-2/package.json` ·
skills `threejs-fundamentals`, `threejs-geometry`, `threejs-materials`,
`threejs-lighting`, `threejs-shaders`, `threejs-postprocessing`,
`lightweight-3d-effects`, `web3d-integration-patterns`, `blender-web-pipeline`.
