"use strict";

function slug(value) {
  return String(value || "site").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 42) || "site";
}
function dateBR(iso) {
  try { return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }); }
  catch (e) { return ""; }
}
function num(v) { return String(v).replace(".", ","); }
function px(v) { var n = parseFloat(v); return isNaN(n) ? String(v) : Math.round(n) + "px"; }
function channel(v) { var s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }
function lum(hexColor) {
  var h = String(hexColor).replace("#", "");
  if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
  return 0.2126 * channel(parseInt(h.slice(0, 2), 16)) + 0.7152 * channel(parseInt(h.slice(2, 4), 16)) + 0.0722 * channel(parseInt(h.slice(4, 6), 16));
}
function contrast(a, b) { var l1 = lum(a), l2 = lum(b); var hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); }
function fallbackFont(family) {
  var f = String(family || "").toLowerCase();
  if (/mono|code|consol|courier/.test(f)) { return "ui-monospace, Consolas, monospace"; }
  if (/serif|georgia|times|garamond|playfair|fraunces|newsreader|instrument|lora|merriweather|baskerville|didot|caslon/.test(f)) {
    return "Georgia, 'Times New Roman', serif";
  }
  return "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";
}
function fontKind(family) {
  var f = String(family || "").toLowerCase();
  if (/mono|code|consol|courier/.test(f)) { return "mono"; }
  if (/serif|georgia|times|garamond|playfair|fraunces|newsreader|instrument|lora|merriweather|baskerville|didot|caslon/.test(f)) { return "serifada"; }
  return "sans";
}

function structure(p) {
  var out = [];
  var i = 1;
  if (p.landmark.header || p.nav.length) {
    var navText = p.nav.length ? p.nav.length + " links (" + p.nav.slice(0, 4).join(", ") + ")" : "sem links lidos";
    out.push(i + ". **Cabecalho** - " + navText + (p.ctas.length ? "; acao principal \"" + p.ctas[0] + "\"" : "") + ".");
    i += 1;
  }
  p.headings.filter(function (h) { return h.tag === "h1"; }).slice(0, 2).forEach(function (h) {
    out.push(i + ". **Hero** - H1 \"" + h.text + "\" (" + h.size + ").");
    i += 1;
  });
  var groups = [];
  var current = null;
  p.headings.forEach(function (h) {
    if (h.tag === "h2") { current = { text: h.text, subs: [] }; groups.push(current); }
    else if (h.tag === "h3" && current) { current.subs.push(h.text); }
  });
  groups.slice(0, 6).forEach(function (g) {
    out.push(i + ". **Secao** - H2 \"" + g.text + "\"" + (g.subs.length ? " com " + g.subs.length + " subtitulos (ex.: \"" + g.subs[0] + "\")" : "") + ".");
    i += 1;
  });
  if (p.ctas.length) {
    out.push(i + ". **Acoes** - " + p.ctas.slice(0, 4).map(function (c) { return "\"" + c + "\""; }).join("; ") + ".");
    i += 1;
  }
  if (p.landmark.footer) { out.push(i + ". **Rodape** - presente."); }
  if (!out.length) { out.push("Estrutura nao identificada automaticamente. Abra a captura e revise o DOM."); }
  return out;
}

function buildDesign(p) {
  var c = p.palette;
  var t = p.typography;
  var L = [];
  function add(line) { L.push(line); }
  var host = "";
  try { host = new URL(p.finalUrl || p.url).hostname.replace(/^www\./, ""); } catch (e) { host = p.url; }
  var title = (p.siteName || p.title || host).split("|")[0].trim();
  var sameFamily = t.display && t.body && t.display.toLowerCase() === t.body.toLowerCase();
  var h1Ratio = (parseFloat(t.h1.size) / Math.max(parseFloat(t.base.size), 1)).toFixed(1);
  var surfaceContrast = contrast(c.surface, c.ink);

  add("# " + title + " - sistema de design observado");
  add("");
  if (p.description) { add("> " + p.description); add(""); }
  add("**Origem:** " + (p.finalUrl || p.url));
  add("**Analisado em:** " + dateBR(p.analyzedAt) + " · Chrome headless 1440x1000");
  add("**Modo:** " + (c.dark ? "escuro" : "claro") + " · **Tecnologia observada:** " + (p.tech.length ? p.tech.join(", ") : "nao identificada"));
  add("");
  add("Perfil inferido do DOM renderizado, com estilos computados. Serve como referencia de estrutura, cor e tipografia para outro projeto. Nao copie textos, marca, logo ou imagens deste site.");
  add("");
  add("## 1. Leitura rapida");
  add("");
  add("- **Cor de fundo dominante:** " + c.bg + " · **tinta:** " + c.ink + " · **acento:** " + c.accent + ".");
  add("- **Tipografia:** " + (sameFamily ? "uma familia (" + t.display + ")" : t.display + " nos titulos e " + t.body + " no texto") + ".");
  add("- **Escala:** H1 " + px(t.h1.size) + " · H2 " + px(t.h2.size) + " · H3 " + px(t.h3.size) + " · corpo " + px(t.base.size) + ".");
  add("- **Layout:** " + (p.layout.container ? "container de " + p.layout.container : "sem container fixo identificado") + " · " + p.counts.sections + " secoes · " + p.counts.elements + " elementos lidos.");
  add("- **Contraste:** texto " + num(c.contrast.ink) + ":1 · apoio " + num(c.contrast.muted) + ":1 · acento " + num(c.contrast.accent) + ":1.");
  add("- **Densidade:** " + (c.dark ? "fundo escuro, contraste por luz" : "fundo claro, contraste por tinta") + "; " + (p.motion.transitions > 20 ? "movimento presente em muitos elementos" : "movimento discreto") + ".");
  add("");
  add("## 2. Estrutura da pagina (arquitetura de informacao)");
  add("");
  structure(p).forEach(add);
  add("");
  add("**Inventario observado**");
  add("");
  add("| Item | Quantidade |");
  add("| --- | --- |");
  add("| Elementos lidos | " + p.counts.elements + " |");
  add("| Titulos (h1-h3) | " + p.counts.headings + " |");
  add("| Secoes | " + p.counts.sections + " |");
  add("| Links | " + p.counts.links + " |");
  add("| Imagens | " + p.images.count + " (alt em " + p.images.altPct + "%) |");
  add("| Campos de formulario | " + p.counts.inputs + " |");
  add("| Artigos | " + p.landmark.articles + " |");
  add("");
  add("## 3. Cores");
  add("");
  add("| Token | Hex | Papel | Contraste |");
  add("| --- | --- | --- | --- |");
  add("| **--color-bg** | " + c.bg + " | fundo | - |");
  add("| **--color-surface** | " + c.surface + " | superficie | " + num(surfaceContrast.toFixed(2)) + ":1 com a tinta |");
  add("| **--color-ink** | " + c.ink + " | texto principal | " + num(c.contrast.ink) + ":1 |");
  add("| **--color-muted** | " + c.muted + " | texto de apoio | " + num(c.contrast.muted) + ":1 |");
  add("| **--color-accent** | " + c.accent + " | acao e destaque | " + num(c.contrast.accent) + ":1 |");
  add("| **--color-on-accent** | " + c.onAccent + " | texto sobre acento | " + num(c.contrast.onAccent) + ":1 |");
  add("| **--color-line** | " + c.line + " | bordas e divisores | - |");
  add("");
  add("Cores mais usadas no DOM (por area pintada ou volume de texto):");
  add("");
  add("| Hex | Tipo | Peso relativo |");
  add("| --- | --- | --- |");
  var all = [];
  p.colors.bg.forEach(function (x) { all.push({ hex: x.value, kind: "fundo", w: x.weight }); });
  p.colors.text.forEach(function (x) { all.push({ hex: x.value, kind: "texto", w: x.weight }); });
  all.sort(function (a, b) { return b.w - a.w; }).slice(0, 8).forEach(function (x) {
    add("| " + x.hex + " | " + x.kind + " | " + (x.w > 999999 ? Math.round(x.w / 1000) + "k" : Math.round(x.w)) + " |");
  });
  add("");
  add("**Regras de cor**");
  add("");
  add("1. Parta de **--color-bg** e **--color-ink**; o acento e excecao, nao base.");
  add("2. Use **--color-muted** so em textos curtos de apoio; confira o contraste ao trocar de fundo.");
  add("3. " + (c.contrast.accent >= 4.5 ? "O acento atual passa AA para texto; pode sustentar rotulos pequenos." : "O acento atual nao passa AA para texto pequeno: use-o em blocos, bordas ou botoes com texto --color-on-accent."));
  add("4. " + (c.dark ? "Em tema escuro, eleve a superficie em vez de clarear a tinta." : "Em tema claro, crie profundidade com superficie e hairline, nao com sombras pesadas."));
  add("");
  add("## 4. Tipografia");
  add("");
  add("| Papel | Familia | Tamanho | Peso | Entrelinha | Tracking |");
  add("| --- | --- | --- | --- | --- | --- |");
  function row(label, v) { add("| " + label + " | " + (v.family || t.display) + " | " + px(v.size) + " | " + (v.weight || "-") + " | " + (v.lineHeight || "-") + " | " + (v.letterSpacing || "normal") + " |"); }
  row("Display / H1", t.h1);
  row("H2", t.h2);
  row("H3", t.h3);
  row("Corpo", t.base);
  add("");
  add("- **Display:** " + t.display + " (" + fontKind(t.display) + "). Fallback sugerido: " + fallbackFont(t.display) + ".");
  add("- **Texto:** " + t.body + " (" + fontKind(t.body) + "). Fallback sugerido: " + fallbackFont(t.body) + ".");
  add("- **Relacao H1/corpo:** " + h1Ratio + "x.");
  add("- **Pesos observados:** " + (t.weights.length ? t.weights.join(", ") : "nao lidos") + ".");
  add("");
  add("Se as familias originais forem proprietarias, use os fallbacks acima e preserve tamanhos, pesos e tracking.");
  add("");
  add("## 5. Layout e espaco");
  add("");
  add("- **Container maximo:** " + (p.layout.container || "nao identificado") + ".");
  add("- **Respiro de secao (topo):** " + (p.layout.sectionPad || "nao identificado") + ".");
  add("- **Sistema observado:** " + p.layout.grid + " blocos em grid · " + p.layout.flex + " em flex.");
  add("- **Unidade sugerida:** 4 px, com escala 8 / 16 / 24 / 32 / 48 / 64.");
  add("- **Grade:** " + (p.layout.grid > 10 ? "grid e o motor principal; mantenha colunas explicitas e gaps consistentes." : "flex e o motor principal; mantenha alinhamentos por linha de base."));
  add("");
  add("## 6. Forma e profundidade");
  add("");
  add("- **Raio dominante:** " + p.shape.radius + (p.shape.radii.length > 1 ? " (variacoes: " + p.shape.radii.map(function (r) { return r.value; }).slice(0, 4).join(", ") + ")" : "") + ".");
  add("- **Sombras:** " + (p.shape.shadows > 5 ? "presentes em " + p.shape.shadows + " elementos; use com parcimonia." : "quase ausentes; profundidade vem de cor e borda."));
  add("- **Bordas:** " + p.shape.borders + " elementos com borda visivel. Hairline de 1 px e a aposta segura.");
  add("");
  add("## 7. Componentes observados");
  add("");
  if (p.buttons.length) {
    p.buttons.slice(0, 3).forEach(function (b, i) {
      add("**Botao " + (i + 1) + " - \"" + b.text + "\"**");
      add("");
      add("- fundo " + (b.bg || "transparente") + " · texto " + (b.color || "herdado") + " · raio " + b.radius + ".");
      add("- padding " + b.padding + " · fonte " + b.font + " " + b.size + "/" + b.weight + ".");
      add("");
    });
  } else {
    add("- Nenhum botao visivel foi capturado; use os CTAs do texto como referencia.");
    add("");
  }
  add("- **Campos de formulario:** " + p.counts.inputs + " encontrados. Se houver, mantenha borda de 1 px, fundo igual ao papel e foco no acento.");
  add("- **Links:** herdam tinta; sublinhado fino com offset de 3-4 px e hover no acento.");
  add("");
  add("## 8. Movimento");
  add("");
  add("- **Elementos com transicao:** " + p.motion.transitions + ".");
  add("- **Animacoes ativas:** " + p.motion.animations + ".");
  add("- **Duracoes vistas:** " + (p.motion.durations.length ? p.motion.durations.map(function (d) { return d.value; }).join(", ") : "nenhuma") + ".");
  add("- Recomendacao: 160-220 ms, ease-out, apenas em cor, borda e opacidade; respeite prefers-reduced-motion.");
  add("");
  add("## 9. Regras para reaproveitar");
  add("");
  add("**Faca**");
  add("");
  add("- Reaproveite a **arquitetura** (cabecalho, hero, secoes, acoes, rodape) e a **hierarquia** de tamanhos.");
  add("- Mantenha " + (sameFamily ? "uma familia tipografica" : "no maximo duas familias") + " e a relacao H1/corpo de " + h1Ratio + "x.");
  add("- Preserve o container de " + (p.layout.container || "largura confortavel") + " e o respiro entre secoes.");
  add("- Use o acento em uma acao principal por dobra.");
  add("");
  add("**Evite**");
  add("");
  add("- Copiar logotipo, textos, fotos ou ilustracoes do site analisado.");
  add("- Introduzir uma terceira familia ou uma segunda cor de acento.");
  add("- Trocar o fundo sem recalcular contraste de tinta e apoio.");
  add("- Empilhar sombras, gradientes e animacoes que nao estavam no sistema original.");
  add("");
  add("## 10. Prompt de implementacao");
  add("");
  add("Implemente uma pagina no espirito de **" + title + "**, sem copiar seu conteudo ou marca. Use fundo " + c.bg + ", tinta " + c.ink + ", apoio " + c.muted + ", acento " + c.accent + " e texto sobre acento " + c.onAccent + ". Titulos em " + t.display + " com fallback " + fallbackFont(t.display) + "; corpo em " + t.body + " com fallback " + fallbackFont(t.body) + ". Escala: H1 " + px(t.h1.size) + ", H2 " + px(t.h2.size) + ", corpo " + px(t.base.size) + ". Container de " + (p.layout.container || "1200px") + ", raio " + p.shape.radius + ", secoes separadas por hairline. Estrutura: " + structure(p).slice(0, 5).join(" ").replace(/\*\*/g, "") + " Uma unica acao de acento por tela; contraste AA; foco visivel; prefers-reduced-motion.");
  add("");
  add("## 11. Confianca e limites");
  add("");
  add("- Perfil extraido automaticamente; nomes de fonte, papeis de cor e agrupamento de secoes sao inferencias.");
  add("- A captura e do primeiro viewport; estados de hover, modais e paginas internas nao foram analisados.");
  add("- Este arquivo descreve o sistema visual, nao autoriza reutilizar a marca ou o conteudo do site.");
  add("");
  return L.join("\n") + "\n";
}

function buildTokens(p) {
  var c = p.palette;
  var t = p.typography;
  var L = [];
  function add(line) { L.push(line); }
  add("/* " + (p.siteName || p.title) + " - tokens observados pelo Atelier */");
  add("/* Gerado em " + dateBR(p.analyzedAt) + " a partir de " + (p.finalUrl || p.url) + " */");
  add("");
  add(":root {");
  add("  /* cor */");
  add("  --color-bg: " + c.bg + ";");
  add("  --color-surface: " + c.surface + ";");
  add("  --color-ink: " + c.ink + ";");
  add("  --color-muted: " + c.muted + ";");
  add("  --color-accent: " + c.accent + ";");
  add("  --color-on-accent: " + c.onAccent + ";");
  add("  --color-line: " + c.line + ";");
  add("");
  add("  /* tipografia */");
  add("  --font-display: \"" + t.display + "\", " + fallbackFont(t.display) + ";");
  add("  --font-body: \"" + t.body + "\", " + fallbackFont(t.body) + ";");
  add("  --text-h1: " + px(t.h1.size) + ";");
  add("  --text-h2: " + px(t.h2.size) + ";");
  add("  --text-h3: " + px(t.h3.size) + ";");
  add("  --text-body: " + px(t.base.size) + ";");
  add("  --text-small: " + px(t.small.size || "14px") + ";");
  add("  --leading-h1: " + (t.h1.lineHeight || "1.1") + ";");
  add("  --tracking-h1: " + (t.h1.letterSpacing || "normal") + ";");
  add("");
  add("  /* layout e forma */");
  add("  --container: " + (p.layout.container || "1200px") + ";");
  add("  --section-y: " + (p.layout.sectionPad || "64px") + ";");
  add("  --radius: " + p.shape.radius + ";");
  add("  --space-1: 4px;");
  add("  --space-2: 8px;");
  add("  --space-3: 16px;");
  add("  --space-4: 24px;");
  add("  --space-5: 32px;");
  add("  --space-6: 48px;");
  add("  --space-7: 64px;");
  add("  --measure: 65ch;");
  add("  --motion: 180ms;");
  add("}");
  add("");
  add("*, *::before, *::after { box-sizing: border-box; }");
  add("body {");
  add("  margin: 0;");
  add("  background: var(--color-bg);");
  add("  color: var(--color-ink);");
  add("  font-family: var(--font-body);");
  add("  font-size: var(--text-body);");
  add("  line-height: 1.55;");
  add("  -webkit-font-smoothing: antialiased;");
  add("}");
  add("h1, h2, h3 {");
  add("  font-family: var(--font-display);");
  add("  margin: 0;");
  add("  text-wrap: balance;");
  add("}");
  add("h1 { font-size: var(--text-h1); line-height: var(--leading-h1); letter-spacing: var(--tracking-h1); }");
  add("h2 { font-size: var(--text-h2); line-height: 1.12; }");
  add("h3 { font-size: var(--text-h3); line-height: 1.2; }");
  add("p { max-width: var(--measure); }");
  add("");
  add(".container { width: min(100% - 2rem, var(--container)); margin-inline: auto; }");
  add(".section { padding-block: var(--section-y); }");
  add(".hairline { border-top: 1px solid var(--color-line); }");
  add("");
  add(".btn {");
  add("  display: inline-flex; align-items: center; gap: 8px;");
  add("  background: var(--color-ink); color: var(--color-bg);");
  add("  border: 1px solid var(--color-ink); border-radius: var(--radius);");
  add("  padding: 12px 18px; font-family: var(--font-body); font-size: var(--text-small);");
  add("  font-weight: 600; text-decoration: none; cursor: pointer;");
  add("  transition: background var(--motion) ease, color var(--motion) ease, border-color var(--motion) ease;");
  add("}");
  add(".btn--accent { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }");
  add(".btn:hover { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); }");
  add("");
  add(".link { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 4px; }");
  add(".link:hover { color: var(--color-accent); }");
  add(":focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }");
  add("::selection { background: var(--color-accent); color: var(--color-on-accent); }");
  add("");
  add("@media (prefers-reduced-motion: reduce) {");
  add("  *, *::before, *::after { transition-duration: 0.001ms !important; animation-duration: 0.001ms !important; }");
  add("}");
  add("");
  return L.join("\n") + "\n";
}

function buildPrompt(p) {
  var c = p.palette;
  var t = p.typography;
  var L = [];
  function add(line) { L.push(line); }
  add("Analise o site " + (p.finalUrl || p.url) + " e implemente uma pagina propria inspirada no sistema visual, sem copiar conteudo, marca ou imagens.");
  add("");
  add("Use estes tokens:");
  add("- Fundo " + c.bg + "; tinta " + c.ink + "; apoio " + c.muted + "; acento " + c.accent + "; texto sobre acento " + c.onAccent + "; linha " + c.line + ".");
  add("- Titulos em " + t.display + " (fallback " + fallbackFont(t.display) + "); corpo em " + t.body + " (fallback " + fallbackFont(t.body) + ").");
  add("- Escala: H1 " + px(t.h1.size) + " / H2 " + px(t.h2.size) + " / H3 " + px(t.h3.size) + " / corpo " + px(t.base.size) + ".");
  add("- Container " + (p.layout.container || "1200px") + "; raio " + p.shape.radius + "; respiro de secao " + (p.layout.sectionPad || "64px") + ".");
  add("");
  add("Estrutura:");
  structure(p).forEach(function (s) { add("- " + s.replace(/\*\*/g, "")); });
  add("");
  add("Regras:");
  add("- Mantenha a hierarquia e a densidade observadas; nao acrescente uma terceira familia.");
  add("- Acento em uma acao principal por dobra; texto corrido em tinta ou apoio.");
  add("- Contraste AA, foco visivel e prefers-reduced-motion.");
  add("- Escreva textos originais em portugues do Brasil.");
  add("");
  return L.join("\n") + "\n";
}

module.exports = { buildDesign: buildDesign, buildTokens: buildTokens, buildPrompt: buildPrompt, slug: slug };
