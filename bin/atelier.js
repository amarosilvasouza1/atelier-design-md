#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const analyzer = require("../analyzer");
const report = require("../report");
const pkg = require("../package.json");

const ROOT = path.join(__dirname, "..");

function help() {
  const lines = [
    "Atelier " + pkg.version + " - extrator de DESIGN.md para agentes",
    "",
    "Uso:",
    "  atelier extract <url> [opcoes]",
    "  atelier studio [--port 4321]",
    "  atelier help | version",
    "",
    "Opcoes do extract:",
    "  -o, --out <dir>   salva design.md, tokens.css, prompt.md, profile.json e screenshot.png",
    "      --json        imprime um JSON com perfil, arquivos e conteudos",
    "      --tokens      inclui tokens.css depois do DESIGN.md na saida",
    "      --prompt      inclui o prompt depois do DESIGN.md na saida",
    "      --no-shot     nao copia a captura ao usar --out",
    "  -q, --quiet       nao escreve progresso no stderr",
    "",
    "Exemplos:",
    "  atelier extract https://stripe.com --out .atelier/stripe",
    "  atelier extract linear.app > DESIGN.md",
    "  atelier extract https://linear.app --json",
    "",
    "MCP: node mcp-server.js (stdio). Configs em docs/agents.md."
  ];
  process.stdout.write(lines.join("\n") + "\n");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "help";
  const opts = { out: "", json: false, tokens: false, prompt: false, noShot: false, quiet: false, port: "" };
  const rest = [];
  for (let i = 1; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "-o" || arg === "--out") { opts.out = args[i + 1] || ""; i += 1; }
    else if (arg === "--json") { opts.json = true; }
    else if (arg === "--tokens") { opts.tokens = true; }
    else if (arg === "--prompt") { opts.prompt = true; }
    else if (arg === "--no-shot") { opts.noShot = true; }
    else if (arg === "-q" || arg === "--quiet") { opts.quiet = true; }
    else if (arg === "--port") { opts.port = args[i + 1] || ""; i += 1; }
    else if (arg === "-h" || arg === "--help") { opts.help = true; }
    else if (arg.slice(0, 2) === "--") { throw new Error("Opcao desconhecida: " + arg); }
    else { rest.push(arg); }
  }
  return { command, opts, rest };
}

function log(opts, message) {
  if (!opts.quiet) { process.stderr.write(message + "\n"); }
}

async function extract(url, opts) {
  if (!url) { help(); process.exitCode = 1; return; }
  log(opts, "Abrindo " + url + " no Chrome headless...");
  const result = await analyzer.analyze(url);
  const profile = result.profile;
  const design = report.buildDesign(profile);
  const tokens = report.buildTokens(profile);
  const prompt = report.buildPrompt(profile);
  const slug = report.slug(profile.siteName || profile.title);

  let files = null;
  if (opts.out) {
    const dir = path.resolve(opts.out);
    fs.mkdirSync(dir, { recursive: true });
    const paths = {
      design: path.join(dir, "design.md"),
      tokens: path.join(dir, "tokens.css"),
      prompt: path.join(dir, "prompt.md"),
      profile: path.join(dir, "profile.json"),
      screenshot: path.join(dir, "screenshot.png")
    };
    fs.writeFileSync(paths.design, design, "utf8");
    fs.writeFileSync(paths.tokens, tokens, "utf8");
    fs.writeFileSync(paths.prompt, prompt, "utf8");
    fs.writeFileSync(paths.profile, JSON.stringify(profile, null, 2), "utf8");
    if (!opts.noShot && result.shot) {
      const source = path.join(ROOT, result.shot);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, paths.screenshot);
      } else {
        delete paths.screenshot;
      }
    }
    files = paths;
    log(opts, "Arquivos salvos em " + dir);
  }

  if (opts.json) {
    process.stdout.write(JSON.stringify({
      ok: true,
      url: profile.finalUrl,
      title: profile.title,
      slug: slug,
      files: files,
      profile: profile,
      design: design,
      tokens: tokens,
      prompt: prompt
    }, null, 2) + "\n");
    return;
  }

  process.stdout.write(design);
  if (opts.tokens) { process.stdout.write("\n\n" + tokens); }
  if (opts.prompt) { process.stdout.write("\n\n" + prompt); }
}

function studio(opts) {
  const port = opts.port || process.env.PORT || "4321";
  const url = "http://127.0.0.1:" + port;
  process.stdout.write("Atelier em " + url + "\n");
  const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
    stdio: "inherit",
    env: Object.assign({}, process.env, { PORT: String(port) })
  });
  child.on("exit", function (code) { process.exit(code || 0); });
}

async function main() {
  let parsed;
  try { parsed = parseArgs(process.argv); }
  catch (error) { process.stderr.write(String(error.message) + "\n"); process.exit(1); return; }
  const command = parsed.command;

  if (command === "help" || parsed.opts.help) { help(); return; }
  if (command === "version" || command === "--version" || command === "-v") {
    process.stdout.write(pkg.version + "\n");
    return;
  }
  if (command === "studio") { studio(parsed.opts); return; }
  if (command === "extract") {
    await extract(parsed.rest[0], parsed.opts);
    return;
  }
  process.stderr.write("Comando desconhecido: " + command + "\n\n");
  help();
  process.exit(1);
}

main().catch(function (error) {
  process.stderr.write("Erro: " + (error && error.message ? error.message : String(error)) + "\n");
  process.exit(1);
});
