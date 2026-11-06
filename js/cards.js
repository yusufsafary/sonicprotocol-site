/* Sonic Protocol: smooth, springy card motion (tilt, glare, parallax, press, gyro, reveal). Content untouched. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const S = new Map(); // card -> state
  let raf = 0, gyro = null, touching = null;
  const visible = new Set();
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const st = (c) => { let s = S.get(c); if (!s) { s = { rx: 0, ry: 0, tx: 0, ty: 0, gx: 50, gy: 50, tgx: 50, tgy: 50, sc: 1, tsc: 1, lift: 0, tlift: 0, on: false }; S.set(c, s); } return s; };
  const canTilt = (c) => c && c.dataset.tilt !== '0' && !c.closest('.mixer');
  const baseOf = (c) => (c.dataset.base || '') + (c.closest('.slot.sel') ? ' translateY(-6px)' : '');

  function aim(c, x, y, strength = 1) { // x,y in 0..1
    const s = st(c); s.on = true;
    s.tx = (0.5 - y) * 16 * strength; s.ty = (x - 0.5) * 18 * strength;
    s.tgx = x * 100; s.tgy = y * 100; s.tlift = 1;
    c.classList.add('live', 'tilting'); kick();
  }
  function release(c) { const s = S.get(c); if (!s) return; s.on = false; s.tx = s.ty = 0; s.tgx = s.tgy = 50; s.tsc = 1; s.tlift = 0; kick(); }

  function frame() {
    raf = 0; let busy = false;
    // gyro drives visible tiltable cards when no finger/mouse is on them
    if (gyro && !touching) visible.forEach((c) => { const s = st(c); if (!s.on && canTilt(c)) { s.tx = gyro.x * 7; s.ty = gyro.y * 9; s.tgx = 50 + gyro.y * 40; s.tgy = 50 - gyro.x * 40; s.gyro = true; c.classList.add('live'); } });
    S.forEach((s, c) => {
      const k = s.on ? 0.2 : 0.12;
      s.rx += (s.tx - s.rx) * k; s.ry += (s.ty - s.ry) * k; s.sc += (s.tsc - s.sc) * 0.25;
      s.gx += (s.tgx - s.gx) * 0.22; s.gy += (s.tgy - s.gy) * 0.22; s.lift += (s.tlift - s.lift) * 0.15;
      const settled = Math.abs(s.rx - s.tx) < 0.02 && Math.abs(s.ry - s.ty) < 0.02 && Math.abs(s.sc - s.tsc) < 0.001 && Math.abs(s.lift - s.tlift) < 0.005;
      const idle = settled && !s.on && s.tx === 0 && s.ty === 0 && s.tsc === 1 && !s.gyro;
      if (idle || !c.isConnected) {
        c.style.transform = c.dataset.base || ''; c.classList.remove('live', 'tilting');
        c.style.removeProperty('--lift'); c.style.removeProperty('--px'); c.style.removeProperty('--py'); S.delete(c); return;
      }
      c.style.transform = `${baseOf(c)} perspective(900px) rotateX(${s.rx.toFixed(2)}deg) rotateY(${s.ry.toFixed(2)}deg) scale(${(s.sc + s.lift * 0.03).toFixed(4)})`;
      c.style.setProperty('--gx', s.gx.toFixed(1) + '%'); c.style.setProperty('--gy', s.gy.toFixed(1) + '%');
      c.style.setProperty('--hx', s.gx.toFixed(1) + '%'); c.style.setProperty('--hy', s.gy.toFixed(1) + '%');
      c.style.setProperty('--px', (-s.ry * 0.45).toFixed(2) + 'px'); c.style.setProperty('--py', (s.rx * 0.45).toFixed(2) + 'px');
      c.style.setProperty('--lift', s.lift.toFixed(3));
      if (!settled || s.on || s.gyro) busy = true;
      s.gyro = false;
    });
    if (busy || (gyro && visible.size)) kick();
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  if (!reduce) {
    // pointer tilt (mouse + touch). Touch scroll fires pointercancel, which springs the card back.
    document.addEventListener('pointermove', (e) => {
      const c = e.target.closest && e.target.closest('.card'); if (!canTilt(c)) return;
      if (e.pointerType === 'mouse' && !fine) return;
      const r = c.getBoundingClientRect();
      aim(c, clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1), e.pointerType === 'touch' ? 0.85 : 1);
    }, { passive: true });
    document.addEventListener('pointerout', (e) => { const c = e.target.closest && e.target.closest('.card'); if (c && !c.contains(e.relatedTarget)) release(c); }, { passive: true });
    document.addEventListener('pointerdown', (e) => {
      const c = e.target.closest && e.target.closest('.card'); if (!c) return;
      if (e.pointerType === 'touch') touching = c;
      const s = st(c); s.tsc = 0.965; c.classList.add('live', 'pressed'); kick();
    }, { passive: true });
    const up = (e) => {
      const c = touching || (e.target.closest && e.target.closest('.card'));
      touching = null; if (!c) return; c.classList.remove('pressed');
      const s = S.get(c); if (s) s.tsc = 1;
      if (e.pointerType === 'touch' || e.type === 'pointercancel') release(c); else kick();
    };
    document.addEventListener('pointerup', up, { passive: true });
    document.addEventListener('pointercancel', up, { passive: true });
    window.addEventListener('blur', () => S.forEach((_, c) => release(c)));

    // gentle gyroscope tilt on phones (Android fires without a permission prompt)
    if (!fine && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      let b0 = null;
      window.addEventListener('deviceorientation', (e) => {
        if (e.beta == null || e.gamma == null) return;
        if (b0 == null) b0 = e.beta; b0 += (e.beta - b0) * 0.01; // slowly re-centre to how the phone is held
        const nx = clamp((e.beta - b0) / 25, -1, 1), ny = clamp(e.gamma / 25, -1, 1);
        gyro = gyro ? { x: gyro.x + (nx - gyro.x) * 0.3, y: gyro.y + (ny - gyro.y) * 0.3 } : { x: nx, y: ny };
        if (visible.size) kick();
      }, { passive: true });
    }
  }

  // reveal + visibility tracking (also limits gyro work to cards on screen)
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((en) => {
    const c = en.target;
    if (en.isIntersecting) {
      visible.add(c);
      if (!c.classList.contains('in')) { const sib = c.parentElement ? [...c.parentElement.children].indexOf(c) : 0; c.style.setProperty('--rd', Math.min(sib, 6) * 60 + 'ms'); c.classList.add('in'); }
    } else { visible.delete(c); }
  }), { rootMargin: '0px 0px -6% 0px', threshold: 0.12 }) : null;
  const watch = (c) => { if (c._w) return; c._w = 1; if (!reduce && !c.closest('.flip')) c.classList.add('rv'); io ? io.observe(c) : c.classList.add('in'); };
  document.querySelectorAll('.card').forEach(watch);
  new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.classList.contains('card')) watch(n); n.querySelectorAll && n.querySelectorAll('.card').forEach(watch); }))).observe(document.body, { childList: true, subtree: true });
  setTimeout(() => document.querySelectorAll('.card.rv:not(.in)').forEach((c) => { const r = c.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) c.classList.add('in'); }), 1500);
})();
