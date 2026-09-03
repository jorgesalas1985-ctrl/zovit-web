import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const output = resolve(root, "generated/zovit-platform-changes.json");

function git(args, { trim = true } = {}) {
  try {
    const result = execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    return trim ? result.trim() : result;
  }
  catch { return ""; }
}

function area(path) {
  if (/payment|pago|liquidacion|finanza/i.test(path)) return "Pagos y finanzas";
  if (/worker|trabajador|alumno|perfil|registro/i.test(path)) return "Perfiles y registro";
  if (/verification|verificacion|document|credential|biometr/i.test(path)) return "Verificación y documentos";
  if (/map|matching|categor|service/i.test(path)) return "Servicios y matching";
  if (/intranet|admin|auth|role|security/i.test(path)) return "Administración y seguridad";
  if (/\bai\b|zovitAi|ia-/i.test(path)) return "ZOVIT IA";
  if (/\.css$|component|page\.tsx/i.test(path)) return "Experiencia e interfaz";
  return "Plataforma general";
}

const porcelain = git(["status", "--porcelain", "--untracked-files=all"], { trim: false });
function walk(directory, prefix = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}${entry.name}`;
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute, `${relative}/`);
    return /\.(ts|tsx|css|sql|md|json)$/.test(entry.name) ? [relative] : [];
  });
}
const trackedRoots = ["app", "components", "lib", "docs", "supabase"];
const fallbackFiles = trackedRoots.flatMap((folder) => walk(resolve(root, folder), `${folder}/`));
const files = porcelain
  ? porcelain.split(/\r?\n/).map((line) => ({ status: line.slice(0, 2).trim() || "M", path: line.slice(3).trim().replace(/^.* -> /, "") })).filter((item) => item.path && !item.path.startsWith("generated/") && !item.path.startsWith(".next/"))
  : fallbackFiles.map((path) => ({ status: "S", path }));
const grouped = Object.entries(files.reduce((acc, item) => { const key = area(item.path); (acc[key] ??= []).push(item.path); return acc; }, {}));
const commit = git(["rev-parse", "--short", "HEAD"]) || "sin-commit";
const checksumSource = files.map((item) => `${item.path}:${statSync(resolve(root, item.path)).size}:${createHash("sha1").update(readFileSync(resolve(root, item.path))).digest("hex")}`).join("\n");
const checksum = createHash("sha256").update(checksumSource).digest("hex").slice(0, 16);
const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  commit,
  checksum,
  totalChanges: files.length,
  areas: grouped.map(([name, paths]) => ({ name, count: paths.length, paths })),
  changes: files,
  governance: "Inventario automático. Los cambios sensibles requieren aprobación exclusiva del superadministrador.",
};
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`ZOVIT IA recibió ${files.length} cambio(s) en ${grouped.length} área(s).`);
