(() => {
  "use strict";

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const card = document.getElementById("card");
  const btn = document.getElementById("dl");
  const text = document.getElementById("dlText");
  const info = document.getElementById("info");
  const warn = document.getElementById("warn");
  const after = document.getElementById("after");

  // Появление карточки
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-in")));

  // Проверяем, что APK лежит на сайте, и показываем его размер
  const url = btn.getAttribute("href");
  fetch(url, { method: "HEAD" })
    .then((r) => {
      if (r.status === 404) { warn.hidden = false; return; }
      const len = +r.headers.get("content-length");
      if (r.ok && len) info.textContent = `Android · бета-версия · ${(len / 1048576).toFixed(1)} МБ`;
    })
    .catch(() => { /* открыто локально — не страшно */ });

  // Нажатие: сам браузер начинает загрузку благодаря атрибуту download,
  // мы только показываем состояние
  btn.addEventListener("click", () => {
    if (btn.classList.contains("started")) return;
    btn.classList.add("started");
    text.textContent = "Загрузка началась";
    after.classList.add("show");
    setTimeout(() => { text.textContent = "Файл в загрузках"; }, 1800);
    setTimeout(() => {
      btn.classList.remove("started");
      text.textContent = "Скачать ещё раз";
    }, 6000);
  });

  if (reduce || !fine) return;

  // Подсветка под курсором
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  // Магнитная кнопка
  const label = btn.querySelector(".lbl");
  btn.addEventListener("pointermove", (e) => {
    const r = btn.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    btn.style.transform = `translate(${x * 0.2}px, ${y * 0.3}px)`;
    label.style.transform = `translate(${x * 0.08}px, ${y * 0.12}px)`;
  });
  btn.addEventListener("pointerleave", () => {
    btn.style.transform = "";
    label.style.transform = "";
  });

  // Параллакс фона
  const orbs = [...document.querySelectorAll(".orb")];
  const rings = [...document.querySelectorAll(".ring")];
  const m = { x: 0, y: 0 }, c = { x: 0, y: 0 };
  addEventListener("pointermove", (e) => {
    m.x = e.clientX / innerWidth - 0.5;
    m.y = e.clientY / innerHeight - 0.5;
  }, { passive: true });
  const loop = () => {
    c.x += (m.x - c.x) * 0.06;
    c.y += (m.y - c.y) * 0.06;
    orbs.forEach((o, i) => (o.style.translate = `${-c.x * (i + 1) * 30}px ${-c.y * (i + 1) * 30}px`));
    rings.forEach((r, i) => (r.style.translate = `${c.x * (i + 1) * 22}px ${c.y * (i + 1) * 22}px`));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
