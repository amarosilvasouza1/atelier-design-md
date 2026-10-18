"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const analyzer = require("./analyzer");
const report = require("./report");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4321;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
  ".md": "text/plain; charset=utf-8"
};

function sendJson(res, status, data) {
  var body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(body);
}
function readBody(req) {
  return new Promise(function (resolve, reject) {
    var chunks = [];
    var size = 0;
    req.on("data", function (chunk) {
      size += chunk.length;
      if (size > 20000) { reject(new Error("Pedido grande demais.")); req.destroy(); return; }
      chunks.push(chunk);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}
function serve(req, res) {
  var pathname;
  try { pathname = decodeURIComponent((req.url || "/").split("?")[0]); }
  catch (e) { pathname = "/"; }
  if (pathname === "/") { pathname = "/extrator.html"; }
  if (pathname === "/estudio") { pathname = "/index.html"; }
  var file = path.join(ROOT, path.normalize(pathname).replace(/^(\.\.[\/\\])+/, ""));
  if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end("403"); return; }
  fs.readFile(file, function (err, data) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404");
      return;
    }
    var ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Cache-Control": ext === ".png" ? "public, max-age=3600" : "no-store"
    });
    res.end(data);
  });
}

var server = http.createServer(function (req, res) {
  var parsed = new URL(req.url || "/", "http://127.0.0.1");
  if (req.method === "POST" && parsed.pathname === "/api/analyze") {
    readBody(req).then(function (raw) {
      var body;
      try { body = JSON.parse(raw); } catch (e) { sendJson(res, 400, { ok: false, error: "JSON invalido." }); return; }
      return analyzer.analyze(body.url, {
        refresh: body.refresh === true,
        responsive: body.responsive !== false,
        dark: body.dark !== false
      }).then(function (result) {
        var profile = result.profile;
        sendJson(res, 200, {
          ok: true,
          cached: result.cached === true,
          profile: profile,
          shot: result.shot,
          design: report.buildDesign(profile),
          tokens: report.buildTokens(profile),
          darkTokens: report.buildDarkTokens(profile),
          prompt: report.buildPrompt(profile),
          slug: report.slug(profile.siteName || profile.title)
        });
      });
    }).catch(function (error) {
      sendJson(res, 422, { ok: false, error: error.message || "Nao consegui analisar esta pagina." });
    });
    return;
  }
  if ((req.method === "GET" || req.method === "HEAD") && parsed.pathname.indexOf("/shots/") === 0) {
    var name = path.basename(parsed.pathname);
    fs.readFile(path.join(analyzer.SHOTS, name), function (error, data) {
      if (error) { res.writeHead(404); res.end("404"); return; }
      res.writeHead(200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" });
      res.end(data);
    });
    return;
  }
  if (req.method === "GET" || req.method === "HEAD") { serve(req, res); return; }
  res.writeHead(405); res.end("405");
});

server.timeout = 100000;
server.listen(PORT, "127.0.0.1", function () {
  console.log("Atelier em http://127.0.0.1:" + PORT);
});
