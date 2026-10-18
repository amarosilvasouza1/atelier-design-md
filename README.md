# Atelier — DESIGN.md para agentes

Ferramenta local que abre uma URL em Chrome headless, extrai estrutura, cores, tipografia, breakpoints e tema escuro, e gera um **DESIGN.md** pronto para o próximo projeto.

Três formas de usar:

- **MCP (stdio)** para Claude Code, Codex, opencode, Cursor, VS Code, Gemini CLI e Windsurf.
- **CLI** para terminal ou scripts de agente.
- **Interface web** com estúdio de identidade e extrator visual.

## Novidades na 1.2

- **Cache de 24 h** por URL e **Chrome reaproveitado** entre análises (a segunda consulta leva milissegundos).
- **Análise responsiva** em 390, 768 e 1440 px, com largura de container, H1 e links visíveis no menu.
- **Tema escuro** detectado via prefers-color-scheme, com paleta alternativa e **tokens.dark.css**.
- Pacote pronto para npm e instalação sem clonar via npx.

## O que sai

- **design.md** — arquitetura, paleta com contraste, tema escuro, tipografia, responsivo, layout, componentes, movimento, regras e prompt.
- **tokens.css** — variáveis CSS do tema claro.
- **tokens.dark.css** — variante escura, quando o site responde a prefers-color-scheme.
- **prompt.md** — briefing para um agente de código.
- **profile.json** — perfil bruto com os snapshots de layout.
- **screenshot.png** — captura do primeiro viewport (1440x1000).

## Instalação

Requisitos: Node 20+ e Chrome ou Edge.

Com clone:

    git clone https://github.com/amarosilvasouza1/atelier-design-md.git
    cd atelier-design-md
    npm install

Sem clonar (direto do GitHub):

    npx -y github:amarosilvasouza1/atelier-design-md atelier --version

Quando o pacote estiver publicado no npm:

    npx -y atelier-design-md atelier extract https://stripe.com --out .atelier/stripe

## CLI

    node bin/atelier.js extract https://stripe.com --out .atelier/stripe

Saída na tela:

    node bin/atelier.js extract linear.app > DESIGN.md

JSON completo:

    node bin/atelier.js extract https://linear.app --json

Opções:

| Flag | Efeito |
| --- | --- |
| --out, -o | grava os arquivos na pasta |
| --json | imprime perfil, conteúdos e caminhos |
| --tokens / --prompt | inclui os arquivos extras na saída |
| --refresh | ignora o cache de 24 h |
| --fast | pula responsivo e tema escuro |
| --no-responsive / --no-dark | desliga só uma das análises |
| --no-shot | não copia a captura |
| --quiet, -q | sem progresso no stderr |

Instalação global do comando:

    npm link
    atelier extract https://stripe.com --out .atelier/stripe

## MCP

Ferramenta **extract_design_system**:

- **url** (obrigatória): página pública http(s).
- **outputDir** (opcional): pasta relativa dentro do projeto.
- **refresh** (opcional): ignora o cache.

Resposta: resumo com modo, cache, caminhos e o DESIGN.md completo.

### Configuração local (clonado)

| Arquivo | Cliente |
| --- | --- |
| .mcp.json | Claude Code e clientes genéricos |
| opencode.json | opencode |
| .cursor/mcp.json | Cursor |
| .vscode/mcp.json | VS Code / Copilot |

### Sem clonar (npx)

    {
      "mcpServers": {
        "atelier": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "--package=atelier-design-md", "atelier-mcp"]
        }
      }
    }

Enquanto o pacote não estiver no npm, troque o package por:

    --package=github:amarosilvasouza1/atelier-design-md

Guia por agente, incluindo Codex e Gemini CLI: [docs/agents.md](docs/agents.md).

## Onde ficam os dados

- Cache, capturas e perfis: **~/.atelier/** (ou ATELIER_DATA_DIR).
- Saídas do CLI/MCP: pasta escolhida com --out/outputDir, por padrão **.atelier/<slug>/** no projeto.
- Nada é enviado a serviços de IA.

## Estrutura

    atelier/
      bin/atelier.js     CLI
      mcp-server.js      servidor MCP stdio
      analyzer.js        Chrome headless via CDP, cache e snapshots
      report.js          DESIGN.md, tokens e prompt
      server.js          servidor web + API
      scripts/           testes de CLI e MCP
      docs/agents.md     instalação por agente
      examples/          página de teste de prefers-color-scheme
      index.html         estúdio
      extrator.html      extrator

## Testes

    npm run test:cli
    npm run test:mcp

Os testes abrem example.com de verdade e exigem Chrome/Edge e internet.

## Limites

- A página precisa ser pública; anti-bot, CAPTCHA ou login podem falhar.
- A captura é do primeiro viewport.
- O tema escuro só é detectado quando o site responde a prefers-color-scheme.
- Fontes proprietárias viram família + fallback sugerido.
- O DESIGN.md descreve o sistema visual; não autoriza reutilizar marca, textos ou imagens do site analisado.

Licença MIT.
