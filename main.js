/* ============================================================
   Joshua Maina — portfolio interactions
   ============================================================ */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Footer year ---------- */
document.getElementById('year').textContent = new Date().getFullYear();

/* ============================================================
   NAV — mobile toggle, stuck state, active section
   ============================================================ */
(function nav() {
  const header = document.getElementById('nav');
  const toggle = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  const links = [...menu.querySelectorAll('.nav__link')];

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  menu.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav__link')) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });

  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Highlight the section currently in view */
  const sections = links
    .map(l => document.querySelector(l.getAttribute('href')))
    .filter(Boolean);

  const spy = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = '#' + entry.target.id;
      links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });

  sections.forEach(s => spy.observe(s));
}());

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
(function reveal() {
  const items = document.querySelectorAll('.reveal');
  if (reduceMotion) {
    items.forEach(el => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((entry, i) => {
      if (!entry.isIntersecting) return;
      entry.target.style.transitionDelay = `${Math.min(i * 70, 280)}ms`;
      entry.target.classList.add('is-visible');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -60px 0px' });

  items.forEach(el => io.observe(el));
}());

/* ============================================================
   TEXT SCRAMBLE — headings decode into place on first view
   ============================================================ */
(function scramble() {
  const GLYPHS = '#&%$@01ABCDEFGHJKLMNPQRSTUVWXYZ468';
  const targets = document.querySelectorAll('[data-scramble]');
  if (!targets.length) return;

  if (reduceMotion) return;

  function run(el) {
    const text = el.textContent;
    const chars = [...text];
    // Each character resolves after its own delay, staggered left to right.
    const resolveAt = chars.map((_, i) => i * 1.6 + Math.random() * 14);
    const total = Math.max(...resolveAt) + 18;
    let frame = 0;

    el.style.minHeight = `${el.offsetHeight}px`;

    function tick() {
      let out = '';
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i];
        if (c === ' ' || c === '\n' || frame >= resolveAt[i]) {
          out += c;
        } else {
          out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
        }
      }
      el.textContent = out;
      frame++;
      if (frame <= total) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = text;
        el.style.minHeight = '';
      }
    }
    tick();
  }

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      run(entry.target);
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.35 });

  targets.forEach(el => io.observe(el));
}());

/* ============================================================
   STAT COUNTERS
   ============================================================ */
(function counters() {
  const stats = document.querySelectorAll('.stat__value');
  if (!stats.length) return;

  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const end = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      obs.unobserve(el);

      if (reduceMotion) { el.textContent = end + suffix; return; }

      const duration = 1100;
      const start = performance.now();
      (function step(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased) + (p === 1 ? suffix : '');
        if (p < 1) requestAnimationFrame(step);
      })(start);
    });
  }, { threshold: 0.5 });

  stats.forEach(el => io.observe(el));
}());

/* ============================================================
   HERO SPHERE — rotating point cloud with proximity links
   ============================================================ */
(function sphere() {
  const canvas = document.getElementById('sphere-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Bright linked nodes sit over a finer, unlinked dust field — keeps the
  // mesh cheap (O(nodes²)) while the sphere still reads as dense.
  const NODES = 260;
  const DUST = 900;
  const LINK_DIST = 34;
  let dpr = 1, size = 0, radius = 0, nodes = [], dust = [], raf = null;

  function fibSphere(count, jitter) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const out = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i + (Math.random() - 0.5) * jitter;
      out.push({
        x: Math.cos(theta) * r,
        y: y,
        z: Math.sin(theta) * r,
        tw: Math.random() * Math.PI * 2
      });
    }
    return out;
  }

  function build() {
    nodes = fibSphere(NODES, 0.3);
    dust = fibSphere(DUST, 1.1);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    size = canvas.clientWidth;
    canvas.width = canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    radius = size * 0.34;
  }

  let angle = 0;

  function project(list, cos, sin, ct, st, cx, cy) {
    const out = new Array(list.length);
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      // rotate around Y, then tilt on X
      const x1 = p.x * cos - p.z * sin;
      const z1 = p.x * sin + p.z * cos;
      const y1 = p.y * ct - z1 * st;
      const z2 = p.y * st + z1 * ct;

      const persp = 1 / (1.9 - z2 * 0.55);
      out[i] = {
        sx: cx + x1 * radius * persp * 1.9,
        sy: cy + y1 * radius * persp * 1.9,
        depth: (z2 + 1) / 2,
        tw: p.tw
      };
    }
    return out;
  }

  function draw(now) {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2;
    angle += 0.0016;

    const cos = Math.cos(angle), sin = Math.sin(angle);
    const tilt = 0.42;
    const ct = Math.cos(tilt), st = Math.sin(tilt);

    const pn = project(nodes, cos, sin, ct, st, cx, cy);
    const pd = project(dust, cos, sin, ct, st, cx, cy);
    const t = now * 0.002;

    // mesh between the bright nodes
    for (let i = 0; i < pn.length; i++) {
      const a = pn[i];
      if (a.depth < 0.3) continue;
      for (let j = i + 1; j < pn.length; j++) {
        const b = pn[j];
        if (b.depth < 0.3) continue;
        const dx = a.sx - b.sx, dy = a.sy - b.sy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < LINK_DIST) {
          const alpha = (1 - d / LINK_DIST) * 0.22 * a.depth * b.depth;
          ctx.strokeStyle = `rgba(160,185,255,${alpha})`;
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.lineTo(b.sx, b.sy);
          ctx.stroke();
        }
      }
    }

    // fine dust — gives the sphere its density
    for (const p of pd) {
      const alpha = Math.pow(p.depth, 2.4) * 0.5;
      if (alpha < 0.012) continue;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 0.55 + p.depth * 0.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(150,175,250,${alpha})`;
      ctx.fill();
    }

    // bright nodes
    for (const p of pn) {
      const twinkle = 0.6 + 0.4 * Math.sin(t + p.tw);
      const alpha = Math.pow(p.depth, 1.9) * twinkle;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 0.8 + p.depth * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = p.depth > 0.86
        ? `rgba(205,218,255,${alpha})`
        : `rgba(140,165,250,${alpha * 0.95})`;
      ctx.fill();
    }

    raf = requestAnimationFrame(draw);
  }

  function start() {
    resize();
    build();
    cancelAnimationFrame(raf);
    if (reduceMotion) { draw(0); cancelAnimationFrame(raf); return; }
    raf = requestAnimationFrame(draw);
  }

  window.addEventListener('resize', () => { resize(); }, { passive: true });
  start();

  // Pause when the hero scrolls out of view
  const io = new IntersectionObserver(([entry]) => {
    if (reduceMotion) return;
    if (entry.isIntersecting) {
      if (!raf) raf = requestAnimationFrame(draw);
    } else {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }, { threshold: 0 });
  io.observe(canvas);
}());

/* ============================================================
   AMBIENT BACKGROUND — drifting particle field
   ============================================================ */
(function background() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || reduceMotion) return;
  const ctx = canvas.getContext('2d');

  let dpr = 1, w = 0, h = 0, particles = [];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(70, (w * h) / 26000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.2 + 0.4
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(140,165,255,0.5)';
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  frame();
}());
