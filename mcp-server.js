#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const analyzer = require("./analyzer");
const report = require("./report");
const pkg = require("./package.json");

const TOOL = {
  name: "extract_design_system",
  description: "Abre uma URL publica em Chrome headless, extrai a estrutura, as cores e a tipografia do site e grava DESIGN.md, tokens.css, prompt.md, profile.json e uma captura. Use quando o usuario pedir o design system, um DESIGN.md ou a identidade visual de uma pagina.",
  inputSchema: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL publica http(s) a analisar." },
      outputDir: { type: "string", description: "Pasta relativa para salvar os arquivos. Padrao: .atelier/<slug>." }
    },
    required: ["url"],
    additionalProperties: false
  }
};

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}
function fail(id, code, message) {
  send({ jsonrpc: "2.0", id: id, error: { code: code, message: message } });
}
function log(message) {
  process.stderr.write("[atelier-mcp] " + message + "\n");
}
function inside(base, target) {
  return target === base || target.indexOf(base + path.sep) === 0;
}
function resolveDir(input, cwd) {
  const base = path.resolve(cwd);
  if (!input) { return base; }
  const target = path.resolve(base, input);
  if (!inside(base, target)) {
    throw new Error("outputDir precisa ficar dentro da pasta do projeto.");
  }
  return target;
}

async function extract(args, cwd) {
  if (!args || typeof args.url !== "string" || !args.url.trim()) {
    throw new Error("Informe uma URL http(s).");
  }
  const result = await analyzer.analyze(args.url);
  const profile = result.profile;
  const slug = report.slug(profile.siteName || profile.title);
  const base = resolveDir(args.outputDir || path.join(".atelier", slug), cwd);
  fs.mkdirSync(base, { recursive: true });

  const design = report.buildDesign(profile);
  const tokens = report.buildTokens(profile);
  const prompt = report.buildPrompt(profile);
  fs.writeFileSync(path.join(base, "design.md"), design, "utf8");
  fs.writeFileSync(path.join(base, "tokens.css"), tokens, "utf8");
  fs.writeFileSync(path.join(base, "prompt.md"), prompt, "utf8");
  fs.writeFileSync(path.join(base, "profile.json"), JSON.stringify(profile, null, 2), "utf8");
  if (result.shot) {
    const source = path.join(__dirname, result.shot);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(base, "screenshot.png"));
    }
  }

  const summary = [
    "DESIGN.md gerado para " + (profile.siteName || profile.title) + ".",
    "URL: " + profile.finalUrl,
    "Modo: " + (profile.palette.dark ? "escuro" : "claro") + " | fundo " + profile.palette.bg + " | acento " + profile.palette.accent,
    "Tipografia: " + profile.typography.display + " / " + profile.typography.body,
    "Pasta: " + base,
    "Arquivos: design.md, tokens.css, prompt.md, profile.json, screenshot.png",
    "",
    "Use o DESIGN.md como referencia de estrutura e linguagem visual; nao copie marca, textos ou imagens do site.",
    "",
    "--- DESIGN.md ---",
    "",
    design
  ].join("\n");

  return { text: summary, dir: base, profile: profile };
}

async function handle(message, cwd) {
  const id = message.id;
  const method = message.method;
  const params = message.params || {};

  if (!method) { return; }
  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id: id,
      result: {
        protocolVersion: params.protocolVersion || "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "atelier-design-md", version: pkg.version }
      }
    });
    return;
  }
  if (method === "ping") { send({ jsonrpc: "2.0", id: id, result: {} }); return; }
  if (method === "tools/list") { send({ jsonrpc: "2.0", id: id, result: { tools: [TOOL] } }); return; }
  if (method === "resources/list") { send({ jsonrpc: "2.0", id: id, result: { resources: [] } }); return; }
  if (method === "prompts/list") { send({ jsonrpc: "2.0", id: id, result: { prompts: [] } }); return; }
  if (method === "tools/call") {
    if (params.name !== TOOL.name) {
      fail(id, -32602, "Ferramenta desconhecida: " + String(params.name));
      return;
    }
    try {
      const result = await extract(params.arguments || {}, cwd);
      send({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{ type: "text", text: result.text }],
          isError: false
        }
      });
    } catch (error) {
      send({
        jsonrpc: "2.0",
        id: id,
        result: {
          content: [{ type: "text", text: "Falha ao extrair: " + (error && error.message ? error.message : String(error)) }],
          isError: true
        }
      });
    }
    return;
  }
  if (method.indexOf("notifications/") === 0) { return; }
  if (id !== undefined && id !== null) {
    fail(id, -32601, "Metodo nao suportado: " + method);
  }
}

const cwd = process.cwd();
let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", function (chunk) {
  buffer += chunk;
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line) {
      try {
        const message = JSON.parse(line);
        handle(message, cwd).catch(function (error) {
          log("erro: " + (error && error.message ? error.message : String(error)));
        });
      } catch (error) {
        log("JSON invalido: " + String(line).slice(0, 120));
      }
    }
    index = buffer.indexOf("\n");
  }
});
process.stdin.on("end", function () { process.exit(0); });

log("servidor pronto (v" + pkg.version + ") em " + cwd);
