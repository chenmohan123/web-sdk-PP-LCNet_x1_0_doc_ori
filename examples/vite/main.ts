import { createDocOrientation } from "web-sdk-pp-lcnet-x1-0-doc-ori";
const detector = await createDocOrientation({ backend: "wasm" });
console.log(detector.model);
