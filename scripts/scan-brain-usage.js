#!/usr/bin/env node
/**
 * Ficheiros em src/brain sem caminho de import a partir de entradas conhecidas.
 * Ver docs/BRAIN-INVENTORY.md. Exit 0 (informativo).
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const brainRoot = path.join(root, "src", "brain");
const bootstrap = path.join(root, "src", "app", "bootstrap.ts");

function walk(dir) {
  const o = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) o.push(...walk(p));
    else if (/\.(m)?(js|ts|tsx)$/.test(e.name)) o.push(p);
  }
  return o;
}

function tryFile(baseNoExt, preferJs) {
  const exts = preferJs
    ? [".js", ".ts", ".tsx"]
    : [".ts", ".tsx", ".js"];
  for (const ext of exts) {
    const p = baseNoExt + ext;
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return path.normalize(p);
  }
  return null;
}

function resolveImport(fromFile, spec) {
  const fromJs = /\.[cm]?js$/.test(fromFile);
  if (spec.startsWith("@/brain/")) {
    const rel = spec.slice(8);
    const t = tryFile(
      path.join(brainRoot, rel.replace(/\.(ts|js)$/, "")),
      false
    );
    return t || null;
  }
  if (spec.startsWith("./") || spec.startsWith("../")) {
    const dir = path.dirname(fromFile);
    const target = path.resolve(dir, spec);
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      return path.normalize(target);
    }
    const t = tryFile(
      target.replace(/\.(ts|js)$/, ""),
      fromJs
    );
    return t || null;
  }
  return null;
}

function edgesFromFile(file) {
  const s = fs.readFileSync(file, "utf8");
  const out = new Set();
  const push = (p) => {
    if (!p) return;
    const n = path.normalize(p);
    if (n.replace(/\\/g, "/").toLowerCase().includes("/src/brain/")) {
      out.add(n);
    }
  };
  const rRequire = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
  let m;
  while ((m = rRequire.exec(s)) !== null) {
    if (
      m[1].startsWith(".") &&
      !m[1].includes("config") &&
      !m[1].includes("modules/") &&
      !m[1].includes("infrastructure/")
    ) {
      push(resolveImport(file, m[1]));
    }
  }
  const rFrom = /from\s+['"]([^'"]+)['"]/g;
  while ((m = rFrom.exec(s)) !== null) {
    if (m[1].startsWith("@/")) {
      push(resolveImport(file, m[1]));
    } else if (m[1].startsWith(".") && !m[1].includes("config")) {
      push(resolveImport(file, m[1]));
    }
  }
  return out;
}

function bootstrapStartFiles() {
  const t = fs.readFileSync(bootstrap, "utf8");
  const set = new Set();
  let m;
  const at = /from\s+['"]@\/brain\/([^'"]+)['"]/g;
  while ((m = at.exec(t)) !== null) {
    const name = m[1].replace(/\.(ts|js)$/, "");
    const p = tryFile(path.join(brainRoot, name), false);
    if (p) set.add(p);
  }
  const rq = /require\(\s*['"]\.\.\/brain\/([^'"]+)['"]\s*\)/g;
  while ((m = rq.exec(t)) !== null) {
    const name = m[1].replace(/\.(js|ts)$/, "");
    const p = tryFile(path.join(brainRoot, name), true);
    if (p) set.add(p);
  }
  return set;
}

const files = walk(brainRoot).map((f) => path.normalize(f));
const fset = new Set(files);
const g = new Map();
for (const f of files) g.set(f, edgesFromFile(f));

function pickFile(basename) {
  return files.find((f) => f.replace(/\\/g, "/").endsWith("/" + basename)) || null;
}

const start = new Set();
const gmg = pickFile("general-manager.ai.js");
const exr = pickFile("executive-report.engine.js");
if (gmg) start.add(gmg);
if (exr) start.add(exr);
for (const p of bootstrapStartFiles()) start.add(p);

for (const s of [...start]) {
  if (!fset.has(s)) start.delete(s);
}

const seen = new Set();
const q = [...start].filter((x) => fset.has(x));
q.forEach((x) => seen.add(x));

while (q.length) {
  const u = q.shift();
  for (const v of g.get(u) || []) {
    if (seen.has(v) || !fset.has(v)) continue;
    seen.add(v);
    q.push(v);
  }
}

const orphans = files.filter((f) => !seen.has(f)).sort((a, b) => a.localeCompare(b));

console.log("Entradas: general-manager + executive-report + @/brain/* (bootstrap)\n");
console.log("Ligados: " + seen.size + "  |  total ficheiros: " + files.length);
console.log("Orfaos: " + orphans.length + "\n");
for (const f of orphans) {
  console.log("  " + path.relative(root, f));
}
if (orphans.length) {
  console.log(
    "\nVer docs/BRAIN-INVENTORY.md — novos ficheiros devem ligar a uma entrada ou"
  );
  console.log("documentar a razao de ficarem fora do grafo.\n");
}
process.exit(0);
