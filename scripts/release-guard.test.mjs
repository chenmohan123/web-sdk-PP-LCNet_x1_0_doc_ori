import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const guard = fileURLToPath(new URL("./release-guard.mjs", import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "lcnet-release-guard-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  mkdirSync(join(cwd, "packages/sdk"), { recursive: true });
  writeFileSync(join(cwd, "packages/sdk/package.json"), JSON.stringify({ version: "0.2.0" }));
  writeFileSync(join(cwd, "sdk-manifest.yaml"), "package:\n  name: example\n  version: 0.2.0\nmodel:\n  version: 1.0.0\n");
  writeFileSync(join(cwd, "CHANGELOG.md"), "# 更新日志\n\n## 0.2.0 - 2026-09-07\n\n- 发布。\n");
  git("init", "-b", "main");
  git("config", "user.name", "发布测试");
  git("config", "user.email", "release-test@example.invalid");
  git("add", ".");
  git("commit", "-m", "创建发布测试版本");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  git("tag", "v0.2.0");
  const run = (env = {}) => spawnSync(process.execPath, [guard], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, GITHUB_EVENT_NAME: "push", GITHUB_REF: "refs/tags/v0.2.0", GITHUB_SHA: git("rev-parse", "HEAD"), ...env },
  });
  return { cwd, git, run };
}

test("发布门禁接受 main 上与包、清单、日志一致的版本标签", (t) => {
  const { run } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /发布门禁通过.*0\.2\.0/);
});

for (const env of [
  { GITHUB_REF: "refs/heads/main" },
  { GITHUB_EVENT_NAME: "workflow_dispatch" },
]) {
  test(`发布门禁拒绝非版本标签推送 ${JSON.stringify(env)}`, (t) => {
    const { run } = fixture(t);
    const result = run(env);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /只允许版本标签的 push 事件/);
  });
}

for (const [path, content, message] of [
  ["packages/sdk/package.json", '{"version":"0.1.2"}', /标签与 SDK 包版本不一致/],
  ["sdk-manifest.yaml", "package:\n  version: 0.1.2\nmodel:\n  version: 0.2.0\n", /标签与 manifest 包版本不一致/],
  ["CHANGELOG.md", "## 0.1.2 - 2026-08-22\n", /缺少当前版本的更新日志/],
]) {
  test(`发布门禁拒绝版本不一致的 ${path}`, (t) => {
    const { cwd, run } = fixture(t);
    writeFileSync(join(cwd, path), content);
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  });
}

test("发布门禁拒绝尚未进入 origin/main 的提交", (t) => {
  const { cwd, git, run } = fixture(t);
  git("checkout", "-b", "candidate");
  writeFileSync(join(cwd, "candidate.txt"), "未合并版本\n");
  git("add", ".");
  git("commit", "-m", "创建未合并提交");
  git("tag", "-f", "v0.2.0");
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /发布提交必须属于 origin\/main/);
});

test("发布门禁拒绝事件提交与标签不一致", (t) => {
  const { run } = fixture(t);
  const result = run({ GITHUB_SHA: "0".repeat(40) });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /事件、标签与检出提交不一致/);
});
