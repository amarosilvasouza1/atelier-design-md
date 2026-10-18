const { execFileSync } = require("child_process");
const path = require("path");
const root = path.join(__dirname, "..");
const out = execFileSync(process.execPath, [path.join(root, "bin", "atelier.js"), "extract", "https://example.com", "--json", "-q", "--out", ".atelier/cli-teste"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 10 * 1024 * 1024,
  timeout: 90000
});
const data = JSON.parse(out);
console.log("json", data.ok, data.slug, "design", data.design.length, "tokens", data.tokens.length, "files", Object.keys(data.files || {}).length);
console.log("primeira linha", data.design.split("\n")[0]);
