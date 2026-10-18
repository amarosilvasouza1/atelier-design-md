# Atelier

Ferramenta local que gera um DESIGN.md a partir de uma URL, usando Chrome headless.

Quando o usuário pedir "design system", "DESIGN.md", "copiar o design" ou "analisar o visual" de um site:

1. Use a ferramenta MCP **extract_design_system** do servidor **atelier** com a URL.
2. O resultado traz o DESIGN.md e grava os arquivos em **.atelier/<slug>/**.
3. Use o DESIGN.md como referência de estrutura, cor, tipografia e componentes.
4. Não copie logotipo, textos, imagens ou marca do site analisado: gere conteúdo original.
5. Se a página bloquear a análise (anti-bot, CAPTCHA, login), explique e ofereça alternativa.

Sem MCP disponível, rode no terminal:

    node bin/atelier.js extract <url> --out .atelier/<slug>

Detalhes e configuração de outros agentes: docs/agents.md
