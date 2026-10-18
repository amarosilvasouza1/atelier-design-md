(function () {
  "use strict";

  var PALETTES = [
    { id: "terracota", name: "Terracota", mood: "terrosa, calorosa, editorial", dark: false,
      bg: "#FAF7F2", surface: "#F0E6D8", ink: "#191714", muted: "#6E6459",
      accent: "#C7451F", onAccent: "#FFF8F0", line: "#DED4C6" },
    { id: "cobalto", name: "Cobalto", mood: "precisa, sóbria, institucional", dark: false,
      bg: "#F3F2ED", surface: "#E7E6DE", ink: "#14161C", muted: "#62656E",
      accent: "#1F3F8F", onAccent: "#F7F8FF", line: "#D5D4CB" },
    { id: "musgo", name: "Musgo", mood: "orgânica, serena, artesanal", dark: false,
      bg: "#F4F2E8", surface: "#E8E5D7", ink: "#1B1F18", muted: "#5F6358",
      accent: "#4A6B45", onAccent: "#F7FAF2", line: "#D7D4C4" },
    { id: "argila", name: "Argila", mood: "afetiva, madura, feminina", dark: false,
      bg: "#FBF3EF", surface: "#F2E4DD", ink: "#23191A", muted: "#6F5C5B",
      accent: "#A9453C", onAccent: "#FFF7F4", line: "#E2D1C9" },
    { id: "vertente", name: "Vertente", mood: "fresca, técnica, tranquila", dark: false,
      bg: "#EDF1F0", surface: "#E1E8E6", ink: "#101918", muted: "#5B6764",
      accent: "#0F6B6B", onAccent: "#F2FBF9", line: "#CFD9D6" },
    { id: "tinta", name: "Tinta", mood: "noturna, intensa, premium", dark: true,
      bg: "#141210", surface: "#1E1A17", ink: "#F2ECE1", muted: "#A79E91",
      accent: "#E0A458", onAccent: "#1A1510", line: "#302B25" }
  ];

  var TYPES = [
    { id: "fraunces", name: "Fraunces", note: "quente · editorial", sample: "Aa",
      font: "'Fraunces', Georgia, 'Times New Roman', serif", weight: 500,
      track: "-0.028em", variation: "'SOFT' 40, 'WONK' 1, 'opsz' 120" },
    { id: "instrument", name: "Instrument Serif", note: "elegante · precisa", sample: "Aa",
      font: "'Instrument Serif', Georgia, serif", weight: 400,
      track: "-0.012em", variation: "normal" },
    { id: "newsreader", name: "Newsreader", note: "literária · sóbria", sample: "Aa",
      font: "'Newsreader', Georgia, serif", weight: 450,
      track: "-0.02em", variation: "'opsz' 48" }
  ];

  var SCALES = [
    { id: "compacta", base: 15, space: 0.88 },
    { id: "equilibrada", base: 16, space: 1 },
    { id: "generosa", base: 17, space: 1.14 }
  ];

  var DEFAULTS = {
    brand: "Casa Verbo",
    tagline: "Identidade, embalagem e direção de arte para negócios que preferem ser lembrados a serem vistos.",
    palette: "terracota", type: "fraunces", scale: "equilibrada",
    corners: false, grain: true
  };

  var STORAGE = "atelier.sistema.v1";
  var state = Object.assign({}, DEFAULTS);

  var els = {
    form: document.getElementById("form"),
    brand: document.getElementById("brand"),
    tagline: document.getElementById("tagline"),
    palettes: document.getElementById("palettes"),
    types: document.getElementById("types"),
    scales: document.getElementById("scales"),
    corners: document.getElementById("corners"),
    grain: document.getElementById("grain"),
    note: document.getElementById("contrastNote"),
    preview: document.getElementById("preview"),
    specimen: document.getElementById("specimen"),
    viewportLabel: document.getElementById("viewportLabel"),
    dialog: document.getElementById("exportDialog"),
    openExport: document.getElementById("openExport"),
    closeExport: document.getElementById("closeExport"),
    exportCode: document.querySelector("#exportCode code"),
    exportMeta: document.getElementById("exportMeta"),
    copyExport: document.getElementById("copyExport"),
    downloadExport: document.getElementById("downloadExport"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".tabs button")),
    surprise: document.getElementById("surprise"),
    reset: document.getElementById("reset"),
    toast: document.getElementById("toast"),
    devices: Array.prototype.slice.call(document.querySelectorAll(".device"))
  };

  var currentTab = "design";
  var toastTimer = null;

  function byId(list, id) {
    for (var i = 0; i < list.length; i += 1) { if (list[i].id === id) { return list[i]; } }
    return list[0];
  }
  function clampByte(n) { return Math.max(0, Math.min(255, n)); }
  function hexToRgb(hex) {
    var h = String(hex).replace("#", "");
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  function channel(c) {
    var v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  function luminance(hex) {
    var c = hexToRgb(hex);
    return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
  }
  function contrast(a, b) {
    var l1 = luminance(a), l2 = luminance(b);
    var hi = Math.max(l1, l2), lo = Math.min(l1, l2);
    return (hi + 0.05) / (lo + 0.05);
  }
  function ratioText(value) { return value.toFixed(1).replace(".", ",") + ":1"; }
  function grade(value) {
    if (value >= 7) { return "AAA"; }
    if (value >= 4.5) { return "AA"; }
    return "abaixo do AA";
  }

  function renderOptions() {
    els.palettes.innerHTML = PALETTES.map(function (p) {
      var r = contrast(p.ink, p.bg);
      return '<label class="palette"><input type="radio" name="palette" value="' + p.id + '">' +
        '<span class="palette-body"><span class="chips" aria-hidden="true">' +
        '<i style="background:' + p.bg + '"></i><i style="background:' + p.ink + '"></i>' +
        '<i style="background:' + p.accent + '"></i><i style="background:' + p.surface + '"></i>' +
        '</span><span class="palette-name">' + p.name + '<em>' + r.toFixed(1).replace(".", ",") + '</em></span></span></label>';
    }).join("");

    els.types.innerHTML = TYPES.map(function (t) {
      return '<label class="type"><input type="radio" name="type" value="' + t.id + '">' +
        '<span class="type-body"><span class="type-aa" style="font-family:' + t.font + ';font-weight:' + t.weight + '">' +
        t.sample + '</span><span class="type-info"><strong>' + t.name + '</strong><span>' + t.note + '</span></span></span></label>';
    }).join("");
  }

  function syncForm() {
    els.brand.value = state.brand;
    els.tagline.value = state.tagline;
    var radios = document.querySelectorAll('input[name="palette"]');
    Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === state.palette; });
    radios = document.querySelectorAll('input[name="type"]');
    Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === state.type; });
    radios = document.querySelectorAll('input[name="scale"]');
    Array.prototype.forEach.call(radios, function (r) { r.checked = r.value === state.scale; });
    els.corners.checked = state.corners;
    els.grain.checked = state.grain;
  }

  function apply() {
    var p = byId(PALETTES, state.palette);
    var t = byId(TYPES, state.type);
    var s = byId(SCALES, state.scale);
    var style = els.specimen.style;

    style.setProperty("--sp-bg", p.bg);
    style.setProperty("--sp-surface", p.surface);
    style.setProperty("--sp-ink", p.ink);
    style.setProperty("--sp-muted", p.muted);
    style.setProperty("--sp-accent", p.accent);
    style.setProperty("--sp-on-accent", p.onAccent);
    style.setProperty("--sp-line", p.line);
    style.setProperty("--sp-display", t.font);
    style.setProperty("--sp-display-weight", String(t.weight));
    style.setProperty("--sp-display-track", t.track);
    style.setProperty("--sp-display-variation", t.variation);
    style.setProperty("--sp-radius-sm", state.corners ? "6px" : "0px");
    style.setProperty("--sp-space", String(s.space));
    style.fontSize = s.base + "px";

    els.preview.classList.toggle("is-dark", !!p.dark);
    els.preview.classList.toggle("no-grain", !state.grain);

    var brand = (state.brand || "").trim() || "Sua marca";
    Array.prototype.forEach.call(document.querySelectorAll("[data-brand]"), function (n) {
      n.textContent = brand;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-tagline]"), function (n) {
      n.textContent = state.tagline || "Uma promessa curta e concreta sobre o que você faz.";
    });

    var inkRatio = contrast(p.ink, p.bg);
    var accentRatio = contrast(p.accent, p.bg);
    els.note.innerHTML = "<b>" + p.name + "</b> · texto " + ratioText(inkRatio) + " " + grade(inkRatio) +
      " · acento " + ratioText(accentRatio) + " " + grade(accentRatio) + " sobre o papel.";

    persist();
    if (els.dialog.open) { renderExport(); }
  }

  function persist() {
    try { window.localStorage.setItem(STORAGE, JSON.stringify(state)); } catch (err) { /* modo privado */ }
  }
  function restore() {
    try {
      var raw = window.localStorage.getItem(STORAGE);
      if (!raw) { return; }
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object") { return; }
      if (typeof saved.brand === "string") { state.brand = saved.brand; }
      if (typeof saved.tagline === "string") { state.tagline = saved.tagline; }
      if (saved.palette && PALETTES.some(function (p) { return p.id === saved.palette; })) { state.palette = saved.palette; }
      if (saved.type && TYPES.some(function (t) { return t.id === saved.type; })) { state.type = saved.type; }
      if (saved.scale && SCALES.some(function (s) { return s.id === saved.scale; })) { state.scale = saved.scale; }
      state.corners = !!saved.corners;
      state.grain = saved.grain !== false;
    } catch (err) { /* estado corrompido: usa padrões */ }
  }

  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { els.toast.classList.remove("is-on"); }, 2200);
  }

  function bind() {
    els.form.addEventListener("change", function (event) {
      var el = event.target;
      if (el.name === "palette" || el.name === "type" || el.name === "scale") {
        state[el.name] = el.value;
        apply();
      }
      if (el === els.corners) { state.corners = el.checked; apply(); }
      if (el === els.grain) { state.grain = el.checked; apply(); }
    });
    els.brand.addEventListener("input", function () { state.brand = els.brand.value; apply(); });
    els.tagline.addEventListener("input", function () { state.tagline = els.tagline.value; apply(); });

    els.devices.forEach(function (button) {
      button.addEventListener("click", function () {
        var mobile = button.getAttribute("data-device") === "mobile";
        els.preview.classList.toggle("is-mobile", mobile);
        els.devices.forEach(function (b) { b.setAttribute("aria-pressed", String(b === button)); b.classList.toggle("is-active", b === button); });
        els.viewportLabel.textContent = mobile ? "404 px" : "1080 px";
      });
    });

    els.surprise.addEventListener("click", function () {
      var nextPalette = state.palette;
      while (nextPalette === state.palette && PALETTES.length > 1) {
        nextPalette = PALETTES[Math.floor(Math.random() * PALETTES.length)].id;
      }
      state.palette = nextPalette;
      state.type = TYPES[Math.floor(Math.random() * TYPES.length)].id;
      state.scale = SCALES[Math.floor(Math.random() * SCALES.length)].id;
      state.corners = Math.random() > 0.55;
      state.grain = Math.random() > 0.25;
      syncForm();
      apply();
      toast("Nova combinação aplicada.");
    });

    els.reset.addEventListener("click", function () {
      state = Object.assign({}, DEFAULTS);
      syncForm();
      apply();
      toast("Padrão restaurado.");
    });

    els.openExport.addEventListener("click", function () {
      renderExport();
      if (typeof els.dialog.showModal === "function") { els.dialog.showModal(); }
      else { els.dialog.setAttribute("open", ""); }
    });
    els.closeExport.addEventListener("click", function () { els.dialog.close(); });
    els.dialog.addEventListener("click", function (event) {
      if (event.target === els.dialog) { els.dialog.close(); }
    });
    els.tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        currentTab = tab.getAttribute("data-tab");
        els.tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
        renderExport();
      });
    });
    els.copyExport.addEventListener("click", function () { copyCurrent(); });
    els.downloadExport.addEventListener("click", function () { downloadCurrent(); });
  }

  renderOptions();
  restore();
  syncForm();
  apply();
  bind();

  
  /* ---------- exportação ---------- */

  function slugify(value) {
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
  }

  function buildDesign() {
    var p = byId(PALETTES, state.palette);
    var t = byId(TYPES, state.type);
    var s = byId(SCALES, state.scale);
    var brand = (state.brand || "").trim() || "Sua marca";
    var tagline = (state.tagline || "").trim() || "Uma promessa curta e concreta.";
    var today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    var ink = contrast(p.ink, p.bg);
    var surface = contrast(p.ink, p.surface);
    var muted = contrast(p.muted, p.bg);
    var accent = contrast(p.accent, p.bg);
    var onAccent = contrast(p.onAccent, p.accent);
    var L = [];
    function add(line) { L.push(line); }

    add("# " + brand + " — sistema de identidade");
    add("");
    add("> " + tagline);
    add("");
    add("Gerado no Atelier em " + today + ". Use este arquivo como contexto de design no Cursor, Claude Code, Codex, v0 ou Lovable.");
    add("");
    add("## 1. Essência");
    add("");
    add("- **Marca:** " + brand);
    add("- **Promessa:** " + tagline);
    add("- **Personalidade:** " + p.mood + "; voz tipográfica " + t.note.replace(" · ", " e ") + ".");
    add("- **Princípio:** o desenho serve à ideia. Menos efeito, mais hierarquia, ritmo e contraste.");
    add("");
    add("## 2. Paleta");
    add("");
    add("| Token | Hex | Uso | Contraste |");
    add("| --- | --- | --- | --- |");
    add("| **--color-bg** | " + p.bg + " | Papel | " + ratioText(ink) + " " + grade(ink) + " |");
    add("| **--color-surface** | " + p.surface + " | Faixa e cartões | " + ratioText(surface) + " " + grade(surface) + " |");
    add("| **--color-ink** | " + p.ink + " | Texto principal | " + ratioText(ink) + " " + grade(ink) + " |");
    add("| **--color-muted** | " + p.muted + " | Texto de apoio | " + ratioText(muted) + " " + grade(muted) + " |");
    add("| **--color-accent** | " + p.accent + " | Acento e foco | " + ratioText(accent) + " " + grade(accent) + " |");
    add("| **--color-on-accent** | " + p.onAccent + " | Texto sobre acento | " + ratioText(onAccent) + " " + grade(onAccent) + " |");
    add("| **--color-line** | " + p.line + " | Hairlines | sem texto |");
    add("");
    add("Regras de cor:");
    add("");
    add("1. Papel e tinta fazem 90% do trabalho. O acento aparece em no máximo 8% da página.");
    add("2. Nunca use o acento como fundo de blocos grandes de texto corrido.");
    add("3. Não introduza gradientes, neon ou uma segunda cor de acento.");
    add("4. Verifique contraste antes de trocar qualquer token.");
    add("");
    add("## 3. Tipografia");
    add("");
    add("- **Display:** " + t.name + " — títulos, números e citações. Peso " + t.weight + ", tracking " + t.track + ".");
    add("- **Texto:** Inter Tight (sans) — interface, corpo, rótulos e botões.");
    add("- **Rótulos:** caixa alta, 0,58 a 0,64 em, tracking 0,14 a 0,19 em.");
    add("");
    add("Escala (base " + s.base + " px):");
    add("");
    add("| Papel | Tamanho | Entrelinha | Observação |");
    add("| --- | --- | --- | --- |");
    add("| Display | clamp(2.05rem, 8.1vw, 5rem) | 0,97 | máx. 15ch, text-wrap balance |");
    add("| Título de seção | clamp(1.85rem, 4.6vw, 3.1rem) | 1,03 | máx. 12ch |");
    add("| Subtítulo | clamp(1.1rem, 2vw, 1.42rem) | 1,1 | cartões |");
    add("| Corpo | " + s.base + "px | 1,55 | máx. 42ch |");
    add("| Apoio | " + (s.base * 0.78).toFixed(1) + "px | 1,55 | descrições |");
    add("| Rótulo | " + (s.base * 0.58).toFixed(1) + "px | 1 | caixa alta, 0,18em |");
    add("");
    add("## 4. Espaço e forma");
    add("");
    add("- Unidade de espaço: 4 px. Escala: 4, 8, 12, 16, 24, 32, 48, 64, 96.");
    add("- Respiro de seção: clamp(44px, 7.4vw, 86px) com multiplicador de proporção " + s.space + ".");
    add("- Margem lateral: clamp(20px, 5.2vw, 58px).");
    add("- Raios: " + (state.corners ? "6 px em botões e cartões" : "0 px, tudo reto, como impressão") + ".");
    add("- Separação entre blocos: hairline de 1 px em --color-line. Sem sombras.");
    add("");
    add("## 5. Componentes");
    add("");
    add("- **Botão primário:** fundo --color-ink, texto --color-bg, 12 a 13 px de padding vertical, caixa alta, 0,14em de tracking. Hover troca para --color-accent.");
    add("- **Botão de acento:** fundo --color-accent, texto --color-on-accent. Use uma vez por tela.");
    add("- **Link editorial:** sublinhado de 1 px, offset de 4 px. Hover no acento.");
    add("- **Rótulo numerado:** /01, /02 em --color-accent, tabular, seguido de linha de 1 px.");
    add("- **Faixa de citação:** fundo --color-surface, display grande, assinatura em caixa alta.");
    add("");
    add("## 6. Movimento");
    add("");
    add("- Transições de 180 a 220 ms com ease-out em cor, borda e fundo. Nada de parallax, bounce ou blur animado.");
    add("- Hover só muda cor, borda ou sublinhado. Sem escala.");
    add("- Respeite prefers-reduced-motion.");
    add("");
    add("## 7. Faça e evite");
    add("");
    add("**Faça**");
    add("");
    add("- Comece pelo conteúdo: hierarquia antes de decoração.");
    add("- Use assimetria editorial (2/3 + 1/3) e hairlines para separar seções.");
    add("- Mantenha uma única família display e uma sans.");
    add("- Escreva textos específicos, sem enchimento genérico.");
    add("");
    add("**Evite**");
    add("");
    add("- Gradientes, glassmorphism, blobs, sombras difusas e ícones coloridos.");
    add("- Cartões com raio acima de 6 px quando o sistema for reto.");
    add("- Mais de duas cores além de papel, tinta, apoio e acento.");
    add("- Texto centralizado em blocos longos.");
    add("");
    add("## 8. Prompt curto");
    add("");
    add("Implemente uma landing page editorial de página única para **" + brand + "**, seguindo os tokens acima: papel " + p.bg + ", tinta " + p.ink + ", acento " + p.accent + "; display " + t.name + " e texto Inter Tight; seções separadas por hairlines de 1 px, rótulos numerados em caixa alta e uma única ação de acento.");
    add("");
    return L.join("\n") + "\n";
  }

  function buildTokens() {
    var p = byId(PALETTES, state.palette);
    var t = byId(TYPES, state.type);
    var s = byId(SCALES, state.scale);
    var brand = (state.brand || "").trim() || "Sua marca";
    var fam = {
      fraunces: "Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700",
      instrument: "Instrument+Serif:ital@0;1",
      newsreader: "Newsreader:ital,opsz,wght@0,6..72,200..600;1,6..72,200..600"
    };
    var L = [];
    function add(line) { L.push(line); }

    add("/* " + brand + " — tokens gerados pelo Atelier em " + new Date().toLocaleDateString("pt-BR") + " */");
    add("@import url(\"https://fonts.googleapis.com/css2?family=" + fam[t.id] + "&family=Inter+Tight:wght@300..700&display=swap\");");
    add("");
    add(":root {");
    add("  --color-bg: " + p.bg + ";");
    add("  --color-surface: " + p.surface + ";");
    add("  --color-ink: " + p.ink + ";");
    add("  --color-muted: " + p.muted + ";");
    add("  --color-accent: " + p.accent + ";");
    add("  --color-on-accent: " + p.onAccent + ";");
    add("  --color-line: " + p.line + ";");
    add("");
    add("  --font-display: " + t.font + ";");
    add("  --font-sans: \"Inter Tight\", system-ui, -apple-system, \"Segoe UI\", sans-serif;");
    add("  --weight-display: " + t.weight + ";");
    add("  --track-display: " + t.track + ";");
    add("  --track-label: 0.18em;");
    add("");
    add("  --text-base: " + s.base + "px;");
    add("  --text-sm: " + (s.base * 0.875).toFixed(2) + "px;");
    add("  --text-xs: " + (s.base * 0.75).toFixed(2) + "px;");
    add("  --text-lede: clamp(0.92rem, 1.5vw, 1.08rem);");
    add("  --text-h3: clamp(1.1rem, 2vw, 1.42rem);");
    add("  --text-h2: clamp(1.85rem, 4.6vw, 3.1rem);");
    add("  --text-display: clamp(2.05rem, 8.1vw, 5rem);");
    add("");
    add("  --space-1: 4px;");
    add("  --space-2: 8px;");
    add("  --space-3: 12px;");
    add("  --space-4: 16px;");
    add("  --space-6: 24px;");
    add("  --space-8: 32px;");
    add("  --space-12: 48px;");
    add("  --space-16: 64px;");
    add("  --pad-x: clamp(20px, 5.2vw, 58px);");
    add("  --section-y: calc(clamp(44px, 7.4vw, 86px) * " + s.space + ");");
    add("  --radius: " + (state.corners ? "6px" : "0px") + ";");
    add("  --measure: 42ch;");
    add("}");
    add("");
    add("html { -webkit-text-size-adjust: 100%; }");
    add("body {");
    add("  margin: 0;");
    add("  background: var(--color-bg);");
    add("  color: var(--color-ink);");
    add("  font-family: var(--font-sans);");
    add("  font-size: var(--text-base);");
    add("  line-height: 1.55;");
    add("  -webkit-font-smoothing: antialiased;");
    add("}");
    add("");
    add("h1, h2, h3, blockquote {");
    add("  font-family: var(--font-display);");
    add("  font-weight: var(--weight-display);");
    add("  letter-spacing: var(--track-display);");
    add("  margin: 0;");
    add("}");
    add("");
    add(".label { font-size: var(--text-xs); letter-spacing: var(--track-label); text-transform: uppercase; color: var(--color-muted); }");
    add(".hairline { border-top: 1px solid var(--color-line); }");
    add("");
    add(".btn {");
    add("  display: inline-flex; align-items: center; gap: 8px;");
    add("  background: var(--color-ink); color: var(--color-bg);");
    add("  border: 1px solid var(--color-ink); border-radius: var(--radius);");
    add("  padding: 12px 19px; font-size: var(--text-xs);");
    add("  font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase;");
    add("  text-decoration: none; cursor: pointer;");
    add("  transition: background 0.2s, border-color 0.2s, color 0.2s;");
    add("}");
    add(".btn:hover { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }");
    add(".btn--accent { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }");
    add("");
    add(".link {");
    add("  color: var(--color-ink); text-decoration: underline;");
    add("  text-decoration-thickness: 1px; text-underline-offset: 4px;");
    add("}");
    add(".link:hover { color: var(--color-accent); }");
    add("");
    add("::selection { background: var(--color-accent); color: var(--color-on-accent); }");
    add(":focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }");
    add("");
    add("@media (prefers-reduced-motion: reduce) {");
    add("  *, *::before, *::after { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; }");
    add("}");
    add("");
    return L.join("\n") + "\n";
  }

  function buildPrompt() {
    var p = byId(PALETTES, state.palette);
    var t = byId(TYPES, state.type);
    var s = byId(SCALES, state.scale);
    var brand = (state.brand || "").trim() || "Sua marca";
    var tagline = (state.tagline || "").trim() || "Uma promessa curta e concreta.";
    var L = [];
    function add(line) { L.push(line); }

    add("Implemente uma landing page editorial de página única para \"" + brand + "\".");
    add("");
    add("Promessa: " + tagline);
    add("");
    add("Direção de arte:");
    add("- Papel " + p.bg + ", superfície " + p.surface + ", tinta " + p.ink + ", apoio " + p.muted + ", acento " + p.accent + " (texto sobre acento: " + p.onAccent + ").");
    add("- Display " + t.name + " (peso " + t.weight + ", tracking " + t.track + "), texto em Inter Tight.");
    add("- Base tipográfica " + s.base + " px; display em clamp(2.05rem, 8vw, 5rem) com entrelinha 0,97 e máx. 15ch.");
    add("- Seções separadas por hairlines de 1 px em " + p.line + "; margem lateral clamp(20px, 5vw, 58px).");
    add("- Raios " + (state.corners ? "de 6 px" : "retos (0 px)") + ".");
    add("");
    add("Estrutura:");
    add("1. Nav com wordmark, quatro links e um CTA discreto.");
    add("2. Hero com rótulo numerado 01, manchete de 2 a 3 linhas, promessa em 46ch, dois CTAs e faixa de três números.");
    add("3. Manifesto 02 em duas colunas assimétricas com princípios /01 /02 /03.");
    add("4. Serviços 03 em três cartões com títulos display e descrições curtas.");
    add("5. Citação em faixa de superfície, display grande e assinatura em caixa alta.");
    add("6. Rodapé com marca, endereço e um botão de acento.");
    add("");
    add("Restrições:");
    add("- Sem gradientes, glassmorphism, blobs, sombras difusas, ícones coloridos ou animação decorativa.");
    add("- Acento em no máximo 8% da página; nada de centralizar texto corrido.");
    add("- Uma única ação de acento por tela; demais ações em tinta.");
    add("- HTML semântico, foco visível, contraste AA e suporte a prefers-reduced-motion.");
    add("- Responsivo a partir de 360 px, com a manchete quebrando em no máximo 4 linhas.");
    add("- Sem dependências de UI: CSS próprio; fontes via Google Fonts com fallback de sistema.");
    add("");
    add("Entregue HTML, CSS e JS em arquivos separados. Textos em português do Brasil, específicos e sem enchimento.");
    add("");
    return L.join("\n") + "\n";
  }

  function currentContent() {
    if (currentTab === "tokens") { return buildTokens(); }
    if (currentTab === "prompt") { return buildPrompt(); }
    return buildDesign();
  }

  function currentFilename() {
    var slug = slugify((state.brand || "").trim()) || "sistema";
    if (currentTab === "tokens") { return slug + "-tokens.css"; }
    if (currentTab === "prompt") { return slug + "-prompt.md"; }
    return slug + "-design.md";
  }

  function renderExport() {
    var content = currentContent();
    els.exportCode.textContent = content;
    var kb = (new Blob([content]).size / 1024).toFixed(1).replace(".", ",");
    els.exportMeta.textContent = currentFilename() + " · " + kb + " KB";
  }

  function copyCurrent() {
    var text = currentContent();
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      document.body.removeChild(area);
      toast(ok ? "Copiado para a área de transferência." : "Não foi possível copiar. Selecione o texto manualmente.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast("Copiado para a área de transferência.");
      }, fallback);
    } else {
      fallback();
    }
  }

  function downloadCurrent() {
    var blob = new Blob([currentContent()], { type: "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = currentFilename();
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) { a.parentNode.removeChild(a); }
    }, 500);
    toast("Arquivo gerado: " + currentFilename());
  }
})();
