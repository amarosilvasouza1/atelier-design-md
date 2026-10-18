# Conectar o Atelier a agentes

O Atelier gera DESIGN.md, tokens.css, prompt.md e uma captura a partir de uma URL.
A análise roda localmente: Node + Chrome/Edge headless. Não precisa de chave de API.

## Requisitos

- Node 20 ou superior
- Chrome ou Edge instalado
- Repositório clonado e dependências instaladas (não há dependências externas):

    git clone https://github.com/amarosilvasouza1/atelier-design-md.git
    cd atelier-design-md
    npm install

Teste rápido:

    node bin/atelier.js extract https://example.com --out .atelier/teste

## 1. Claude Code

O arquivo **.mcp.json** na raiz já declara o servidor. Abra o Claude Code na pasta do projeto e aprove o servidor quando ele pedir.

Se preferir configurar em outro projeto, use caminho absoluto:

    {
      "mcpServers": {
        "atelier": {
          "type": "stdio",
          "command": "node",
          "args": ["C:/caminho/atelier-design-md/mcp-server.js"]
        }
      }
    }

Comando de barra incluso: **/design-md <url>** (em .claude/commands/design-md.md).

## 2. Codex CLI

O Codex lê **AGENTS.md** automaticamente. Para registrar o MCP, edite **~/.codex/config.toml**:

    [mcp_servers.atelier]
    command = "node"
    args = ["C:/caminho/atelier-design-md/mcp-server.js"]
    startup_timeout_ms = 20000

Depois reinicie o Codex e confira com **/mcp** (ou o comando equivalente da sua versão).

## 3. opencode

O arquivo **opencode.json** na raiz já configura o servidor local. Se o opencode for aberto em outro projeto, use caminho absoluto:

    {
      "$schema": "https://opencode.ai/config.json",
      "mcp": {
        "atelier": {
          "type": "local",
          "command": ["node", "C:/caminho/atelier-design-md/mcp-server.js"],
          "enabled": true
        }
      }
    }

## 4. Cursor

Copie **.cursor/mcp.json** para o projeto ou para **~/.cursor/mcp.json** e ajuste o caminho se necessário.

## 5. VS Code / Copilot

O arquivo **.vscode/mcp.json** já declara o servidor stdio. Abra o painel de MCP e inicie **atelier**.

## 6. Gemini CLI

Em **~/.gemini/settings.json**:

    {
      "mcpServers": {
        "atelier": {
          "command": "node",
          "args": ["C:/caminho/atelier-design-md/mcp-server.js"]
        }
      }
    }

## 7. Windsurf

Em **~/.codeium/windsurf/mcp_config.json**:

    {
      "mcpServers": {
        "atelier": {
          "command": "node",
          "args": ["C:/caminho/atelier-design-md/mcp-server.js"]
        }
      }
    }

## O que o agente recebe

Ferramenta **extract_design_system**:

- **url**: página pública http(s).
- **outputDir**: pasta relativa opcional. Padrão: .atelier/<slug>.

Resposta: resumo do site + DESIGN.md completo + caminhos dos arquivos.

## Regras de uso

- A pasta de saída precisa ficar dentro do projeto aberto.
- O agente não deve copiar marca, textos ou imagens do site analisado.
- Sites com login, CAPTCHA ou bloqueio anti-bot podem falhar.
- A captura é do primeiro viewport, em 1440x1000.

## Solução de problemas

- **Chrome não encontrado:** instale Chrome ou Edge; o analisador procura nos caminhos padrão do Windows.
- **Timeout:** páginas pesadas podem passar de 20 s; tente novamente ou use uma URL mais leve.
- **MCP não aparece:** use caminho absoluto no comando e reinicie o agente.
- **Saída vazia:** rode a CLI manualmente para ver o erro real.
