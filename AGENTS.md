# Instruções para agentes

Este repositório expõe o Atelier de duas formas:

- **MCP (recomendado):** servidor stdio em **mcp-server.js**, ferramenta **extract_design_system**.
- **CLI:** **node bin/atelier.js extract <url>**.

## Quando usar

Sempre que o usuário pedir um DESIGN.md, um design system, tokens visuais ou uma análise de identidade de um site.

1. Prefira a ferramenta MCP **extract_design_system** com o parâmetro **url**.
2. Leia o DESIGN.md devolvido e os arquivos em **.atelier/<slug>/** (design.md, tokens.css, prompt.md, profile.json, screenshot.png).
3. Use os tokens como referência; escreva conteúdo novo.
4. Nunca copie marca, logotipo, textos ou imagens do site analisado.
5. Se a análise falhar por bloqueio do site, informe o erro real (não invente tokens).

## Fallback sem MCP

    node bin/atelier.js extract https://exemplo.com --out .atelier/exemplo

Para imprimir na saída padrão:

    node bin/atelier.js extract https://exemplo.com > DESIGN.md

## MCP

- Servidor: **atelier**
- Ferramenta: **extract_design_system**
- Entrada: **url** (obrigatória), **outputDir** (opcional, relativo à raiz do projeto)
- Saída: texto com o DESIGN.md + arquivos gravados

Configurações prontas: .mcp.json, opencode.json, .cursor/mcp.json, .vscode/mcp.json.
Guia completo: docs/agents.md.
