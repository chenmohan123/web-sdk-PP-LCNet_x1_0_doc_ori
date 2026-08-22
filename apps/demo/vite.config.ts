import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const sdkPackage = JSON.parse(
  readFileSync(new URL("../../packages/sdk/package.json", import.meta.url), "utf8"),
) as { version: string };
const base =
  process.env.GITHUB_ACTIONS === "true" && repositoryName
    ? `/${repositoryName}/`
    : "/";

export default defineConfig({
  base,
  define: { __SDK_VERSION__: JSON.stringify(sdkPackage.version) },
  server: { host: "127.0.0.1", port: 4174 },
});
