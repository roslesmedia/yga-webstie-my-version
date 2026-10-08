/* YGA motion layer — runs after the React bundle and choreographs scroll transitions
   with the bundle's own GSAP/ScrollTrigger/Lenis (exposed as window.__yga).
   It never restructures React-owned DOM: it only animates styles, sets data attributes,
   and appends decorative, aria-hidden nodes. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function ready(fn, tries = 0) {
    if (window.__yga && $('.results') && $('.footer')) return fn(window.__yga);
    if (tries > 300) return; // ~5s: leave the page as the bundle rendered it
    requestAnimationFrame(() => ready(fn, tries + 1));
  }

  ready(({ gsap, ScrollTrigger: ST }) => {
    const deco = cls => { const d = document.createElement('div'); d.className = cls; d.setAttribute('aria-hidden', 'true'); return d; };
    document.body.append(deco('yga-grain'), deco('yga-progress'));

    const seamHosts = $$('.process-section, .creator-products, .partnership, .demand-section, .evidence, .results');
    seamHosts.forEach(s => s.append(deco('yga-seam')));

    if (reduce) return;

    const nav = $('.navigation');
    const progress = $('.yga-progress');
    gsap.to(progress, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

    // Navigation tucks away while reading down; React owns its className, so use a data attribute.
    ST.create({
      start: 0, end: 'max',
      onUpdate(self) {
        const hide = self.direction === 1 && self.scroll() > 520 && !nav.classList.contains('menu-open') && !nav.contains(document.activeElement);
        nav.toggleAttribute('data-yga-hidden', hide);
      },
    });

    // ---- Backgrounds: depth parallax (translate property, so CSS scale drift can run alongside)
    const parallax = (el, trigger, from, to) => {
      if (!el) return;
      ST.create({
        trigger, start: 'top bottom', end: 'bottom top', scrub: true,
        onUpdate: s => { el.style.translate = `0 ${(from + (to - from) * s.progress).toFixed(1)}px`; },
      });
    };
    const hero = $('.hero');
    ST.create({
      trigger: hero, start: 'top top', end: 'bottom top', scrub: true,
      onUpdate: s => {
        const p = s.progress;
        $('.hero-environment').style.translate = `0 ${(p * 140).toFixed(1)}px`;
        $('.hero-scene').style.translate = `0 ${(p * 90).toFixed(1)}px`;
        $('.hero-scene').style.opacity = String(1 - Math.max(0, p - .55) * 1.6);
      },
    });
    parallax($('.process-environment'), '.process-section', -60, 60);
    parallax($('.partnership-environment'), '.partnership', -70, 70);
    parallax($('.results-environment'), '.results', -60, 60);
    parallax($('.demand-arch'), '.demand-section', -40, 40);

    // ---- Section transitions: each photographic background opens like a window as it arrives
    [['.process-environment', '.process-section', 'top 35%'], ['.partnership-environment', '.partnership', 'top 40%'], ['.results-environment', '.results', 'top 72%']]
      .forEach(([env, sec, end]) => {
        gsap.fromTo(env,
          { clipPath: 'inset(9% 7% 9% 7% round 36px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
            scrollTrigger: { trigger: sec, start: 'top bottom', end, scrub: .6 } });
      });

    $$('.yga-seam').forEach(seam => {
      gsap.to(seam, { scaleX: 1, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: seam.parentElement, start: 'top 82%', once: true } });
    });

    // ---- Type: headings rise out of a mask, labels slide in, supporting copy follows
    const reveal = (targets, vars, trigger, start = 'top 86%') => {
      const els = typeof targets === 'string' ? $$(targets) : targets;
      if (!els.length) return;
      gsap.fromTo(els, vars.from, {
        ...vars.to,
        clearProps: vars.to.clearProps || 'transform,opacity',
        onStart() { els.forEach(e => { e.style.transition = 'none'; }); },
        onComplete() { els.forEach(e => { e.style.transition = ''; }); },
        scrollTrigger: { trigger: trigger || els[0], start, once: true },
      });
    };
    $$('.process-heading h2, .products-heading-group h2, .partnership-copy h2, .demand-copy h2, .evidence h2, .results h2').forEach(h => {
      reveal([h], {
        from: { clipPath: 'inset(0% 0% 100% 0%)', y: 46, skewY: 2.5 },
        to: { clipPath: 'inset(-12% -4% -22% -4%)', y: 0, skewY: 0, duration: 1.4, ease: 'expo.out', clearProps: 'clipPath,transform' },
      });
    });
    $$('main .eyebrow, .products-eyebrow, .demand-eyebrow').forEach(e => {
      if (e.closest('.hero')) return;
      reveal([e], { from: { opacity: 0, x: -18 }, to: { opacity: 1, x: 0, duration: 1, ease: 'power3.out', clearProps: 'transform,opacity' } });
    });
    $$('.process-intro, .products-intro, .partnership-copy > p:last-child, .demand-description, .demand-cta, .demand-signals, .demand-progression')
      .forEach((p, i) => reveal([p], { from: { opacity: 0, y: 22 }, to: { opacity: 1, y: 0, duration: 1.1, delay: .12, ease: 'power3.out', clearProps: 'transform,opacity' } }));

    // Process steps cascade
    reveal('.process-detail li', { from: { opacity: 0, x: 26 }, to: { opacity: 1, x: 0, duration: 1, stagger: .1, ease: 'power3.out', clearProps: 'transform,opacity' } }, '.process-detail');
    reveal('.process-heading .button', { from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity' } }, '.process-section', 'top 55%');

    // Product cards: staggered rise, the artwork wipes open from below
    const items = $$('.product-item');
    gsap.fromTo(items, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.2, stagger: .09, ease: 'expo.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.products-track', start: 'top 88%', once: true } });
    gsap.fromTo($$('.products-track .product-art'), { clipPath: 'inset(22% 0% 0% 0% round 9px)' }, { clipPath: 'inset(0% 0% 0% 0% round 9px)', duration: 1.5, stagger: .09, ease: 'expo.out', clearProps: 'clipPath',
      scrollTrigger: { trigger: '.products-track', start: 'top 88%', once: true } });
    // Carousel: a short slide that follows the arrow direction
    const wide = matchMedia('(min-width: 900px)');
    $$('.products-controls button').forEach((b, i) => b.addEventListener('click', () => {
      if (!wide.matches) return; // mobile uses native scroll-snap; don't fight it
      requestAnimationFrame(() => gsap.fromTo($$('.product-item'), { x: i ? 46 : -46, opacity: .25 }, { x: 0, opacity: 1, duration: .9, stagger: .05, ease: 'expo.out', overwrite: 'auto', clearProps: 'transform,opacity' }));
    }));

    // Partnership: card arrives, light follows the pointer across the glass
    reveal('.partnership-visual', { from: { y: 70, opacity: 0, scale: .96 }, to: { y: 0, opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out', clearProps: 'transform,opacity' } }, '.partnership', 'top 75%');
    reveal('.partnership-side-note', { from: { opacity: 0, y: 14 }, to: { opacity: 1, y: 0, duration: 1, delay: .4 } }, '.partnership', 'top 70%');
    const card = $('.partnership-card');
    if (card && fine) card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });

    // Evidence: steps light up one after another
    const steps = $$('.evidence-step');
    gsap.fromTo(steps, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, stagger: .12, ease: 'expo.out', clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.evidence', start: 'top 85%', once: true,
        onEnter: () => steps.forEach((s, i) => setTimeout(() => s.classList.add('is-lit'), 500 + i * 260)) } });

    // Results: ribbon turns with scroll, pillars land in sequence
    const ribbon = $('.results-ribbon');
    if (ribbon) ST.create({ trigger: '.results', start: 'top bottom', end: 'bottom top', scrub: true,
      onUpdate: s => { ribbon.style.rotate = `${(-7 + s.progress * 14).toFixed(2)}deg`; ribbon.style.translate = `0 ${(s.progress * 60 - 30).toFixed(1)}px`; } });
    reveal('.result-pillars p', { from: { opacity: 0, y: 26 }, to: { opacity: 1, y: 0, duration: 1, stagger: .12, ease: 'power3.out', clearProps: 'transform,opacity' } }, '.results', 'top 80%');
    reveal('.results > .button', { from: { opacity: 0, scale: .9 }, to: { opacity: 1, scale: 1, duration: .9, delay: .4, ease: 'back.out(1.6)', clearProps: 'transform,opacity' } }, '.results', 'top 80%');

    // Footer settles in
    reveal('.footer-top > *', { from: { opacity: 0, y: 18 }, to: { opacity: 1, y: 0, duration: 1, stagger: .07, ease: 'power3.out', clearProps: 'transform,opacity' } }, '.footer', 'top 92%');

    // ---- Magnetic buttons (pointer devices only)
    if (fine) {
      document.addEventListener('pointermove', e => {
        const b = e.target.closest?.('.button, .products-controls button');
        if (!b) return;
        const r = b.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        b.style.translate = `${(dx * 10).toFixed(1)}px ${(dy * 7).toFixed(1)}px`;
      }, { passive: true });
      document.addEventListener('pointerout', e => {
        const b = e.target.closest?.('.button, .products-controls button');
        if (b && !b.contains(e.relatedTarget)) b.style.translate = '';
      });
    }

    // Layout changes once the embedded fonts finish loading
    document.fonts?.ready.then(() => ST.refresh());
    addEventListener('load', () => ST.refresh(), { once: true });
  });
})();
