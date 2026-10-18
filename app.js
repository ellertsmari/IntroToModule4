/* Connecting to the World · slide engine + interactions */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  /* ?static disables animations (screenshots / printing); ?all reveals every fragment */
  const params = new URLSearchParams(location.search);
  const STATIC = params.has("static");
  const ALL_FRAGS = params.has("all");
  if (STATIC) document.documentElement.classList.add("static");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches || STATIC;

  /* ---------- deck scaling ---------- */
  const deck = $("#deck");
  const DECK_W = 1600, DECK_H = 900;
  function fit() {
    const s = Math.min(innerWidth / DECK_W, (innerHeight - 46) / DECK_H);
    deck.style.transform = `translate(-50%, -50%) translateY(-23px) scale(${s})`;
  }
  addEventListener("resize", fit);
  fit();

  /* ---------- navigation ---------- */
  const slides = $$(".slide");
  const total = slides.length;
  let current = -1;
  const counter = $("#counter"), progress = $("#progress"), notesText = $("#notesText");
  const fragsOf = slide => $$(".frag", slide);

  function showSlide(n, { allFrags = false } = {}) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === current) return;
    current = n;
    slides.forEach((s, i) => { s.classList.toggle("active", i === n); s.classList.toggle("past", i < n); });
    const slide = slides[n];
    fragsOf(slide).forEach(f => f.classList.toggle("on", allFrags || ALL_FRAGS));
    counter.textContent = `${n + 1} / ${total}`;
    progress.style.width = `${((n + 1) / total) * 100}%`;
    notesText.textContent = slide.dataset.notes || "";
    location.hash = `#/${n + 1}`;
    slide.dispatchEvent(new CustomEvent("slide:enter"));
  }
  function next() {
    const pending = fragsOf(slides[current]).find(f => !f.classList.contains("on"));
    if (pending) { pending.classList.add("on"); return; }
    showSlide(current + 1);
  }
  function prev() {
    const shown = fragsOf(slides[current]).filter(f => f.classList.contains("on"));
    if (shown.length) { shown[shown.length - 1].classList.remove("on"); return; }
    showSlide(current - 1, { allFrags: true });
  }
  addEventListener("keydown", e => {
    if (e.target.matches("input, textarea")) return;
    switch (e.key) {
      case "ArrowRight": case " ": case "PageDown": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); prev(); break;
      case "Home": showSlide(0); break;
      case "End": showSlide(total - 1); break;
      case "n": case "N": $("#notes").classList.toggle("show"); break;
      case "f": case "F": document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); break;
      case "?": $("#help").classList.toggle("show"); break;
      case "Escape": $("#help").classList.remove("show"); break;
      case "1": case "2": case "3":
        if (slides[current].classList.contains("s-three")) pickRoute(e.key);
        break;
    }
  });
  $("#nextBtn").addEventListener("click", next);
  $("#prevBtn").addEventListener("click", prev);
  $("#help").addEventListener("click", () => $("#help").classList.remove("show"));

  /* touch swipe */
  let tx = null;
  addEventListener("touchstart", e => { tx = e.touches[0].clientX; }, { passive: true });
  addEventListener("touchend", e => {
    if (tx === null) return;
    if (e.target.closest("input, button, label, video")) { tx = null; return; }
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 60) dx < 0 ? next() : prev();
    tx = null;
  });

  const fromHash = parseInt((location.hash.match(/\d+/) || [1])[0], 10) - 1;
  addEventListener("hashchange", () => {
    const n = parseInt((location.hash.match(/\d+/) || [1])[0], 10) - 1;
    if (n !== current) showSlide(n);
  });

  /* ---------- button ripple ---------- */
  document.addEventListener("click", e => {
    const btn = e.target.closest(".btn");
    if (!btn || reduceMotion) return;
    const r = document.createElement("span");
    r.className = "ripple";
    const rect = btn.getBoundingClientRect();
    const scale = deck.getBoundingClientRect().width / DECK_W || 1;
    const size = Math.max(rect.width, rect.height) / scale;
    r.style.cssText = `width:${size}px;height:${size}px;left:${(e.clientX - rect.left) / scale - size / 2}px;top:${(e.clientY - rect.top) / scale - size / 2}px`;
    btn.appendChild(r);
    setTimeout(() => r.remove(), 700);
  });

  /* ---------- ambient background: routes between cities, a plane on each ---------- */
  const canvas = $("#routes"), ctx = canvas.getContext("2d");
  const COLORS = ["31,95,174", "212,96,42", "35,132,90"];
  let routes = [];
  function resizeCanvas() {
    canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const n = Math.max(6, Math.round((innerWidth * innerHeight) / 140000));
    const cities = Array.from({ length: n + 3 }, () => ({ x: Math.random() * innerWidth, y: Math.random() * innerHeight }));
    routes = Array.from({ length: n }, (_, i) => {
      const a = cities[i], b = cities[(i + 1 + Math.floor(Math.random() * 3)) % cities.length];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(b.x - a.x, b.y - a.y);
      return { a, b, cx: mx - (b.y - a.y) * 0.25, cy: my + (b.x - a.x) * 0.25 - d * 0.1, t: Math.random(), v: 0.0006 + Math.random() * 0.0009, c: COLORS[i % 3] };
    });
  }
  const at = (r, t) => ({ x: (1 - t) ** 2 * r.a.x + 2 * (1 - t) * t * r.cx + t * t * r.b.x, y: (1 - t) ** 2 * r.a.y + 2 * (1 - t) * t * r.cy + t * t * r.b.y });
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const r of routes) {
      ctx.setLineDash([6, 9]);
      ctx.strokeStyle = `rgba(${r.c},.16)`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(r.a.x, r.a.y); ctx.quadraticCurveTo(r.cx, r.cy, r.b.x, r.b.y); ctx.stroke();
      ctx.setLineDash([]);
      for (const p of [r.a, r.b]) { ctx.fillStyle = "rgba(28,40,56,.13)"; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); }
      r.t = (r.t + r.v) % 1;
      const p = at(r, r.t);
      ctx.fillStyle = `rgba(${r.c},.35)`; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
    }
    if (!reduceMotion) requestAnimationFrame(tick);
  }
  addEventListener("resize", () => { resizeCanvas(); if (reduceMotion) tick(); });
  resizeCanvas(); tick();

  /* ---------- slide 3 · three directions ---------- */
  const ROUTES = {
    1: `<span class="tag app">1 · your app → the world</span><p><b>APIs and live data.</b> Your redesign stops being a picture and starts showing real articles, films or products from a public API, with a schema that checks every answer.</p><p><b>AI in the browser.</b> Chrome has a model built in. Your app can use it for free, and you write the loop that lets it call your own functions.</p><p class="dim">Guide 4.3</p>`,
    2: `<span class="tag agent">2 · your agent → the world</span><p><b>MCP gives your coding agent hands and eyes.</b> It can read your Figma file, drive a browser to check the page it built, and look things up in documentation.</p><p><b>Skills give it your rules.</b> Which components exist, which tokens to use, what it must never do.</p><p class="dim">Guides 4.1 and 4.2</p>`,
    3: `<span class="tag world">3 · the world's agents → your app</span><p><b>AI agents visit websites for people now.</b> They read your page through the <b>accessibility tree</b>, the same structure a screen reader uses. A div pretending to be a button is invisible to both.</p><p><b>WebMCP</b> (Chrome is testing it) lets a site hand agents proper tools instead of making them click.</p><p class="dim">Guide 4.1, and a speciality</p>`,
  };
  const threeMap = $(".three-map"), routeSay = $("#routeSay");
  function pickRoute(k) {
    threeMap.classList.add("focus");
    $$(".route-g", threeMap).forEach(g => g.classList.toggle("on", g.dataset.route === String(k)));
    $$(".route-btn").forEach(b => b.classList.toggle("on", b.dataset.route === String(k)));
    routeSay.innerHTML = ROUTES[k];
  }
  $$(".route-btn").forEach(b => b.addEventListener("click", () => pickRoute(b.dataset.route)));
  $(".s-three").addEventListener("slide:enter", () => {
    threeMap.classList.remove("focus");
    $$(".route-btn").forEach(b => b.classList.remove("on"));
    routeSay.innerHTML = `<p class="dim">Click a route, or press 1, 2 or 3.</p>`;
  });

  /* ---------- slide 4 · accessibility tree ---------- */
  const TREES = {
    good: [
      ["main", "", 0], ["navigation", "Main", 1], ["link", "Volcanoes", 2], ["link", "Map", 2], ["link", "About", 2],
      ["search", "", 1], ["searchbox", "Search volcanoes", 2], ["button", "Search", 2],
      ["article", "Hekla", 1], ["heading", "Hekla, level 2", 2], ["img", "Hekla seen from the south", 2],
      ["text", "Iceland's most active volcano…", 2], ["button", "Save", 2, "target"],
    ],
    soup: [
      ["generic", "", 0], ["generic", "", 1], ["text", "Volcanoes", 2], ["text", "Map", 2], ["text", "About", 2],
      ["generic", "", 1], ["text", "Search volcanoes…", 2], ["generic", "", 2], ["text", "Search", 3],
      ["generic", "", 1], ["generic", "", 2], ["text", "Hekla", 2],
      ["text", "Iceland's most active volcano…", 2], ["generic", "", 2], ["text", "♥", 3, "target"],
    ],
  };
  let treeMode = "good", treeTimer = null;
  const treeOut = $("#treeOut"), agentLog = $("#agentLog");
  function renderTree() {
    treeOut.innerHTML = TREES[treeMode].map(([role, name, depth], i) =>
      `<span class="row" data-i="${i}">${"  ".repeat(depth)}<span class="${role === "generic" ? "gen" : "role"}">${role}</span>${name ? ` <span class="nm">"${esc(name)}"</span>` : ""}</span>`
    ).join("");
  }
  function resetAgent() { clearTimeout(treeTimer); agentLog.innerHTML = ""; $("#runAgent").disabled = false; }
  $$(".s-tree .tab").forEach(t => t.addEventListener("click", () => {
    treeMode = t.dataset.mode;
    $$(".s-tree .tab").forEach(x => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    resetAgent(); renderTree();
  }));
  $("#runAgent").addEventListener("click", () => {
    resetAgent(); renderTree();
    $("#runAgent").disabled = true;
    const rows = $$(".row", treeOut), tree = TREES[treeMode];
    agentLog.textContent = "Agent: looking for something that saves this article…";
    const finish = () => {
      const i = tree.findIndex(r => r[3] === "target");
      if (treeMode === "good") {
        rows[i].classList.add("hit");
        agentLog.innerHTML = `<span class="ok">✓ Found button "Save" in article "Hekla". Clicked it.</span> A screen reader user gets there the same way.`;
      } else {
        rows[i].classList.add("miss");
        agentLog.innerHTML = `<span class="bad">✗ No button, link or form here.</span> There is a "♥" inside a generic box; I can't tell what it does. A screen reader just says "black heart suit".`;
      }
      $("#runAgent").disabled = false;
    };
    if (reduceMotion) { finish(); return; }
    let k = 0;
    const step = () => {
      rows.forEach(r => r.classList.remove("scan"));
      if (k >= rows.length) { finish(); return; }
      rows[k].classList.add("scan"); k++;
      treeTimer = setTimeout(step, 140);
    };
    step();
  });
  $(".s-tree").addEventListener("slide:enter", () => { resetAgent(); renderTree(); });
  renderTree();

  /* ---------- slide 5 · design → code pairs ---------- */
  const PAIRS = {
    1: `<b>Accessible UI → 4.1.</b> Your annotations (alt text, focus order, headings, landmarks) become the tests you write before the agent builds anything.`,
    2: `<b>Smart Components → 4.2.</b> Every Figma property becomes a typed prop, your variables become tokens, and your agent gets a skill that makes it use them.`,
    3: `<b>Redesign → 4.3.</b> Your redesign gets built for real, against live data from an API, with the loading, empty and error states designed too.`,
    4: `<b>Figma Animations → 4.4.</b> The motions get built in code, and then you make a launch film of your redesign. No speciality file? 4.4 gives you four motions to start from.`,
  };
  $$(".s-shape .card.design").forEach(c => c.addEventListener("click", () => {
    $$(".s-shape .card").forEach(x => x.classList.toggle("lit", x.dataset.pair === c.dataset.pair));
    $("#pairSay").innerHTML = PAIRS[c.dataset.pair];
  }));
  $(".s-shape").addEventListener("slide:enter", () => {
    $$(".s-shape .card").forEach(x => x.classList.remove("lit"));
    $("#pairSay").textContent = "Click a design card to see what it becomes.";
  });

  /* ---------- slide 7 · Figma properties → props ---------- */
  const FW = {
    react: [
      ["type ButtonProps = {", []],
      ['  variant: "primary" | "secondary";', ["variant"]],
      ["  label: string;", ["text"]],
      ["  disabled?: boolean;", ["bool"]],
      ["  icon?: React.ReactNode;", ["swap"]],
      ["};", []],
      ["", []],
      ["export function Button(", []],
      ["  { variant, label, disabled, icon }: ButtonProps", []],
      [") {", []],
      ["  return (", []],
      ["    <button className={`btn btn-${variant}`}", ["variant"]],
      ["            disabled={disabled}>", ["bool"]],
      ["      {icon}", ["swap"]],
      ["      {label}", ["text"]],
      ["    </button>", []],
      ["  );", []],
      ["}", []],
    ],
    vue: [
      ['<script setup lang="ts">', []],
      ["defineProps<{", []],
      ['  variant: "primary" | "secondary";', ["variant"]],
      ["  label: string;", ["text"]],
      ["  disabled?: boolean;", ["bool"]],
      ["}>();", []],
      ["</script>", []],
      ["", []],
      ["<template>", []],
      ["  <button :class=\"['btn', `btn-${variant}`]\"", ["variant"]],
      ['          :disabled="disabled">', ["bool"]],
      ['    <slot name="icon" />', ["swap"]],
      ["    {{ label }}", ["text"]],
      ["  </button>", []],
      ["</template>", []],
    ],
    angular: [
      ["@Component({", []],
      ['  selector: "app-button",', []],
      ["  template: `", []],
      ["    <button [class]=\"'btn btn-' + variant()\"", ["variant"]],
      ['            [disabled]="disabled()">', ["bool"]],
      ['      <ng-content select="[icon]" />', ["swap"]],
      ["      {{ label() }}", ["text"]],
      ["    </button>`,", []],
      ["})", []],
      ["export class ButtonComponent {", []],
      ['  variant = input.required<"primary" | "secondary">();', ["variant"]],
      ["  label = input.required<string>();", ["text"]],
      ["  disabled = input(false);", ["bool"]],
      ["}", []],
    ],
  };
  const PROPS = {
    variant: "A <b>variant</b> becomes a <b>union type</b>: <code>\"primary\" | \"secondary\"</code>. The button can only be what you designed; TypeScript refuses anything else.",
    text: "A <b>text</b> property becomes a <b>string</b> prop. The words come from whoever uses the component.",
    bool: "A <b>boolean</b> becomes an <b>optional boolean</b> prop. Leave it out and it is false.",
    swap: "An <b>instance swap</b> becomes <b>children</b>, a <b>slot</b> or <b>content projection</b>: the parent passes in whatever goes there.",
  };
  let fw = "react", prop = "variant";
  function renderFw() {
    $("#fwCode").innerHTML = FW[fw].map(([line, tags]) => {
      const cls = tags.includes(prop) ? "lit" : tags.length ? "dimmed" : "";
      return `<span class="ln ${cls}">${esc(line) || " "}</span>`;
    }).join("");
    $("#propSay").innerHTML = PROPS[prop];
  }
  $$(".s-g42 .tab").forEach(t => t.addEventListener("click", () => {
    fw = t.dataset.fw;
    $$(".s-g42 .tab").forEach(x => { x.classList.toggle("on", x === t); x.setAttribute("aria-selected", x === t); });
    renderFw();
  }));
  $$(".fp-prop").forEach(b => b.addEventListener("click", () => {
    prop = b.dataset.p;
    $$(".fp-prop").forEach(x => x.classList.toggle("on", x === b));
    renderFw();
  }));
  renderFw();

  /* ---------- slide 8 · what the agent loads ---------- */
  const ASKS = {
    readme: { load: false, say: `A typo fix doesn't match the skill's description, so <b>SKILL.md stays closed</b>. The agent only paid for one line.` },
    page: { load: true, say: `"Settings page" is UI work. That matches the description, so the agent <b>opens SKILL.md</b> and follows it. One line always, the full text only when needed: <b>progressive disclosure</b>.` },
  };
  function ask(k) {
    const a = ASKS[k];
    $$(".ask").forEach(b => b.classList.toggle("on", b.dataset.ask === k));
    $("#skillRow").classList.toggle("loaded", a.load);
    $("#skillState").textContent = a.load ? "loaded: the task matches" : "only the description is read";
    $("#ctxSkill").style.width = a.load ? "14%" : "0";
    $("#ctxSay").innerHTML = a.say;
  }
  $$(".ask").forEach(b => b.addEventListener("click", () => ask(b.dataset.ask)));
  $(".s-skill").addEventListener("slide:enter", () => {
    $$(".ask").forEach(b => b.classList.remove("on"));
    $("#skillRow").classList.remove("loaded");
    $("#skillState").textContent = "only the description is read";
    $("#ctxSkill").style.width = "0";
    $("#ctxSay").textContent = "Pick a request.";
  });

  /* ---------- slide 9 · the agent loop ---------- */
  const LOOP = [
    { from: "user", to: "model", say: `<b>You → model.</b> "What does Wikipedia say about Hekla?" The model can't reach the internet. It can only answer with text.`,
      code: `<span class="c">// your code sends the question, and says which tools exist</span>\n<span class="k">const</span> reply = <span class="k">await</span> session.prompt(question, {\n  responseConstraint: toolOrAnswer, <span class="c">// a JSON schema</span>\n});\n<span class="c">// tools: getSummary(title) · searchArticles(query)</span>` },
    { from: "model", to: "code", say: `<b>Model → your code.</b> The model asks for a tool, in JSON. It doesn't run anything itself.`,
      code: `{ <span class="m">"tool"</span>: <span class="s">"getSummary"</span>, <span class="m">"args"</span>: { <span class="m">"title"</span>: <span class="s">"Hekla"</span> } }` },
    { from: "code", to: "api", say: `<b>Your code → the API.</b> Your code decides: is <code>getSummary</code> on the list? Is the title sensible? Only then does it call the API.`,
      code: `<span class="m">GET</span> https://en.wikipedia.org/api/rest_v1/page/summary/Hekla` },
    { from: "api", to: "code", say: `<b>API → your code.</b> The answer comes back, and your schema checks its shape before anything trusts it.`,
      code: `<span class="ok">200 OK</span>\n{ <span class="m">"title"</span>: <span class="s">"Hekla"</span>, <span class="m">"extract"</span>: <span class="s">"Hekla is a stratovolcano in the south of Iceland…"</span> }\n\n<span class="ok">✓</span> ArticleSummary.parse(json) <span class="c">// zod: the shape is what we expect</span>` },
    { from: "code", to: "model", say: `<b>Your code → model.</b> The checked result goes back to the model, as data.`,
      code: `<span class="k">await</span> session.prompt(<span class="s">\`Tool result: \${JSON.stringify(summary)}\`</span>);` },
    { from: "model", to: "user", say: `<b>Model → you.</b> An answer in words. That's an agent. Your coding agent runs the same loop with tools like <i>read file</i>, <i>run tests</i>, <i>open browser</i>.`,
      code: `<span class="s">"Hekla is a stratovolcano in the south of Iceland. (Source: Wikipedia)"</span>` },
  ];
  let loopStep = 0;
  const actors = Object.fromEntries($$(".actor").map(a => [a.dataset.a, a]));
  function drawLoopArrow(s) {
    const svg = $("#loopArrow"), stage = $(".loop-stage");
    if (!s) { svg.classList.remove("on"); return; }
    const sr = stage.getBoundingClientRect();
    const cx = el => { const r = el.getBoundingClientRect(); return ((r.left + r.width / 2 - sr.left) / sr.width) * 1000; };
    const xa = cx(actors[s.from]), xb = cx(actors[s.to]);
    $("path", svg).setAttribute("d", `M${xa} 6 Q ${(xa + xb) / 2} 58 ${xb} 6`);
    svg.classList.add("on");
  }
  function renderLoop() {
    const s = LOOP[loopStep - 1];
    Object.values(actors).forEach(a => a.classList.toggle("on", !!s && (a.dataset.a === s.from || a.dataset.a === s.to)));
    $("#loopSay").innerHTML = s ? s.say : `Press "Next step".`;
    $("#loopCode").innerHTML = s ? s.code : `<span class="c">// six steps, one loop</span>`;
    $("#loopCount").textContent = `step ${loopStep} / ${LOOP.length}`;
    $("#loopNext").disabled = loopStep >= LOOP.length;
    drawLoopArrow(s);
  }
  $("#loopNext").addEventListener("click", () => { if (loopStep < LOOP.length) { loopStep++; renderLoop(); } });
  $("#loopReset").addEventListener("click", () => { loopStep = 0; renderLoop(); });
  $(".s-g43").addEventListener("slide:enter", () => { loopStep = 0; renderLoop(); });
  renderLoop();

  /* ---------- slide 11 · films: one plays at a time, all stop on leave ---------- */
  const films = $$(".film video");
  films.forEach(v => v.addEventListener("play", () => films.forEach(o => { if (o !== v) o.pause(); })));
  slides.forEach(s => s.addEventListener("slide:enter", () => films.forEach(v => { if (!s.contains(v)) v.pause(); })));

  /* ---------- slide 12 · drawer + reduced motion ---------- */
  const dd = $("#ddScreen"), ddOpen = $("#ddOpen"), ddReduce = $("#ddReduce");
  ddReduce.checked = matchMedia("(prefers-reduced-motion: reduce)").matches;
  dd.classList.toggle("reduce", ddReduce.checked);
  function setDrawer(open) {
    dd.classList.toggle("open", open);
    ddOpen.setAttribute("aria-expanded", open);
    $("#ddSay").textContent = open
      ? (ddReduce.checked ? "Reduced motion: the drawer is simply there. Nothing lost." : "Slides in with a little overshoot. Click the dark area to close.")
      : "Open the drawer, then switch reduced motion on and open it again.";
  }
  ddOpen.addEventListener("click", () => setDrawer(!dd.classList.contains("open")));
  $("#ddScrim").addEventListener("click", () => setDrawer(false));
  ddReduce.addEventListener("change", () => { dd.classList.toggle("reduce", ddReduce.checked); setDrawer(false); });
  $(".s-g44").addEventListener("slide:enter", () => setDrawer(false));

  /* ---------- slide 14 · how you use it ---------- */
  const PATS = {
    deleg: { q: "Build the search page with the Wikipedia API. Make it work.", v: "low", say: "The fastest way to a working page, and to remembering nothing of it." },
    prog: { q: "I'll write the fetch myself…\n…actually, just do the rest as well.", v: "low", say: "Starts well, ends as full delegation." },
    debug: { q: "It's broken again, fix it.\nStill broken. Fix it.", v: "low", say: "The agent learns your bug; you don't. Debugging was the biggest gap in the whole study." },
    concept: { q: "Why does my fetch run twice in development?\nDon't write code, just explain.", v: "high", say: "You write the code; the AI explains the ideas. The most common high-scoring pattern." },
    hybrid: { q: "Write the schema for this response, and explain each line and why you chose it.", v: "high", say: "The code and the understanding arrive together." },
    gen: { q: "Walk me through the function you just wrote.\nWhat happens if the API returns an empty list?\nWhat breaks if I delete line 12?", v: "high", say: "Generate first, then interrogate it until you could have written it yourself." },
  };
  $$(".pat").forEach(b => b.addEventListener("click", () => {
    const p = PATS[b.dataset.pat];
    $$(".pat").forEach(x => x.classList.toggle("on", x === b));
    $("#patSay").innerHTML = `<p class="who">sounds like</p><p class="q">${esc(p.q)}</p><p class="verdict ${p.v}">${p.v === "low" ? "Under 40%." : "65% or more."} ${esc(p.say)}</p>`;
  }));
  $(".s-learn").addEventListener("slide:enter", () => {
    $$(".pat").forEach(x => x.classList.remove("on"));
    $("#patSay").innerHTML = `<p class="dim">Click a pattern.</p>`;
  });

  /* ---------- slide 18 · ask the browser about its built-in model ---------- */
  $("#probeBtn").addEventListener("click", async () => {
    const out = $("#probeOut");
    const line = (cls, text) => `<span class="c">// LanguageModel.availability()</span>\n<span class="${cls}">${esc(text)}</span>`;
    if (!("LanguageModel" in self)) {
      out.innerHTML = line("bad", "Not in this browser. Use desktop Chrome 148 or newer.");
      return;
    }
    try {
      const a = await self.LanguageModel.availability();
      const msg = {
        available: ["ok", "available: the model is already on this laptop."],
        downloadable: ["ok", "downloadable: this laptop can run it. The first real use downloads several GB, so do that on good Wi-Fi."],
        downloading: ["ok", "downloading: the model is on its way."],
        unavailable: ["bad", "unavailable: this laptop can't run it. Pair with someone in 4.3."],
      }[a] || ["c", `answered "${a}"`];
      out.innerHTML = line(msg[0], msg[1]);
    } catch (err) {
      out.innerHTML = line("bad", `The check failed: ${err.message}`);
    }
  });

  showSlide(isNaN(fromHash) ? 0 : fromHash);
})();
