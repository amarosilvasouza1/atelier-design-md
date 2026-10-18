(function () {
  "use strict";

  var EXAMPLES = ["stripe.com", "linear.app", "vercel.com", "refero.design"];
  var HIST_KEY = "atelier.extrator.historico.v1";
  var state = { data: null, tab: "design", slug: "site", busy: false, timer: null };

  function $(id) { return document.getElementById(id); }
  var els = {
    form: $("xForm"), url: $("xUrl"), go: $("xGo"), examples: $("xExamples"),
    error: $("xError"), loading: $("xLoading"), empty: $("xEmpty"), result: $("xResult"),
    timer: $("xTimer"), shot: $("xShot"), host: $("xHost"), title: $("xTitle"), desc: $("xDesc"),
    chips: $("xChips"), palette: $("xPalette"), mode: $("xMode"), contrast: $("xContrast"),
    specimen: $("xSpecimen"), specKicker: $("xSpecKicker"), specTitle: $("xSpecTitle"),
    specBase: $("xSpecBase"), specMeta: $("xSpecMeta"), fonts: $("xFonts"), sections: $("xSections"),
    outline: $("xOutline"), metrics: $("xMetrics"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".x-tabs button")),
    code: $("xCode"), codeText: $("xCodeText"), file: $("xFile"), copy: $("xCopy"),
    download: $("xDownload"), toast: $("xToast")
  };

  function show(el) { el.hidden = false; }
  function hide(el) { el.hidden = true; }
  function toast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-on");
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(function () { els.toast.classList.remove("is-on"); }, 2200);
  }
  function normalize(value) {
    var raw = String(value || "").trim();
    if (!raw) { return ""; }
    if (!/^https?:\/\//i.test(raw)) { raw = "https://" + raw; }
    try {
      var u = new URL(raw);
      if (u.protocol !== "http:" && u.protocol !== "https:") { return ""; }
      return u.toString();
    } catch (e) { return ""; }
  }
  function hostOf(value) {
    try { return new URL(value).hostname.replace(/^www\./, ""); } catch (e) { return value; }
  }
  function showError(message) {
    els.error.textContent = message;
    show(els.error);
  }
  function setBusy(busy) {
    state.busy = busy;
    els.go.disabled = busy;
    els.go.textContent = busy ? "Analisando..." : "Analisar página";
  }
  function startTimer() {
    var started = Date.now();
    els.timer.textContent = "0 s";
    window.clearInterval(state.timer);
    state.timer = window.setInterval(function () {
      els.timer.textContent = Math.round((Date.now() - started) / 1000) + " s";
    }, 500);
  }
  function stopTimer() {
    window.clearInterval(state.timer);
    state.timer = null;
  }

  function analyze(url) {
    if (state.busy) { return; }
    setBusy(true);
    els.url.value = url;
    show(els.loading);
    hide(els.error);
    hide(els.empty);
    hide(els.result);
    startTimer();
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 95000);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: url }),
      signal: controller.signal
    }).then(function (response) {
      return response.json().catch(function () {
        throw new Error("O servidor respondeu em um formato inesperado.");
      }).then(function (body) {
        if (!response.ok || !body.ok) { throw new Error(body.error || "Não consegui analisar esta página."); }
        return body;
      });
    }).then(function (body) {
      state.data = body;
      state.slug = body.slug || "site";
      render(body);
      saveHistory(body);
      hide(els.loading);
      show(els.result);
      els.result.setAttribute("tabindex", "-1");
      els.result.focus({ preventScroll: false });
    }).catch(function (error) {
      hide(els.loading);
      show(els.empty);
      if (error && error.name === "AbortError") {
        showError("A análise passou de 95 segundos e foi interrompida. Tente uma página mais leve.");
      } else {
        showError((error && error.message) || "Falha ao analisar. Tente outra URL.");
      }
    }).finally(function () {
      window.clearTimeout(timeout);
      stopTimer();
      setBusy(false);
    });
  }

  function safeColor(hex) {
    if (!hex) { return "#000000"; }
    return /^#[0-9a-f]{3,8}$/i.test(hex) ? hex : "#000000";
  }

  function render(data) {
    var p = data.profile;
    var c = p.palette;
    var t = p.typography;

    els.shot.src = "./" + p.shot;
    els.shot.alt = "Captura de " + (p.siteName || p.title);
    els.host.textContent = hostOf(p.finalUrl || p.url);
    els.title.textContent = p.title || p.siteName || hostOf(p.url);
    els.desc.textContent = p.description || "Sem descrição meta nesta página.";

    els.chips.innerHTML = "";
    var chips = (p.tech || []).concat([c.dark ? "modo escuro" : "modo claro", "H1 " + Math.round(parseFloat(t.h1.size) || 0) + "px"]);
    if (p.dark && p.dark.supported) { chips.push("tema escuro"); }
    if (p.responsive && p.responsive.length > 1) { chips.push(p.responsive.length + " larguras"); }
    chips.forEach(function (label) {
      var span = document.createElement("span");
      span.textContent = label;
      els.chips.appendChild(span);
    });

    var roles = [
      ["Fundo", c.bg], ["Superfície", c.surface], ["Tinta", c.ink], ["Apoio", c.muted],
      ["Acento", c.accent], ["Sobre acento", c.onAccent], ["Linha", c.line]
    ];
    els.palette.innerHTML = "";
    roles.forEach(function (role) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.title = "Copiar " + role[1];
      var block = document.createElement("i");
      block.style.background = safeColor(role[1]);
      var name = document.createElement("span");
      name.textContent = role[0];
      var hex = document.createElement("b");
      hex.textContent = role[1];
      button.appendChild(block);
      button.appendChild(name);
      button.appendChild(hex);
      button.addEventListener("click", function () { copyText(role[1], "Cor copiada: " + role[1]); });
      els.palette.appendChild(button);
    });
    els.mode.textContent = (c.dark ? "escuro" : "claro") + " · " + (p.layout.container || "sem container");
    function grade(v) { return v >= 7 ? "AAA" : v >= 4.5 ? "AA" : "abaixo de AA"; }
    els.contrast.textContent = "Texto " + String(c.contrast.ink).replace(".", ",") + ":1 (" + grade(c.contrast.ink) + ") · apoio " +
      String(c.contrast.muted).replace(".", ",") + ":1 (" + grade(c.contrast.muted) + ") · acento " +
      String(c.contrast.accent).replace(".", ",") + ":1 (" + grade(c.contrast.accent) + ").";

    var style = els.specimen.style;
    style.setProperty("--x-bg", safeColor(c.bg));
    style.setProperty("--x-ink", safeColor(c.ink));
    style.setProperty("--x-accent", safeColor(c.accent));
    style.setProperty("--x-line", safeColor(c.line));
    style.setProperty("--x-display", "\"" + t.display + "\", Georgia, serif");
    style.setProperty("--x-body", "\"" + t.body + "\", Inter, system-ui, sans-serif");
    style.setProperty("--x-weight", t.h1.weight || "500");
    style.setProperty("--x-track", t.h1.letterSpacing || "normal");
    els.specTitle.style.fontSize = Math.max(23, Math.min(40, (parseFloat(t.h1.size) || 40) * 0.6)) + "px";
    els.specTitle.style.lineHeight = "1.03";
    els.specBase.style.fontSize = Math.max(13, Math.min(17, parseFloat(t.base.size) || 15)) + "px";
    els.specKicker.style.fontFamily = "\"" + t.display + "\", Georgia, serif";
    els.specKicker.style.color = safeColor(c.accent);
    els.specMeta.textContent = t.display + " · " + t.body + " · H1 " + t.h1.size + " · corpo " + t.base.size;
    els.fonts.textContent = (t.display || "").toLowerCase() === (t.body || "").toLowerCase() ? "1 família" : "2 famílias";

    els.sections.textContent = p.counts.sections + " seções";
    els.outline.innerHTML = "";
    outlineFromDesign(data.design).forEach(function (item, index) {
      var li = document.createElement("li");
      var b = document.createElement("b");
      b.textContent = String(index + 1).padStart(2, "0");
      var span = document.createElement("span");
      span.textContent = item;
      li.appendChild(b);
      li.appendChild(span);
      els.outline.appendChild(li);
    });

    var metrics = [
      [p.counts.elements, "elementos lidos"],
      [p.images.altPct + "%", "imagens com alt"],
      [p.layout.container || "livre", "container"],
      [p.shape.radius, "raio dominante"],
      [p.motion.transitions, "elementos com transição"],
      [String(c.contrast.accent).replace(".", ",") + ":1", "contraste do acento"]
    ];
    els.metrics.innerHTML = "";
    metrics.forEach(function (m) {
      var div = document.createElement("div");
      var b = document.createElement("b");
      b.textContent = m[0];
      var s = document.createElement("span");
      s.textContent = m[1];
      div.appendChild(b);
      div.appendChild(s);
      els.metrics.appendChild(div);
    });

    renderExport();
  }

  function outlineFromDesign(md) {
    if (!md) { return []; }
    var start = md.indexOf("## 2.");
    var end = md.indexOf("## 3.");
    var block = start >= 0 ? md.slice(start, end > start ? end : start + 2600) : md;
    var lines = block.split("\n").filter(function (line) { return /^\d+\.\s/.test(line); });
    return lines.map(function (line) {
      return line.replace(/^\d+\.\s*/, "").replace(/\*\*/g, "");
    }).slice(0, 9);
  }

  function tabContent() {
    if (!state.data) { return ""; }
    if (state.tab === "tokens") { return state.data.tokens; }
    if (state.tab === "prompt") { return state.data.prompt; }
    return state.data.design;
  }
  function fileName() {
    if (state.tab === "tokens") { return state.slug + "-tokens.css"; }
    if (state.tab === "prompt") { return state.slug + "-prompt.md"; }
    return state.slug + "-design.md";
  }
  function renderExport() {
    var content = tabContent();
    els.codeText.textContent = content;
    els.file.textContent = fileName() + " · " + (new Blob([content]).size / 1024).toFixed(1).replace(".", ",") + " KB";
  }
  function copyText(text, message) {
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(area);
      toast(ok ? message : "Não foi possível copiar. Selecione o texto manualmente.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(message); }, fallback);
    } else {
      fallback();
    }
  }

  function history() {
    try {
      var list = JSON.parse(window.localStorage.getItem(HIST_KEY) || "[]");
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function saveHistory(data) {
    var p = data.profile;
    var list = history().filter(function (item) { return item.url !== p.url; });
    list.unshift({ url: p.url, title: p.title || p.siteName || hostOf(p.url), slug: data.slug, at: Date.now() });
    try { window.localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, 5))); } catch (e) {}
    renderExamples();
  }
  function renderExamples() {
    els.examples.innerHTML = "";
    var label = document.createElement("span");
    label.textContent = "Exemplos";
    els.examples.appendChild(label);
    EXAMPLES.forEach(function (domain) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = domain;
      button.addEventListener("click", function () {
        var url = normalize(domain);
        if (url) { analyze(url); }
      });
      els.examples.appendChild(button);
    });
    var recent = history();
    if (recent.length) {
      var recentLabel = document.createElement("span");
      recentLabel.textContent = "Recentes";
      recentLabel.style.marginLeft = "10px";
      els.examples.appendChild(recentLabel);
      recent.forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.textContent = hostOf(item.url);
        button.title = item.title || item.url;
        button.addEventListener("click", function () { analyze(item.url); });
        els.examples.appendChild(button);
      });
    }
  }

  function bind() {
    els.form.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = normalize(els.url.value);
      if (!value) {
        showError("Digite uma URL válida, por exemplo https://stripe.com.");
        return;
      }
      hide(els.error);
      analyze(value);
    });
    els.tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        state.tab = tab.getAttribute("data-tab");
        els.tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
        renderExport();
        els.code.scrollTop = 0;
      });
      tab.addEventListener("keydown", function (event) {
        if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") { return; }
        event.preventDefault();
        var index = els.tabs.indexOf(tab);
        var next = event.key === "ArrowRight" ? (index + 1) % els.tabs.length : (index - 1 + els.tabs.length) % els.tabs.length;
        els.tabs[next].focus();
        els.tabs[next].click();
      });
    });
    els.copy.addEventListener("click", function () {
      if (!state.data) { return; }
      copyText(tabContent(), "Arquivo copiado: " + fileName());
    });
    els.download.addEventListener("click", function () {
      if (!state.data) { return; }
      var blob = new Blob([tabContent()], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = fileName();
      document.body.appendChild(a);
      a.click();
      window.setTimeout(function () {
        URL.revokeObjectURL(url);
        if (a.parentNode) { a.parentNode.removeChild(a); }
      }, 500);
      toast("Baixando " + fileName());
    });
  }

  renderExamples();
  bind();
  var param = new URLSearchParams(window.location.search).get("url");
  if (param) {
    var initial = normalize(param);
    if (initial) {
      els.url.value = initial;
      analyze(initial);
    }
  }
})();
