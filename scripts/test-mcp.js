const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const child = spawn(process.execPath, [path.join(root, "mcp-server.js")], { cwd: root, stdio: ["pipe", "pipe", "pipe"] });
let buffer = "";
let nextId = 1;
const pending = new Map();

child.stdout.setEncoding("utf8");
child.stdout.on("data", function (chunk) {
  buffer += chunk;
  let index = buffer.indexOf("\n");
  while (index >= 0) {
    const line = buffer.slice(0, index).trim();
    buffer = buffer.slice(index + 1);
    if (line) {
      const message = JSON.parse(line);
      if (message.id && pending.has(message.id)) {
        const resolve = pending.get(message.id);
        pending.delete(message.id);
        resolve(message);
      }
    }
    index = buffer.indexOf("\n");
  }
});
child.stderr.setEncoding("utf8");
child.stderr.on("data", function (chunk) { if (process.env.DEBUG_MCP) { process.stderr.write(chunk); } });

function call(message) {
  return new Promise(function (resolve, reject) {
    const id = nextId++;
    pending.set(id, resolve);
    child.stdin.write(JSON.stringify(Object.assign({ jsonrpc: "2.0", id: id }, message)) + "\n");
    setTimeout(function () {
      if (pending.has(id)) { pending.delete(id); reject(new Error("timeout id " + id)); }
    }, 90000);
  });
}

(async function () {
  const init = await call({ method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "teste", version: "1" } } });
  console.log("initialize:", init.result.serverInfo.name, init.result.protocolVersion);
  const list = await call({ method: "tools/list" });
  console.log("tools:", list.result.tools.map(function (tool) { return tool.name; }).join(", "));
  const run = await call({ method: "tools/call", params: { name: "extract_design_system", arguments: { url: "https://example.com", outputDir: ".atelier/mcp-teste" } } });
  console.log("isError:", run.result.isError);
  console.log("primeira linha:", run.result.content[0].text.split("\n")[0]);
  console.log("temDesign:", run.result.content[0].text.indexOf("# Example Domain") >= 0);
  console.log("arquivos:", fs.readdirSync(path.join(root, ".atelier", "mcp-teste")).join(", "));
  child.kill();
})().catch(function (error) {
  console.error("FALHA", error.message);
  child.kill();
  process.exit(1);
});
