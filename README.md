# Atelier — estúdio e extrator de sistemas de design

Duas ferramentas locais que transformam referências visuais em arquivos de design reutilizáveis.
HTML, CSS e JavaScript puros no cliente; Node no servidor; Chrome/Edge headless para ler páginas reais.

## 1. Estúdio (`/index.html`)

Componha uma identidade editorial e exporte:

- `DESIGN.md` com essência, paleta, escala tipográfica, componentes, movimento, regras e prompt.
- `tokens.css` com variáveis e estilos-base.
- Prévia ao vivo de uma landing page completa, com 6 paletas (contraste WCAG calculado), 3 vozes tipográficas, proporção, cantos e textura.
- Estado salvo no navegador; "Surpreender-me" gera combinações.

## 2. Extrator (`/extrator.html`)

Cole uma URL. O servidor abre a página num Chrome headless, lê o DOM renderizado e os estilos computados, e devolve:

- **Estrutura** — cabeçalho, hero, seções (h2/h3), ações e rodapé em ordem.
- **Cores** — fundo, superfície, tinta, apoio, acento, linha, com contraste real.
- **Tipografia** — famílias, escala (h1–h3, corpo), pesos, entrelinha e tracking.
- **Layout e forma** — container, respiro de seção, raio, sombras, transições.
- **Arquivos** — `DESIGN.md`, `tokens.css`, prompt de implementação e `.json` com o perfil bruto.
- **Captura** do primeiro viewport e histórico local das últimas URLs.

Use os arquivos como contexto no Cursor, Claude Code, Codex, v0 ou Lovable. O perfil descreve o sistema visual; **não** autoriza reutilizar marca, textos ou imagens do site analisado.

## Como rodar

```powershell
cd atelier
node server.js
```

Abra http://127.0.0.1:4321 (extrator) ou http://127.0.0.1:4321/estudio (estúdio).

Requisitos: Node 20+ e Chrome ou Edge instalado. O servidor procura o navegador em caminhos padrão do Windows.

## API

`POST /api/analyze` com `{ "url": "https://exemplo.com" }` devolve:

```json
{ "ok": true, "profile": {}, "shot": "shots/....png", "design": "...", "tokens": "...", "prompt": "...", "slug": "..." }
```

`GET /shots/<arquivo>.png` serve as capturas.

## Estrutura

```
atelier/
  index.html        estúdio
  extrator.html     extrator
  styles.css        interface do estúdio (tema escuro)
  specimen.css      página de exemplo (container queries)
  extrator.css      interface do extrator
  app.js            estado e exportação do estúdio
  extrator.js       fluxo de análise, relatório e exportação
  analyzer.js       Chrome headless via CDP + extração de tokens
  report.js         geração de DESIGN.md, tokens.css e prompt
  server.js         estático + API /api/analyze
  shots/            capturas das análises
```

## Limites e privacidade

- A análise busca a URL a partir desta máquina; a página precisa ser pública (sem login).
- Sites com bloqueio anti-bot, CAPTCHA ou paywall podem falhar — o erro é mostrado na interface.
- A captura é do primeiro viewport; hover, modais e páginas internas não entram no relatório.
- Fontes proprietárias viram família + fallback sugerido no `DESIGN.md`.
- Nada é enviado a serviços de IA: a extração é local (Chrome + Node).

## Verificado

- Estúdio: interações, exportação, mobile 390 px e auditoria axe sem violações.
- Extrator: análises reais de stripe.com e linear.app; paleta, estrutura e arquivos gerados conferidos; abas, cópia e download exercitados.
