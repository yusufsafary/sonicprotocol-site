/* Sonic Protocol: mobile-first interaction layer. Runs after app.js; adds no content. */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const buzz = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };

  // ── scroll progress, compact header, hide-on-scroll tab bar, back to top ──
  const bar = $('.sp-progress'), top = $('.top'), bnav = $('.bnav'), toTop = $('.to-top');
  let lastY = scrollY, ticking = false;
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.style.setProperty('--p', h > 0 ? (y / h).toFixed(4) : 0);
    if (top) top.classList.toggle('is-scrolled', y > 24);
    if (bnav) { const down = y > lastY + 6, up = y < lastY - 6; if (down && y > 300) bnav.classList.add('is-hidden'); else if (up || y < 300) bnav.classList.remove('is-hidden'); }
    if (toTop) toTop.classList.toggle('show', y > innerHeight * 1.4);
    lastY = y; ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  if (toTop) toTop.addEventListener('click', () => { buzz(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

  // ── active section in top nav + bottom tab bar ──
  const links = $$('.nav a[href^="#"], .bnav a[href^="#"]');
  const ids = [...new Set(links.map((a) => a.getAttribute('href').slice(1)))];
  const secs = ids.map((id) => document.getElementById(id)).filter(Boolean);
  const setActive = (id) => links.forEach((a) => { const on = a.getAttribute('href') === '#' + id; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  const vis = new Map();
  const sio = new IntersectionObserver((es) => {
    es.forEach((e) => vis.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
    let best = null, br = 0; vis.forEach((r, id) => { if (r > br) { br = r; best = id; } });
    if (scrollY < innerHeight * 0.5) best = null;
    setActive(best);
  }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.01, 0.2, 0.5, 1] });
  secs.forEach((s) => sio.observe(s));
  $$('.bnav a').forEach((a) => a.addEventListener('click', () => buzz(6)));

  // ── ripple + haptics on every button ──
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b || reduce) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2.2, i = document.createElement('span');
    i.className = 'rip'; i.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(i); setTimeout(() => i.remove(), 650); buzz(6);
  }, { passive: true });
  document.addEventListener('click', (e) => { if (e.target.closest('.card, .swatches button, .tabs button, .filters button, .presets button, .qty button')) buzz(10); }, true);

  // ── hero: swipe to shuffle the three cards ──
  const stage = $('#heroStage');
  if (stage) {
    const bases = ['translate(-92%,-46%) rotate(-12deg) scale(.82)', 'translate(-8%,-46%) rotate(12deg) scale(.82)', 'translate(-50%,-50%)'];
    const z = [1, 1, 2];
    const cards = () => $$('.card', stage);
    let order = [0, 1, 2];
    const layout = () => cards().forEach((c, i) => { const slot = order.indexOf(i); c.dataset.base = bases[slot]; c.style.transform = bases[slot]; c.style.zIndex = z[slot]; });
    let sx = 0, sy = 0, tracking = false;
    stage.addEventListener('touchstart', (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; tracking = true; }, { passive: true });
    stage.addEventListener('touchend', (e) => {
      if (!tracking) return; tracking = false; const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      const cs = cards(); if (cs.length < 3) return;
      // swipe left: right card comes front; swipe right: left card comes front
      const front = order.indexOf(2), pick = order.indexOf(dx < 0 ? 1 : 0);
      [order[front], order[pick]] = [order[pick], order[front]];
      layout(); buzz(12);
      const f = cs[order.indexOf(2)]; if (f && f._play) setTimeout(() => f._play(), 180);
    }, { passive: true });
  }

  // ── rails: dots under swipeable rows on phones ──
  const rail = (el) => {
    if (!el) return;
    const dots = document.createElement('div'); dots.className = 'rail-dots'; dots.setAttribute('aria-hidden', 'true'); el.after(dots);
    const build = () => { const n = el.children.length; dots.innerHTML = '<i></i>'.repeat(n); upd(); };
    const upd = () => { const kids = [...el.children]; if (!kids.length) return; const mid = el.scrollLeft + el.clientWidth / 2; let best = 0, bd = 1e9; kids.forEach((k, i) => { const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } }); [...dots.children].forEach((d, i) => d.classList.toggle('on', i === best)); };
    el.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    new MutationObserver(build).observe(el, { childList: true }); build();
  };
  ['#ladder', '#tierGrid', '.rules'].forEach((s) => rail($(s)));

  // ── staggered reveal for grouped items ──
  ['.rules .rv', '.faq .rv', '.anat li', '.claim-grid .rv'].forEach((s) => $$(s).forEach((el, i) => el.style.setProperty('--d', Math.min(i, 6) * 0.06 + 's')));

  // ── claim steps light up as you scroll ──
  const steps = $$('.step');
  if (steps.length) {
    const st = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle('lit', e.isIntersecting)), { rootMargin: '-40% 0px -40% 0px' });
    steps.forEach((s) => st.observe(s));
  }

  // ── faq: one open at a time ──
  $$('.faq details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) { buzz(6); $$('.faq details').forEach((o) => { if (o !== d) o.open = false; }); } }));

  // ── fusion sheet: swipe down to close ──
  const sheet = $('#fuseSheet'), inner = sheet && $('.sheet-in', sheet);
  if (inner) {
    let y0 = null, dy = 0;
    inner.addEventListener('touchstart', (e) => { if (inner.scrollTop > 0) return; y0 = e.touches[0].clientY; dy = 0; inner.style.transition = 'none'; }, { passive: true });
    inner.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); inner.style.transform = `translateY(${dy}px)`; }, { passive: true });
    inner.addEventListener('touchend', () => { if (y0 == null) return; inner.style.transition = 'transform .25s ease'; if (dy > 110) { const x = $('#fsClose'); inner.style.transform = 'translateY(100%)'; setTimeout(() => { inner.style.transform = ''; inner.style.transition = ''; x && x.click(); }, 220); } else inner.style.transform = ''; y0 = null; }, { passive: true });
  }

  // ── keep hidden tab bar from covering inputs while typing ──
  $$('input').forEach((i) => { i.addEventListener('focus', () => bnav && bnav.classList.add('is-hidden')); i.addEventListener('blur', () => bnav && bnav.classList.remove('is-hidden')); });
})();
