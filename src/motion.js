(function () {
'use strict';
/* ==========================================================================
   YGA motion layer. Zero dependencies: WAAPI + one IntersectionObserver +
   one rAF read-then-write loop. CSS scroll timelines live in motion.css.
   Every hook is optional: a missing element is skipped, never an error.
   ========================================================================== */
var YGA = window.YGA = window.YGA || { motion: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, stage: null };

var root = document.documentElement;
var EASE = 'cubic-bezier(.2,.75,.2,1)';
var phone = matchMedia('(max-width:760px)');
var prefers = matchMedia('(prefers-reduced-motion: reduce)');
var supports = function (p, v) { try { return !!(window.CSS && CSS.supports(p, v)); } catch (e) { return false; } };
var SDA_SCROLL = supports('animation-timeline', 'scroll()');
root.classList.toggle('sda', SDA_SCROLL);
root.classList.toggle('no-sda', !SDA_SCROLL);

var q = function (s, r) { return (r || document).querySelector(s); };
var qa = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
var motionOn = !prefers.matches;
function still() { return !motionOn; }

/* set a button's visible label without wiping any icon markup inside it */
function setLabel(el, text) {
  if (!el) return;
  var lab = el.querySelector('.mt-label, [data-label]');
  if (lab) { lab.textContent = text; return; }
  var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), n;
  while ((n = w.nextNode())) { if (n.nodeValue.trim()) { n.nodeValue = text; return; } }
  el.appendChild(document.createTextNode(text));
}

/* ======================================================= 1. POP REVEALS == */
var records = new Map();
var observer = null;
var KINDS = { headline: 1, copy: 1, slide: 1, panel: 1, sculpture: 1, frame: 1 };

function readableText(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeName === 'BR') return ' ';
  return Array.prototype.map.call(node.childNodes, readableText).join('');
}
function splitWords(node, cls, hide) {
  var walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  nodes.forEach(function (tn) {
    var frag = document.createDocumentFragment();
    tn.textContent.split(/(\s+)/).forEach(function (chunk) {
      if (!chunk) return;
      if (/^\s+$/.test(chunk)) { frag.appendChild(document.createTextNode(chunk)); return; }
      var s = document.createElement('span');
      s.className = cls;
      s.textContent = chunk;
      if (hide) s.setAttribute('aria-hidden', 'true');
      frag.appendChild(s);
    });
    tn.parentNode.replaceChild(frag, tn);
  });
  return qa('.' + cls, node);
}
/* Headline split: wrapper spans (.mark-word/.outline-word/.serif-word) and
   <br> stay where they are; each word becomes span.pop-word aria-hidden, and
   the parent carries the whole sentence as its accessible name. Idempotent. */
function splitHeading(node) {
  if (node.querySelector('.pop-word')) return qa('.pop-word', node);
  node.setAttribute('aria-label', readableText(node).replace(/\s+/g, ' ').trim());
  node.classList.add('pop-headline');
  return splitWords(node, 'pop-word', true);
}

function register(node, kind) {
  if (records.has(node) || !KINDS[kind]) return;
  if (kind === 'headline') splitHeading(node);
  /* alternation index: position among same-kind siblings */
  var index = 0, sib = node.previousElementSibling;
  while (sib) { if (sib.getAttribute('data-pop') === kind) index++; sib = sib.previousElementSibling; }
  records.set(node, { node: node, kind: kind, index: index, seen: false, animations: new Set() });
}
qa('[data-pop]').forEach(function (node) { register(node, node.getAttribute('data-pop')); });

function track(record, node, frames, options) {
  var opts = { duration: 720, easing: EASE, fill: 'backwards' };
  for (var k in options) opts[k] = options[k];
  var a = node.animate(frames, opts);
  record.animations.add(a);
  var release = function () {
    record.animations.delete(a);
    if (!record.animations.size) record.node.classList.remove('pop-is-running');
  };
  a.finished.then(release, release);
  return a;
}
function finish(record) {
  record.node.classList.remove('pop-pending', 'pop-is-running');
  Array.from(record.animations).forEach(function (a) { a.cancel(); });
  record.animations.clear();
  record.seen = true;
}
function play(record, delay) {
  delay = delay || 0;
  if (still() || !record.node.animate) { finish(record); return; }
  Array.from(record.animations).forEach(function (a) { a.cancel(); });
  record.animations.clear();
  record.seen = true;
  var node = record.node, kind = record.kind, sm = phone.matches;
  node.classList.remove('pop-pending');
  node.classList.add('pop-is-running');

  /* A. headline: each word pops forward out of the page */
  if (kind === 'headline') {
    splitHeading(node).forEach(function (word, i) {
      track(record, word, [
        { opacity: 0, transform: 'perspective(850px) translate3d(0,' + (sm ? '.72em' : '.95em') + ',0) rotateX(-48deg) scale(1.16)', offset: 0 },
        { opacity: 1, transform: 'perspective(850px) translate3d(0,-.055em,0) rotateX(4deg) scale(1.035)', offset: .68 },
        { opacity: 1, transform: 'perspective(850px) translate3d(0,0,0) rotateX(0deg) scale(1)', offset: 1 }
      ], { duration: 780, delay: delay + Math.min(i * 48, 480) });
    });
    return;
  }

  /* F. frame: clip-path mask opens, inner counter-scales */
  if (kind === 'frame') {
    var down = record.index % 2 === 0;
    track(record, node, [
      { clipPath: down ? 'inset(0 0 100% 0)' : 'inset(0 100% 0 0)', offset: 0 },
      { clipPath: 'inset(0 0 0 0)', offset: 1 }
    ], { duration: 880, delay: delay });
    var inner = node.firstElementChild;
    if (inner) {
      var ib = getComputedStyle(inner).transform, ie = ib === 'none' ? '' : ' ' + ib;
      track(record, inner, [
        { transform: 'scale(1.085) translateY(2.2%)' + ie, offset: 0 },
        { transform: 'scale(1.012) translateY(-.4%)' + ie, offset: .72 },
        { transform: 'scale(1) translateY(0)' + ie, offset: 1 }
      ], { duration: 940, delay: delay });
    }
    return;
  }

  /* B-E. block archetypes; the authored resting transform rides along */
  var base = getComputedStyle(node).transform;
  var end = base === 'none' ? '' : ' ' + base;
  var dist = sm ? 48 : 82;
  var start, over, duration;
  if (kind === 'copy') {
    start = 'translate3d(0,' + (sm ? 32 : 48) + 'px,0) scale(1.035)';
    over = 'translate3d(0,-3px,0) scale(1.006)';
    duration = 650;
  } else if (kind === 'slide') {
    var d = record.index % 2 === 0 ? -1 : 1;
    start = 'translate3d(' + (d * dist) + 'px,32px,0) rotate(' + (d * 1.4) + 'deg) scale(.94)';
    over = 'translate3d(' + (-d * 4) + 'px,-3px,0) rotate(0deg) scale(1.012)';
    duration = 780;
  } else if (kind === 'sculpture') {
    start = 'perspective(1100px) translate3d(0,' + dist + 'px,0) rotateX(18deg) rotateY(-13deg) scale(.9)';
    over = 'perspective(1100px) translate3d(0,-9px,0) rotateX(-2deg) rotateY(2deg) scale(1.045)';
    duration = 920;
  } else { /* panel */
    start = 'perspective(1100px) translate3d(0,' + dist + 'px,0) rotateX(13deg) scale(.91)';
    over = 'perspective(1100px) translate3d(0,-5px,0) rotateX(-1deg) scale(1.025)';
    duration = 780;
  }
  track(record, node, [
    { opacity: 0, transform: start + end, offset: 0 },
    { opacity: 1, transform: over + end, offset: .7 },
    { opacity: 1, transform: (end || 'none'), offset: 1 }
  ], { duration: duration, delay: delay });
}

function connectObserver() {
  if (observer) observer.disconnect();
  observer = null;
  if (still() || !('IntersectionObserver' in window)) return;
  observer = new IntersectionObserver(function (entries) {
    var entering = entries.filter(function (e) {
      return e.isIntersecting && records.has(e.target) && !records.get(e.target).seen;
    });
    entering.sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });
    entering.forEach(function (e, i) {
      play(records.get(e.target), Math.min(i * 55, 220));
      observer.unobserve(e.target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -' + Math.min(120, Math.round(innerHeight * .13)) + 'px 0px' });
  records.forEach(function (r) { if (!r.seen) observer.observe(r.node); });
}

/* fold-aware arming: above the fold plays now, below waits hidden */
function arm() {
  if (still() || !('IntersectionObserver' in window)) { settle(); return; }
  var list = [];
  records.forEach(function (r) { list.push({ r: r, rect: r.node.getBoundingClientRect() }); });
  var visible = [];
  list.forEach(function (it) {
    var rect = it.rect, vh = innerHeight;
    if (!rect.width && !rect.height) { it.r.seen = false; return; }      /* hidden (dialog, closed details) */
    if (rect.bottom <= 0) { finish(it.r); return; }                       /* already scrolled past */
    if (rect.top < vh * .84) { visible.push(it); return; }
    it.r.node.classList.add('pop-pending');
  });
  visible.sort(function (a, b) { return a.rect.top - b.rect.top; });
  var blocks = 0;
  visible.forEach(function (it) {
    if (it.r.kind === 'headline') play(it.r, 20);
    else play(it.r, 110 + Math.min(blocks++ * 55, 220));
  });
  connectObserver();
}

/* keyboard focus never lands on something invisible */
document.addEventListener('focusin', function (e) {
  for (var t = e.target; t && t !== document.body; t = t.parentElement) {
    if (records.has(t)) {
      var r = records.get(t);
      if (r.node.classList.contains('pop-pending') || r.animations.size) finish(r);
      if (observer) observer.unobserve(t);
    }
  }
});

/* =================================================== 2. WORD FILL ======= */
var FILL_DIM = .22, FILL_OVERLAP = 2.6;
var fills = qa('[data-wordfill]').map(function (host) {
  var words = host.querySelector('.word-dim') ? qa('.word-dim', host) : splitWords(host, 'word-dim', false);
  return { host: host, words: words, last: -1, rect: null };
});

/* =================================================== 3. MARQUEES ======== */
var marquees = qa('.marquee').map(function (m) {
  var track = q('.marquee-track', m);
  if (!track) return null;
  var w = track.scrollWidth / 2;
  if (w > 0) track.style.setProperty('--marquee-dur', Math.max(18, Math.round(w / (phone.matches ? 42 : 58))) + 's');
  return { el: m, track: track, rect: null, anim: null };
}).filter(Boolean);
var boost = 0, lastY = scrollY, lastT = 0;
function marqueeAnim(m) {
  if (m.anim && m.anim.playState !== 'idle') return m.anim;
  m.anim = null;
  if (!m.track.getAnimations) return null;
  m.track.getAnimations().forEach(function (a) { if (a.animationName === 'yga-marquee') m.anim = a; });
  return m.anim;
}

/* =================================================== 4. TRANSITIONS ===== */
function sectionSibling(el, dir) {
  var s = el[dir];
  while (s && !(s.matches && s.matches('section,[data-section]'))) s = s[dir];
  return s;
}
function findSticky(host) {
  var kids = qa(':scope > *, :scope > * > *', host);
  for (var i = 0; i < kids.length; i++) if (getComputedStyle(kids[i]).position === 'sticky') return kids[i];
  return null;
}
qa('[data-transition="stack"]').forEach(function (sec) {
  var isHero = sec.id === 'top' || !!q('[data-3d="hero"]', sec);
  var host = isHero ? sec : sectionSibling(sec, 'previousElementSibling');
  if (!host) return;
  host.classList.add('stack-host');
  (findSticky(host) || host).classList.add('stack-recede');
  /* everything between the hero and the next section (the ticker) rides over too */
  var over = isHero ? host.nextElementSibling : sec;
  while (over && over.nodeName !== 'SCRIPT') {
    over.classList.add('stack-over');
    if (over.matches('section,[data-section]')) break;
    over = over.nextElementSibling;
  }
});
qa('[data-transition="band"]').forEach(function (s, i) { if (i % 2) s.classList.add('band-rev'); });

/* =================================================== 5. PINNED STORY ==== */
var pins = qa('[data-pin]').map(function (el) {
  return { el: el, steps: qa('[data-step]', el), rect: null, p: -1, active: -1 };
});

/* =================================================== 6. MASTHEAD ======== */
var masthead = q('.masthead') || q('header');
var rail = q('.progress > span', masthead || document);
var navLinks = qa('a[data-nav]');
var spy = [];
navLinks.forEach(function (a) {
  var id = (a.getAttribute('href') || '').split('#')[1];
  var sec = id && document.getElementById(id);
  if (!sec) return;
  var item = null;
  spy.forEach(function (s) { if (s.sec === sec) item = s; });
  if (!item) spy.push(item = { sec: sec, links: [], rect: null });
  item.links.push(a);
});
var spyCurrent = null;

/* ===================================================== 7. THE LOOP ====== */
var ticking = false;
function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }

function frame(now) {
  ticking = false;
  var vh = innerHeight, y = scrollY, i;
  /* ---- READ ---- */
  var docH = root.scrollHeight - vh;
  pins.forEach(function (p) { p.rect = p.el.getBoundingClientRect(); });
  fills.forEach(function (f) { f.rect = f.host.getBoundingClientRect(); });
  spy.forEach(function (s) { s.rect = s.sec.getBoundingClientRect(); });
  marquees.forEach(function (m) { m.rect = m.el.getBoundingClientRect(); });
  var dt = lastT ? Math.min(64, Math.max(1, now - lastT)) : 16;
  var v = (y - lastY) / dt; lastY = y; lastT = now;

  /* ---- WRITE ---- */
  if (masthead) masthead.classList.toggle('is-scrolled', y > 8);
  if (rail && (!SDA_SCROLL || still())) rail.style.scale = clamp01(docH > 0 ? y / docH : 0).toFixed(4) + ' 1';

  /* scrollspy: the section crossing 38% of the viewport */
  var line = vh * .38, cur = null;
  spy.forEach(function (s) { if (s.rect.top <= line && s.rect.bottom > line) cur = s; });
  if (cur !== spyCurrent) {
    spyCurrent = cur;
    spy.forEach(function (s) {
      s.links.forEach(function (a) { if (s === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    });
  }

  if (!still()) {
    /* pinned story: progress through the tall section */
    pins.forEach(function (p) {
      var r = p.rect;
      if (r.bottom < -vh || r.top > vh * 2) return;
      var prog = clamp01(-r.top / Math.max(1, r.height - vh));
      if (Math.abs(prog - p.p) > .0005) { p.p = prog; p.el.style.setProperty('--p', prog.toFixed(4)); }
      var k = Math.min(5, Math.floor(prog * 6));
      if (k !== p.active) {
        p.active = k;
        p.el.setAttribute('data-active', String(k));
        p.steps.forEach(function (s) { s.classList.toggle('is-active', +s.getAttribute('data-step') === k); });
      }
    });

    /* word fill */
    fills.forEach(function (f) {
      var r = f.rect;
      if (r.bottom < 0 || r.top > vh) return;
      var prog = clamp01((vh * .78 - r.top) / Math.max(1, r.height + vh * .5));
      if (Math.abs(prog - f.last) < .002) return;
      f.last = prog;
      var lit = prog * (f.words.length + FILL_OVERLAP);
      for (i = 0; i < f.words.length; i++) {
        var k = clamp01((lit - i) / FILL_OVERLAP);
        f.words[i].style.opacity = (FILL_DIM + (1 - FILL_DIM) * k).toFixed(3);
      }
    });

    /* marquee: scroll velocity pushes the drift, then it eases back */
    var target = Math.max(-3, Math.min(4, v * 2.2));
    boost += (target - boost) * .18;
    if (Math.abs(boost) < .01 && Math.abs(target) < .01) boost = 0;
    marquees.forEach(function (m) {
      if (m.rect.bottom < 0 || m.rect.top > vh) return;
      var a = marqueeAnim(m);
      if (a && a.updatePlaybackRate) a.updatePlaybackRate(1 + boost);
    });
    if (boost !== 0) requestTick();
  }
}
addEventListener('scroll', requestTick, { passive: true });
var resizeT = 0;
addEventListener('resize', function () {
  requestTick();
  clearTimeout(resizeT);
  resizeT = setTimeout(connectObserver, 150);
}, { passive: true });

/* ================================================ 8. MOTION ON / OFF ==== */
var toggle = q('[data-motion-toggle]');
var folds = new Set();

function settle() {
  records.forEach(finish);
  if (observer) { observer.disconnect(); observer = null; }
  folds.forEach(function (a) { a.cancel(); });
  folds.clear();
  fills.forEach(function (f) { f.last = -1; f.words.forEach(function (w) { w.style.opacity = ''; }); });
  pins.forEach(function (p) {
    p.p = -1; p.active = -1;
    p.el.style.setProperty('--p', '1');
    p.steps.forEach(function (s) { s.classList.add('is-active'); });
  });
  marquees.forEach(function (m) { m.anim = null; });
  boost = 0;
}

function setMotion(on, initial) {
  motionOn = !!on;
  YGA.motion = motionOn;
  root.dataset.motion = motionOn ? 'on' : 'off';
  root.classList.toggle('motion-off', !motionOn);
  if (toggle) {
    toggle.setAttribute('aria-pressed', String(motionOn));
    setLabel(toggle, motionOn ? 'Motion on' : 'Motion off');
    if (prefers.matches) {
      toggle.disabled = true;
      toggle.setAttribute('aria-label', 'Motion off: your system prefers reduced motion');
    } else {
      toggle.disabled = false;
      toggle.removeAttribute('aria-label');
    }
  }
  if (!motionOn) settle();
  else if (!initial) {
    if (rail) rail.style.scale = '';
    pins.forEach(function (p) { p.steps.forEach(function (s) { s.classList.remove('is-active'); }); });
  }
  if (!initial) window.dispatchEvent(new CustomEvent('yga:motion', { detail: { on: motionOn } }));
  requestTick();
}
if (toggle) toggle.addEventListener('click', function () { if (!prefers.matches) setMotion(!motionOn); });
var onPref = function () { YGA.reduced = prefers.matches; setMotion(!prefers.matches); };
if (prefers.addEventListener) prefers.addEventListener('change', onPref); else if (prefers.addListener) prefers.addListener(onPref);

/* ===================================================== 9. HERO ACTS ===== */
var acts = qa('.hero-acts [data-act]');
var caption = q('[data-act-caption]');
function selectAct(btn, silent) {
  acts.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
  if (caption && btn.dataset.caption != null) caption.textContent = btn.dataset.caption;
  var act = +btn.getAttribute('data-act') || 0;
  YGA.heroAct = act;
  if (!silent && YGA.stage && typeof YGA.stage.setValue === 'function') YGA.stage.setValue('hero', act / 2);
}
acts.forEach(function (b) { b.addEventListener('click', function () { selectAct(b); }); });
if (acts.length) {
  var pressed = acts.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; })[0] || acts[0];
  if (caption && !caption.textContent.trim()) caption.textContent = pressed.dataset.caption || '';
  if (pressed.getAttribute('aria-pressed') !== 'true') pressed.setAttribute('aria-pressed', 'true');
  YGA.heroAct = +pressed.getAttribute('data-act') || 0;
}

/* ================================================= 10. MOBILE MENU ====== */
var menuBtn = q('[data-menu-toggle]');
var menu = document.getElementById((menuBtn && menuBtn.getAttribute('aria-controls')) || 'mobile-menu');
function setMenu(open, refocus) {
  if (!menuBtn || !menu) return;
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  setLabel(menuBtn, open ? 'Close' : 'Menu');
  root.classList.toggle('menu-open', open);
  if (!open && refocus) menuBtn.focus();
}
if (menuBtn && menu) {
  menuBtn.addEventListener('click', function () { setMenu(menu.hidden, false); });
  menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) setMenu(false, false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false, true); }
  });
  addEventListener('resize', function () { if (!menu.hidden && innerWidth > 960) setMenu(false, false); }, { passive: true });
}

/* ======================================================= 11. QUIZ ======= */
var dlg = document.getElementById('fit-quiz');
if (dlg) (function () {
  var steps = qa('fieldset[data-q]', dlg).sort(function (a, b) { return +a.getAttribute('data-q') - +b.getAttribute('data-q'); });
  var results = qa('[data-result]', dlg);
  var count = q('[data-quiz-count]', dlg);
  var status = q('[data-match-status]');
  var answers = {}, step = 0, advanceT = 0; /* 0..n-1 = questions, n = result */
  var n = steps.length;
  var navs = function (k) { return qa('[data-quiz="' + k + '"]', dlg); };

  function branch() {
    if (answers[2] === 'learning' || answers[3] === 'opportunity') return 'research';
    if (answers[1] === 'skill') return 'course';
    if (answers[1] === 'method') return 'workbook';
    return 'guide';
  }
  function pad(x) { return (x < 10 ? '0' : '') + x; }
  function setMatch(level) {
    [1, 2, 3].forEach(function (l) {
      var card = document.getElementById('level-' + l);
      if (!card) return;
      var hit = String(l) === String(level);
      card.classList.toggle('is-match', hit);
      var rib = q('.match-ribbon', card);
      if (rib) rib.hidden = !hit;
    });
    if (status) status.textContent = level ? 'Your match: Level ' + pad(+level) : '';
  }
  function enter(el) {
    if (still() || !el || !el.animate) return;
    el.animate([
      { opacity: 0, transform: 'translate3d(18px,0,0)' },
      { opacity: 1, transform: 'none' }
    ], { duration: 260, easing: EASE });
  }
  function render(focus) {
    var done = step >= n, shown = null;
    steps.forEach(function (fs, i) { fs.hidden = i !== step; if (i === step) shown = fs; });
    var b = done ? branch() : null;
    results.forEach(function (r) { var hit = r.getAttribute('data-result') === b; r.hidden = !hit; if (hit) shown = r; });
    if (count) count.textContent = done ? 'Result' : pad(step + 1) + ' / ' + pad(n);
    navs('back').forEach(function (x) { x.hidden = step === 0; });
    navs('next').forEach(function (x) {
      x.hidden = done;
      x.disabled = !done && !answers[stepId(step)];
    });
    navs('restart').forEach(function (x) { x.hidden = !done; });
    qa('.quiz-disclaimer', dlg).forEach(function (x) { x.hidden = !done; });
    if (done && shown) setMatch(shown.getAttribute('data-match-level'));
    enter(shown);
    if (focus && shown) {
      var f = done ? (q('h2,h3,h4', shown) || shown) : (q('[data-value][aria-pressed="true"]', shown) || q('[data-value]', shown));
      if (f) { if (!f.matches('button,a,input,[tabindex]')) f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
    }
  }
  function stepId(i) { return steps[i] ? steps[i].getAttribute('data-q') : null; }
  function reset() {
    answers = {}; step = 0;
    qa('[data-value]', dlg).forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
  }

  qa('[data-open-quiz]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      if (dlg.open) return;
      if (step >= n) reset();
      render(false);
      if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
      if (!still() && dlg.animate) dlg.animate([
        { opacity: 0, transform: 'translate3d(0,12px,0) scale(.98)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 250, easing: EASE });
      render(true);
    });
  });

  dlg.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    var opt = t.closest('[data-value]');
    if (opt && dlg.contains(opt)) {
      var fs = opt.closest('fieldset[data-q]');
      if (fs) {
        qa('[data-value]', fs).forEach(function (o) { o.setAttribute('aria-pressed', String(o === opt)); });
        answers[fs.getAttribute('data-q')] = opt.getAttribute('data-value');
        navs('next').forEach(function (x) { x.disabled = false; });
        /* no Next button: a choice advances on its own after a short beat */
        var at = steps.indexOf(fs);
        clearTimeout(advanceT);
        advanceT = setTimeout(function () { if (step === at && dlg.open) { step = at + 1; render(true); } }, still() ? 0 : 240);
      }
      return;
    }
    var nav = t.closest('[data-quiz]');
    if (!nav) { if (e.target === dlg) dlg.close(); return; }   /* backdrop click */
    var k = nav.getAttribute('data-quiz');
    if (k === 'close') { e.preventDefault(); dlg.close(); return; }
    if (k === 'next') { e.preventDefault(); if (step < n && answers[stepId(step)]) { step++; render(true); } return; }
    if (k === 'back') { e.preventDefault(); if (step > 0) { step--; render(true); } return; }
    if (k === 'restart') { e.preventDefault(); reset(); setMatch(null); render(true); }
  });
  render(false);
})();

/* ================================================ 12. DETAILS FOLD ====== */
qa('#faq details, #what-we-do details').forEach(function (d) {
  d.addEventListener('toggle', function () {
    if (!d.open || still()) return;
    var el = d.querySelector(':scope > summary');
    el = el ? el.nextElementSibling : null;
    var i = 0;
    while (el) {
      if (el.animate) {
        el.classList.add('fold-anim');
        var a = el.animate([
          { opacity: 0, transform: 'perspective(900px) rotateX(-8deg) translateY(-6px)' },
          { opacity: 1, transform: 'perspective(900px) rotateX(0deg) translateY(0)' }
        ], { duration: 240, delay: i * 30, easing: EASE, fill: 'backwards' });
        folds.add(a);
        a.finished.then(function () { folds.delete(a); }, function () { folds.delete(a); });
      }
      el = el.nextElementSibling; i++;
    }
  });
});

/* ======================================================== BOOT ========= */
setMotion(motionOn, true);
arm();
requestTick();
})();
