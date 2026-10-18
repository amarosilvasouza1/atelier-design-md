"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawn } = require("child_process");

const ROOT = __dirname;
const DATA_DIR = process.env.ATELIER_DATA_DIR || path.join(os.homedir(), ".atelier");
const SHOTS = path.join(DATA_DIR, "shots");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const CACHE_VERSION = 3;
const CACHE_TTL = 24 * 60 * 60 * 1000;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const CHROMES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
];

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
function findChrome() {
  for (var i = 0; i < CHROMES.length; i += 1) { if (fs.existsSync(CHROMES[i])) { return CHROMES[i]; } }
  throw new Error("Chrome ou Edge nao encontrado nesta maquina.");
}
function normalizeUrl(value) {
  var raw = String(value || "").trim();
  if (!raw) { throw new Error("Informe uma URL."); }
  if (!/^https?:\/\//i.test(raw)) { raw = "https://" + raw; }
  var url;
  try { url = new URL(raw); } catch (err) { throw new Error("URL invalida."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") { throw new Error("Somente http e https."); }
  return url.toString();
}
async function getJson(url, options) {
  var res = await fetch(url, options);
  if (!res.ok) { throw new Error("HTTP " + res.status); }
  return res.json();
}
async function waitForVersion(port, timeout) {
  var end = Date.now() + timeout;
  while (Date.now() < end) {
    try { return await getJson("http://127.0.0.1:" + port + "/json/version"); }
    catch (err) { await sleep(200); }
  }
  throw new Error("O navegador nao iniciou a tempo.");
}
function cdpSession(wsUrl) {
  return new Promise(function (resolve, reject) {
    var ws = new WebSocket(wsUrl);
    var pending = new Map();
    var events = new Map();
    var seq = 0;
    var ready = false;

    function send(method, params) {
      return new Promise(function (res, rej) {
        var id = ++seq;
        var timer = setTimeout(function () {
          pending.delete(id);
          rej(new Error("Timeout em " + method));
        }, 25000);
        pending.set(id, { resolve: function (v) { clearTimeout(timer); res(v); }, reject: function (e) { clearTimeout(timer); rej(e); } });
        ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
      });
    }
    function once(method, ms) {
      return new Promise(function (res, rej) {
        var timer = setTimeout(function () { rej(new Error("Timeout aguardando " + method)); }, ms);
        var fn = function (params) { clearTimeout(timer); res(params); };
        var list = events.get(method) || [];
        list.push(fn);
        events.set(method, list);
      });
    }

    ws.addEventListener("open", function () {
      ready = true;
      resolve({ send: send, once: once, close: function () { try { ws.close(); } catch (e) {} } });
    });
    ws.addEventListener("error", function () {
      if (!ready) { reject(new Error("Nao consegui falar com o Chrome.")); }
    });
    ws.addEventListener("message", function (event) {
      var msg;
      try { msg = JSON.parse(event.data); } catch (err) { return; }
      if (msg.id && pending.has(msg.id)) {
        var p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) { p.reject(new Error(msg.error.message || "Erro do navegador")); }
        else { p.resolve(msg.result); }
        return;
      }
      if (msg.method && events.has(msg.method)) {
        var list = events.get(msg.method);
        events.delete(msg.method);
        list.forEach(function (fn) { try { fn(msg.params); } catch (e) {} });
      }
    });
  });
}

function EXTRACT() {
  function clean(value) { return String(value || "").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim(); }
  function short(value, max) { var t = clean(value); return t.length > max ? t.slice(0, max - 1) + "..." : t; }
  function rgb(value) {
    if (!value || value === "transparent") { return null; }
    var m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) { return null; }
    var p = m[1].split(",").map(function (x) { return parseFloat(x); });
    if (p.length < 3 || p[3] === 0) { return null; }
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  }
  function hex(c) {
    if (!c) { return null; }
    function h(v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h(c.r) + h(c.g) + h(c.b);
  }
  function add(map, key, weight) {
    if (!key) { return; }
    map[key] = (map[key] || 0) + Math.max(1, weight);
  }
  function top(map, limit) {
    return Object.keys(map).map(function (k) { return { value: k, weight: map[k] }; })
      .sort(function (a, b) { return b.weight - a.weight; }).slice(0, limit || 12);
  }
  function styleOf(el, prop) { try { return getComputedStyle(el)[prop]; } catch (e) { return ""; } }

  var all = Array.prototype.slice.call(document.querySelectorAll("body *")).slice(0, 3500);
  var bgMap = {}, textMap = {}, fontMap = {}, sizeMap = {}, weightMap = {};
  var radii = {}, shadows = 0, transitions = 0, animations = 0, durations = {};
  var containerMap = {}, padMap = {}, borderCount = 0, grid = 0, flex = 0;
  var gradients = {};

  all.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    var w = Math.min(rect.width, 1800);
    var h = Math.min(rect.height, 1400);
    var area = w > 0 && h > 0 ? w * h : 0;
    var cs = getComputedStyle(el);
    var bg = rgb(cs.backgroundColor);
    if (bg && bg.a > 0.4) { add(bgMap, hex(bg), area + 1); }
    if (cs.backgroundImage && cs.backgroundImage.indexOf("gradient") >= 0) {
      add(gradients, short(cs.backgroundImage, 140), 1);
    }
    var isLeaf = el.children.length === 0;
    var text = isLeaf ? clean(el.textContent) : "";
    var color = rgb(cs.color);
    if (text && color) { add(textMap, hex(color), Math.min(text.length, 240)); }
    if (text) {
      var fam = (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim();
      if (fam) { add(fontMap, fam, text.length); }
      add(sizeMap, cs.fontSize, 1);
      add(weightMap, cs.fontWeight, 1);
    }
    if (cs.borderRadius && cs.borderRadius !== "0px") { add(radii, cs.borderRadius, 1); }
    if (cs.boxShadow && cs.boxShadow !== "none") { shadows += 1; }
    if (cs.borderTopWidth && parseFloat(cs.borderTopWidth) > 0) { borderCount += 1; }
    if (cs.transitionDuration && cs.transitionDuration !== "0s") { transitions += 1; add(durations, cs.transitionDuration, 1); }
    if (cs.animationName && cs.animationName !== "none") { animations += 1; }
    if (parseFloat(cs.maxWidth) >= 480 && parseFloat(cs.maxWidth) <= 2200) { add(containerMap, cs.maxWidth, 1); }
    if (/^(section|header|footer|main)$/i.test(el.tagName)) {
      add(padMap, cs.paddingTop, 1);
    }
    if (cs.display === "grid") { grid += 1; }
    if (cs.display === "flex") { flex += 1; }
  });

  var bodyBack = rgb(getComputedStyle(document.body).backgroundColor);
  if (bodyBack) { add(bgMap, hex(bodyBack), innerWidth * innerHeight); }

  function typeOf(selector) {
    var el = document.querySelector(selector);
    if (!el) { return null; }
    var cs = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    if (rect.width < 2) { return null; }
    return {
      size: cs.fontSize,
      weight: cs.fontWeight,
      family: (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim(),
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      transform: cs.textTransform
    };
  }

  var seenHeadings = {};
  var headings = Array.prototype.slice.call(document.querySelectorAll("h1,h2,h3")).filter(function (h) {
    var key = h.tagName + "|" + clean(h.textContent);
    if (seenHeadings[key]) { return false; }
    seenHeadings[key] = true;
    return true;
  }).slice(0, 24).map(function (h) {
    return {
      tag: h.tagName.toLowerCase(),
      text: short(h.textContent, 110),
      size: styleOf(h, "fontSize"),
      family: (styleOf(h, "fontFamily") || "").split(",")[0].replace(/["']/g, "").trim()
    };
  });

  var nav = Array.prototype.slice.call(document.querySelectorAll("header a, nav a")).map(function (a) {
    return short(a.textContent, 32);
  }).filter(function (t) { return t; }).slice(0, 12);

  var ctaEls = Array.prototype.slice.call(document.querySelectorAll("button, [role=button]"));
  if (!ctaEls.length) {
    ctaEls = Array.prototype.slice.call(document.querySelectorAll("a[class*=btn i], a[class*=button i], a[class*=cta i]"));
  }
  var seenCta = {};
  var ctas = ctaEls.map(function (b) { return short(b.textContent, 40); })
    .filter(function (t) { if (!t || t.length > 39 || seenCta[t]) { return false; } seenCta[t] = true; return true; })
    .slice(0, 8);

  var seenButton = {};
  var buttons = [];
  Array.prototype.slice.call(document.querySelectorAll("button, a[class*=btn i], a[class*=button i], a[class*=cta i]")).forEach(function (b) {
    if (buttons.length >= 4) { return; }
    var label = short(b.textContent, 40);
    if (!label || seenButton[label]) { return; }
    seenButton[label] = true;
    var cs = getComputedStyle(b);
    var rect = b.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 12) { return; }
    buttons.push({
      text: label,
      bg: hex(rgb(cs.backgroundColor)),
      color: hex(rgb(cs.color)),
      radius: cs.borderRadius,
      padding: cs.paddingTop + " " + cs.paddingRight + " " + cs.paddingBottom + " " + cs.paddingLeft,
      font: (cs.fontFamily || "").split(",")[0].replace(/["']/g, "").trim(),
      size: cs.fontSize,
      weight: cs.fontWeight,
      border: cs.borderTopWidth + " " + cs.borderTopStyle + " " + cs.borderTopColor
    });
  });

  var inputCount = document.querySelectorAll("input, textarea, select").length;
  var images = document.images || [];
  var alts = 0;
  for (var i = 0; i < images.length; i += 1) { if (images[i].alt) { alts += 1; } }

  var generator = document.querySelector('meta[name="generator"]');
  var tech = [];
  if (window.__NEXT_DATA__ || document.querySelector('script[src*="_next"]')) { tech.push("Next.js"); }
  if (window.__NUXT__ || document.querySelector('script[src*="_nuxt"]')) { tech.push("Nuxt"); }
  if (window.__GATSBY || document.querySelector('script[src*="gatsby"]')) { tech.push("Gatsby"); }
  if (document.querySelector('script[src*="wp-content"]')) { tech.push("WordPress"); }
  if (document.querySelector('script[src*="shopify"]')) { tech.push("Shopify"); }
  if (document.querySelector('script[src*="webflow"]')) { tech.push("Webflow"); }
  if (document.querySelector('script[src*="framer"]')) { tech.push("Framer"); }
  if (document.querySelector('[data-wf-page]')) { if (tech.indexOf("Webflow") < 0) { tech.push("Webflow"); } }
  if (document.querySelector('[class*="tailwind"], [class*=" tw-"]')) { tech.push("Tailwind?"); }

  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var descMeta = document.querySelector('meta[name="description"]');
  var ogSite = document.querySelector('meta[property="og:site_name"]');

  return {
    meta: {
      title: short(document.title, 140),
      description: short(descMeta ? descMeta.content : "", 260),
      siteName: short(ogSite ? ogSite.content : "", 80),
      lang: document.documentElement.lang || "",
      themeColor: themeMeta ? themeMeta.content : "",
      generator: generator ? generator.content : "",
      tech: tech,
      finalUrl: location.href
    },
    viewport: { w: innerWidth, h: innerHeight },
    counts: {
      elements: all.length,
      headings: document.querySelectorAll("h1,h2,h3").length,
      sections: document.querySelectorAll("section").length,
      images: images.length,
      inputs: inputCount,
      links: document.querySelectorAll("a").length
    },
    landmark: {
      header: !!document.querySelector("header"),
      nav: !!document.querySelector("nav"),
      main: !!document.querySelector("main"),
      footer: !!document.querySelector("footer"),
      articles: document.querySelectorAll("article").length
    },
    colors: {
      bg: top(bgMap, 18),
      text: top(textMap, 18),
      gradients: top(gradients, 3)
    },
    fonts: top(fontMap, 10),
    sizes: top(sizeMap, 12),
    weights: top(weightMap, 8),
    type: {
      h1: typeOf("h1"),
      h2: typeOf("h2"),
      h3: typeOf("h3"),
      body: typeOf("body"),
      small: typeOf("p")
    },
    headings: headings,
    nav: nav,
    ctas: ctas,
    buttons: buttons,
    images: { count: images.length, altPct: images.length ? Math.round(alts / images.length * 100) : 0 },
    layout: {
      container: top(containerMap, 1)[0] ? top(containerMap, 1)[0].value : "",
      sectionPad: top(padMap, 1)[0] ? top(padMap, 1)[0].value : "",
      grid: grid,
      flex: flex
    },
    shape: {
      radius: top(radii, 1)[0] ? top(radii, 1)[0].value : "0px",
      radii: top(radii, 5),
      shadows: shadows,
      borders: borderCount
    },
    motion: {
      transitions: transitions,
      animations: animations,
      durations: top(durations, 4)
    },
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    scrollHeight: Math.min(document.documentElement.scrollHeight, 12000)
  };
}

function SNAPSHOT() {
  function mode(map) {
    var best = "";
    var weight = 0;
    Object.keys(map).forEach(function (key) {
      if (map[key] > weight) { weight = map[key]; best = key; }
    });
    return best;
  }
  var all = Array.prototype.slice.call(document.querySelectorAll("body *")).slice(0, 1800);
  var containers = {};
  var pads = {};
  var grid = 0;
  var flex = 0;
  all.forEach(function (el) {
    var style = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) { return; }
    var maxWidth = parseFloat(style.maxWidth);
    if (maxWidth >= 480 && maxWidth <= 2200) {
      containers[style.maxWidth] = (containers[style.maxWidth] || 0) + 1;
    }
    if (/^(section|header|footer|main)$/i.test(el.tagName)) {
      pads[style.paddingTop] = (pads[style.paddingTop] || 0) + 1;
    }
    if (style.display === "grid") { grid += 1; }
    if (style.display === "flex") { flex += 1; }
  });
  var h1 = document.querySelector("h1");
  var h2 = document.querySelector("h2");
  var nav = document.querySelector("header nav, nav");
  var navVisible = false;
  var navLinks = 0;
  if (nav) {
    var nr = nav.getBoundingClientRect();
    navVisible = getComputedStyle(nav).display !== "none" && nr.height > 0 && nr.width > 0;
    navLinks = Array.prototype.slice.call(nav.querySelectorAll("a")).filter(function (a) {
      var r = a.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length;
  }
  return {
    width: innerWidth,
    h1: h1 ? getComputedStyle(h1).fontSize : "",
    h2: h2 ? getComputedStyle(h2).fontSize : "",
    body: getComputedStyle(document.body).fontSize,
    container: mode(containers),
    sectionPad: mode(pads),
    grid: grid,
    flex: flex,
    navVisible: navVisible,
    navLinks: navLinks,
    scrollWidth: document.documentElement.scrollWidth
  };
}

function THEME() {
  function norm(value) {
    if (!value) { return null; }
    var match = value.match(/rgba?\(([^)]+)\)/);
    if (!match) { return null; }
    var parts = match[1].split(",").map(function (x) { return parseFloat(x); });
    if (parts.length < 3 || parts[3] === 0) { return null; }
    function h(v) {
      var s = Math.round(Math.max(0, Math.min(255, v))).toString(16);
      return s.length < 2 ? "0" + s : s;
    }
    return "#" + h(parts[0]) + h(parts[1]) + h(parts[2]);
  }
  function top(map, limit) {
    return Object.keys(map).map(function (key) { return { value: key, weight: map[key] }; })
      .sort(function (a, b) { return b.weight - a.weight; }).slice(0, limit);
  }
  var els = Array.prototype.slice.call(document.querySelectorAll("body *")).slice(0, 1600);
  var bg = {};
  var text = {};
  els.forEach(function (el) {
    var style = getComputedStyle(el);
    var rect = el.getBoundingClientRect();
    var area = Math.max(1, Math.min(rect.width, 1600) * Math.min(rect.height, 1200));
    var back = norm(style.backgroundColor);
    if (back) { bg[back] = (bg[back] || 0) + area; }
    if (el.children.length === 0) {
      var content = (el.textContent || "").trim();
      var color = norm(style.color);
      if (content && color) { text[color] = (text[color] || 0) + Math.min(content.length, 200); }
    }
  });
  var bodyBack = norm(getComputedStyle(document.body).backgroundColor);
  if (bodyBack) { bg[bodyBack] = (bg[bodyBack] || 0) + innerWidth * innerHeight; }
  var bodyText = norm(getComputedStyle(document.body).color);
  if (bodyText) { text[bodyText] = (text[bodyText] || 0) + 400; }

  return {
    prefersDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyColor: getComputedStyle(document.body).color,
    bg: top(bg, 10),
    text: top(text, 10)
  };
}

function buildDark(theme, lightPalette) {
  if (!theme || !theme.bg || !theme.bg.length) {
    return { supported: false, palette: null };
  }
  var darkPalette = buildPalette({ colors: { bg: theme.bg, text: theme.text, gradients: [] }, buttons: [] });
  var changed = darkPalette.bg !== lightPalette.bg && (contrast(darkPalette.bg, lightPalette.bg) > 1.2 || darkPalette.dark !== lightPalette.dark);
  return { supported: changed, palette: changed ? darkPalette : null };
}

module.exports = {
  analyze: analyze,
  normalizeUrl: normalizeUrl,
  shutdown: shutdown,
  SHOTS: SHOTS,
  CACHE_DIR: CACHE_DIR
};

var browser = null;
var idleTimer = null;
var queue = Promise.resolve();

function shutdown() {
  return new Promise(function (resolve) {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (!browser) { resolve(); return; }
    var current = browser;
    browser = null;
    try { current.proc.kill(); } catch (e) {}
    try { fs.rmSync(current.profileDir, { recursive: true, force: true }); } catch (e) {}
    setTimeout(resolve, 150);
  });
}

function scheduleIdle() {
  if (idleTimer) { clearTimeout(idleTimer); }
  idleTimer = setTimeout(function () { shutdown(); }, 90000);
  if (idleTimer.unref) { idleTimer.unref(); }
}

async function ensureBrowser() {
  if (browser && browser.proc.exitCode === null) {
    try {
      await getJson("http://127.0.0.1:" + browser.port + "/json/version", {});
      return browser;
    } catch (error) {
      await shutdown();
    }
  }
  var chrome = findChrome();
  var port = 9300 + Math.floor(Math.random() * 400);
  var profileDir = path.join(os.tmpdir(), "atelier-cdp-" + Date.now());
  var proc = spawn(chrome, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-background-networking", "--hide-scrollbars",
    "--disable-features=Translate,BackForwardCache", "--remote-allow-origins=*",
    "--remote-debugging-port=" + port, "--user-data-dir=" + profileDir,
    "--window-size=1440,1000", "about:blank"
  ], { stdio: "ignore", windowsHide: true });
  await waitForVersion(port, 15000);
  browser = { proc: proc, port: port, profileDir: profileDir };
  proc.once("exit", function () {
    if (browser && browser.proc === proc) { browser = null; }
  });
  return browser;
}

function cacheKey(url, options) {
  var material = url + "|v" + CACHE_VERSION + "|responsive:" + (options.responsive === false ? "0" : "1") + "|dark:" + (options.dark === false ? "0" : "1");
  return crypto.createHash("sha1").update(material).digest("hex");
}

function readCache(key) {
  try {
    var file = path.join(CACHE_DIR, key + ".json");
    var stat = fs.statSync(file);
    if (Date.now() - stat.mtimeMs > CACHE_TTL) { return null; }
    var data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!data || !data.profile) { return null; }
    if (data.shot) {
      var shotPath = path.join(SHOTS, path.basename(data.shot));
      if (!fs.existsSync(shotPath)) { return null; }
      data.shotPath = shotPath;
      data.profile.shot = "shots/" + path.basename(data.shot);
    }
    data.cached = true;
    data.cachedAt = data.cachedAt || stat.mtimeMs;
    return data;
  } catch (error) {
    return null;
  }
}

function writeCache(key, result) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, key + ".json"), JSON.stringify({
      profile: result.profile,
      shot: result.shot,
      cachedAt: Date.now()
    }));
  } catch (error) {}
}

async function analyze(rawUrl, options) {
  var url = normalizeUrl(rawUrl);
  var opts = options || {};
  var key = cacheKey(url, opts);
  if (!opts.refresh) {
    var cached = readCache(key);
    if (cached) { return cached; }
  }
  var job = queue.then(function () { return runAnalysis(url, opts, key); });
  queue = job.catch(function () {});
  return job;
}

async function runAnalysis(url, options, key) {
  var current = await ensureBrowser();
  var cdp = null;
  var target = null;
  try {
    target = await getJson("http://127.0.0.1:" + current.port + "/json/new?about:blank", { method: "PUT" });
    cdp = await cdpSession(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await cdp.send("Network.setUserAgentOverride", { userAgent: UA, acceptLanguage: "pt-BR,pt;q=0.9,en;q=0.8" });
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] });
    try {
      await cdp.send("Storage.clearDataForOrigin", { origin: new URL(url).origin, storageTypes: "all" });
    } catch (error) {}
    try { await cdp.send("Network.clearBrowserCookies"); } catch (error) {}

    var loaded = cdp.once("Page.loadEventFired", 22000);
    var nav = await cdp.send("Page.navigate", { url: url });
    if (nav && nav.errorText) { throw new Error("Falha ao abrir: " + nav.errorText); }
    await loaded.catch(function () {});
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "light" }] }).catch(function () {});
    await sleep(1500);
    await cdp.send("Runtime.evaluate", {
      expression: "document.fonts && document.fonts.ready ? document.fonts.ready.then(function(){ return true; }) : true",
      awaitPromise: true
    }).catch(function () {});
    await sleep(700);

    var shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    var hash = crypto.createHash("sha1").update(url + Date.now()).digest("hex").slice(0, 12);
    fs.mkdirSync(SHOTS, { recursive: true });
    var fileName = hash + ".png";
    var shotPath = path.join(SHOTS, fileName);
    fs.writeFileSync(shotPath, Buffer.from(shot.data, "base64"));

    var res = await cdp.send("Runtime.evaluate", {
      expression: "(" + EXTRACT.toString() + ")()",
      returnByValue: true,
      awaitPromise: true
    });
    if (!res || !res.result || !res.result.value) {
      throw new Error("Nao consegui ler o conteudo da pagina.");
    }
    var raw = res.result.value;
    var lightPalette = buildPalette(raw);

    var responsive = [];
    if (options.responsive !== false) {
      var snapAt = async function (width) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width: width, height: 1000, deviceScaleFactor: 1, mobile: false });
        await sleep(350);
        var snap = await cdp.send("Runtime.evaluate", {
          expression: "(" + SNAPSHOT.toString() + ")()",
          returnByValue: true
        });
        if (snap && snap.result && snap.result.value) { responsive.push(snap.result.value); }
      };
      await snapAt(1440);
      await snapAt(768);
      await snapAt(390);
      await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
      await sleep(200);
    }

    var dark = { supported: false, palette: null, prefersDark: null, error: "" };
    if (options.dark !== false) {
      try {
        await cdp.send("Emulation.setEmulatedMedia", { media: "screen", features: [{ name: "prefers-color-scheme", value: "dark" }] });
        await sleep(450);
        var themed = await cdp.send("Runtime.evaluate", {
          expression: "(" + THEME.toString() + ")()",
          returnByValue: true
        });
        if (themed && themed.result && themed.result.value) {
          dark = buildDark(themed.result.value, lightPalette);
          dark.prefersDark = themed.result.value.prefersDark;
        }
      } catch (error) {
        dark.error = error && error.message ? error.message : String(error);
      } finally {
        try { await cdp.send("Emulation.setEmulatedMedia", { features: [] }); } catch (error2) {}
      }
    }

    var profile = buildProfile(raw, url, "shots/" + fileName, { responsive: responsive, dark: dark });
    var result = { profile: profile, shot: "shots/" + fileName, shotPath: shotPath, cached: false };
    writeCache(key, result);
    return result;
  } finally {
    if (cdp) { cdp.close(); }
    if (target && target.id) {
      try { await fetch("http://127.0.0.1:" + current.port + "/json/close/" + target.id); } catch (error) {}
    }
    scheduleIdle();
  }
}

function channel(v) { var s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
function lum(hexColor) {
  var h = String(hexColor).replace("#", "");
  if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) + 0.7152 * channel(parseInt(h.slice(2, 4), 16)) + 0.0722 * channel(parseInt(h.slice(4, 6), 16));
}
function contrast(a, b) { var l1 = lum(a), l2 = lum(b); var hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function toRgb(hexColor) { var h = String(hexColor).replace("#", ""); if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; } return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) }; }
function mix(a, b, t) {
  var x = toRgb(a), y = toRgb(b);
  function c(v, w) { var n = Math.round(v + (w - v) * t).toString(16); return n.length < 2 ? "0" + n : n; }
  return "#" + c(x.r, y.r) + c(x.g, y.g) + c(x.b, y.b);
}
function saturation(hexColor) {
  var c = toRgb(hexColor);
  var r = c.r / 255, g = c.g / 255, b = c.b / 255;
  var max = Math.max(r, g, b), min = Math.min(r, g, b);
  if (max === min) { return 0; }
  var l = (max + min) / 2;
  return l > 0.5 ? (max - min) / (2 - max - min) : (max - min) / (max + min);
}

function buildPalette(raw) {
  var bgList = raw.colors.bg || [];
  var textList = raw.colors.text || [];
  var all = [];
  bgList.forEach(function (c) { all.push({ hex: c.value, weight: c.weight, kind: "bg" }); });
  textList.forEach(function (c) { all.push({ hex: c.value, weight: c.weight, kind: "text" }); });

  var bg = bgList.length ? bgList[0].value : "#ffffff";
  var dark = lum(bg) < 0.12;
  var ink = dark ? "#f5f2ec" : "#141414";
  var strong = textList.filter(function (c) { return contrast(c.value, bg) >= 7; });
  var medium = textList.filter(function (c) { return contrast(c.value, bg) >= 4.5; });
  if (strong.length) {
    strong.sort(function (a, b) { return b.weight - a.weight; });
    ink = strong[0].value;
  } else if (medium.length) {
    medium.sort(function (a, b) { return contrast(b.value, bg) - contrast(a.value, bg); });
    ink = medium[0].value;
  }

  var muted = null;
  var mutedCandidates = textList.map(function (c) { return c.value; }).filter(function (c) {
    var r = contrast(c, bg); return r >= 3 && r < contrast(ink, bg) * 0.86 && c !== ink;
  });
  if (mutedCandidates.length) { muted = mutedCandidates[0]; }
  if (!muted) { muted = mix(ink, bg, 0.42); }

  var surface = null;
  var surfaceCandidates = bgList.slice(1).map(function (c) { return c.value; }).filter(function (c) {
    var d = contrast(c, bg); return d >= 1.03 && d <= 1.9;
  });
  if (surfaceCandidates.length) { surface = surfaceCandidates[0]; }
  if (!surface) { surface = mix(bg, ink, dark ? 0.10 : 0.05); }

  var buttonColors = {};
  (raw.buttons || []).forEach(function (b) { if (b.bg && b.bg !== "#000000") { buttonColors[b.bg] = true; } });
  var accent = null, accentScore = 0;
  all.forEach(function (c) {
    var sat = saturation(c.hex);
    var vsBg = contrast(c.hex, bg);
    var l = lum(c.hex);
    var tooCloseToInk = Math.abs(l - lum(ink)) < 0.05;
    if (sat < 0.28 || vsBg < 2.1 || l < 0.1 || l > 0.9 || tooCloseToInk) { return; }
    var score = sat * 130 + vsBg * 2 + Math.log(c.weight + 1) * 3 + (buttonColors[c.hex] ? 40 : 0) + (1 - Math.abs(l - 0.5)) * 25;
    if (score > accentScore) { accentScore = score; accent = c.hex; }
  });
  if (!accent) {
    var withSat = all.map(function (c) { return c.hex; })
      .filter(function (c) { return saturation(c) > 0.18 && contrast(c, bg) >= 2.5 && Math.abs(lum(c) - lum(ink)) > 0.06; })
      .sort(function (a, b) { return saturation(b) - saturation(a); });
    accent = withSat.length ? withSat[0] : (dark ? "#e0a458" : "#c7451f");
  }
  var onAccent = contrast("#ffffff", accent) >= contrast("#111111", accent) ? "#ffffff" : "#111111";
  var line = mix(bg, ink, dark ? 0.16 : 0.13);

  return {
    bg: bg, surface: surface, ink: ink, muted: muted, accent: accent, onAccent: onAccent, line: line,
    dark: dark,
    contrast: { ink: +contrast(ink, bg).toFixed(2), muted: +contrast(muted, bg).toFixed(2), accent: +contrast(accent, bg).toFixed(2), onAccent: +contrast(onAccent, accent).toFixed(2) }
  };
}

function buildProfile(raw, url, shot, extras) {
  var palette = buildPalette(raw);
  var fonts = (raw.fonts || []).map(function (f) { return f.value; });
  var display = (raw.type && raw.type.h1 && raw.type.h1.family) || fonts[0] || "Georgia";
  var body = (raw.type && raw.type.body && raw.type.body.family) || fonts[1] || fonts[0] || "system-ui";
  var weights = (raw.weights || []).map(function (w) { return w.value; });
  var sizes = (raw.sizes || []).map(function (s) { return s.value; });

  var type = {
    display: display,
    body: body,
    h1: raw.type.h1 || { size: sizes[0] || "48px", weight: weights[0] || "600", lineHeight: "1.1", letterSpacing: "0" },
    h2: raw.type.h2 || { size: sizes[1] || "32px" },
    h3: raw.type.h3 || { size: sizes[2] || "22px" },
    base: raw.type.body || { size: "16px", lineHeight: "1.5" },
    small: raw.type.small || { size: "14px" },
    sizes: sizes,
    weights: weights
  };

  var outline = (raw.headings || []).map(function (h) {
    return { tag: h.tag, text: h.text, size: h.size };
  });

  return {
    url: url,
    finalUrl: raw.meta.finalUrl,
    title: raw.meta.title || raw.meta.siteName || url,
    description: raw.meta.description || "",
    siteName: raw.meta.siteName || "",
    lang: raw.meta.lang || "",
    themeColor: raw.meta.themeColor || "",
    tech: raw.meta.tech || [],
    generator: raw.meta.generator || "",
    shot: shot,
    analyzedAt: new Date().toISOString(),
    viewport: raw.viewport,
    counts: raw.counts,
    landmark: raw.landmark,
    palette: palette,
    colors: {
      bg: (raw.colors.bg || []).slice(0, 10),
      text: (raw.colors.text || []).slice(0, 10),
      gradients: raw.colors.gradients || []
    },
    typography: type,
    headings: raw.headings || [],
    outline: outline,
    nav: raw.nav || [],
    ctas: raw.ctas || [],
    buttons: raw.buttons || [],
    images: raw.images || { count: 0, altPct: 0 },
    layout: raw.layout || {},
    shape: raw.shape || {},
    motion: raw.motion || {},
    responsive: (extras && extras.responsive ? extras.responsive.slice() : []).sort(function (a, b) { return a.width - b.width; }),
    dark: (extras && extras.dark) || { supported: false, palette: null },
    scrollHeight: raw.scrollHeight || 0,
    confidence: "alta",
    note: "Perfil inferido do DOM renderizado em Chrome headless, com estilos computados. Nao replica conteudo, marca ou imagens do site analisado."
  };
}
