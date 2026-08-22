import {
  createDocOrientation,
  type Backend,
} from "web-sdk-pp-lcnet-x1-0-doc-ori";

export async function detectSelectedFile(
  file: File,
  backend: Backend = "wasm",
) {
  const detector = await createDocOrientation({ backend });
  try {
    return await detector.detect(file);
  } finally {
    await detector.dispose();
  }
}
