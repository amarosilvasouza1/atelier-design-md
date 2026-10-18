# Atelier — DESIGN.md para agentes

Ferramenta local que abre uma URL em Chrome headless, extrai a estrutura, as cores e a tipografia do site e gera um **DESIGN.md** com tokens, regras e prompt de implementação.

Funciona de três formas:

- **MCP (stdio)** para Claude Code, Codex, opencode, Cursor, VS Code, Gemini CLI e Windsurf.
- **CLI** para qualquer terminal ou script de agente.
- **Interface web** com estúdio de identidade e extrator visual.

## O que sai

Cada análise gera:

- **design.md** — arquitetura da página, paleta com contraste WCAG, escala tipográfica, layout, componentes, movimento, regras e prompt.
- **tokens.css** — variáveis CSS prontas.
- **prompt.md** — briefing para um agente de código.
- **profile.json** — perfil bruto da análise.
- **screenshot.png** — captura do primeiro viewport.

## Instalação

Requisitos: Node 20+ e Chrome ou Edge.

    git clone https://github.com/amarosilvasouza1/atelier-design-md.git
    cd atelier-design-md
    npm install

Não há dependências externas; o comando acima só prepara o pacote.

## CLI

    node bin/atelier.js extract https://stripe.com --out .atelier/stripe

Saída na tela, sem gravar arquivos:

    node bin/atelier.js extract linear.app > DESIGN.md

JSON completo (perfil + conteúdos + caminhos):

    node bin/atelier.js extract https://linear.app --json

Opções: --out, --json, --tokens, --prompt, --no-shot, --quiet.

Para instalar o comando global:

    npm link
    atelier extract https://stripe.com --out .atelier/stripe

O estúdio web continua disponível:

    npm start
    # http://127.0.0.1:4321  (extrator)
    # http://127.0.0.1:4321/estudio  (estúdio)

## MCP

O servidor **mcp-server.js** expõe a ferramenta **extract_design_system**:

- **url** (obrigatória): página pública http(s).
- **outputDir** (opcional): pasta relativa dentro do projeto. Padrão: .atelier/<slug>.

Configurações já incluídas no repositório:

| Arquivo | Cliente |
| --- | --- |
| .mcp.json | Claude Code e clientes MCP genéricos |
| opencode.json | opencode |
| .cursor/mcp.json | Cursor |
| .vscode/mcp.json | VS Code / Copilot |

Exemplo de configuração com caminho absoluto:

    {
      "mcpServers": {
        "atelier": {
          "type": "stdio",
          "command": "node",
          "args": ["C:/caminho/atelier-design-md/mcp-server.js"]
        }
      }
    }

Guia por agente, incluindo Codex e Gemini CLI: [docs/agents.md](docs/agents.md).

Claude Code também tem o comando **/design-md <url>** em .claude/commands/design-md.md.
O repositório inclui **AGENTS.md** e **CLAUDE.md** para orientar o comportamento do agente.

## Estrutura

    atelier/
      index.html         estúdio
      extrator.html      extrator
      styles.css         interface do estúdio
      specimen.css       página de exemplo
      extrator.css       interface do extrator
      app.js             estado e exportação do estúdio
      extrator.js        fluxo do extrator
      analyzer.js        Chrome headless via CDP + extração
      report.js          geração de DESIGN.md, tokens e prompt
      server.js          servidor web + API
      bin/atelier.js     CLI
      mcp-server.js      servidor MCP stdio
      scripts/           testes de CLI e MCP
      docs/agents.md     instalação por agente
      shots/             capturas locais (ignoradas no Git)

## Testes

    npm run test:cli
    npm run test:mcp

Os testes abrem example.com de verdade e exigem Chrome/Edge e internet.

## Limites e privacidade

- A análise busca a URL a partir desta máquina; a página precisa ser pública.
- Sites com bloqueio anti-bot, CAPTCHA ou login podem falhar.
- A captura é do primeiro viewport, em 1440x1000.
- Fontes proprietárias viram família + fallback sugerido.
- Nada é enviado a serviços de IA: extração local com Chrome + Node.
- O DESIGN.md descreve o sistema visual; não autoriza reutilizar marca, textos ou imagens do site analisado.

## Verificado

- CLI: extração real de example.com com design.md, tokens.css, prompt.md, profile.json e screenshot.
- MCP: initialize, tools/list e tools/call testados via stdio.
- Web: desktop e 390 px, auditoria axe sem violações.

Licença MIT.
