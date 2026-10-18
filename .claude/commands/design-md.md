---
description: Extrai um DESIGN.md de uma URL
argument-hint: <url>
---
Use a ferramenta MCP **extract_design_system** do servidor **atelier** para analisar a URL: $ARGUMENTS

Depois:
1. Resuma em até 6 linhas o que o extrator encontrou (modo, paleta, tipografia, estrutura).
2. Informe a pasta onde o DESIGN.md foi salvo.
3. Pergunte se o usuário quer aplicar esse sistema a algum arquivo do projeto.

Se o MCP não estiver disponível, rode:

    node bin/atelier.js extract $ARGUMENTS --out .atelier/design
