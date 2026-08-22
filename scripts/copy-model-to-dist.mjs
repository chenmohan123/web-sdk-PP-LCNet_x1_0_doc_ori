import { cp } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "models", "v1.0.0");
const target = resolve(root, "packages", "sdk", "dist", "models", "v1.0.0");

await cp(source, target, { recursive: true });
console.log(`copied bundled model assets to ${target}`);
