/* ==========================================================================
   Sahana — interactions (vanilla JS, no dependencies)
   Depends on data.js (LANGUAGES, CONSTELLATION_NODES)
   ========================================================================== */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Persistent favorites (localStorage, safely) ---------- */
  const FAV_KEY = "sahana:favorites:v1";
  const safeStore = {
    get() {
      try { return JSON.parse(window.localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; }
    },
    set(list) {
      try { window.localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable: ignore */ }
    }
  };
  const favorites = new Set(safeStore.get().filter((n) => LANGUAGES.some((l) => l.n === n)));

  function updateFavCounts() {
    const c = String(favorites.size);
    $("#favCount").textContent = c;
    $("#favCount2").textContent = c;
  }

  function toggleFavorite(n, btn) {
    if (favorites.has(n)) favorites.delete(n); else favorites.add(n);
    safeStore.set(Array.from(favorites));
    updateFavCounts();
    if (btn) {
      const on = favorites.has(n);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.setAttribute("aria-label", (on ? "Remove from" : "Save to") + " favorites");
    }
  }

  /* ==========================================================================
     SECTION FIVE — 143 language archive grid
     ========================================================================== */
  const REGION_LABEL = { SOUTH: "South", EAST: "East", MIDDLE: "Middle Eastern & RTL", EUROPEAN: "European & Cyrillic" };
  const grid = $("#langGrid");
  const heartSvg = '<svg viewBox="0 0 12 11" fill="none" aria-hidden="true"><path d="M6 10.2 1.6 5.9A2.6 2.6 0 0 1 6 2.6a2.6 2.6 0 0 1 4.4 3.3L6 10.2Z" stroke="currentColor" stroke-width="1.1"/></svg>';

  function buildGrid() {
    const frag = document.createDocumentFragment();
    LANGUAGES.forEach((l) => {
      const card = document.createElement("article");
      card.className = "lang-card";
      card.dataset.n = l.n;
      card.dataset.region = l.region;
      card.dataset.search = [l.script, l.roman, l.name, l.region, REGION_LABEL[l.region] || ""].join(" ").toLowerCase();
      const isFav = favorites.has(l.n);
      card.innerHTML =
        '<span class="num">#' + String(l.n).padStart(2, "0") + "</span>" +
        '<p class="script">' + escapeHtml(l.script) + "</p>" +
        '<span class="roman">' + escapeHtml(l.roman) + "</span>" +
        '<span class="name">' + escapeHtml(l.name) + "</span>" +
        '<span class="region">• ' + l.region + "</span>" +
        '<button class="fav" type="button" aria-pressed="' + (isFav ? "true" : "false") + '" aria-label="' + (isFav ? "Remove from" : "Save to") + ' favorites">' + heartSvg + "</button>";
      frag.appendChild(card);
    });
    grid.appendChild(frag);

    // Category counts as shown on the filter pills (computed from the real data)
    const counts = {};
    LANGUAGES.forEach((l) => { counts[l.region] = (counts[l.region] || 0) + 1; });
    $$("[data-count]").forEach((el) => { el.textContent = counts[el.dataset.count] || 0; });
    $("#resultCount").textContent = "Showing " + LANGUAGES.length + " inscribed folios";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let activeFilter = "ALL";
  let query = "";

  function applyFilters() {
    let visible = 0;
    $$(".lang-card", grid).forEach((card) => {
      const matchRegion = activeFilter === "ALL" || card.dataset.region === activeFilter;
      const matchQuery = !query || card.dataset.search.indexOf(query) !== -1;
      const show = matchRegion && matchQuery;
      card.classList.toggle("is-hidden", !show);
      if (show) visible++;
    });
    $("#emptyState").classList.toggle("is-on", visible === 0);
    $("#resultCount").textContent = visible === LANGUAGES.length && !query && activeFilter === "ALL"
      ? "Showing " + LANGUAGES.length + " inscribed folios"
      : "Showing " + visible + " of " + LANGUAGES.length + " folios";
  }

  function setupArchive() {
    grid.addEventListener("click", (e) => {
      const btn = e.target.closest(".fav");
      if (!btn) return;
      const card = btn.closest(".lang-card");
      toggleFavorite(Number(card.dataset.n), btn);
    });

    $("#search").addEventListener("input", (e) => {
      query = e.target.value.trim().toLowerCase();
      applyFilters();
    });

    $$(".pill").forEach((pill) => {
      pill.addEventListener("click", () => {
        activeFilter = pill.dataset.filter;
        $$(".pill").forEach((p) => p.setAttribute("aria-pressed", p === pill ? "true" : "false"));
        applyFilters();
      });
    });

    // Reflect favourite state from storage on load
    updateFavCounts();
  }

  /* ==========================================================================
     SECTION FOUR — constellation canvas
     ========================================================================== */
  const sky = $("#sky");
  const panel = $("#nodePanel");
  const starLayer = $("#starLayer");
  let activeNode = null;

  function buildStars() {
    const NS = "http://www.w3.org/2000/svg";
    starLayer.setAttribute("viewBox", "0 0 1000 500");
    starLayer.innerHTML = "";
    const count = 70;
    for (let i = 0; i < count; i++) {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", (Math.random() * 1000).toFixed(1));
      c.setAttribute("cy", (Math.random() * 500).toFixed(1));
      c.setAttribute("r", (Math.random() * 1.2 + 0.4).toFixed(2));
      c.setAttribute("fill", i % 5 === 0 ? "#fec3c5" : "#d6c2c5");
      c.setAttribute("opacity", (Math.random() * 0.6 + 0.2).toFixed(2));
      starLayer.appendChild(c);
    }
  }

  function placeNodes(randomize) {
    const W = 1032, H = 540;
    const pts = [];
    CONSTELLATION_NODES.forEach((node, i) => {
      let x = node.left, y = node.top;
      if (randomize) {
        // scatter within the canvas while keeping nodes from crowding each other
        let tries = 0, ok = false;
        while (!ok && tries < 60) {
          x = 90 + Math.random() * (W - 180);
          y = 60 + Math.random() * (H - 140);
          ok = pts.every((p) => Math.hypot(p.x - x, p.y - y) > 140);
          tries++;
        }
      }
      pts.push({ x, y });
      node.el.style.left = (x / W * 100).toFixed(2) + "%";
      node.el.style.top = (y / H * 100).toFixed(2) + "%";
      node.el.style.animationDelay = (i * 0.25).toFixed(2) + "s";
    });
  }

  function buildNodes() {
    CONSTELLATION_NODES.forEach((node) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "node";
      el.setAttribute("aria-label", node.label + " — " + node.script);
      el.innerHTML =
        '<span class="orb"><i></i><span class="pip"></span></span>' +
        '<span class="chip-n"><b>' + escapeHtml(node.script) + "</b><small>• " + escapeHtml(node.label) + "</small></span>";
      el.addEventListener("click", (e) => { e.stopPropagation(); openNode(node, el); });
      node.el = el;
      sky.appendChild(el);
    });
    placeNodes(false);
  }

  function openNode(node, el) {
    if (activeNode) activeNode.el.classList.remove("is-active");
    activeNode = node;
    el.classList.add("is-active");
    const lang = LANGUAGES.find((l) => l.name.toLowerCase().indexOf(node.label.toLowerCase()) === 0) || null;
    panel.innerHTML =
      '<div class="big">' + escapeHtml(node.script) + "</div>" +
      '<div class="roman">' + escapeHtml(lang ? lang.roman : node.label) + "</div>" +
      '<div class="lang">' + escapeHtml(lang ? lang.name : node.label) + " • " + escapeHtml(lang ? lang.region : "") + "</div>";
    panel.classList.add("is-open");
  }

  function setupCanvas() {
    buildStars();
    buildNodes();
    sky.addEventListener("click", (e) => {
      if (!e.target.closest(".node") && !e.target.closest(".node-panel")) {
        panel.classList.remove("is-open");
        if (activeNode) { activeNode.el.classList.remove("is-active"); activeNode = null; }
      }
    });
    $("#rearrange").addEventListener("click", () => {
      placeNodes(true);
      panel.classList.remove("is-open");
      if (activeNode) { activeNode.el.classList.remove("is-active"); activeNode = null; }
    });
  }

  /* ==========================================================================
     SEALS — prologue card, chapter 10 and envelope
     ========================================================================== */
  function setupSeals() {
    const card = $("#sealCard");
    const btn = $("#sealBtn");
    const toggleCard = () => {
      const open = !card.classList.contains("is-open");
      card.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close the note" : "Break the wax seal and read the note");
    };
    btn.addEventListener("click", toggleCard);
    card.querySelector(".seal-reveal").addEventListener("click", toggleCard);

    const pressWax = $("#pressWax");
    pressWax.addEventListener("click", () => {
      const pressed = pressWax.getAttribute("aria-pressed") === "true";
      pressWax.setAttribute("aria-pressed", pressed ? "false" : "true");
      pressWax.innerHTML = pressed
        ? '<svg width="12" height="16" viewBox="0 0 12 16" fill="none" aria-hidden="true"><rect x="1" y="6" width="10" height="9" rx="1.5" stroke="#fff" stroke-width="1.2"/><path d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2" stroke="#fff" stroke-width="1.2"/></svg> Pressed in wax'
        : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6.5 5 9l5-6" stroke="#fff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg> Sealed with love';
    });
  }

  /* ==========================================================================
     ACT III — envelope showpiece
     ========================================================================== */
  function setupEnvelope() {
    const wrap = $("#envWrap");
    const sheet = $("#letterSheet");
    const seal = $("#sealEnv");
    const open = () => {
      wrap.classList.add("is-open");
      sheet.setAttribute("aria-hidden", "false");
      seal.setAttribute("aria-expanded", "true");
    };
    const close = () => {
      wrap.classList.remove("is-open");
      sheet.setAttribute("aria-hidden", "true");
      seal.setAttribute("aria-expanded", "false");
    };
    seal.setAttribute("aria-expanded", "false");
    seal.addEventListener("click", open);
    wrap.querySelector(".envelope").addEventListener("click", () => { if (!wrap.classList.contains("is-open")) open(); });
    $("#foldLetter").addEventListener("click", close);
  }

  /* ==========================================================================
     SOFT MUSIC — gentle ambient pad via Web Audio (opt-in, starts muted)
     ========================================================================== */
  let audioCtx = null;
  let padNodes = null;
  let musicOn = false;

  function startPad() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return false;
    audioCtx = audioCtx || new Ctx();
    const master = audioCtx.createGain();
    master.gain.value = 0;
    master.connect(audioCtx.destination);
    const freqs = [196, 246.94, 293.66, 392]; // soft G-major colour
    const oscs = freqs.map((f, i) => {
      const o = audioCtx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = audioCtx.createGain();
      g.gain.value = 0.04 / (i + 1);
      o.connect(g).connect(master);
      o.start();
      return o;
    });
    master.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 2.5);
    padNodes = { master, oscs };
    return true;
  }

  function stopPad() {
    if (!padNodes || !audioCtx) return;
    const { master, oscs } = padNodes;
    master.gain.cancelScheduledValues(audioCtx.currentTime);
    master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.2);
    setTimeout(() => oscs.forEach((o) => { try { o.stop(); } catch (e) {} }), 1300);
    padNodes = null;
  }

  function setMusic(on) {
    if (on && !padNodes) {
      if (!startPad()) return; // no Web Audio: leave the toggle off
    }
    if (on && audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    if (!on) stopPad();
    musicOn = on;
    $$("#musicToggle, #musicToggle2").forEach((b) => {
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.classList.toggle("is-on", on);
    });
    const dot = $("#musicToggle .dot");
    if (dot) dot.style.background = on ? "var(--plum)" : "";
  }

  function setupMusic() {
    $$("#musicToggle, #musicToggle2").forEach((b) => b.addEventListener("click", () => setMusic(!musicOn)));
  }

  /* ==========================================================================
     Navigation: scroll-spy, chapter quick-nav, reveal on scroll
     ========================================================================== */
  function setupNav() {
    const sections = ["prologue", "act1", "act2", "act3"].map((id) => document.getElementById(id));
    const links = $$(".nav-pill a");
    const spy = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let current = sections[0].id;
      sections.forEach((s) => { if (s && s.offsetTop <= y) current = s.id; });
      links.forEach((a) => a.classList.toggle("is-active", a.dataset.nav === current));
    };
    window.addEventListener("scroll", spy, { passive: true });
    spy();

    // Chapter quick-nav: visible only while reading Act I, highlights the current chapter
    const chNav = $("#chapterNav");
    const chapters = $$("[data-chapter]");
    const chLinks = $$("#chapterNav a");
    const act1 = $("#act1");
    const chSpy = () => {
      const r = act1.getBoundingClientRect();
      const inAct = r.top < window.innerHeight * 0.6 && r.bottom > window.innerHeight * 0.4;
      chNav.classList.toggle("is-visible", inAct);
      let current = null;
      chapters.forEach((c) => {
        const top = c.getBoundingClientRect().top;
        if (top < window.innerHeight * 0.45) current = c.dataset.chapter;
      });
      chLinks.forEach((a) => a.classList.toggle("is-active", a.dataset.ch === current));
    };
    window.addEventListener("scroll", chSpy, { passive: true });
    chSpy();

    // Close the constellation panel when pressing Escape
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        panel.classList.remove("is-open");
        const env = $("#envWrap");
        if (env.classList.contains("is-open")) $("#foldLetter").click();
      }
    });
  }

  function setupReveal() {
    const els = $$(".reveal");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach((el) => io.observe(el));
  }

  /* ==========================================================================
     Boot
     ========================================================================== */
  function init() {
    buildGrid();
    setupArchive();
    setupCanvas();
    setupSeals();
    setupEnvelope();
    setupMusic();
    setupNav();
    setupReveal();
    applyFilters();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
