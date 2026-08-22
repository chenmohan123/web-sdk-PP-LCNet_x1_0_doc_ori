import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

test("release metadata is public and Apache-2.0 licensed", async () => {
  const packageJson = JSON.parse(
    await readFile(
      new URL("../packages/sdk/package.json", import.meta.url),
      "utf8",
    ),
  );
  const license = await readFile(
    new URL("../LICENSE", import.meta.url),
    "utf8",
  );
  assert.equal(packageJson.publishConfig.access, "public");
  assert.match(license, /Apache License/);
});
