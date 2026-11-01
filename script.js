(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Разбивка заголовка на слова ---------- */
  $$("[data-split]").forEach((el) => {
    let i = 0;
    const wrap = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span");
            w.className = "word";
            const s = document.createElement("span");
            s.style.setProperty("--i", i++);
            s.textContent = part;
            w.appendChild(s);
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) wrap(n);
      });
    };
    wrap(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")));
  });

  /* ---------- Появление при скролле ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach((el) => io.observe(el));

  /* ---------- Скролл: прогресс + навигация ---------- */
  const bar = $(".progress");
  const nav = $("#nav");
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`;
      nav.classList.toggle("scrolled", scrollY > 40);
      ticking = false;
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ======================================================
     Феррожидкость на canvas
     ====================================================== */
  class Ferro {
    constructor(canvas, count, getMagnet) {
      this.c = canvas;
      this.ctx = canvas.getContext("2d");
      this.n = count;
      this.getMagnet = getMagnet;
      this.p = [];
      this.w = 0; this.h = 0;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas);
    }

    resize() {
      const w = this.c.clientWidth, h = this.c.clientHeight;
      if (!w || !h || (w === this.w && h === this.h)) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = w; this.h = h;
      this.c.width = Math.round(w * dpr);
      this.c.height = Math.round(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = (Math.min(w, h) * 0.46) / Math.sqrt(this.n);
      this.p = Array.from({ length: this.n }, (_, i) => {
        const r = s * Math.sqrt(i + 0.5), a = i * 2.399963;
        const hx = w / 2 + r * Math.cos(a), hy = h / 2 + r * Math.sin(a);
        return { hx, hy, x: hx, y: hy, vx: 0, vy: 0 };
      });
    }

    tick(dt) {
      if (!this.w) { this.resize(); if (!this.w) return; }
      const { w, h, ctx } = this;
      const m = this.getMagnet(w, h);
      const R = Math.min(w, h) * 0.32;
      const damp = Math.exp(-7 * dt);

      ctx.clearRect(0, 0, w, h);

      for (const p of this.p) {
        let ax = (p.hx - p.x) * 20;
        let ay = (p.hy - p.y) * 20;
        let near = 0;

        if (m) {
          const dx = m.x - p.x, dy = m.y - p.y;
          const d = Math.hypot(dx, dy) + 0.001;
          const reach = R * 3;
          if (d < reach) {
            const f = m.s * 2600 * Math.pow(R / (d + R * 0.4), 2) * (1 - d / reach);
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
          if (d < 28) {
            const push = (28 - d) * 130;
            ax -= (dx / d) * push;
            ay -= (dy / d) * push;
          }
          near = clamp(1 - d / (R * 1.5), 0, 1);
        }

        p.vx = (p.vx + ax * dt) * damp;
        p.vy = (p.vy + ay * dt) * damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        const speed = Math.hypot(p.vx, p.vy);
        const alpha = 0.3 + near * 0.5 + Math.min(speed / 700, 0.2);
        ctx.fillStyle = `rgba(218,218,224,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.4 + near * 1.8, 0, 6.2832);
        ctx.fill();
      }

      if (m) this.drawMagnet(m);
    }

    drawMagnet(m) {
      const { ctx } = this;
      const t = performance.now() / 1000;
      const r = 17 + (m.s > 1 ? 4 : 0);

      // лучи
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.lineWidth = 1;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * 6.2832 + t * 0.15;
        const len = r + 22 + Math.sin(t * 2 + i * 1.7) * 14 + (m.s > 1 ? 16 : 0);
        ctx.strokeStyle = `rgba(255,255,255,${0.1 + 0.1 * Math.sin(t * 1.6 + i)})`;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6));
        ctx.lineTo(Math.cos(a) * len * 1.5, Math.sin(a) * len * 1.5);
        ctx.stroke();
      }
      // ореол
      const halo = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 3);
      halo.addColorStop(0, "rgba(255,255,255,.32)");
      halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(0, 0, r * 3, 0, 6.2832); ctx.fill();
      // шар
      const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.6, "#e8e8e8");
      g.addColorStop(1, "#8a8a8a");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  /* ---------- Контроллер магнита (курсор / палец / автопилот) ---------- */
  function makeMagnet(el, speed = 1) {
    const st = { nx: 0.3, ny: 0.3, tx: 0.3, ty: 0.3, active: false, down: false, t: Math.random() * 10, to: 0 };

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      st.tx = clamp((e.clientX - r.left) / r.width, 0, 1);
      st.ty = clamp((e.clientY - r.top) / r.height, 0, 1);
      st.active = true;
      clearTimeout(st.to);
      st.to = setTimeout(() => (st.active = false), 2200);
    });
    el.addEventListener("pointerdown", (e) => {
      st.down = true;
      const r = el.getBoundingClientRect();
      st.tx = clamp((e.clientX - r.left) / r.width, 0, 1);
      st.ty = clamp((e.clientY - r.top) / r.height, 0, 1);
      st.active = true;
    });
    const up = () => (st.down = false);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", () => { st.active = false; st.down = false; });

    st.update = (dt) => {
      st.t += dt * speed;
      if (!st.active && !reduce) {
        st.tx = 0.5 + 0.42 * Math.sin(st.t * 0.6);
        st.ty = 0.5 + 0.4 * Math.sin(st.t * 0.47 + 1.3);
      }
      const k = 1 - Math.exp(-(st.active ? 12 : 3) * dt);
      st.nx += (st.tx - st.nx) * k;
      st.ny += (st.ty - st.ny) * k;
    };
    return st;
  }

  /* ---------- Телефон в hero ---------- */
  const phone = $("#phone");
  const screen = $("#screen");
  const heroMag = makeMagnet(screen, 1);
  const heroCanvas = $("#heroCanvas");
  const heroFerro = new Ferro(heroCanvas, 140, (w, h) => ({
    x: heroMag.nx * w, y: heroMag.ny * h, s: heroMag.down ? 1.7 : 1,
  }));

  // Вкладки
  $$("#tabs button").forEach((b) => {
    b.addEventListener("click", () => {
      phone.dataset.view = b.dataset.view;
      $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    });
  });

  // Переключатель виброотклика
  const toggle = $("#toggle");
  toggle.addEventListener("click", () => toggle.classList.toggle("on"));

  // Детектор
  const el = {
    ut: $("#ut"), dial: $("#dial"), glow: $("#glow"),
    cx: $("#cx"), cy: $("#cy"), cz: $("#cz"), cd: $("#cd"), peak: $("#peak"),
  };
  let shown = 48, peak = 48, lastPeakText = "";
  $("#reset").addEventListener("click", () => { peak = Math.round(shown); });

  function updateDetector(dt) {
    const sw = screen.clientWidth, sh = screen.clientHeight;
    if (!sw) return;
    // датчик «под левым верхним углом»
    const d = Math.hypot(heroMag.nx * sw, heroMag.ny * sh) / sw;
    const target = 48 + 880 * Math.exp(-d * 3.6) * (heroMag.down ? 1.12 : 1);
    shown += (target - shown) * (1 - Math.exp(-9 * dt));
    const ut = Math.round(shown + (Math.random() - 0.5) * 1.6);
    if (ut > peak) peak = ut;

    el.ut.textContent = ut;
    el.cx.textContent = `X: ${Math.round(ut * 0.48)}`;
    el.cy.textContent = `Y: ${Math.round(ut * 0.24)}`;
    el.cz.textContent = `Z: ${-Math.round(ut * 0.84)}`;
    el.cd.textContent = `Δ ${Math.max(0, ut - 48)}`;
    const pt = `${peak} µT`;
    if (pt !== lastPeakText) { el.peak.textContent = pt; lastPeakText = pt; }

    const k = clamp((shown - 48) / 800, 0, 1);
    el.dial.style.transform = `scale(${1 + k * 0.08})`;
    el.dial.style.borderColor = `rgba(255,255,255,${0.22 + k * 0.5})`;
    el.glow.style.transform = `translate(${heroMag.nx * sw}px, ${heroMag.ny * sh}px)`;
    el.glow.style.opacity = (0.22 + k * 0.78).toFixed(2);
  }

  /* ---------- Большое демо ---------- */
  const demoEl = $(".demo");
  const demoMag = makeMagnet(demoEl, 0.8);
  const demoFerro = new Ferro($("#demoCanvas"), 320, (w, h) => ({
    x: demoMag.nx * w, y: demoMag.ny * h, s: demoMag.down ? 1.8 : 1,
  }));

  /* ---------- Главный цикл (только для видимого) ---------- */
  const vis = { hero: true, demo: false };
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((e) => { vis[e.target === screen ? "hero" : "demo"] = e.isIntersecting; });
  }, { threshold: 0.05 });
  vio.observe(screen);
  vio.observe(demoEl);

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    if (!document.hidden) {
      if (vis.hero) {
        heroMag.update(dt);
        if (phone.dataset.view === "detector") updateDetector(dt);
        else heroFerro.tick(dt);
      }
      if (vis.demo) {
        demoMag.update(dt);
        demoFerro.tick(dt);
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ======================================================
     Десктопные эффекты
     ====================================================== */
  if (reduce || !fine) return;

  // Подсветка карточек
  $$(".spot").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });

  // Тилт
  $$(".tilt").forEach((card) => {
    let raf;
    card.addEventListener("pointerenter", () => card.classList.add("tilting"));
    card.addEventListener("pointermove", (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`;
      });
    });
    card.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      card.classList.remove("tilting");
      card.style.transform = "";
    });
  });

  // Магнитные кнопки
  $$(".magnetic").forEach((b) => {
    const label = $("span", b);
    b.addEventListener("pointermove", (e) => {
      const r = b.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      b.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
      if (label) label.style.transform = `translate(${x * 0.1}px, ${y * 0.15}px)`;
    });
    b.addEventListener("pointerleave", () => {
      b.style.transform = "";
      if (label) label.style.transform = "";
    });
  });

  // Параллакс фона
  const orbs = $$(".orb"), rings = $$(".ring");
  const m = { x: 0, y: 0 }, c = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    m.x = e.clientX / innerWidth - 0.5;
    m.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });
  const par = () => {
    c.x += (m.x - c.x) * 0.06;
    c.y += (m.y - c.y) * 0.06;
    orbs.forEach((o, i) => (o.style.translate = `${-c.x * (i + 1) * 30}px ${-c.y * (i + 1) * 30}px`));
    rings.forEach((r, i) => (r.style.translate = `${c.x * (i + 1) * 22}px ${c.y * (i + 1) * 22}px`));
    requestAnimationFrame(par);
  };
  requestAnimationFrame(par);
})();
