import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

try {
  const { GITHUB_EVENT_NAME, GITHUB_REF, GITHUB_SHA } = process.env;
  const tag = /^refs\/tags\/v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/.exec(GITHUB_REF ?? "");
  if (GITHUB_EVENT_NAME !== "push" || !tag) {
    throw new Error("只允许版本标签的 push 事件");
  }
  const version = tag[1];
  const pkg = JSON.parse(readFileSync("packages/sdk/package.json", "utf8"));
  if (pkg.version !== version) throw new Error("标签与 SDK 包版本不一致");
  // 只读取 package 层级，避免误把 model.version 当成 npm 版本。
  const manifest = readFileSync("sdk-manifest.yaml", "utf8");
  const packageBlock = /^package:\s*\r?\n((?:[ \t]+[^\r\n]*\r?\n?)+)/m.exec(manifest)?.[1];
  const manifestVersion = /^  version:\s*["']?([^\s"']+)["']?\s*$/m.exec(packageBlock ?? "")?.[1];
  if (manifestVersion !== version) throw new Error("标签与 manifest 包版本不一致");
  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const heading = new RegExp(`^## ${version.replaceAll(".", "\\.")} - \\d{4}-\\d{2}-\\d{2}\\s*$`, "m");
  if (!heading.test(changelog)) throw new Error("缺少当前版本的更新日志");
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const head = git("rev-parse", "HEAD");
  const tagCommit = git("rev-parse", `${GITHUB_REF}^{commit}`);
  if (head !== tagCommit || GITHUB_SHA !== head) {
    throw new Error("事件、标签与检出提交不一致");
  }
  const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", head, "origin/main"], { stdio: "pipe" });
  if (ancestor.status !== 0) throw new Error("发布提交必须属于 origin/main");
  console.log(`发布门禁通过：${version}，提交 ${head}`);
} catch (error) {
  console.error(`发布门禁失败：${error.message}`);
  process.exitCode = 1;
}
