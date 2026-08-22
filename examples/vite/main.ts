import { createDocOrientation } from "web-sdk-pp-lcnet-x1-0-doc-ori";

export async function detectSelectedFile(file: File) {
  const detector = await createDocOrientation({ backend: "wasm" });
  try {
    return await detector.detect(file);
  } finally {
    await detector.dispose();
  }
}
