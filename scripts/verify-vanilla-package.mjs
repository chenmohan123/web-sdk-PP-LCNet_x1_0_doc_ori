import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "examples/vanilla-vite");
const originalPackage = readFileSync(join(source, "package.json"), "utf8");
const sdk = JSON.parse(readFileSync(join(root, "packages/sdk/package.json"), "utf8"));
const temporary = mkdtempSync(join(tmpdir(), "lcnet-vanilla-package-"));
const example = join(temporary, "example");
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error("请通过 pnpm examples:verify 运行打包消费者验证");

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: "inherit", env: { ...process.env, CI: "true" } });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`消费者验证命令失败：${basename(command)} ${args.join(" ")}`);
}

function runPnpm(args, cwd) {
  if (/\.[cm]?js$/.test(pnpm)) run(process.execPath, [pnpm, ...args], cwd);
  else run(pnpm, args, cwd);
}

try {
  runPnpm(["--dir", "packages/sdk", "pack", "--pack-destination", temporary], root);
  const tarballs = readdirSync(temporary).filter((name) => name.endsWith(".tgz"));
  assert.equal(tarballs.length, 1, "打包必须生成唯一 SDK tarball");
  cpSync(source, example, {
    recursive: true,
    filter: (path) => !["node_modules", "dist", "pnpm-lock.yaml"].includes(basename(path)),
  });
  const pkg = JSON.parse(originalPackage);
  assert.equal(pkg.dependencies[sdk.name], sdk.version, "正式示例必须声明当前版本");
  pkg.dependencies[sdk.name] = `file:../${tarballs[0]}`;
  writeFileSync(join(example, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);
  runPnpm(["install", "--no-frozen-lockfile"], example);
  runPnpm(["build"], example);
  run(process.execPath, [join(root, "scripts/verify-vanilla-browser.mjs"), example], root);
  assert.equal(readFileSync(join(source, "package.json"), "utf8"), originalPackage, "验证不得改写正式依赖");
  console.log(`当前 SDK ${sdk.version} 的临时 tarball 消费者验证通过`);
} finally {
  // 只清理本次 mkdtemp 创建的独立目录。
  assert.equal(basename(temporary).startsWith("lcnet-vanilla-package-"), true);
  rmSync(temporary, { recursive: true, force: true });
}
